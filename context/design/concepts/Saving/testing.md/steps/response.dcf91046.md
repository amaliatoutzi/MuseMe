---
timestamp: 'Sun Oct 19 2025 14:16:47 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_141647.410b9573.md]]'
content_id: dcf910461154c22536c94c89490e1c4657133199cb417a11c129b8ed2e45540d
---

# response:

Okay, I will provide the `SavingConcept` implementation and its corresponding Deno test file, adhering to all the specified conceptual constraints, implementation guidelines, and testing requirements.

***

### `src/utils/types.ts` (as assumed in the problem description)

This file contains the foundational types needed across concepts.

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

***

### `src/concepts/Saving/SavingConcept.ts`

This is the implementation of the `Saving` concept.

```typescript
// file: src/concepts/Saving/SavingConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID, toID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; // Assuming freshID is from @utils/database.ts

// The new-york-museums.json file containing museum and exhibit data.
// This is used here for item ID validation as per the prompt's instructions.
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

// Generic types of this concept, defined as branded IDs for type safety.
type User = ID;
type ItemId = ID; // Using ItemId to represent the generic Item parameter for clarity.

/**
 * Represents a 'Saved' entry in the database.
 * Corresponds to the 'Saved' relationship in the concept state:
 * a set of **Saved** with
 *   a user **User**
 *   an item **ItemId**
 *   a createdAt **DateTime**
 * The _id field is for the MongoDB document's unique identifier.
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

    // Load museum and exhibit IDs for validation, as per the prompt's instructions.
    // This process assumes museumsRaw is a flat array of MuseumData.
    for (const m of museumsRaw as MuseumData[]) {
      this.validMuseumAndExhibitIds.add(toID(m.id)); // Add museum ID
      for (const e of m.exhibits) {
        this.validMuseumAndExhibitIds.add(toID(e.id)); // Add exhibit ID
      }
    }

    // Optional: Create a unique index to prevent duplicate saves for the same user-item pair
    // and improve performance for existence checks. This directly helps enforce the
    // "Saved(user, item) not present" requirement at the database level.
    this.savedCollection.createIndex({ user: 1, item: 1 }, { unique: true })
      .catch((e) =>
        console.warn(
          "SavingConcept: Error creating unique index (might already exist):",
          e,
        )
      );
  }

  /**
   * saveItem (user: User, item: ItemId): Empty | { error: string }
   *
   * @requires user exists (this check would typically be handled by a higher-level synchronization
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
        error:
          `Item ID '${item}' is not a valid museum or exhibit in the catalog.`,
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
      // Check for MongoDB duplicate key error (code 11000) which implies
      // "Saved(user, item) present" violation due to the unique index.
      if (e instanceof Error && "code" in e && e.code === 11000) {
        return { error: `User '${user}' has already saved item '${item}'.` };
      }
      console.error(`Error saving item '${item}' for user '${user}':`, e);
      // Catching other potential database errors during insert.
      return {
        error: "Failed to save item due to an internal database error.",
      };
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
    // We target the specific user-item pair to ensure only one record is affected.
    const result = await this.savedCollection.deleteOne({ user, item });

    // Requires: Saved(user, item) exists - checked by deletedCount.
    // If no document was deleted, it means the item was not saved by this user.
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
   *          optionally limited by `limit`. Results are sorted by `createdAt` in descending order
   *          (most recently saved items first).
   *          Returns an array of dictionaries, each with an 'item' field, as per query convention.
   */
  async _listSaved(
    { user, limit }: { user: User; limit?: number },
  ): Promise<Array<{ item: ItemId }> | { error: string }> {
    try {
      // Find all saved items for the given user, sorted by creation date (newest first).
      let cursor = this.savedCollection.find({ user }).sort({ createdAt: -1 });

      // Apply a limit if provided and valid.
      if (limit !== undefined && limit > 0) {
        cursor = cursor.limit(limit);
      }

      const savedDocuments = await cursor.toArray();

      // Effects: return a list of ItemIds. Map the internal SavedDocument to the
      // required output format: an array of dictionaries, each with an 'item' field.
      return savedDocuments.map((doc) => ({ item: doc.item }));
    } catch (e) {
      console.error(`Error listing saved items for user '${user}':`, e);
      return {
        error: "Failed to list saved items due to an internal database error.",
      };
    }
  }
}
```

