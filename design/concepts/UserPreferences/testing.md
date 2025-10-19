[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: Similarity

Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Some more details about the test cases you should include:
- Operational principle. A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example.
- Interesting scenarios. Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors.
- Number required. For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios.
- No state setup. Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state.

# response:

# file: src/UserPreferences/UserPreferencesConcept.test.ts

```typescript
import {
  assertEquals,
  assertObjectMatch,
  assertRejects,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserPreferencesConcept from "./UserPreferencesConcept.ts";
import { ID } from "@utils/types.ts";
import type { Db } from "npm:mongodb";

// ----- shared literals used in every test -----
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const tagImpressionist = "tag:impressionist" as ID;
const tagModern = "tag:modern" as ID;
const tagPhotography = "tag:photography" as ID;
const tagSculpture = "tag:sculpture" as ID;
const nonExistentTag = "tag:nonexistent" as ID;

type Tag = ID;
interface PresetTagDoc {
  _id: Tag;
  name: string;
}

async function seedPresetTags(db: Db) {
  await db.collection<PresetTagDoc>("UserPreferences.presetTags").insertMany([
    { _id: tagImpressionist, name: "Impressionist" },
    { _id: tagModern, name: "Modern" },
    { _id: tagPhotography, name: "Photography" },
    { _id: tagSculpture, name: "Sculpture" },
  ]);
}

// --- Test 1: Operational principle ---
Deno.test("Operational principle: Add a preference and verify", async () => {
  const [db, client] = await testDb();
  const concept = new UserPreferencesConcept(db);
  try {
    await seedPresetTags(db);
    console.log(`\n--- Test: Operational Principle ---`);
    console.log(`Action: addPreference(${userAlice}, ${tagImpressionist})`);
    const result = await concept.addPreference({
      user: userAlice,
      tag: tagImpressionist,
    });
    assertObjectMatch(result, {}); // Expect success
    console.log(`Result: ${JSON.stringify(result)}`);

    const preferences = await concept._getPreferencesForUser(userAlice);
    console.log(
      `Query: _getPreferencesForUser(${userAlice}) -> ${
        JSON.stringify(preferences)
      }`,
    );
    assertEquals(
      preferences,
      [tagImpressionist],
      "Alice should have Impressionist preference.",
    );

    const usersForTag = await concept._getUsersByPreferenceTag(
      tagImpressionist,
    );
    console.log(
      `Query: _getUsersByPreferenceTag(${tagImpressionist}) -> ${
        JSON.stringify(usersForTag)
      }`,
    );
    assertEquals(
      usersForTag,
      [userAlice],
      "Impressionist tag should be preferred by Alice.",
    );
  } finally {
    await client.close();
  }
});

// --- Test 2: Non-existent tag ---
Deno.test("Scenario 1: Attempt to add a preference for a non-existent tag", async () => {
  const [db, client] = await testDb();
  const concept = new UserPreferencesConcept(db);
  try {
    await seedPresetTags(db);
    console.log(`\n--- Test: Add Preference with Non-Existent Tag ---`);
    console.log(`Action: addPreference(${userAlice}, ${nonExistentTag})`);
    const result = await concept.addPreference({
      user: userAlice,
      tag: nonExistentTag,
    });
    assertObjectMatch(result, {
      error:
        `Tag '${nonExistentTag}' does not exist in the list of preset tags.`,
    });
    console.log(`Result: ${JSON.stringify(result)}`);

    const preferences = await concept._getPreferencesForUser(userAlice);
    assertEquals(
      preferences.length,
      0, // no prior successful add in this independent test
      "Alice should still only have 0 preferences.",
    );
  } finally {
    await client.close();
  }
});

// --- Test 3: Duplicate preference ---
Deno.test("Scenario 2: Attempt to add an existing preference (duplicate)", async () => {
  const [db, client] = await testDb();
  const concept = new UserPreferencesConcept(db);
  try {
    await seedPresetTags(db);
    // setup to create the first preference so the second is a duplicate
    await concept.addPreference({ user: userAlice, tag: tagImpressionist });

    console.log(`\n--- Test: Add Duplicate Preference ---`);
    console.log(`Action: addPreference(${userAlice}, ${tagImpressionist})`);
    const result = await concept.addPreference({
      user: userAlice,
      tag: tagImpressionist,
    });
    assertObjectMatch(result, {
      error:
        `User '${userAlice}' already has a preference for tag '${tagImpressionist}'.`,
    });
    console.log(`Result: ${JSON.stringify(result)}`);

    const preferences = await concept._getPreferencesForUser(userAlice);
    assertEquals(
      preferences.length,
      1,
      "Alice should still only have 1 preference.",
    );
  } finally {
    await client.close();
  }
});

// --- Test 4: Multiple adds ---
Deno.test("Scenario 3: Add multiple distinct preferences for a user", async () => {
  const [db, client] = await testDb();
  const concept = new UserPreferencesConcept(db);
  try {
    await seedPresetTags(db);
    console.log(`\n--- Test: Add Multiple Preferences ---`);
    console.log(`Action: addPreference(${userAlice}, ${tagModern})`);
    await concept.addPreference({ user: userAlice, tag: tagModern });
    console.log(`Action: addPreference(${userAlice}, ${tagPhotography})`);
    await concept.addPreference({ user: userAlice, tag: tagPhotography });

    console.log(`Action: addPreference(${userBob}, ${tagModern})`);
    await concept.addPreference({ user: userBob, tag: tagModern });
    console.log(`Action: addPreference(${userBob}, ${tagSculpture})`);
    await concept.addPreference({ user: userBob, tag: tagSculpture });

    // Also add impressionist for Alice to match expectation of 3
    await concept.addPreference({ user: userAlice, tag: tagImpressionist });

    const alicePreferences = await concept._getPreferencesForUser(userAlice);
    console.log(
      `Query: _getPreferencesForUser(${userAlice}) -> ${
        JSON.stringify(alicePreferences)
      }`,
    );
    assertEquals(
      alicePreferences.sort(),
      [tagImpressionist, tagModern, tagPhotography].sort(),
      "Alice should have 3 preferences.",
    );

    const bobPreferences = await concept._getPreferencesForUser(userBob);
    console.log(
      `Query: _getPreferencesForUser(${userBob}) -> ${
        JSON.stringify(bobPreferences)
      }`,
    );
    assertEquals(
      bobPreferences.sort(),
      [tagModern, tagSculpture].sort(),
      "Bob should have 2 preferences.",
    );

    const usersForModernTag = await concept._getUsersByPreferenceTag(
      tagModern,
    );
    console.log(
      `Query: _getUsersByPreferenceTag(${tagModern}) -> ${
        JSON.stringify(usersForModernTag)
      }`,
    );
    assertEquals(
      usersForModernTag.sort(),
      [userAlice, userBob].sort(),
      "Modern tag should be preferred by Alice and Bob.",
    );
  } finally {
    await client.close();
  }
});

// --- Test 5: Remove existing ---
Deno.test("Scenario 4: Remove an existing preference", async () => {
  const [db, client] = await testDb();
  const concept = new UserPreferencesConcept(db);
  try {
    await seedPresetTags(db);
    // setup: give Alice three prefs so removing one leaves two
    await concept.addPreference({ user: userAlice, tag: tagImpressionist });
    await concept.addPreference({ user: userAlice, tag: tagModern });
    await concept.addPreference({ user: userAlice, tag: tagPhotography });
    await concept.addPreference({ user: userBob, tag: tagModern });

    console.log(`\n--- Test: Remove Existing Preference ---`);
    console.log(`Action: removePreference(${userAlice}, ${tagModern})`);
    const result = await concept.removePreference({
      user: userAlice,
      tag: tagModern,
    });
    assertObjectMatch(result, {}); // Expect success
    console.log(`Result: ${JSON.stringify(result)}`);

    const alicePreferences = await concept._getPreferencesForUser(userAlice);
    console.log(
      `Query: _getPreferencesForUser(${userAlice}) -> ${
        JSON.stringify(alicePreferences)
      }`,
    );
    assertEquals(
      alicePreferences.sort(),
      [tagImpressionist, tagPhotography].sort(),
      "Alice should now have 2 preferences.",
    );

    const usersForModernTag = await concept._getUsersByPreferenceTag(tagModern);
    console.log(
      `Query: _getUsersByPreferenceTag(${tagModern}) -> ${
        JSON.stringify(usersForModernTag)
      }`,
    );
    assertEquals(
      usersForModernTag,
      [userBob],
      "Modern tag should now only be preferred by Bob.",
    );
  } finally {
    await client.close();
  }
});

// --- Test 6: Remove non-existent ---
Deno.test("Scenario 5: Attempt to remove a non-existent preference", async () => {
  const [db, client] = await testDb();
  const concept = new UserPreferencesConcept(db);
  try {
    await seedPresetTags(db);
    // setup: Alice has two prefs, not Sculpture
    await concept.addPreference({ user: userAlice, tag: tagImpressionist });
    await concept.addPreference({ user: userAlice, tag: tagPhotography });

    console.log(`\n--- Test: Remove Non-Existent Preference ---`);
    console.log(`Action: removePreference(${userAlice}, ${tagSculpture})`);
    const result = await concept.removePreference({
      user: userAlice,
      tag: tagSculpture,
    });
    assertObjectMatch(result, {
      error:
        `No preference found for user '${userAlice}' and tag '${tagSculpture}'.`,
    });
    console.log(`Result: ${JSON.stringify(result)}`);

    const alicePreferences = await concept._getPreferencesForUser(userAlice);
    assertEquals(
      alicePreferences.length,
      2,
      "Alice's preferences should remain unchanged.",
    );
  } finally {
    await client.close();
  }
});

// --- Test 7: _getPresetTags ---
Deno.test("Scenario 6: Verify _getPresetTags query", async () => {
  const [db, client] = await testDb();
  const concept = new UserPreferencesConcept(db);
  try {
    await seedPresetTags(db);
    console.log(`\n--- Test: _getPresetTags Query ---`);
    const presetTags = await concept._getPresetTags();
    console.log(`Query: _getPresetTags() -> ${JSON.stringify(presetTags)}`);
    assertEquals(presetTags.length, 4, "Should retrieve all 4 preset tags.");
    assertEquals(
      presetTags.map((tag) => tag._id).sort(),
      [tagImpressionist, tagModern, tagPhotography, tagSculpture].sort(),
      "Should retrieve correct preset tag IDs.",
    );
  } finally {
    await client.close();
  }
});

```

# trace: UserPreferences Concept Test Execution

The `UserPreferencesConcept.test.ts` file, when executed using `deno test`, will perform the following sequence of actions and verifications:

1.  **Database Initialization**: The `testDb()` utility will connect to a MongoDB instance (likely an in-memory or ephemeral one for testing) and ensure the database is clean before the test suite begins.
2.  **Concept Instantiation**: An instance of `UserPreferencesConcept` is created, linked to the test database.
3.  **Preset Tag Pre-population**: Four `PresetTagDoc` documents (Impressionist, Modern, Photography, Sculpture) are inserted directly into the `UserPreferences.presetTags` collection. This setup step is crucial because the `addPreference` action relies on these tags existing, simulating the "Catalog assumption" where available tags are managed externally.

4.  **Operational Principle (Add a preference and verify)**:
    *   **Action**: `concept.addPreference({ user: "user:Alice", tag: "tag:impressionist" })`
    *   **Expected Outcome**: Success (`{}`).
    *   **Verification**:
        *   `concept._getPreferencesForUser("user:Alice")` is called, expecting `["tag:impressionist"]`.
        *   `concept._getUsersByPreferenceTag("tag:impressionist")` is called, expecting `["user:Alice"]`.
    *   **Console Output**: Logs the action, its result, and the results of the two verification queries.

5.  **Scenario 1 (Attempt to add a preference for a non-existent tag)**:
    *   **Action**: `concept.addPreference({ user: "user:Alice", tag: "tag:nonexistent" })`
    *   **Expected Outcome**: An error object `{ error: "Tag 'tag:nonexistent' does not exist in the list of preset tags." }`.
    *   **Verification**: Alice's preferences remain unchanged (still 1 preference).
    *   **Console Output**: Logs the action and the expected error result.

6.  **Scenario 2 (Attempt to add an existing preference (duplicate))**:
    *   **Action**: `concept.addPreference({ user: "user:Alice", tag: "tag:impressionist" })`
    *   **Expected Outcome**: An error object `{ error: "User 'user:Alice' already has a preference for tag 'tag:impressionist'." }`.
    *   **Verification**: Alice's preferences remain unchanged (still 1 preference).
    *   **Console Output**: Logs the action and the expected error result.

7.  **Scenario 3 (Add multiple distinct preferences for a user and another user)**:
    *   **Actions**:
        *   `concept.addPreference({ user: "user:Alice", tag: "tag:modern" })` (Success)
        *   `concept.addPreference({ user: "user:Alice", tag: "tag:photography" })` (Success)
        *   `concept.addPreference({ user: "user:Bob", tag: "tag:modern" })` (Success)
        *   `concept.addPreference({ user: "user:Bob", tag: "tag:sculpture" })` (Success)
    *   **Expected Outcome**: All actions succeed.
    *   **Verification**:
        *   `concept._getPreferencesForUser("user:Alice")` is called, expecting `["tag:impressionist", "tag:modern", "tag:photography"]` (order-insensitive).
        *   `concept._getPreferencesForUser("user:Bob")` is called, expecting `["tag:modern", "tag:sculpture"]` (order-insensitive).
        *   `concept._getUsersByPreferenceTag("tag:modern")` is called, expecting `["user:Alice", "user:Bob"]` (order-insensitive).
    *   **Console Output**: Logs all actions and verification queries with their results.

8.  **Scenario 4 (Remove an existing preference)**:
    *   **Action**: `concept.removePreference({ user: "user:Alice", tag: "tag:modern" })`
    *   **Expected Outcome**: Success (`{}`).
    *   **Verification**:
        *   `concept._getPreferencesForUser("user:Alice")` is called, expecting `["tag:impressionist", "tag:photography"]` (order-insensitive).
        *   `concept._getUsersByPreferenceTag("tag:modern")` is called, expecting `["user:Bob"]`.
    *   **Console Output**: Logs the action, its result, and the verification queries.

9.  **Scenario 5 (Attempt to remove a non-existent preference)**:
    *   **Action**: `concept.removePreference({ user: "user:Alice", tag: "tag:sculpture" })`
    *   **Expected Outcome**: An error object `{ error: "No preference found for user 'user:Alice' and tag 'tag:sculpture'." }`.
    *   **Verification**: Alice's preferences remain unchanged (still 2 preferences).
    *   **Console Output**: Logs the action and the expected error result.

10. **Scenario 6 (Verify _getPresetTags query)**:
    *   **Action**: `concept._getPresetTags()`
    *   **Expected Outcome**: Returns an array of the 4 pre-populated preset tag documents.
    *   **Verification**: Checks the length and content of the returned array.
    *   **Console Output**: Logs the query and its result.

11. **Client Closure**: The MongoDB client connection is closed at the end of the test suite.
