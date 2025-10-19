[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: userAuthentication

Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Some more details about the test cases you should include:
- Operational principle. A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example.
- Interesting scenarios. Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors.
- Number required. For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios.
- No state setup. Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state.

# response:

# Application pitch

## Product Summary

*   **Name:** MuseMe
*   **Core idea:** A friends-only diary and discovery app for museum lovers.
*   **Visits:** Users create visit entries (pick museum → add exhibits → notes → photos).
*   **Ratings:** Unified **1–5 stars** for both museums and exhibits; ratings shape recommendations.
*   **Friends-Only Social:** Only **mutual follows** can view each other’s visits/ratings.
*   **Save for Later:** Users can **save/unsave** museums to a personal shortlist.
*   **Taste Tags:** Optional user preference tags help personalize discovery.
*   **Recommendations:** Powered by existing data: similarity over items + user ratings + preference tags.
*   **Catalog assumption:** Museums & exhibits already exist in the database.
*   **Privacy model:** Friends-only; no public browsing of user content.

## Conceptual Constraints (operational principles)

*   **Following:** Friendship = mutual follows; access checks happen at the application boundary.
*   **Reviewing \[User, Item]:** A single source of truth for 1–5 star ratings (optional note).
*   **Visit \[User, Museum]:** Diary for notes/photos per exhibit; do **not** store ratings here.
*   **Similarity \[Item]:** Item-to-item relatedness for ranking; rebuilt offline or on demand.
*   **Saving \[User, Item]:** Users can save/unsave items (museums now; extensible to exhibits).
*   **UserPreferences \[User, Tag]:** Durable taste tags from a preset list.
*   **UserAuthentication:** Username identifies user.

# implement: UserAuthentication

## concept **UserAuthentication** \[User]

**purpose**
limit access to known users

**principle**
after a user registers with a username and a password, they can authenticate with the same username+password and be treated as the same user.

**state**
a set of **Credentials** with

*   an owner **User**
*   a username **String** (unique)
*   a passwordHash **Hash**
*   a createdAt **DateTime**
*   an updatedAt **DateTime**

**actions**
**register**(username: String, password: String) : {user: User} | {error: string}

*   requires no existing Credentials with this username AND username/password are not empty
*   effects create Credentials(owner := new User, username, passwordHash := hash(password), createdAt := now, updatedAt := now); return owner

**authenticate**(username: String, password: String): {user: User} | {error: string}

*   requires Credentials(username) exists AND verifyHash(password, passwordHash) AND username/password are not empty
*   effects none

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

# test: userAuthentication

# file: src/concepts/UserAuthenticationConcept.test.ts

```typescript
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("UserAuthenticationConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  // --- Operational Principle Test ---
  await t.step("should fulfill the operational principle (register and authenticate successfully)", async () => {
    console.log("\n--- Operational Principle Test ---");

    const username = "testUser";
    const password = "testPassword123";

    console.log(`Action: register({ username: "${username}", password: "..." })`);
    const registerResult = await concept.register({ username, password });
    console.log("Result:", registerResult);

    assertExists((registerResult as { user: ID }).user, "Registration should return a user ID");
    const registeredUserId = (registerResult as { user: ID }).user;
    console.log(`User registered with ID: ${registeredUserId}`);

    console.log(`Action: authenticate({ username: "${username}", password: "..." })`);
    const authResult = await concept.authenticate({ username, password });
    console.log("Result:", authResult);

    assertExists((authResult as { user: ID }).user, "Successful authentication should return a user ID");
    assertEquals((authResult as { user: ID }).user, registeredUserId, "Authenticated user ID should match registered user ID");
    console.log(`Successfully authenticated user with ID: ${registeredUserId}`);

    console.log(`Action: authenticate({ username: "${username}", password: "wrongPassword" })`);
    const authFailResult = await concept.authenticate({ username, password: "wrongPassword" });
    console.log("Result:", authFailResult);
    assertExists((authFailResult as { error: string }).error, "Authentication with wrong password should fail");
    assertEquals((authFailResult as { error: string }).error, "Invalid username or password.", "Error message for wrong password should be correct");

    console.log(`Action: authenticate({ username: "nonExistent", password: "..." })`);
    const authNonExistentResult = await concept.authenticate({ username: "nonExistent", password: "anyPassword" });
    console.log("Result:", authNonExistentResult);
    assertExists((authNonExistentResult as { error: string }).error, "Authentication with non-existent username should fail");
    assertEquals((authNonExistentResult as { error: string }).error, "Invalid username or password.", "Error message for non-existent user should be correct");
  });

  // --- Interesting Scenarios ---

  await t.step("should prevent registration with a duplicate username", async () => {
    console.log("\n--- Scenario 1: Duplicate Username Registration ---");
    const username = "uniqueUser";
    const password = "password1";

    console.log(`Action: register({ username: "${username}", password: "..." }) (First registration)`);
    const result1 = await concept.register({ username, password });
    console.log("Result:", result1);
    assertExists((result1 as { user: ID }).user, "First registration should succeed");

    console.log(`Action: register({ username: "${username}", password: "..." }) (Attempt with same username)`);
    const result2 = await concept.register({ username, password: "password2" });
    console.log("Result:", result2);
    assertExists((result2 as { error: string }).error, "Second registration with same username should fail");
    assertEquals((result2 as { error: string }).error, "Username already taken.", "Error message for duplicate username should be correct");
  });

  await t.step("should handle multiple successful registrations and authentications", async () => {
    console.log("\n--- Scenario 2: Multiple Users ---");
    const userA_name = "Alice";
    const userA_pass = "alice_pass";
    const userB_name = "Bob";
    const userB_pass = "bob_pass";

    console.log(`Action: register({ username: "${userA_name}", password: "..." })`);
    const resA = await concept.register({ username: userA_name, password: userA_pass });
    console.log("Result:", resA);
    assertExists((resA as { user: ID }).user, "Alice registration should succeed");
    const userA_id = (resA as { user: ID }).user;

    console.log(`Action: register({ username: "${userB_name}", password: "..." })`);
    const resB = await concept.register({ username: userB_name, password: userB_pass });
    console.log("Result:", resB);
    assertExists((resB as { user: ID }).user, "Bob registration should succeed");
    const userB_id = (resB as { user: ID }).user;

    assertNotEquals(userA_id, userB_id, "User IDs should be different for different users");

    console.log(`Action: authenticate({ username: "${userA_name}", password: "..." })`);
    const authA = await concept.authenticate({ username: userA_name, password: userA_pass });
    console.log("Result:", authA);
    assertEquals((authA as { user: ID }).user, userA_id, "Alice authentication should succeed and return Alice's ID");

    console.log(`Action: authenticate({ username: "${userB_name}", password: "..." })`);
    const authB = await concept.authenticate({ username: userB_name, password: userB_pass });
    console.log("Result:", authB);
    assertEquals((authB as { user: ID }).user, userB_id, "Bob authentication should succeed and return Bob's ID");
  });

  await t.step("should reject registration and authentication with empty or whitespace-only credentials", async () => {
    console.log("\n--- Scenario 3: Empty/Whitespace Credentials ---");

    console.log(`Action: register({ username: "", password: "..." })`);
    const emptyUserReg = await concept.register({ username: "", password: "password" });
    console.log("Result:", emptyUserReg);
    assertExists((emptyUserReg as { error: string }).error, "Registration with empty username should fail");
    assertEquals((emptyUserReg as { error: string }).error, "Username cannot be empty.", "Error message for empty username should be correct");

    console.log(`Action: register({ username: " ", password: "..." })`);
    const whitespaceUserReg = await concept.register({ username: " ", password: "password" });
    console.log("Result:", whitespaceUserReg);
    assertExists((whitespaceUserReg as { error: string }).error, "Registration with whitespace username should fail");
    assertEquals((whitespaceUserReg as { error: string }).error, "Username cannot be empty.", "Error message for whitespace username should be correct");

    console.log(`Action: register({ username: "user", password: "" })`);
    const emptyPassReg = await concept.register({ username: "someuser", password: "" });
    console.log("Result:", emptyPassReg);
    assertExists((emptyPassReg as { error: string }).error, "Registration with empty password should fail");
    assertEquals((emptyPassReg as { error: string }).error, "Password cannot be empty.", "Error message for empty password should be correct");

    console.log(`Action: authenticate({ username: "", password: "..." })`);
    const emptyUserAuth = await concept.authenticate({ username: "", password: "password" });
    console.log("Result:", emptyUserAuth);
    assertExists((emptyUserAuth as { error: string }).error, "Authentication with empty username should fail");
    assertEquals((emptyUserAuth as { error: string }).error, "Username cannot be empty.", "Error message for empty username should be correct");

    console.log(`Action: authenticate({ username: " ", password: "..." })`);
    const whitespaceUserAuth = await concept.authenticate({ username: " ", password: "password" });
    console.log("Result:", whitespaceUserAuth);
    assertExists((whitespaceUserAuth as { error: string }).error, "Authentication with whitespace username should fail");
    assertEquals((whitespaceUserAuth as { error: string }).error, "Username cannot be empty.", "Error message for whitespace username should be correct");

    console.log(`Action: authenticate({ username: "user", password: "" })`);
    const emptyPassAuth = await concept.authenticate({ username: "someuser", password: "" });
    console.log("Result:", emptyPassAuth);
    assertExists((emptyPassAuth as { error: string }).error, "Authentication with empty password should fail");
    assertEquals((emptyPassAuth as { error: string }).error, "Password cannot be empty.", "Error message for empty password should be correct");
  });

  await t.step("should treat usernames as case-sensitive", async () => {
    console.log("\n--- Scenario 4: Case-Sensitive Usernames ---");
    const usernameLower = "caseuser";
    const usernameUpper = "CaseUser";
    const password = "testPassword";

    console.log(`Action: register({ username: "${usernameLower}", password: "..." })`);
    const regLower = await concept.register({ username: usernameLower, password });
    console.log("Result:", regLower);
    assertExists((regLower as { user: ID }).user, "Registration for lowercase username should succeed");
    const idLower = (regLower as { user: ID }).user;

    console.log(`Action: register({ username: "${usernameUpper}", password: "..." })`);
    const regUpper = await concept.register({ username: usernameUpper, password });
    console.log("Result:", regUpper);
    assertExists((regUpper as { user: ID }).user, "Registration for uppercase username should succeed");
    const idUpper = (regUpper as { user: ID }).user;

    assertNotEquals(idLower, idUpper, "Different case usernames should result in different user IDs, implying case-sensitivity");

    console.log(`Action: authenticate({ username: "${usernameLower}", password: "..." })`);
    const authLower = await concept.authenticate({ username: usernameLower, password });
    console.log("Result:", authLower);
    assertEquals((authLower as { user: ID }).user, idLower, "Authentication with lowercase username should succeed");

    console.log(`Action: authenticate({ username: "${usernameUpper}", password: "..." })`);
    const authUpper = await concept.authenticate({ username: usernameUpper, password });
    console.log("Result:", authUpper);
    assertEquals((authUpper as { user: ID }).user, idUpper, "Authentication with uppercase username should succeed");

    console.log(`Action: authenticate({ username: "${usernameUpper}", password: "..." }) (with lowercase username, expecting failure)`);
    const authUpperWithLowerAttempt = await concept.authenticate({ username: usernameLower, password: password });
    console.log("Result:", authUpperWithLowerAttempt);
    assertExists((authUpperWithLowerAttempt as { error: string }).error, "Authentication with incorrect casing should fail");
    assertEquals((authUpperWithLowerAttempt as { error: string }).error, "Invalid username or password.", "Error message for incorrect username casing should be correct");
  });


  await client.close();
});
```