***

### `src/concepts/Saving/SavingConcept.test.ts`

This file contains the Deno tests for the `Saving` concept.

```typescript
// file: src/concepts/Saving/SavingConcept.test.ts
import { assert, assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import SavingConcept from "@concepts/Saving/SavingConcept.ts";

// Define generic ID types for test clarity.
type User = ID;
type ItemId = ID;

// --- Test Data ---
const USER_ALICE = "user:Alice" as User;
const USER_BOB = "user:Bob" as User;
const USER_CHARLIE = "user:Charlie" as User;
const USER_DANA = "user:Dana" as User;

// Valid item IDs from new-york-museums.json (example values).
// These IDs are confirmed to exist in the new-york-museums.json file.
const MUSEUM_STATEN_ISLAND = "staten-island-museum" as ItemId;
const MUSEUM_ALICE_AUSTEN = "alice-austen-house-museum" as ItemId;
const EXHIBIT_STORY_OF_HOUSE = "the-story-of-the-house" as ItemId; // An exhibit ID
const MUSEUM_WHITNEY = "whitney-museum-of-american-art" as ItemId;
const MUSEUM_MOMA = "museum-of-modern-art" as ItemId;

// Invalid item ID (guaranteed not to be in new-york-museums.json).
const INVALID_ITEM = "invalid-museum-or-exhibit" as ItemId;
const NON_EXISTENT_ITEM_FOR_UNSAVE = "non-existent-item-for-unsave" as ItemId;

// Helper to check for error objects from action/query results.
function isError(response: unknown): response is { error: string } {
  return typeof response === "object" && response !== null &&
    "error" in response;
}

// --- Test Cases ---

Deno.test("Saving Concept - Operational Principle", async (t) => {
  const [db, client] = await testDb();
  const saving = new SavingConcept(db);

  try {
    console.log(`\n--- Test: Operational Principle for Saving ---`);
    console.log(
      `Scenario: ${USER_ALICE} saves an item, lists it, then unsaves it.`,
    );

    // trace: Alice saves Staten Island Museum
    console.log(`  Action: ${USER_ALICE} saves ${MUSEUM_STATEN_ISLAND}`);
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
      "saveItem for first save should return empty object on success",
    );

    // trace: Check if Staten Island Museum appears in Alice's saved list
    console.log(`  Query: List saved items for ${USER_ALICE}`);
    let aliceSaved = await saving._listSaved({ user: USER_ALICE });
    assert(
      !isError(aliceSaved),
      `_listSaved should succeed: ${JSON.stringify(aliceSaved)}`,
    );
    assertEquals(aliceSaved.length, 1, "Alice should have 1 saved item.");
    assertEquals(
      aliceSaved[0].item,
      MUSEUM_STATEN_ISLAND,
      "The saved item should be Staten Island Museum.",
    );
    console.log(`  Result: Alice's saved items: ${JSON.stringify(aliceSaved)}`);

    // trace: Alice unsaves Staten Island Museum
    console.log(`  Action: ${USER_ALICE} unsaves ${MUSEUM_STATEN_ISLAND}`);
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
    console.log(`  Query: List saved items for ${USER_ALICE} after unsaving`);
    aliceSaved = await saving._listSaved({ user: USER_ALICE });
    assert(
      !isError(aliceSaved),
      `_listSaved should succeed: ${JSON.stringify(aliceSaved)}`,
    );
    assertEquals(
      aliceSaved.length,
      0,
      "Alice should have 0 saved items after unsaving.",
    );
    console.log(`  Result: Alice's saved items: ${JSON.stringify(aliceSaved)}`);

    console.log(
      "--- Operational Principle Test: PASSED (Saving and unsaving demonstrated) ---",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Saving Concept - Invalid Item ID (saveItem requires)", async (t) => {
  const [db, client] = await testDb();
  const saving = new SavingConcept(db);

  try {
    console.log(`\n--- Test: Invalid Item ID Error ---`);
    console.log(`Scenario: ${USER_BOB} attempts to save an invalid item ID.`);

    // trace: Bob tries to save an item with an invalid ID
    console.log(`  Action: ${USER_BOB} saves ${INVALID_ITEM}`);
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
      `Error message should indicate invalid item: "${saveResult.error}"`,
    );
    console.log(`  Expected Error: ${saveResult.error}`);

    // Verify no item was saved for Bob
    const bobSaved = await saving._listSaved({ user: USER_BOB });
    assert(
      !isError(bobSaved),
      `_listSaved should succeed: ${JSON.stringify(bobSaved)}`,
    );
    assertEquals(
      bobSaved.length,
      0,
      "No items should be saved for Bob after invalid attempt.",
    );

    console.log("--- Invalid Item ID Test: PASSED ---");
  } finally {
    await client.close();
  }
});

