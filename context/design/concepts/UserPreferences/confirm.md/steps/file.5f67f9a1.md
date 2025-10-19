---
timestamp: 'Sun Oct 19 2025 15:02:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_150217.f647a974.md]]'
content_id: 5f67f9a1ffd277a957490b82e60ca88973ed5e686d7011edd60b95a48b89dfd8
---

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
