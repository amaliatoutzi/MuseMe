---
timestamp: 'Sun Oct 19 2025 13:59:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_135931.f848e3b7.md]]'
content_id: a2b3a826b9a7c188580c6bf3a38e814376fbf1b4f708b5ecd273a07846238053
---

# file: src/concepts/UserAuthenticationConcept.test.ts

```typescript
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";
import { MongoClient } from "npm:mongodb"; // Import MongoClient for closing

// --- Test for Operational Principle ---
Deno.test("UserAuthenticationConcept: Operational Principle (Register and Authenticate)", async () => {
  console.log("\n--- Operational Principle Test ---");
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  try {
    const username = "principleUser";
    const password = "principlePassword123";

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

  } finally {
    await client.close();
  }
});

// --- Interesting Scenarios ---

Deno.test("UserAuthenticationConcept: Prevent duplicate username registration", async () => {
  console.log("\n--- Scenario 1: Duplicate Username Registration ---");
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  try {
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

  } finally {
    await client.close();
  }
});

Deno.test("UserAuthenticationConcept: Handle multiple successful registrations and authentications", async () => {
  console.log("\n--- Scenario 2: Multiple Users ---");
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  try {
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

  } finally {
    await client.close();
  }
});

Deno.test("UserAuthenticationConcept: Reject empty or whitespace credentials", async () => {
  console.log("\n--- Scenario 3: Empty/Whitespace Credentials ---");
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  try {
    // Registration with empty username
    console.log(`Action: register({ username: "", password: "..." })`);
    const emptyUserReg = await concept.register({ username: "", password: "password" });
    console.log("Result:", emptyUserReg);
    assertExists((emptyUserReg as { error: string }).error, "Registration with empty username should fail");
    assertEquals((emptyUserReg as { error: string }).error, "Username cannot be empty.", "Error message for empty username should be correct");

    // Registration with whitespace username
    console.log(`Action: register({ username: " ", password: "..." })`);
    const whitespaceUserReg = await concept.register({ username: " ", password: "password" });
    console.log("Result:", whitespaceUserReg);
    assertExists((whitespaceUserReg as { error: string }).error, "Registration with whitespace username should fail");
    assertEquals((whitespaceUserReg as { error: string }).error, "Username cannot be empty.", "Error message for whitespace username should be correct");

    // Registration with empty password
    console.log(`Action: register({ username: "someuser", password: "" })`);
    const emptyPassReg = await concept.register({ username: "someuser", password: "" });
    console.log("Result:", emptyPassReg);
    assertExists((emptyPassReg as { error: string }).error, "Registration with empty password should fail");
    assertEquals((emptyPassReg as { error: string }).error, "Password cannot be empty.", "Error message for empty password should be correct");

    // Authentication with empty username
    console.log(`Action: authenticate({ username: "", password: "..." })`);
    const emptyUserAuth = await concept.authenticate({ username: "", password: "password" });
    console.log("Result:", emptyUserAuth);
    assertExists((emptyUserAuth as { error: string }).error, "Authentication with empty username should fail");
    assertEquals((emptyUserAuth as { error: string }).error, "Username cannot be empty.", "Error message for empty username should be correct");

    // Authentication with whitespace username
    console.log(`Action: authenticate({ username: " ", password: "..." })`);
    const whitespaceUserAuth = await concept.authenticate({ username: " ", password: "password" });
    console.log("Result:", whitespaceUserAuth);
    assertExists((whitespaceUserAuth as { error: string }).error, "Authentication with whitespace username should fail");
    assertEquals((whitespaceUserAuth as { error: string }).error, "Username cannot be empty.", "Error message for whitespace username should be correct");

    // Authentication with empty password
    console.log(`Action: authenticate({ username: "user", password: "" })`);
    const emptyPassAuth = await concept.authenticate({ username: "user", password: "" });
    console.log("Result:", emptyPassAuth);
    assertExists((emptyPassAuth as { error: string }).error, "Authentication with empty password should fail");
    assertEquals((emptyPassAuth as { error: string }).error, "Password cannot be empty.", "Error message for empty password should be correct");

  } finally {
    await client.close();
  }
});

Deno.test("UserAuthenticationConcept: Usernames are case-sensitive", async () => {
  console.log("\n--- Scenario 4: Case-Sensitive Usernames ---");
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  try {
    const username = "caseUser"; // Register with mixed case
    const password = "testPassword";
    const incorrectCasingUsername = "caseuser"; // Attempt to authenticate with different casing

    console.log(`Action: register({ username: "${username}", password: "..." })`);
    const regResult = await concept.register({ username, password });
    console.log("Result:", regResult);
    assertExists((regResult as { user: ID }).user, "Registration should succeed for the given username");
    const registeredId = (regResult as { user: ID }).user;

    console.log(`Action: authenticate({ username: "${username}", password: "..." }) (Correct casing)`);
    const authCorrectCasing = await concept.authenticate({ username, password });
    console.log("Result:", authCorrectCasing);
    assertEquals((authCorrectCasing as { user: ID }).user, registeredId, "Authentication with correct casing should succeed");

    console.log(`Action: authenticate({ username: "${incorrectCasingUsername}", password: "..." }) (Incorrect casing, expecting failure)`);
    const authIncorrectCasing = await concept.authenticate({ username: incorrectCasingUsername, password });
    console.log("Result:", authIncorrectCasing);
    assertExists((authIncorrectCasing as { error: string }).error, "Authentication with incorrect casing should fail");
    assertEquals((authIncorrectCasing as { error: string }).error, "Invalid username or password.", "Error message for incorrect username casing should be generic 'Invalid username or password'.");

  } finally {
    await client.close();
  }
});

Deno.test("UserAuthenticationConcept: Usernames cannot contain leading/trailing spaces", async () => {
  console.log("\n--- Scenario 5: Usernames with leading/trailing spaces ---");
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  try {
    const usernameWithSpaces = "  userWithSpaces  ";
    const usernameTrimmed = "userWithSpaces";
    const password = "testPassword1";

    console.log(`Action: register({ username: "${usernameWithSpaces}", password: "..." })`);
    const regResult = await concept.register({ username: usernameWithSpaces, password });
    console.log("Result:", regResult);
    assertExists((regResult as { error: string }).error, "Registration with leading/trailing spaces should fail");
    assertEquals((regResult as { error: string }).error, "Username cannot be empty.", "Error message for username with only spaces should be 'Username cannot be empty.'"); // Our implementation treats trimmed empty as empty

    // Register a valid user
    console.log(`Action: register({ username: "${usernameTrimmed}", password: "..." })`);
    const validReg = await concept.register({ username: usernameTrimmed, password });
    console.log("Result:", validReg);
    assertExists((validReg as { user: ID }).user, "Valid username registration should succeed");
    const validUserId = (validReg as { user: ID }).user;

    // Attempt to authenticate with leading/trailing spaces against the valid user
    console.log(`Action: authenticate({ username: "${usernameWithSpaces}", password: "..." })`);
    const authWithSpaces = await concept.authenticate({ username: usernameWithSpaces, password });
    console.log("Result:", authWithSpaces);
    assertExists((authWithSpaces as { error: string }).error, "Authentication with leading/trailing spaces should fail");
    assertEquals((authWithSpaces as { error: string }).error, "Username cannot be empty.", "Error message for username with only spaces during auth should be 'Username cannot be empty.'"); // Our implementation treats trimmed empty as empty

    // Authenticate with the correctly trimmed username
    console.log(`Action: authenticate({ username: "${usernameTrimmed}", password: "..." })`);
    const authTrimmed = await concept.authenticate({ username: usernameTrimmed, password });
    console.log("Result:", authTrimmed);
    assertExists((authTrimmed as { user: ID }).user, "Authentication with trimmed username should succeed");
    assertEquals((authTrimmed as { user: ID }).user, validUserId, "Authenticated user ID should match for trimmed username");

  } finally {
    await client.close();
  }
});
```