Deno.test("Saving Concept - Duplicate Save Attempt (saveItem requires)", async (t) => {
  const [db, client] = await testDb();
  const saving = new SavingConcept(db);

  try {
    console.log(`\n--- Test: Duplicate Save Error ---`);
    console.log(
      `Scenario: ${USER_ALICE} attempts to save the same item twice.`,
    );

    // trace: Alice saves Alice Austen House Museum for the first time
    console.log(`  Action: ${USER_ALICE} saves ${MUSEUM_ALICE_AUSTEN}`);
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
      `  Action: ${USER_ALICE} attempts to save ${MUSEUM_ALICE_AUSTEN} again`,
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
      `Error message should indicate duplicate save: "${saveResult2.error}"`,
    );
    console.log(`  Expected Error: ${saveResult2.error}`);

    // Verify only one entry exists for this user-item pair
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

    console.log("--- Duplicate Save Test: PASSED ---");
  } finally {
    await client.close();
  }
});

Deno.test("Saving Concept - Unsave Non-Existent Item (unsaveItem requires)", async (t) => {
  const [db, client] = await testDb();
  const saving = new SavingConcept(db);

  try {
    console.log(`\n--- Test: Unsave Non-Existent Item Error ---`);
    console.log(
      `Scenario: ${USER_BOB} attempts to unsave an item they haven't saved.`,
    );

    // trace: Bob tries to unsave an item he never saved
    console.log(
      `  Action: ${USER_BOB} unsaves ${NON_EXISTENT_ITEM_FOR_UNSAVE}`,
    );
    const unsaveResult = await saving.unsaveItem({
      user: USER_BOB,
      item: NON_EXISTENT_ITEM_FOR_UNSAVE,
    });

    assert(
      isError(unsaveResult),
      `unsaveItem should return an error for non-existent save.`,
    );
    assert(
      unsaveResult.error.includes("No saved item"),
      `Error message should indicate no saved item: "${unsaveResult.error}"`,
    );
    console.log(`  Expected Error: ${unsaveResult.error}`);

    // Verify no item was affected for Bob
    const bobSaved = await saving._listSaved({ user: USER_BOB });
    assert(
      !isError(bobSaved),
      `_listSaved should succeed: ${JSON.stringify(bobSaved)}`,
    );
    assertEquals(
      bobSaved.length,
      0,
      "No items should be saved for Bob, and none should have been removed.",
    );

    console.log("--- Unsave Non-Existent Item Test: PASSED ---");
  } finally {
    await client.close();
  }
});

Deno.test("Saving Concept - Multiple Saves and Listing with Limit and Order", async (t) => {
  const [db, client] = await testDb();
  const saving = new SavingConcept(db);

  try {
    console.log(`\n--- Test: Multiple Saves and Listing with Limit and Order ---`);
    console.log(`Scenario: ${USER_CHARLIE} saves multiple items and lists them, verifying order and limit.`);

    // trace: Charlie saves multiple items with small delays to ensure distinct `createdAt` timestamps
    console.log(`  Action: ${USER_CHARLIE} saves ${MUSEUM_WHITNEY}`);
    const saveR1 = await saving.saveItem({ user: USER_CHARLIE, item: MUSEUM_WHITNEY });
    assert(!isError(saveR1), `saveItem for Whitney should succeed.`);

    await new Promise((r) => setTimeout(r, 10)); // Small delay
    console.log(`  Action: ${USER_CHARLIE} saves ${EXHIBIT_STORY_OF_HOUSE}`);
    const saveR2 = await saving.saveItem({ user: USER_CHARLIE, item: EXHIBIT_STORY_OF_HOUSE });
    assert(!isError(saveR2), `saveItem for Exhibit should succeed.`);

    await new Promise((r) => setTimeout(r, 10)); // Small delay
    console.log(`  Action: ${USER_CHARLIE} saves ${MUSEUM_ALICE_AUSTEN}`);
    const saveR3 = await saving.saveItem({ user: USER_CHARLIE, item: MUSEUM_ALICE_AUSTEN });
    assert(!isError(saveR3), `saveItem for Alice Austen should succeed.`);

    await new Promise((r) => setTimeout(r, 10)); // Small delay
    console.log(`  Action: ${USER_CHARLIE} saves ${MUSEUM_MOMA}`);
    const saveR4 = await saving.saveItem({ user: USER_CHARLIE, item: MUSEUM_MOMA });
    assert(!isError(saveR4), `saveItem for MOMA should succeed.`);


    // trace: List all saved items for Charlie, verify count and newest-first order
    console.log(`  Query: List all saved items for ${USER_CHARLIE}`);
    let charlieSavedAll = await saving._listSaved({ user: USER_CHARLIE });
    assert(!isError(charlieSavedAll), `_listSaved (all) should succeed.`);
    assertEquals(charlieSavedAll.length, 4, "Charlie should have 4 saved items.");
    // Verify order (newest first based on `createdAt`)
    assertEquals(charlieSavedAll[0].item, MUSEUM_MOMA, "Newest item should be MOMA.");
    assertEquals(charlieSavedAll[1].item, MUSEUM_ALICE_AUSTEN, "Second newest item should be Alice Austen House Museum.");
    assertEquals(charlieSavedAll[2].item, EXHIBIT_STORY_OF_HOUSE, "Third newest item should be The Story of the House exhibit.");
    assertEquals(charlieSavedAll[3].item, MUSEUM_WHITNEY, "Oldest item should be Whitney Museum.");
    console.log(`  Result: Charlie's all saved items (ordered): ${JSON.stringify(charlieSavedAll.map((s) => s.item))}`);

    // trace: List saved items for Charlie with limit 2, verify count and order
    console.log(`  Query: List 2 most recent saved items for ${USER_CHARLIE}`);
    let charlieSavedLimited = await saving._listSaved({ user: USER_CHARLIE, limit: 2 });
    assert(!isError(charlieSavedLimited), `_listSaved with limit should succeed.`);
    assertEquals(charlieSavedLimited.length, 2, "Charlie should have 2 saved items with limit.");
    assertEquals(charlieSavedLimited[0].item, MUSEUM_MOMA, "First item should be MOMA (newest).");
    assertEquals(charlieSavedLimited[1].item, MUSEUM_ALICE_AUSTEN, "Second item should be Alice Austen House Museum.");
    console.log(`  Result: Charlie's limited saved items: ${JSON.stringify(charlieSavedLimited.map((s) => s.item))}`);

    // trace: List saved items for Charlie with limit 0 (should return empty)
    console.log(`  Query: List 0 saved items for ${USER_CHARLIE} (limit 0)`);
    let charlieSavedLimitZero = await saving._listSaved({ user: USER_CHARLIE, limit: 0 });
    assert(!isError(charlieSavedLimitZero), `_listSaved with limit 0 should succeed.`);
    assertEquals(charlieSavedLimitZero.length, 0, "Charlie should have 0 saved items with limit 0.");
    console.log(`  Result: Charlie's limit 0 saved items: ${JSON.stringify(charlieSavedLimitZero)}`);


    console.log("--- Multiple Saves and Listing Test: PASSED ---");
  } finally {
    await client.close();
  }
});

