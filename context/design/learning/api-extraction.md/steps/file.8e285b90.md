---
timestamp: 'Tue Oct 21 2025 12:05:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_120518.1ade212f.md]]'
content_id: 8e285b90e3cb4c79be78e4394ff51b571c593050fe3a47e87ae7e43c14c9f44d
---

# file: src/concepts/Saving/SavingConcept.ts

```typescript
// file: src/concepts/Saving/SavingConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; // Assuming freshID is from @utils/database.ts and imported here or aliased.

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
  createdAt: Date;
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
    // Ensure the museum data is loaded for ID validation.
    // In a production app, this might be handled by a central data loader
    // or passed as a dependency for strict isolation. As per prompt,
    // the concept itself performs this check.
    for (const m of museumsRaw as MuseumData[]) {
      this.validMuseumAndExhibitIds.add(m.id as ID);
      for (const e of m.exhibits) {
        this.validMuseumAndExhibitIds.add(e.id as ID);
      }
    }

    // Optional: Create a unique index to prevent duplicate saves for the same user-item pair
    // and improve performance for existence checks.
    // This is a more robust way to enforce "Saved(user, item) not present".
    this.savedCollection.createIndex({ user: 1, item: 1 }, { unique: true })
      .catch((e) =>
        console.error("Error creating unique index for SavingConcept:", e)
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
        error:
          `Item ID '${item}' is not a valid museum or exhibit in the catalog.`,
      };
    }

    // Requires: Saved(user, item) not present
    // Using findOne for explicit check as per "requires" and to return specific error.
    // If a unique index is used, a duplicate key error on insert could also be caught.
    const existingSave = await this.savedCollection.findOne({ user, item });
    if (existingSave) {
      return { error: `User '${user}' has already saved item '${item}'.` };
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
      console.error(`Error saving item '${item}' for user '${user}':`, e);
      // Catching potential database errors during insert.
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
      return {
        error: "Failed to list saved items due to an internal database error.",
      };
    }
  }
}

```

## Similarity

Specification:

## concept **Similarity** \[Item]

**purpose**\
store item-to-item relatedness usable by ranking flows

**principle**\
if **SimilarityLinks(from, to)** with **score** exists, then neighbor queries for **from** may surface **to** ranked by **score**; rebuilding recomputes these scores atomically for the chosen scope.

**state**\
a set of **SimilarityLinks** with

* a from **ItemId**
* a to **ItemId**
* a score **Number** *(higher means more similar)*
* an updatedAt **DateTime**

**actions**\
**rebuildSimilarity**(scope?: Scope) : Empty | { error: String }

* effects (re)compute **SimilarityLinks** for the specified scope *(e.g., all museums or exhibits)*; set `updatedAt := now`

**neighbors**(item: ItemId, k: Number) : { neighbors: ItemId\[] } | { error: String }

* requires `k ≥ 1`
* effects return up to `k` items with highest score where `from = item`

Code:
