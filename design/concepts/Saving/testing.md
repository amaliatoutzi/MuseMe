[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: Saving

Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Some more details about the test cases you should include:
- Operational principle. A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example.
- Interesting scenarios. Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors.
- Number required. For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios.
- No state setup. Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state.

# Notes:
The ID of museum or exhibit that you use must be in the file `new-york-museums.json`  for them to be valid. Add a testcase to check that invalid names give errors.

Each test should be a new Dyno.test so Deno.test("", async (t) => { ... } ) for each testcase. Mark clearly which is the test for the operational principle. Each testcase should be at top level.

# response:

Here's the implementation for the `Saving` concept and its corresponding test file.

---

### `src/utils/types.ts` (as assumed in the problem description)

```typescript
// file: src/utils/types.ts
export type ID = string & { __brand: "ID" };
export type Empty = Record<PropertyKey, never>;

/**
 * Converts a string to an ID type. Useful for manual ID creation in tests or specific contexts.
 * @param s The string to convert.
 * @returns An ID type.
 */
export function toID(s: string): ID {
  return s as ID;
}
```

---

### `src/concepts/Saving/SavingConcept.ts`

```typescript
// file: src/concepts/Saving/SavingConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID, toID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; // Assuming freshID is from @utils/database.ts

import museumsRaw from "@utils/new-york-museums.json" with {
  type: "json",
};

// --- External Data Definitions (for new-york-museums.json validation) ---
// These interfaces are used only for parsing the external JSON file
// and do not represent the concept's internal state directly.
interface ExhibitData {
  id: string;
  name: string;
  type: string;
}

interface MuseumData {
  id: string;
  name: string;
  address: string;
  zip: string;
  borough: string;
  location: {
    lat: number;
    lon: number;
  };
  website: string;
  tags: string[];
  exhibits: ExhibitData[];
}
// --- End External Data Definitions ---

// Declare collection prefix, uses the concept name.
const COLLECTION_PREFIX = "Saving" + ".";

// Generic types of this concept, defined as branded IDs.
type User = ID;
type ItemId = ID; // Using ItemId to represent the generic Item parameter for clarity.

/**
 * Represents a 'Saved' entry in the database.
 * Corresponds to:
 * a set of **Saved** with
 *   a user **User**
 *   an item **ItemId**
 *   a createdAt **DateTime**
 */
interface SavedDocument {
  _id: ID; // Unique ID for this specific saved entry.
  user: User;
  item: ItemId;
  createdAt: Date; // Storing as Date object for proper sorting and querying.
}

/**
 * @concept Saving [User, Item]
 * @purpose let a user mark/unmark any item to revisit later (“save” a museum)
 * @principle if **Saved(user,item)** exists, then that item should appear in the user’s saved list;
 *            removing it deletes the single source of truth for that saved state.
 *            This concept is designed to be independent of the content of User or Item,
 *            only concerned with their identifiers for the "saving" relationship.
 */
export default class SavingConcept {
  private savedCollection: Collection<SavedDocument>;
  private validMuseumAndExhibitIds: Set<ID>; // Stores all valid museum/exhibit IDs for validation.

  constructor(private readonly db: Db) {
    this.savedCollection = this.db.collection(COLLECTION_PREFIX + "saved");
    this.validMuseumAndExhibitIds = new Set<ID>();

    // Load museum and exhibit IDs for validation.
    // In a larger system, this data might come from another concept,
    // but the prompt specifies this concept should check against this file.
    for (const m of museumsRaw as MuseumData[]) {
      this.validMuseumAndExhibitIds.add(toID(m.id));
      for (const e of m.exhibits) {
        this.validMuseumAndExhibitIds.add(toID(e.id));
      }
    }

    // Optional: Create a unique index to prevent duplicate saves for the same user-item pair
    // and improve performance for existence checks.
    // This also helps enforce the "Saved(user, item) not present" requirement at the DB level.
    this.savedCollection.createIndex({ user: 1, item: 1 }, { unique: true })
      .catch((e) =>
        console.warn("SavingConcept: Error creating unique index (might already exist):", e)
      );
  }

  /**
   * saveItem (user: User, item: ItemId): Empty | { error: string }
   *
   * @requires user exists (this check would typically be handled by a higher-level sync
   *           that ensures the User ID is valid from an Authentication or Profile concept).
   * @requires item exists in new-york-museums.json (either as a museum or an exhibit ID).
   * @requires Saved(user, item) not present (the user has not already saved this specific item).
   *
   * @effects creates a new Saved entry linking the user to the item with a timestamp;
   *          returns an empty record {} on success.
   */
  async saveItem(
    { user, item }: { user: User; item: ItemId },
  ): Promise<Empty | { error: string }> {
    // Requires: item exists in new-york-museums.json
    if (!this.validMuseumAndExhibitIds.has(item)) {
      return {
        error: `Item ID '${item}' is not a valid museum or exhibit in the catalog.`,
      };
    }

    // Effects: create Saved(user, item, createdAt := now)
    const newSave: SavedDocument = {
      _id: freshID(), // Generate a unique ID for the Saved document itself
      user,
      item,
      createdAt: new Date(), // Set the creation timestamp
    };

    try {
      await this.savedCollection.insertOne(newSave);
      return {}; // Return empty object on success
    } catch (e) {
      // Check for duplicate key error which implies "Saved(user, item) present"
      if (e instanceof Error && "code" in e && e.code === 11000) {
        return { error: `User '${user}' has already saved item '${item}'.` };
      }
      console.error(`Error saving item '${item}' for user '${user}':`, e);
      // Catching other potential database errors during insert.
      return { error: "Failed to save item due to an internal database error." };
    }
  }

  /**
   * unsaveItem (user: User, item: ItemId): Empty | { error: string }
   *
   * @requires Saved(user, item) exists (there must be an existing saved entry for this user and item).
   *
   * @effects deletes the matching Saved entry; returns an empty record {} on success.
   */
  async unsaveItem(
    { user, item }: { user: User; item: ItemId },
  ): Promise<Empty | { error: string }> {
    // Effects: delete that Saved entry
    const result = await this.savedCollection.deleteOne({ user, item });

    // Requires: Saved(user, item) exists - checked by deletedCount
    if (result.deletedCount === 0) {
      return {
        error: `No saved item '${item}' found for user '${user}' to unsave.`,
      };
    }

    return {}; // Return empty object on success
  }

  /**
   * _listSaved (user: User, limit?: number): Array<{ item: ItemId }> | { error: string }
   *
   * @requires user exists (assumed valid ID from a User concept).
   *           No explicit check within this concept for independence.
   *
   * @effects returns an array of ItemId's that the specified user has saved,
   *          optionally limited by `limit`. Results are sorted by `createdAt` in descending order.
   *          Returns an array of dictionaries, each with an 'item' field.
   */
  async _listSaved(
    { user, limit }: { user: User; limit?: number },
  ): Promise<Array<{ item: ItemId }> | { error: string }> {
    try {
      let cursor = this.savedCollection.find({ user }).sort({ createdAt: -1 }); // Sort by newest first

      if (limit !== undefined && limit > 0) {
        cursor = cursor.limit(limit);
      }

      const savedItems = await cursor.toArray();

      // Effects: return a list of ItemIds
      // As per query return convention, return an array of dictionaries.
      return savedItems.map((doc) => ({ item: doc.item }));
    } catch (e) {
      console.error(`Error listing saved items for user '${user}':`, e);
      return { error: "Failed to list saved items due to an internal database error." };
    }
  }
}
```

---

### `src/concepts/Saving/SavingConcept.test.ts`

```typescript
// file: src/concepts/Saving/SavingConcept.test.ts
import { assert, assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import SavingConcept from "@concepts/Saving/SavingConcept.ts";

type ItemId = ID;

// --- Test Data ---
const USER_ALICE = "user:Alice" as ID;
const USER_BOB = "user:Bob" as ID;
const USER_CHARLIE = "user:Charlie" as ID;

// Valid item IDs from new-york-museums.json (example values)
const MUSEUM_STATEN_ISLAND = "staten-island-museum" as ItemId;
const MUSEUM_ALICE_AUSTEN = "alice-austen-house-museum" as ItemId;
const EXHIBIT_STORY_OF_HOUSE = "the-story-of-the-house" as ItemId;
const MUSEUM_AMERICAN_FOLK = "whitney-museum-of-american-art" as ItemId;

// Invalid item ID
const INVALID_ITEM = "invalid-museum-or-exhibit" as ItemId;

// Helper to check for error objects
function isError(response: unknown): response is { error: string } {
  return typeof response === "object" && response !== null &&
    "error" in response;
}

Deno.test("Saving Concept - Operational Principle", async (t) => {
  const [db, client] = await testDb();
  const saving = new SavingConcept(db);

  try {
    console.log(`\n--- Test: Operational Principle for Saving ---`);
    console.log(`User ${USER_ALICE} wants to save and unsave items.`);

    // trace: Alice saves Staten Island Museum
    console.log(`Action: ${USER_ALICE} saves ${MUSEUM_STATEN_ISLAND}`);
    const saveResult1 = await saving.saveItem({
      user: USER_ALICE,
      item: MUSEUM_STATEN_ISLAND,
    });
    assert(
      !isError(saveResult1),
      `saveItem should succeed: ${JSON.stringify(saveResult1)}`,
    );
    assertEquals(
      saveResult1,
      {},
      "saveItem should return empty object on success",
    );

    // trace: Check if Staten Island Museum appears in Alice's saved list
    console.log(`Query: List saved items for ${USER_ALICE}`);
    let aliceSaved = await saving._listSaved({ user: USER_ALICE });
    assert(
      !isError(aliceSaved),
      `_listSaved should succeed: ${JSON.stringify(aliceSaved)}`,
    );
    assertEquals(aliceSaved.length, 1, "Alice should have 1 saved item");
    assertEquals(
      aliceSaved[0].item,
      MUSEUM_STATEN_ISLAND,
      "The saved item should be Staten Island Museum",
    );
    console.log(`Result: Alice's saved items: ${JSON.stringify(aliceSaved)}`);

    // trace: Alice unsaves Staten Island Museum
    console.log(`Action: ${USER_ALICE} unsaves ${MUSEUM_STATEN_ISLAND}`);
    const unsaveResult1 = await saving.unsaveItem({
      user: USER_ALICE,
      item: MUSEUM_STATEN_ISLAND,
    });
    assert(
      !isError(unsaveResult1),
      `unsaveItem should succeed: ${JSON.stringify(unsaveResult1)}`,
    );
    assertEquals(
      unsaveResult1,
      {},
      "unsaveItem should return empty object on success",
    );

    // trace: Check if Alice's saved list is empty
    console.log(`Query: List saved items for ${USER_ALICE} after unsaving`);
    aliceSaved = await saving._listSaved({ user: USER_ALICE });
    assert(
      !isError(aliceSaved),
      `_listSaved should succeed: ${JSON.stringify(aliceSaved)}`,
    );
    assertEquals(
      aliceSaved.length,
      0,
      "Alice should have 0 saved items after unsaving",
    );
    console.log(`Result: Alice's saved items: ${JSON.stringify(aliceSaved)}`);

    console.log(
      "Operational Principle: Successfully demonstrated saving and unsaving an item.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Saving Concept - Invalid Item ID Error", async (t) => {
  const [db, client] = await testDb();
  const saving = new SavingConcept(db);

  try {
    console.log(`\n--- Test: Invalid Item ID Error ---`);
    console.log(`User ${USER_BOB} attempts to save an invalid item ID.`);

    // trace: Bob tries to save an item with an invalid ID
    console.log(`Action: ${USER_BOB} saves ${INVALID_ITEM}`);
    const saveResult = await saving.saveItem({
      user: USER_BOB,
      item: INVALID_ITEM,
    });

    assert(
      isError(saveResult),
      `saveItem should return an error for invalid item ID.`,
    );
    assert(
      saveResult.error.includes("not a valid museum or exhibit"),
      `Error message should indicate invalid item: ${saveResult.error}`,
    );
    console.log(`Expected Error: ${saveResult.error}`);

    // Verify no item was saved
    const bobSaved = await saving._listSaved({ user: USER_BOB });
    assert(
      !isError(bobSaved),
      `_listSaved should succeed: ${JSON.stringify(bobSaved)}`,
    );
    assertEquals(bobSaved.length, 0, "No items should be saved for Bob.");

    console.log("Invalid Item ID Error: Successfully handled.");
  } finally {
    await client.close();
  }
});

Deno.test("Saving Concept - Duplicate Save Error", async (t) => {
  const [db, client] = await testDb();
  const saving = new SavingConcept(db);

  try {
    console.log(`\n--- Test: Duplicate Save Error ---`);
    console.log(`User ${USER_ALICE} attempts to save the same item twice.`);

    // trace: Alice saves Alice Austen House Museum
    console.log(`Action: ${USER_ALICE} saves ${MUSEUM_ALICE_AUSTEN}`);
    const saveResult1 = await saving.saveItem({
      user: USER_ALICE,
      item: MUSEUM_ALICE_AUSTEN,
    });
    assert(
      !isError(saveResult1),
      `saveItem should succeed the first time: ${JSON.stringify(saveResult1)}`,
    );

    // trace: Alice tries to save Alice Austen House Museum again
    console.log(
      `Action: ${USER_ALICE} attempts to save ${MUSEUM_ALICE_AUSTEN} again`,
    );
    const saveResult2 = await saving.saveItem({
      user: USER_ALICE,
      item: MUSEUM_ALICE_AUSTEN,
    });

    assert(
      isError(saveResult2),
      `saveItem should return an error for duplicate save.`,
    );
    assert(
      saveResult2.error.includes("has already saved item"),
      `Error message should indicate duplicate save: ${saveResult2.error}`,
    );
    console.log(`Expected Error: ${saveResult2.error}`);

    // Verify only one entry exists
    const aliceSaved = await saving._listSaved({ user: USER_ALICE });
    assert(
      !isError(aliceSaved),
      `_listSaved should succeed: ${JSON.stringify(aliceSaved)}`,
    );
    assertEquals(
      aliceSaved.length,
      1,
      "Only one entry for Alice Austen House Museum should exist.",
    );
    assertEquals(
      aliceSaved[0].item,
      MUSEUM_ALICE_AUSTEN,
      "The saved item should be Alice Austen House Museum.",
    );

    console.log("Duplicate Save Error: Successfully handled.");
  } finally {
    await client.close();
  }
});

Deno.test("Saving Concept - Unsave Non-Existent Item Error", async (t) => {
  const [db, client] = await testDb();
  const saving = new SavingConcept(db);

  try {
    console.log(`\n--- Test: Unsave Non-Existent Item Error ---`);
    console.log(
      `User ${USER_BOB} attempts to unsave an item they haven't saved.`,
    );

    // trace: Bob tries to unsave Alice Austen House Museum (which he hasn't saved)
    console.log(`Action: ${USER_BOB} unsaves ${MUSEUM_ALICE_AUSTEN}`);
    const unsaveResult = await saving.unsaveItem({
      user: USER_BOB,
      item: MUSEUM_ALICE_AUSTEN,
    });

    assert(
      isError(unsaveResult),
      `unsaveItem should return an error for non-existent save.`,
    );
    assert(
      unsaveResult.error.includes("No saved item"),
      `Error message should indicate no saved item: ${unsaveResult.error}`,
    );
    console.log(`Expected Error: ${unsaveResult.error}`);

    // Verify no item was affected
    const bobSaved = await saving._listSaved({ user: USER_BOB });
    assert(
      !isError(bobSaved),
      `_listSaved should succeed: ${JSON.stringify(bobSaved)}`,
    );
    assertEquals(bobSaved.length, 0, "No items should be saved for Bob.");

    console.log("Unsave Non-Existent Item Error: Successfully handled.");
  } finally {
    await client.close();
  }
});

Deno.test("Saving Concept - Multiple Saves and Listing with Limit", async (t) => {
  const [db, client] = await testDb();
  const saving = new SavingConcept(db);

  try {
    console.log(`\n--- Test: Multiple Saves and Listing with Limit ---`);
    console.log(`User ${USER_CHARLIE} saves multiple items and lists them.`);

    // trace: Charlie saves multiple items
    // Multiple Saves and Listing with Limit
    const r1 = await saving.saveItem({
      user: USER_CHARLIE,
      item: MUSEUM_AMERICAN_FOLK,
    });
    if ("error" in r1) console.log("r1 error:", r1.error);
    assert(!("error" in r1));

    await new Promise((r) => setTimeout(r, 10));
    const r2 = await saving.saveItem({
      user: USER_CHARLIE,
      item: EXHIBIT_STORY_OF_HOUSE,
    });
    if ("error" in r2) console.log("r2 error:", r2.error);
    assert(!("error" in r2));

    await new Promise((r) => setTimeout(r, 10));
    const r3 = await saving.saveItem({
      user: USER_CHARLIE,
      item: MUSEUM_ALICE_AUSTEN,
    });
    if ("error" in r3) console.log("r3 error:", r3.error);
    assert(!("error" in r3));

    // trace: List all saved items for Charlie
    console.log(`Query: List all saved items for ${USER_CHARLIE}`);
    let charlieSaved = await saving._listSaved({ user: USER_CHARLIE });
    assert(
      !isError(charlieSaved),
      `_listSaved should succeed: ${JSON.stringify(charlieSaved)}`,
    );
    assertEquals(charlieSaved.length, 3, "Charlie should have 3 saved items.");
    // Verify order (newest first)
    assertEquals(
      charlieSaved[0].item,
      MUSEUM_ALICE_AUSTEN,
      "Newest item should be Alice Austen House Museum.",
    );
    assertEquals(
      charlieSaved[1].item,
      EXHIBIT_STORY_OF_HOUSE,
      "Second newest should be The Story of the House.",
    );
    assertEquals(
      charlieSaved[2].item,
      MUSEUM_AMERICAN_FOLK,
      "Oldest item should be American Folk Art Museum.",
    );
    console.log(
      `Result: Charlie's all saved items: ${
        JSON.stringify(charlieSaved.map((s) => s.item))
      }`,
    );

    // trace: List saved items for Charlie with limit 2
    console.log(`Query: List 2 most recent saved items for ${USER_CHARLIE}`);
    let charlieSavedLimited = await saving._listSaved({
      user: USER_CHARLIE,
      limit: 2,
    });
    assert(
      !isError(charlieSavedLimited),
      `_listSaved with limit should succeed: ${
        JSON.stringify(charlieSavedLimited)
      }`,
    );
    assertEquals(
      charlieSavedLimited.length,
      2,
      "Charlie should have 2 saved items with limit.",
    );
    assertEquals(
      charlieSavedLimited[0].item,
      MUSEUM_ALICE_AUSTEN,
      "First item should be Alice Austen House Museum.",
    );
    assertEquals(
      charlieSavedLimited[1].item,
      EXHIBIT_STORY_OF_HOUSE,
      "Second item should be The Story of the House.",
    );
    console.log(
      `Result: Charlie's limited saved items: ${
        JSON.stringify(charlieSavedLimited.map((s) => s.item))
      }`,
    );

    console.log("Multiple Saves and Listing: Successfully demonstrated.");
  } finally {
    await client.close();
  }
});

Deno.test("Saving Concept - Mixed User Saves and Independent Lists", async (t) => {
  const [db, client] = await testDb();
  const saving = new SavingConcept(db);

  try {
    console.log(`\n--- Test: Mixed User Saves and Independent Lists ---`);
    console.log(`Alice and Bob save items independently.`);

    // trace: Alice saves Staten Island Museum
    console.log(`Action: ${USER_ALICE} saves ${MUSEUM_STATEN_ISLAND}`);
    await saving.saveItem({ user: USER_ALICE, item: MUSEUM_STATEN_ISLAND });

    // trace: Bob saves Staten Island Museum and American Folk Art Museum
    console.log(`Action: ${USER_BOB} saves ${MUSEUM_STATEN_ISLAND}`);
    await saving.saveItem({ user: USER_BOB, item: MUSEUM_STATEN_ISLAND });
    await new Promise((resolve) => setTimeout(resolve, 10));
    console.log(`Action: ${USER_BOB} saves ${MUSEUM_AMERICAN_FOLK}`);
    await saving.saveItem({ user: USER_BOB, item: MUSEUM_AMERICAN_FOLK });

    // trace: Verify Alice's list
    console.log(`Query: List saved items for ${USER_ALICE}`);
    let aliceSaved = await saving._listSaved({ user: USER_ALICE });
    assert(!isError(aliceSaved), `_listSaved for Alice should succeed.`);
    assertEquals(aliceSaved.length, 1, "Alice should have 1 saved item.");
    assertEquals(
      aliceSaved[0].item,
      MUSEUM_STATEN_ISLAND,
      "Alice's item should be Staten Island Museum.",
    );
    console.log(
      `Result: Alice's saved items: ${
        JSON.stringify(aliceSaved.map((s) => s.item))
      }`,
    );

    // trace: Verify Bob's list
    console.log(`Query: List saved items for ${USER_BOB}`);
    let bobSaved = await saving._listSaved({ user: USER_BOB });
    assert(!isError(bobSaved), `_listSaved for Bob should succeed.`);
    assertEquals(bobSaved.length, 2, "Bob should have 2 saved items.");
    assertEquals(
      bobSaved[0].item,
      MUSEUM_AMERICAN_FOLK,
      "Bob's newest item should be American Folk Art Museum.",
    );
    assertEquals(
      bobSaved[1].item,
      MUSEUM_STATEN_ISLAND,
      "Bob's older item should be Staten Island Museum.",
    );
    console.log(
      `Result: Bob's saved items: ${
        JSON.stringify(bobSaved.map((s) => s.item))
      }`,
    );

    // trace: Bob unsaves Staten Island Museum
    console.log(`Action: ${USER_BOB} unsaves ${MUSEUM_STATEN_ISLAND}`);
    const bobUnsaveResult = await saving.unsaveItem({
      user: USER_BOB,
      item: MUSEUM_STATEN_ISLAND,
    });
    assert(!isError(bobUnsaveResult), `unsaveItem for Bob should succeed.`);

    // trace: Verify Bob's list after unsaving
    console.log(`Query: List saved items for ${USER_BOB} after unsaving one`);
    bobSaved = await saving._listSaved({ user: USER_BOB });
    assert(!isError(bobSaved), `_listSaved for Bob should succeed.`);
    assertEquals(bobSaved.length, 1, "Bob should now have 1 saved item.");
    assertEquals(
      bobSaved[0].item,
      MUSEUM_AMERICAN_FOLK,
      "Bob's remaining item should be American Folk Art Museum.",
    );
    console.log(
      `Result: Bob's remaining saved items: ${
        JSON.stringify(bobSaved.map((s) => s.item))
      }`,
    );

    // trace: Verify Alice's list is unaffected
    console.log(
      `Query: List saved items for ${USER_ALICE} (should be unaffected)`,
    );
    aliceSaved = await saving._listSaved({ user: USER_ALICE });
    assert(!isError(aliceSaved), `_listSaved for Alice should still succeed.`);
    assertEquals(aliceSaved.length, 1, "Alice's list should remain 1 item.");
    assertEquals(
      aliceSaved[0].item,
      MUSEUM_STATEN_ISLAND,
      "Alice's item should still be Staten Island Museum.",
    );
    console.log(
      `Result: Alice's saved items: ${
        JSON.stringify(aliceSaved.map((s) => s.item))
      }`,
    );

    console.log(
      "Mixed User Saves: Successfully demonstrated independent saving and lists.",
    );
  } finally {
    await client.close();
  }
});

```
