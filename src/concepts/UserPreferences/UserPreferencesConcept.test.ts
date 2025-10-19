// src/UserPreferences/UserPreferencesConcept.test.ts
import {
  assertEquals,
  assertObjectMatch,
  // assertRejects, // assertRejects is no longer strictly needed as concept returns errors as objects.
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserPreferencesConcept from "./UserPreferencesConcept.ts";
import { ID } from "@utils/types.ts";
// Removed: import type { Db } from "npm:mongodb";

// ----- shared literals used in every test -----
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
// These tags are now *assumed* to be valid IDs by the UserPreferences concept itself.
// Their actual existence and validity would be checked by an external synchronization layer.
const tagImpressionist = "tag:impressionist" as ID;
const tagModern = "tag:modern" as ID;
const tagPhotography = "tag:photography" as ID;
const tagSculpture = "tag:sculpture" as ID;

// The concept no longer validates tag existence, so this ID will be treated like any other.
// Validation for its 'existence' would be external.
const nonExistentTag = "tag:nonexistent" as ID;

// REMOVED: PresetTagDoc interface and seedPresetTags function.
// The UserPreferences concept no longer manages PresetTags or requires seeding them internally.

// --- Test 1: Operational principle (Add a preference and verify) ---
// This test remains valid as it covers the core functionality of adding a preference.
Deno.test("Operational principle: Add a preference and verify", async () => {
  const [db, client] = await testDb();
  const concept = new UserPreferencesConcept(db);
  try {
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

// REMOVED: Test for "Attempt to add a preference for a non-existent tag" (Original Scenario 1).
// This validation is now external to the UserPreferences concept.
// If we were to include it, the concept's action would *succeed* in adding it, as it no longer validates tag existence.

// --- Test 2: Attempt to add an existing preference (duplicate) ---
// Renumbered from Scenario 2. This test remains valid as it checks the concept's internal "not present" precondition.
Deno.test("Scenario 1: Attempt to add an existing preference (duplicate)", async () => {
  const [db, client] = await testDb();
  const concept = new UserPreferencesConcept(db);
  try {
    // Setup: create the first preference so the second is a duplicate
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

// --- Test 3: Add multiple distinct preferences for a user ---
// Renumbered from Scenario 3. This test remains valid, covering multiple adds and query checks.
Deno.test("Scenario 2: Add multiple distinct preferences for a user", async () => {
  const [db, client] = await testDb();
  const concept = new UserPreferencesConcept(db);
  try {
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

// --- Test 4: Remove an existing preference ---
// Renumbered from Scenario 4. This test remains valid.
Deno.test("Scenario 3: Remove an existing preference", async () => {
  const [db, client] = await testDb();
  const concept = new UserPreferencesConcept(db);
  try {
    // Setup: give Alice three prefs so removing one leaves two
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

// --- Test 5: Attempt to remove a non-existent preference ---
// Renumbered from Scenario 5. This test remains valid as it checks the concept's internal "exists" precondition.
Deno.test("Scenario 4: Attempt to remove a non-existent preference", async () => {
  const [db, client] = await testDb();
  const concept = new UserPreferencesConcept(db);
  try {
    // Setup: Alice has two prefs, but not Sculpture
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

// REMOVED: Test for "_getPresetTags query" (Original Scenario 6/7).
// This query is no longer part of the concept.
