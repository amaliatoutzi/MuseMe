---
timestamp: 'Sat Oct 18 2025 18:11:42 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_181142.65cc7fe3.md]]'
content_id: ae8f7359223cbb21c36450657d8cd6d5f8751e4eec549a17abefe11cc58045b0
---

# response:

```typescript
// file: src/Similarity/SimilarityConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
// Assuming @utils/new-york-museums.json exists at the project root level
// and contains an array of museum objects.
import museumsRaw from "@utils/new-york-museums.json" with { type: "json" };

// Declare collection prefix, use concept name
const PREFIX = "Similarity" + ".";

// Generic types of this concept
type ItemId = ID;

// Define possible scopes for rebuilding similarity, as suggested in the principle.
type RebuildScope = "museums" | "exhibits" | "all";

/**
 * Interface representing a similarity link between two items.
 *
 * a set of SimilarityLinks with
 *   a from ItemId
 *   a to ItemId
 *   a score Number  (higher means more similar)
 *   an updatedAt DateTime
 */
interface SimilarityLink {
  _id: ID; // Unique ID for the link document
  from: ItemId; // The source item ID
  to: ItemId; // The target item ID
  score: number; // A numeric score indicating similarity, higher means more similar
  updatedAt: Date; // Timestamp of when this link was last updated/computed
}

/**
 * Interface for the structure of museum data from new-york-museums.json
 * This helps with type safety when parsing the JSON.
 */
interface MuseumData {
  id: string;
  name: string;
  address: string;
  description: string;
  exhibits: { id: string; name: string; description: string }[];
}

/**
 * concept: Similarity [Item]
 *
 * purpose: store item-to-item relatedness usable by ranking flows
 */
export default class SimilarityConcept {
  private similarityLinks: Collection<SimilarityLink>;
  private validItemIds: Set<ItemId>; // Cache of all valid museum and exhibit IDs

  constructor(private readonly db: Db) {
    this.similarityLinks = this.db.collection(PREFIX + "links");

    // Ensure a unique index on (from, to) pairs to prevent duplicate similarity links
    // and optimize queries for neighbors.
    this.similarityLinks.createIndex({ from: 1, to: 1 }, { unique: true });

    this.validItemIds = new Set<ItemId>();
    this.populateValidItemIds();
  }

  /**
   * Populates the `validItemIds` set by extracting all museum and exhibit IDs
   * from the `new-york-museums.json` catalog.
   */
  private populateValidItemIds() {
    // Cast museumsRaw to the expected type for better type inference if needed.
    const museums: MuseumData[] = museumsRaw as MuseumData[];
    for (const museum of museums) {
      this.validItemIds.add(museum.id as ItemId);
      for (const exhibit of museum.exhibits) {
        this.validItemIds.add(exhibit.id as ItemId);
      }
    }
  }

  /**
   * Helper method to validate if a given ItemId exists in our catalog.
   * @param id The ItemId to validate.
   * @returns `true` if the ID is valid, `false` otherwise.
   */
  private isValidItemId(id: ItemId): boolean {
    return this.validItemIds.has(id);
  }

  /**
   * action: rebuildSimilarity
   *
   * principle: if SimilarityLinks(from,to) with score exists, then neighbor queries for from may surface to ranked by score; rebuilding recomputes these scores atomically for the chosen scope.
   *
   * effects: (re)compute SimilarityLinks for the specified scope
   *          (e.g., all museums or exhibits) using some black box algorithm;
   *          set updatedAt := now
   *
   * This action simulates the computation of item-to-item similarity scores.
   * In a real application, this would involve complex machine learning algorithms.
   * For this concept, it clears existing links for the specified scope and generates
   * a new set of random similarity links between items within that scope.
   *
   * @param scope Optional parameter to specify which items to rebuild similarity for.
   *              Can be 'museums', 'exhibits', or 'all' (default).
   * @returns An empty object on success, or an object with an `error` message on failure.
   */
  async rebuildSimilarity(
    { scope }: { scope?: RebuildScope } = {},
  ): Promise<Empty | { error: string }> {
    let itemsToProcess: ItemId[] = [];
    const museums: MuseumData[] = museumsRaw as MuseumData[];

    // 1. Determine the set of items for which to (re)compute similarity.
    if (scope === "museums") {
      itemsToProcess = museums.map((m) => m.id as ItemId);
    } else if (scope === "exhibits") {
      itemsToProcess = museums.flatMap((m) =>
        m.exhibits.map((e) => e.id as ItemId)
      );
    } else { // Default to 'all' if scope is undefined or 'all'
      itemsToProcess = Array.from(this.validItemIds);
    }

    if (itemsToProcess.length === 0) {
      return { error: "No items found for the specified rebuild scope." };
    }

    // 2. Clear existing similarity links for the items within the current scope.
    // This ensures that the rebuild is atomic for these items.
    try {
      await this.similarityLinks.deleteMany({
        from: { $in: itemsToProcess },
      });
    } catch (e) {
      console.error("SimilarityConcept: Error clearing existing links:", e);
      return { error: "Failed to clear existing similarity links during rebuild." };
    }

    // 3. Simulate the "black box algorithm" by generating new links.
    const newLinks: SimilarityLink[] = [];
    const now = new Date();
    const maxLinksPerItem = 3; // Arbitrary limit for simulated neighbors

    for (const fromItem of itemsToProcess) {
      // Filter out the 'from' item itself from potential 'to' items.
      const potentialToItems = itemsToProcess.filter((item) => item !== fromItem);

      // Shuffle and pick a subset of potential 'to' items to link to.
      const selectedToItems = [...potentialToItems]
        .sort(() => 0.5 - Math.random())
        .slice(0, maxLinksPerItem);

      for (const toItem of selectedToItems) {
        // Double-check validity, though derived `itemsToProcess` should already be valid.
        if (this.isValidItemId(fromItem) && this.isValidItemId(toItem)) {
          newLinks.push({
            _id: freshID(),
            from: fromItem,
            to: toItem,
            score: parseFloat((Math.random() * 10 + 1).toFixed(2)), // Random score between 1 and 11
            updatedAt: now,
          });
        }
      }
    }

    // 4. Insert the newly generated similarity links into the database.
    if (newLinks.length > 0) {
      try {
        // Use `ordered: false` to allow insertion of valid documents even if some fail
        // (e.g., due to duplicate key errors if the simulation somehow produced them,
        // though the unique index already protects against this for (from,to) pairs).
        await this.similarityLinks.insertMany(newLinks, { ordered: false });
      } catch (e) {
        // Specifically catch MongoDB duplicate key errors (code 11000)
        // These are not critical failures for rebuild if `ordered: false` is used.
        if (e.code === 11000) {
          console.warn(
            "SimilarityConcept: Some similarity links were skipped due to duplicates.",
          );
        } else {
          console.error("SimilarityConcept: Error inserting new links:", e);
          return { error: "Failed to insert new similarity links during rebuild." };
        }
      }
    }

    return {}; // Success
  }

  /**
   * action: neighbors
   *
   * requires: k ≥ 1
   * effects: return up to k items with highest score where `from = item`
   *
   * Retrieves the `k` most similar items (neighbors) for a given item.
   * The similarity is determined by the `score` in `SimilarityLink` documents,
   * with higher scores indicating greater similarity.
   *
   * @param item The ItemId for which to find neighbors.
   * @param k The maximum number of neighbors to return. Must be 1 or greater.
   * @returns An object containing a `neighbors` array of ItemIds on success,
   *          or an object with an `error` message on failure.
   */
  async neighbors(
    { item, k }: { item: ItemId; k: number },
  ): Promise<{ neighbors: ItemId[] } | { error: string }> {
    // 1. Precondition check: k must be a positive number.
    if (k < 1) {
      return { error: "The parameter 'k' must be 1 or greater." };
    }

    // 2. Validate the input item ID against the known catalog.
    if (!this.isValidItemId(item)) {
      return { error: `Invalid item ID provided: '${item}'.` };
    }

    // 3. Query the database for similarity links.
    try {
      const foundLinks = await this.similarityLinks
        .find({ from: item }) // Find links where the 'from' item matches the input.
        .sort({ score: -1 }) // Sort by score in descending order (highest score first).
        .limit(k) // Limit the results to 'k' neighbors.
        .toArray();

      const neighbors = foundLinks.map((link) => link.to);
      return { neighbors };
    } catch (e) {
      console.error("SimilarityConcept: Error fetching neighbors:", e);
      return { error: "Failed to retrieve neighbors for the specified item." };
    }
  }

  // --- Concept Queries (for internal use or testing/debugging) ---

  /**
   * query: _getLinkCount
   * effects: return the total number of similarity links stored.
   * @returns An object containing the `count` of similarity links.
   */
  async _getLinkCount(): Promise<{ count: number }> {
    const count = await this.similarityLinks.countDocuments();
    return { count };
  }

  /**
   * query: _getLinksByFromItem
   * effects: return all similarity links originating from a specific item.
   * @param item The ItemId to query for.
   * @returns An object containing an array of `SimilarityLink` objects.
   */
  async _getLinksByFromItem(
    { item }: { item: ItemId },
  ): Promise<{ links: SimilarityLink[] }> {
    const links = await this.similarityLinks.find({ from: item }).toArray();
    return { links };
  }

  /**
   * query: _getLinksByToItem
   * effects: return all similarity links targeting a specific item.
   * @param item The ItemId to query for.
   * @returns An object containing an array of `SimilarityLink` objects.
   */
  async _getLinksByToItem(
    { item }: { item: ItemId },
  ): Promise<{ links: SimilarityLink[] }> {
    const links = await this.similarityLinks.find({ to: item }).toArray();
    return { links };
  }

  /**
   * query: _getAllValidItemIds
   * effects: returns all item IDs that are considered valid by this concept.
   * @returns An object containing an array of `ItemId` objects.
   */
  async _getAllValidItemIds(): Promise<{ itemIds: ItemId[] }> {
    return { itemIds: Array.from(this.validItemIds) };
  }
}
```
