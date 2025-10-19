---
timestamp: 'Sat Oct 18 2025 19:40:06 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_194006.5f095939.md]]'
content_id: f3a3c8a454717264f82e0a3abf4a405b4979b77dacfb05aa81bc8e3eab493c96
---

# file: src/UserPreferences/UserPreferencesConcept.test.ts

```typescript
import { assertEquals, assertObjectMatch, assertRejects } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts";
import UserPreferencesConcept from "./UserPreferencesConcept.ts";
import { ID } from "../../utils/types.ts";

Deno.test("UserPreferencesConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new UserPreferencesConcept(db);

  // Define some test IDs
  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const tagImpressionist = "tag:impressionist" as ID;
  const tagModern = "tag:modern" as ID;
  const tagPhotography = "tag:photography" as ID;
  const tagSculpture = "tag:sculpture" as ID;
  const nonExistentTag = "tag:nonexistent" as ID;

  // Pre-populate preset tags required for addPreference preconditions
  // This simulates the "Catalog assumption" for tags, as they are not managed by UserPreferences actions
  await db.collection("UserPreferences.presetTags").insertMany([
    { _id: tagImpressionist, name: "Impressionist" },
    { _id: tagModern, name: "Modern" },
    { _id: tagPhotography, name: "Photography" },
    { _id: tagSculpture, name: "Sculpture" },
  ]);
  console.log("Setup: Preset tags pre-populated.");

  await t.step("Operational principle: Add a preference and verify", async () => {
    console.log(`\n--- Test: Operational Principle ---`);
    console.log(`Action: addPreference(${userAlice}, ${tagImpressionist})`);
    const result = await concept.addPreference({ user: userAlice, tag: tagImpressionist });
    assertObjectMatch(result, {}); // Expect success
    console.log(`Result: ${JSON.stringify(result)}`);

    const preferences = await concept._getPreferencesForUser(userAlice);
    console.log(`Query: _getPreferencesForUser(${userAlice}) -> ${JSON.stringify(preferences)}`);
    assertEquals(preferences, [tagImpressionist], "Alice should have Impressionist preference.");

    const usersForTag = await concept._getUsersByPreferenceTag(tagImpressionist);
    console.log(`Query: _getUsersByPreferenceTag(${tagImpressionist}) -> ${JSON.stringify(usersForTag)}`);
    assertEquals(usersForTag, [userAlice], "Impressionist tag should be preferred by Alice.");
  });

  await t.step("Scenario 1: Attempt to add a preference for a non-existent tag", async () => {
    console.log(`\n--- Test: Add Preference with Non-Existent Tag ---`);
    console.log(`Action: addPreference(${userAlice}, ${nonExistentTag})`);
    const result = await concept.addPreference({ user: userAlice, tag: nonExistentTag });
    assertObjectMatch(result, { error: `Tag '${nonExistentTag}' does not exist in the list of preset tags.` });
    console.log(`Result: ${JSON.stringify(result)}`);

    const preferences = await concept._getPreferencesForUser(userAlice);
    assertEquals(preferences.length, 1, "Alice should still only have 1 preference.");
  });

  await t.step("Scenario 2: Attempt to add an existing preference (duplicate)", async () => {
    console.log(`\n--- Test: Add Duplicate Preference ---`);
    console.log(`Action: addPreference(${userAlice}, ${tagImpressionist})`);
    const result = await concept.addPreference({ user: userAlice, tag: tagImpressionist });
    assertObjectMatch(result, { error: `User '${userAlice}' already has a preference for tag '${tagImpressionist}'.` });
    console.log(`Result: ${JSON.stringify(result)}`);

    const preferences = await concept._getPreferencesForUser(userAlice);
    assertEquals(preferences.length, 1, "Alice should still only have 1 preference.");
  });

  await t.step("Scenario 3: Add multiple distinct preferences for a user", async () => {
    console.log(`\n--- Test: Add Multiple Preferences ---`);
    console.log(`Action: addPreference(${userAlice}, ${tagModern})`);
    await concept.addPreference({ user: userAlice, tag: tagModern });
    console.log(`Action: addPreference(${userAlice}, ${tagPhotography})`);
    await concept.addPreference({ user: userAlice, tag: tagPhotography });

    console.log(`Action: addPreference(${userBob}, ${tagModern})`);
    await concept.addPreference({ user: userBob, tag: tagModern });
    console.log(`Action: addPreference(${userBob}, ${tagSculpture})`);
    await concept.addPreference({ user: userBob, tag: tagSculpture });

    const alicePreferences = await concept._getPreferencesForUser(userAlice);
    console.log(`Query: _getPreferencesForUser(${userAlice}) -> ${JSON.stringify(alicePreferences)}`);
    assertEquals(alicePreferences.sort(), [tagImpressionist, tagModern, tagPhotography].sort(), "Alice should have 3 preferences.");

    const bobPreferences = await concept._getPreferencesForUser(userBob);
    console.log(`Query: _getPreferencesForUser(${userBob}) -> ${JSON.stringify(bobPreferences)}`);
    assertEquals(bobPreferences.sort(), [tagModern, tagSculpture].sort(), "Bob should have 2 preferences.");

    const usersForModernTag = await concept._getUsersByPreferenceTag(tagModern);
    console.log(`Query: _getUsersByPreferenceTag(${tagModern}) -> ${JSON.stringify(usersForModernTag)}`);
    assertEquals(usersForModernTag.sort(), [userAlice, userBob].sort(), "Modern tag should be preferred by Alice and Bob.");
  });

  await t.step("Scenario 4: Remove an existing preference", async () => {
    console.log(`\n--- Test: Remove Existing Preference ---`);
    console.log(`Action: removePreference(${userAlice}, ${tagModern})`);
    const result = await concept.removePreference({ user: userAlice, tag: tagModern });
    assertObjectMatch(result, {}); // Expect success
    console.log(`Result: ${JSON.stringify(result)}`);

    const alicePreferences = await concept._getPreferencesForUser(userAlice);
    console.log(`Query: _getPreferencesForUser(${userAlice}) -> ${JSON.stringify(alicePreferences)}`);
    assertEquals(alicePreferences.sort(), [tagImpressionist, tagPhotography].sort(), "Alice should now have 2 preferences.");

    const usersForModernTag = await concept._getUsersByPreferenceTag(tagModern);
    console.log(`Query: _getUsersByPreferenceTag(${tagModern}) -> ${JSON.stringify(usersForModernTag)}`);
    assertEquals(usersForModernTag, [userBob], "Modern tag should now only be preferred by Bob.");
  });

  await t.step("Scenario 5: Attempt to remove a non-existent preference", async () => {
    console.log(`\n--- Test: Remove Non-Existent Preference ---`);
    console.log(`Action: removePreference(${userAlice}, ${tagSculpture})`);
    const result = await concept.removePreference({ user: userAlice, tag: tagSculpture });
    assertObjectMatch(result, { error: `No preference found for user '${userAlice}' and tag '${tagSculpture}'.` });
    console.log(`Result: ${JSON.stringify(result)}`);

    const alicePreferences = await concept._getPreferencesForUser(userAlice);
    assertEquals(alicePreferences.length, 2, "Alice's preferences should remain unchanged.");
  });

  await t.step("Scenario 6: Verify _getPresetTags query", async () => {
    console.log(`\n--- Test: _getPresetTags Query ---`);
    const presetTags = await concept._getPresetTags();
    console.log(`Query: _getPresetTags() -> ${JSON.stringify(presetTags)}`);
    assertEquals(presetTags.length, 4, "Should retrieve all 4 preset tags.");
    assertEquals(presetTags.map(tag => tag._id).sort(), [tagImpressionist, tagModern, tagPhotography, tagSculpture].sort(), "Should retrieve correct preset tag IDs.");
  });

  await client.close();
});
```
