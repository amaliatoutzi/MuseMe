---
timestamp: 'Sun Oct 19 2025 13:46:01 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_134601.0746b14b.md]]'
content_id: 72eefdfc2b6370cac870e89e39d69f863d787127d5b7f953261e5b2130e0dddd
---

# file: src/concepts/UserAuthenticationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import * as crypto from "node:crypto";
import * as util from "node:util"; // Import util for promisify

// Declare collection prefix, use concept name
const PREFIX = "UserAuthentication" + ".";

// Generic type of this concept - represents the user's identity
type User = ID;

// Constants for password hashing (PBKDF2 is recommended for password storage)
const SALT_LENGTH = 16; // 16 bytes for salt
const HASH_ITERATIONS = 100000; // Number of iterations for PBKDF2
const HASH_KEYLEN = 64; // Length of the derived key (hashed password) in bytes
const HASH_ALGORITHM = "sha512"; // Hashing algorithm to use

// Promisify crypto functions for easier async/await usage
const pbkdf2Async = util.promisify(crypto.pbkdf2);
const randomBytesAsync = util.promisify(crypto.randomBytes);

/**
 * Hashes a plaintext password using PBKDF2 with a randomly generated salt.
 * The salt and the derived key are stored together in a colon-separated string.
 * @param password The plaintext password to hash.
 * @returns A promise that resolves to the combined salt and hash string.
 */
async function hashPassword(password: string): Promise<string> {
  const salt = await randomBytesAsync(SALT_LENGTH);
  const hash = await pbkdf2Async(
    password,
    salt,
    HASH_ITERATIONS,
    HASH_KEYLEN,
    HASH_ALGORITHM,
  );
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
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
  const parts = storedHash.split(":");
  if (parts.length !== 2) {
    return false; // Malformed stored hash
  }
  const salt = Buffer.from(parts[0], "hex");
  const storedKey = Buffer.from(parts[1], "hex");

  const derivedKey = await pbkdf2Async(
    password,
    salt,
    HASH_ITERATIONS,
    HASH_KEYLEN,
    HASH_ALGORITHM,
  );

  // Use timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(derivedKey, storedKey);
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

    // Ensure the username is unique across all credentials documents for registration validation
    // This index prevents duplicates and enforces the 'requires' clause at the database level.
    // If we wanted case-insensitivity, we'd need to add a collation option or store a lowercase version.
    // For now, adhering to String type implies case-sensitivity unless specified otherwise.
    this.credentials.createIndex({ username: 1 }, { unique: true });
  }

  /**
   * register (username: String, password: String) : {user: User} | {error: string}
   *
   * **requires** no existing Credentials with this username AND username/password are not empty
   *
   * **effects** creates a new User ID `u`; creates Credentials(owner := `u`, username,
   *             passwordHash := hash(password), createdAt := now, updatedAt := now); returns `u` as `user`
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Basic input validation
    if (!username || username.trim() === "") {
      return { error: "Username cannot be empty." };
    }
    if (!password || password.trim() === "") {
      return { error: "Password cannot be empty." };
    }

    // Precondition check: no existing Credentials with this username
    // The unique index handles the strict enforcement, but this provides a friendly error message.
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
      if (e instanceof Error && e.message.includes("E11000 duplicate key error")) {
         return { error: "Username already taken (race condition detected)." };
      }
      console.error("Error during user registration:", e);
      return { error: "Failed to register user. Please try again later." };
    }
  }

  /**
   * authenticate (username: String, password: String) : {user: User} | {error: string}
   *
   * **requires** Credentials(username) exists AND verifyHash(password, passwordHash) AND username/password are not empty
   *
   * **effects** none
   */
  async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Basic input validation
    if (!username || username.trim() === "") {
      return { error: "Username cannot be empty." };
    }
    if (!password || password.trim() === "") {
      return { error: "Password cannot be empty." };
    }

    // Find credentials for the given username
    const userCredentials = await this.credentials.findOne({ username });

    // Check if credentials exist
    if (!userCredentials) {
      // Return a generic error message for security (don't reveal if username exists)
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
```
