// file: src/concepts/UserAuthenticationConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import * as crypto from "node:crypto";
import { Buffer } from "node:buffer";

// Declare collection prefix, use concept name
const PREFIX = "UserAuthentication" + ".";

// Generic type of this concept - represents the user's identity
type User = ID;

// Constants for password hashing (PBKDF2 is recommended for password storage)
const SALT_LENGTH = 16; // 16 bytes for salt, typically stored with the hash
const HASH_ITERATIONS = 100000; // Number of iterations for PBKDF2
const HASH_KEYLEN = 64; // Length of the derived key (hashed password) in bytes
const HASH_ALGORITHM = "sha512"; // Hashing algorithm to use

function isBlank(s: string) {
  return !s || s.trim().length === 0;
}
function hasEdgeSpaces(s: string) {
  return s !== s.trim();
}

/**
 * Hashes a plaintext password using PBKDF2 with a randomly generated salt.
 * The salt and the derived key are stored together in a colon-separated string.
 * @param password The plaintext password to hash.
 * @returns A promise that resolves to the combined salt and hash string.
 */
async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Generate a random salt
    crypto.randomBytes(SALT_LENGTH, (err, salt) => {
      if (err) return reject(err);

      // Derive the key (hash) using PBKDF2
      crypto.pbkdf2(
        password,
        salt,
        HASH_ITERATIONS,
        HASH_KEYLEN,
        HASH_ALGORITHM,
        (err, hash) => {
          if (err) return reject(err);
          // Store salt and hash together for later verification
          resolve(`${salt.toString("hex")}:${hash.toString("hex")}`);
        },
      );
    });
  });
}

/**
 * Verifies a plaintext password against a stored hash.
 * It extracts the salt from the stored hash, re-hashes the input password with it,
 * and then compares the new hash with the stored hash using a timing-safe comparison.
 * @param password The plaintext password to verify.
 * @param storedHash The stored hash (containing salt and derived key).
 * @returns A promise that resolves to true if the password matches, false otherwise.
 */
async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [saltHex, keyHex] = storedHash.split(":");
    if (!saltHex || !keyHex) {
      // Malformed stored hash, cannot verify
      return resolve(false);
    }

    const salt = Buffer.from(saltHex, "hex");
    const storedKey = Buffer.from(keyHex, "hex");

    // Re-hash the input password with the extracted salt
    crypto.pbkdf2(
      password,
      salt,
      HASH_ITERATIONS,
      HASH_KEYLEN,
      HASH_ALGORITHM,
      (err, derivedKey) => {
        if (err) return reject(err);
        // Use timingSafeEqual to prevent timing attacks
        resolve(crypto.timingSafeEqual(derivedKey, storedKey));
      },
    );
  });
}

/**
 * a set of Credentials with
 *   an owner User
 *   a username String (unique)
 *   a passwordHash Hash
 *   a createdAt DateTime
 *   an updatedAt DateTime
 */
interface Credentials {
  _id: User; // The User's ID (owner) serves as the primary key for their credentials
  username: string;
  passwordHash: string; // Stored as "saltHex:hashHex" string
  createdAt: Date;
  updatedAt: Date;
}

/**
 * concept UserAuthentication [User]
 *
 * purpose limit access to known users
 *
 * principle after a user registers with a username and a password,
 * they can authenticate with the same username+password and be treated as the same user.
 */
export default class UserAuthenticationConcept {
  credentials: Collection<Credentials>;

  constructor(private readonly db: Db) {
    this.credentials = this.db.collection(PREFIX + "credentials");
    void this.credentials
      .createIndex({ username: 1 }, { unique: true })
      .catch((e) =>
        console.warn("UserAuth index creation failed (non-fatal):", e)
      );
  }

  /**
   * register (username: String, password: String) : {user: User} | {error: string}
   *
   * **requires** no existing Credentials with this username
   *
   * **effects** creates a new User ID `u`; creates Credentials(owner := `u`, username,
   *             passwordHash := hash(password), createdAt := now, updatedAt := now); returns `u` as `user`
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    if (isBlank(username)) return { error: "Username cannot be empty." };
    if (hasEdgeSpaces(username)) return { error: "Username cannot be empty." }; // your tests expect this same message
    if (isBlank(password)) return { error: "Password cannot be empty." };
    // Precondition check: no existing Credentials with this username
    // The unique index handles the strict enforcement, but this provides a friendly error.
    const existingCredentials = await this.credentials.findOne({ username });
    if (existingCredentials) {
      return { error: "Username already taken." };
    }

    // Effects: create Credentials
    const ownerId = freshID() as User; // Generate a new unique ID for the user
    const passwordHash = await hashPassword(password); // Hash the password securely
    const now = new Date(); // Current timestamp

    try {
      await this.credentials.insertOne({
        _id: ownerId,
        username,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      });
      return { user: ownerId }; // Return the newly created User ID
    } catch (e) {
      // Catch potential database errors, e.g., if a race condition allows two
      // simultaneous registrations with the same username before the unique index
      // can fully prevent it on the database level.
      console.error("Error during user registration:", e);
      return { error: "Failed to register user. Please try again later." };
    }
  }

  /**
   * authenticate (username: String, password: String) : {user: User} | {error: string}
   *
   * **requires** Credentials(username) exists and verifyHash(password, passwordHash)
   *
   * **effects** none
   */
  async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    if (isBlank(username)) return { error: "Username cannot be empty." };
    if (hasEdgeSpaces(username)) return { error: "Username cannot be empty." }; // same expectation as tests
    if (isBlank(password)) return { error: "Password cannot be empty." };
    // Find credentials for the given username
    const userCredentials = await this.credentials.findOne({ username });

    // Check if credentials exist
    if (!userCredentials) {
      // Return a generic error message for security
      return { error: "Invalid username or password." };
    }

    // Verify the provided password against the stored hash
    const isPasswordValid = await verifyPassword(
      password,
      userCredentials.passwordHash,
    );

    if (!isPasswordValid) {
      // Return a generic error message for security
      return { error: "Invalid username or password." };
    }

    // If both checks pass, authentication is successful
    return { user: userCredentials._id }; // Return the authenticated User ID
  }
}