Deno.test("Saving Concept - Mixed User Saves and Independent Lists", async (t) => {
  const [db, client] = await testDb();
  const saving = new SavingConcept(db);

  try {
    console.log(`\n--- Test: Mixed User Saves and Independent Lists ---`);
    console.log(`Scenario: ${USER_DANA} and ${USER_BOB} save items independently.`);

    // trace: Dana saves Staten Island Museum
    console.log(`  Action: ${USER_DANA} saves ${MUSEUM_STATEN_ISLAND}`);
    await saving.saveItem({ user: USER_DANA, item: MUSEUM_STATEN_ISLAND });

    // trace: Bob saves Staten Island Museum (same item as Dana) and Whitney Museum
    console.log(`  Action: ${USER_BOB} saves ${MUSEUM_STATEN_ISLAND}`);
    await saving.saveItem({ user: USER_BOB, item: MUSEUM_STATEN_ISLAND });
    await new Promise((resolve) => setTimeout(resolve, 10)); // Ensure distinct timestamp
    console.log(`  Action: ${USER_BOB} saves ${MUSEUM_WHITNEY}`);
    await saving.saveItem({ user: USER_BOB, item: MUSEUM_WHITNEY });

    // trace: Verify Dana's list (should only contain her save)
    console.log(`  Query: List saved items for ${USER_DANA}`);
    let danaSaved = await saving._listSaved({ user: USER_DANA });
    assert(!isError(danaSaved), `_listSaved for Dana should succeed.`);
    assertEquals(danaSaved.length, 1, "Dana should have 1 saved item.");
    assertEquals(
      danaSaved[0].item,
      MUSEUM_STATEN_ISLAND,
      "Dana's item should be Staten Island Museum.",
    );
    console.log(`  Result: Dana's saved items: ${JSON.stringify(danaSaved.map((s) => s.item))}`);

    // trace: Verify Bob's list (should contain his two saves in correct order)
    console.log(`  Query: List saved items for ${USER_BOB}`);
    let bobSaved = await saving._listSaved({ user: USER_BOB });
    assert(!isError(bobSaved), `_listSaved for Bob should succeed.`);
    assertEquals(bobSaved.length, 2, "Bob should have 2 saved items.");
    assertEquals(
      bobSaved[0].item,
      MUSEUM_WHITNEY,
      "Bob's newest item should be Whitney Museum.",
    );
    assertEquals(
      bobSaved[1].item,
      MUSEUM_STATEN_ISLAND,
      "Bob's older item should be Staten Island Museum.",
    );
    console.log(`  Result: Bob's saved items: ${JSON.stringify(bobSaved.map((s) => s.item))}`);

    // trace: Bob unsaves Staten Island Museum
    console.log(`  Action: ${USER_BOB} unsaves ${MUSEUM_STATEN_ISLAND}`);
    const bobUnsaveResult = await saving.unsaveItem({
      user: USER_BOB,
      item: MUSEUM_STATEN_ISLAND,
    });
    assert(!isError(bobUnsaveResult), `unsaveItem for Bob should succeed.`);

    // trace: Verify Bob's list after unsaving (should only have Whitney Museum)
    console.log(`  Query: List saved items for ${USER_BOB} after unsaving one`);
    bobSaved = await saving._listSaved({ user: USER_BOB });
    assert(!isError(bobSaved), `_listSaved for Bob should succeed.`);
    assertEquals(bobSaved.length, 1, "Bob should now have 1 saved item.");
    assertEquals(
      bobSaved[0].item,
      MUSEUM_WHITNEY,
      "Bob's remaining item should be Whitney Museum.",
    );
    console.log(`  Result: Bob's remaining saved items: ${JSON.stringify(bobSaved.map((s) => s.item))}`);

    // trace: Verify Dana's list is unaffected by Bob's actions
    console.log(`  Query: List saved items for ${USER_DANA} (should be unaffected by Bob's unsave)`);
    danaSaved = await saving._listSaved({ user: USER_DANA });
    assert(!isError(danaSaved), `_listSaved for Dana should still succeed.`);
    assertEquals(danaSaved.length, 1, "Dana's list should remain 1 item.");
    assertEquals(
      danaSaved[0].item,
      MUSEUM_STATEN_ISLAND,
      "Dana's item should still be Staten Island Museum.",
    );
    console.log(`  Result: Dana's saved items: ${JSON.stringify(danaSaved.map((s) => s.item))}`);

    console.log("--- Mixed User Saves Test: PASSED ---");
  } finally {
    await client.close();
  }
});
```
