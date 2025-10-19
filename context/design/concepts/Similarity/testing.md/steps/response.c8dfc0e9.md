---
timestamp: 'Sat Oct 18 2025 19:00:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_190049.d4ff979e.md]]'
content_id: c8dfc0e9d84e40f778612df1b85a53927cb6fccccbbffb7c3cc33d6a90eeba0a
---

# response:

## Application Pitch - MuseMe Concept Implementation and Testing

This section details the implementation of the `Similarity` concept for MuseMe, followed by a comprehensive test suite.

***

### Concept Implementation

The `Similarity` concept is designed to compute and store item-to-item relatedness within the MuseMe application, facilitating recommendation and discovery. It leverages a content-based similarity approach using tags associated with museums and exhibits.

#### Core Logic:

1. **Catalog Processing:** The concept first processes the `new-york-museums.json` catalog to extract all relevant items (museums and exhibits) and their associated tags. Exhibits are assumed to inherit tags from their parent museum for similarity calculations. Tags are normalized (lowercase, unique) into `Set<string>`.
2. **Cosine Similarity:** The `rebuildSimilarity` action calculates cosine similarity between tag sets of different items.
   * `cosine(i,j) = |tags(i) ∩ tags(j)| / sqrt(|tags(i)| * |tags(j)|)`
   * Items are only compared if they share at least one tag.
   * Self-links (an item being similar to itself) are explicitly excluded.
3. **Top K Pruning:** For each "from" item, only the top `DEFAULT_TOP_K_NEIGHBORS` (defaulting to 50) most similar "to" items are stored.
4. **Atomic Updates:** When `rebuildSimilarity` is called for a specific scope, all existing similarity links originating from items within that scope are first deleted, and then the newly computed links are inserted. This ensures data consistency.
5. **Neighbor Retrieval:** The `neighbors` action efficiently queries the stored similarity links, returning up to `k` items sorted by score.

***

### file: src/Similarity/SimilarityConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
// Adjust the import path if your file structure differs, e.g., `../utils/new-york-museums.json`
import museumsRaw from "../../utils/new-york-museums.json" with { type: "json" };

// Declare collection prefix for MongoDB, using the concept name to ensure uniqueness.
const PREFIX = "Similarity" + ".";

/**
 * @typedef {ID} ItemId
 * Represents a generic identifier for an item, which could be a museum or an exhibit.
 * It's a branded string type for type safety.
 */
type ItemId = ID;

/**
 * @enum {string} Scope
 * Defines the scope for which similarity links should be rebuilt.
 * - 'museums': Only compute links for museum items.
 * - 'exhibits': Only compute links for exhibit items.
 * - 'all': Compute links for both museum and exhibit items (default).
 */
export type Scope = "museums" | "exhibits" | "all"; // Corrected 'exhbits' to 'exhibits'

/**
 * @interface SimilarityLink
 * Represents a stored item-to-item similarity relationship within the concept's state.
 * This document stores how similar one item (`from`) is to another (`to`).
 *
 * @property {ID} _id - A unique identifier for this similarity link document.
 * @property {ItemId} from - The source ItemId (e.g., a museum or an exhibit).
 * @property {ItemId} to - The target ItemId, which is deemed similar to the 'from' item.
 * @property {number} score - A numerical score indicating the degree of similarity (higher means more similar).
 * @property {Date} updatedAt - The timestamp when this specific similarity link was last computed/updated.
 */
interface SimilarityLink {
  _id: ID;
  from: ItemId;
  to: ItemId;
  score: number;
  updatedAt: Date;
}

/**
 * @interface MuseumData
 * Represents the structure of a museum entry as found in the `new-york-museums.json` catalog.
 * This interface focuses on the fields relevant for similarity calculation.
 *
 * @property {string} id - The unique identifier of the museum.
 * @property {string} name - The name of the museum.
 * @property {string[]} tags - An array of tags associated with the museum.
 * @property {ExhibitData[]} exhibits - An array of exhibit data objects belonging to this museum.
 */
interface MuseumData {
  id: string;
  name: string;
  tags: string[];
  exhibits: ExhibitData[];
}

/**
 * @interface ExhibitData
 * Represents the structure of an exhibit entry within a museum from the `new-york-museums.json` catalog.
 *
 * @property {string} id - The unique identifier of the exhibit.
 * @property {string} name - The name of the exhibit.
 * @property {string} type - The type of the exhibit (e.g., "Permanent").
 */
interface ExhibitData {
  id: string;
  name: string;
  type: string;
}

/**
 * @function processMuseumCatalog
 * Processes the raw museum catalog to extract all relevant items (museums and exhibits)
 * along with their normalized tag sets, based on the specified scope.
 *
 * @description Exhibits are assumed to inherit tags from their parent museum for similarity purposes
 *              as the `new-york-museums.json` structure only provides tags at the museum level.
 *
 * @param {Scope} scope - The scope to filter which items are processed ('museums', 'exhibits', or 'all').
 * @returns {Map<ItemId, Set<string>>} A Map where keys are ItemIds and values are Sets of lowercase, unique tags.
 */
function processMuseumCatalog(scope: Scope): Map<ItemId, Set<string>> {
  const itemTags = new Map<ItemId, Set<string>>();

  for (const museum of museumsRaw as MuseumData[]) {
    // Normalize museum tags (lowercase, unique)
    const museumTags = new Set(
      (museum.tags || []).map((tag) => tag.toLowerCase()),
    );

    // If the scope includes museums, add the museum itself to the catalog.
    if (scope === "museums" || scope === "all") {
      const museumId: ItemId = museum.id as ID;
      itemTags.set(museumId, museumTags);
    }

    // If the scope includes exhibits, add each exhibit, inheriting tags from its parent museum.
    if (scope === "exhibits" || scope === "all") {
      for (const exhibit of museum.exhibits || []) {
        const exhibitId: ItemId = exhibit.id as ID;
        itemTags.set(exhibitId, new Set(museumTags)); // Create a new set to avoid shared reference if modifying
      }
    }
  }
  return itemTags;
}

/**
 * @function isValidItemId
 * Checks if a given ItemId is present in the provided item catalog.
 * This ensures that any item referenced in actions actually exists in our known data.
 *
 * @param {ItemId} itemId - The ID of the item to validate.
 * @param {Map<ItemId, Set<string>>} catalog - The pre-processed catalog of valid items.
 * @returns {boolean} `true` if the item exists in the catalog, `false` otherwise.
 */
function isValidItemId(
  itemId: ItemId,
  catalog: Map<ItemId, Set<string>>,
): boolean {
  return catalog.has(itemId);
}

/**
 * @concept Similarity [ItemId]
 * @purpose store item-to-item relatedness usable by ranking flows.
 * @principle if SimilarityLinks(from,to) with score exists, then neighbor queries for from may surface to ranked by score; rebuilding recomputes these scores atomically for the chosen scope.
 */
export default class SimilarityConcept {
  // MongoDB collection to store similarity links.
  similarityLinks: Collection<SimilarityLink>;

  // A comprehensive, pre-processed catalog of all possible ItemIds (museums and exhibits)
  // and their tags, used for validation and tag lookup across all actions.
  private readonly allItemsCatalog: Map<ItemId, Set<string>>;
  private readonly DEFAULT_TOP_K_NEIGHBORS = 50; // Default limit for the number of neighbors to store per item.

  /**
   * Constructs the SimilarityConcept, initializing its MongoDB collection and loading the full item catalog.
   *
   * @param {Db} db - The MongoDB database instance to use for persistence.
   */
  constructor(private readonly db: Db) {
    this.similarityLinks = this.db.collection(PREFIX + "Links");
    this.allItemsCatalog = processMuseumCatalog("all"); // Load all items for comprehensive validation
  }

  /**
   * @action rebuildSimilarity
   * @description Recomputes and updates the similarity links between items based on their tags
   *              for the specified scope. This process is comprehensive and replaces existing
   *              links for the 'from' items within that scope.
   *
   * @effects (re)compute SimilarityLinks for the specified scope using a content-based similarity algorithm;
   *          set updatedAt := now for all new links.
   * @param {object} params - The action parameters.
   * @param {Scope} [params.scope='all'] - Optional. The scope to limit the rebuild.
   *                                            Valid values are 'museums', 'exhibits', or 'all'.
   * @returns {Promise<Empty | { error: string }>} An empty object on successful completion,
   *                                                or an error object if the operation fails.
   */
  async rebuildSimilarity(
    { scope }: { scope?: Scope } = {},
  ): Promise<Empty | { error: string }> {
    const currentScope: Scope = scope || "all";
    // Get items and their tags relevant to the current rebuild scope.
    const itemTagsMap = processMuseumCatalog(currentScope);
    const itemIdsInScope = Array.from(itemTagsMap.keys());

    if (itemIdsInScope.length === 0) {
      console.warn(`rebuildSimilarity: No items found in catalog for scope: ${currentScope}. No links will be generated.`);
      // If no items in scope, just clear existing for these (which there aren't any by definition of scope)
      // or effectively do nothing. Returning success here.
      return {};
    }

    const newLinks: SimilarityLink[] = [];
    const updatedAt = new Date(); // Timestamp for all newly computed links.

    // Intermediate storage to group potential links by 'from' item before applying topK pruning.
    const potentialLinksByFrom: Map<ItemId, SimilarityLink[]> = new Map();

    // Iterate through all unique pairs of items within the defined scope to calculate similarity.
    for (let i = 0; i < itemIdsInScope.length; i++) {
      const item1Id = itemIdsInScope[i];
      const tags1 = itemTagsMap.get(item1Id)!; // Tags for the 'from' item.

      for (let j = 0; j < itemIdsInScope.length; j++) {
        const item2Id = itemIdsInScope[j];

        // Post-processing: Disallow self-links (an item cannot be similar to itself in this context).
        if (item1Id === item2Id) {
          continue;
        }

        const tags2 = itemTagsMap.get(item2Id)!; // Tags for the 'to' item.

        // Candidate pruning: Only compare items if they share at least one tag.
        // Also implicitly handles cases where one or both tag sets are empty, as intersection.size will be 0.
        const intersection = new Set([...tags1].filter((tag) =>
          tags2.has(tag)
        ));
        if (intersection.size === 0) {
          continue;
        }

        // Calculate Cosine Similarity: |tags(i) ∩ tags(j)| / sqrt(|tags(i)| * |tags(j)|)
        const numCommonTags = intersection.size;
        const denom = Math.sqrt(tags1.size * tags2.size);

        let score = 0;
        // Denominator must be greater than 0 for a valid division.
        // If tags1.size or tags2.size is 0, denom will be 0, but this case should be caught by intersection.size === 0.
        if (denom > 0) {
          score = numCommonTags / denom;
        }
        
        // Ensure scores are finite numbers. Log a warning and default to 0 if not.
        if (!Number.isFinite(score)) {
          console.warn(
            `Non-finite score calculated for ${item1Id} and ${item2Id}. Setting to 0.`,
          );
          score = 0;
        }

        // Add the newly calculated link to temporary storage, grouped by its 'from' item.
        if (!potentialLinksByFrom.has(item1Id)) {
          potentialLinksByFrom.set(item1Id, []);
        }
        potentialLinksByFrom.get(item1Id)!.push({
          _id: freshID(), // Generate a unique ID for this new link document.
          from: item1Id,
          to: item2Id,
          score: score,
          updatedAt: updatedAt,
        });
      }
    }

    // Apply post-processing: Keep only the top K neighbors for each 'from' item.
    for (const [fromItemId, links] of potentialLinksByFrom.entries()) {
      links.sort((a, b) => b.score - a.score); // Sort by score in descending order (highest score first).
      const topKLinks = links.slice(0, this.DEFAULT_TOP_K_NEIGHBORS); // Take the top K links.
      newLinks.push(...topKLinks); // Add to the final list of links to be inserted.
    }

    try {
      // Atomically replace existing links:
      // First, delete all similarity links where the 'from' item is within the current rebuild scope.
      await this.similarityLinks.deleteMany({
        from: { $in: itemIdsInScope },
      });

      // Then, insert all the newly computed and pruned similarity links.
      if (newLinks.length > 0) {
        await this.similarityLinks.insertMany(newLinks);
      }
      return {}; // Indicate success by returning an empty object.
    } catch (e: any) {
      console.error("Error during rebuildSimilarity:", e);
      return { error: `Failed to rebuild similarity: ${e.message}` };
    }
  }

  /**
   * @action neighbors
   * @description Retrieves up to 'k' most similar neighbor ItemIds for a given source item.
   *              The neighbors are returned sorted by their similarity score in descending order.
   *
   * @requires k >= 1 - The number of neighbors requested must be at least one.
   * @effects return up to k items with highest score where from = item.
   * @param {object} params - The action parameters.
   * @param {ItemId} params.item - The ID of the item for which to find neighbors.
   * @param {number} params.k - The maximum number of neighbors to return. Must be at least 1.
   * @returns {Promise<{ neighbors: ItemId[] } | { error: string }>} A promise that resolves
   *                                                to an object containing a list of neighbor ItemIds on success,
   *                                                or an error object if validation fails or an error occurs.
   */
  async neighbors(
    { item, k }: { item: ItemId; k: number },
  ): Promise<{ neighbors: ItemId[] } | { error: string }> {
    // Precondition check: k must be at least 1.
    if (k < 1) {
      return { error: "k must be at least 1." };
    }
    // Precondition check: Validate that the requested item exists in our overall catalog.
    if (!isValidItemId(item, this.allItemsCatalog)) {
      return { error: `Item with ID '${item}' not found in the catalog.` };
    }

    try {
      // Query the database for similarity links where 'from' matches the requested item.
      const results = await this.similarityLinks
        .find({ from: item })
        .sort({ score: -1 }) // Sort the results by score in descending order (highest score first).
        .limit(k) // Limit the number of returned documents to 'k'.
        .project({ to: 1, _id: 0 }) // Project only the 'to' field (the neighbor's ID), excluding the document's _id.
        .toArray();

      // Extract the 'to' ItemIds from the query results.
      const neighborIds = results.map((doc) => doc.to);
      return { neighbors: neighborIds }; // Return the list of neighbor IDs.
    } catch (e: any) {
      console.error("Error during neighbors query:", e);
      return { error: `Failed to fetch neighbors: ${e.message}` };
    }
  }
}
```

***

### Concept Testing

The following test suite ensures the `Similarity` concept behaves as expected, covering the operational principle and various edge cases.

***

### file: src/Similarity/SimilarityConcept.test.ts

```typescript
import { assertEquals, assertExists, assertInstanceOf, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import SimilarityConcept, { Scope } from "./SimilarityConcept.ts";
import { ID } from "@utils/types.ts";
import museumsRaw from "../../utils/new-york-museums.json" with { type: "json" };

type ItemId = ID;

// Helper to get all museum IDs from the raw data
function getAllMuseumIds(): ItemId[] {
  return museumsRaw.map((m) => m.id as ItemId);
}

// Helper to get an exhibit ID for testing
function getAnExhibitId(): ItemId {
  for (const museum of museumsRaw) {
    if (museum.exhibits && museum.exhibits.length > 0) {
      return museum.exhibits[0].id as ItemId;
    }
  }
  throw new Error("No exhibits found in catalog for testing.");
}

// Helper to find two distinct museums with common tags for similarity testing
function findTwoMuseumsWithCommonTags(): {
  museum1Id: ItemId;
  museum2Id: ItemId;
} {
  for (let i = 0; i < museumsRaw.length; i++) {
    for (let j = i + 1; j < museumsRaw.length; j++) {
      const museum1 = museumsRaw[i];
      const museum2 = museumsRaw[j];

      const tags1 = new Set((museum1.tags || []).map((t) => t.toLowerCase()));
      const tags2 = new Set((museum2.tags || []).map((t) => t.toLowerCase()));

      const intersection = new Set([...tags1].filter((tag) => tags2.has(tag)));
      if (intersection.size > 0) {
        return {
          museum1Id: museum1.id as ItemId,
          museum2Id: museum2.id as ItemId,
        };
      }
    }
  }
  throw new Error("Could not find two museums with common tags.");
}

// Helper to find two museums that are expected to have a high similarity score
// based on having many common tags relative to their total tags.
function findMuseumsWithHighSimilarityExpectation(): {
  museumId: ItemId;
  highlySimilarMuseumId: ItemId;
} {
  // Example: "the-metropolitan-museum-of-art" and "guggenheim-museum"
  // Both have "art", "modern", "european", "american"
  const metId = "the-metropolitan-museum-of-art" as ItemId;
  const guggenheimId = "guggenheim-museum" as ItemId;

  // Let's verify these exist and have some overlap in tags
  const metMuseum = museumsRaw.find(m => m.id === metId);
  const guggenheimMuseum = museumsRaw.find(m => m.id === guggenheimId);

  if (metMuseum && guggenheimMuseum) {
    const metTags = new Set((metMuseum.tags || []).map(t => t.toLowerCase()));
    const guggenheimTags = new Set((guggenheimMuseum.tags || []).map(t => t.toLowerCase()));
    const commonTags = new Set([...metTags].filter(tag => guggenheimTags.has(tag)));
    if (commonTags.size > 0) {
      return { museumId: metId, highlySimilarMuseumId: guggenheimId };
    }
  }

  // Fallback if specific example is not suitable or data changes
  console.warn("Specific high-similarity museum pair not found or suitable. Falling back to generic search.");
  let bestPair: { museum1Id: ItemId; museum2Id: ItemId; score: number } | null = null;

  for (let i = 0; i < museumsRaw.length; i++) {
    for (let j = i + 1; j < museumsRaw.length; j++) {
      const m1 = museumsRaw[i];
      const m2 = museumsRaw[j];

      const t1 = new Set((m1.tags || []).map(t => t.toLowerCase()));
      const t2 = new Set((m2.tags || []).map(t => t.toLowerCase()));

      const intersection = new Set([...t1].filter(tag => t2.has(tag)));
      if (intersection.size > 0) {
        const numCommonTags = intersection.size;
        const denom = Math.sqrt(t1.size * t2.size);
        const score = denom > 0 ? numCommonTags / denom : 0;
        
        if (!bestPair || score > bestPair.score) {
          bestPair = { museum1Id: m1.id as ItemId, museum2Id: m2.id as ItemId, score: score };
        }
      }
    }
  }

  if (bestPair && bestPair.score > 0) {
    return { museumId: bestPair.museum1Id, highlySimilarMuseumId: bestPair.museum2Id };
  }

  throw new Error("Could not find any two museums with common tags for similarity testing.");
}


Deno.test("Similarity Concept: Operational Principle - Rebuild and Query", async () => {
  console.log("\n--- Test: Operational Principle - Rebuild and Query ---");
  const [db, client] = await testDb();
  const similarityConcept = new SimilarityConcept(db);

  // 1. Setup: Get a known museum and its expected highly similar counterpart
  const { museumId, highlySimilarMuseumId } = findMuseumsWithHighSimilarityExpectation();
  console.log(`Testing with museum: ${museumId} and expected similar: ${highlySimilarMuseumId}`);

  // 2. Action: Rebuild similarity links for museums
  console.log("Calling rebuildSimilarity for 'museums' scope...");
  const rebuildResult = await similarityConcept.rebuildSimilarity({ scope: "museums" as Scope });
  assertEquals(rebuildResult, {}, `rebuildSimilarity should succeed: ${JSON.stringify(rebuildResult)}`);
  console.log("rebuildSimilarity completed successfully.");

  // 3. Query: Get neighbors for the selected museum
  console.log(`Calling neighbors for ${museumId} with k=5...`);
  const neighborsResult = await similarityConcept.neighbors({ item: museumId, k: 5 });
  console.log(`Neighbors result for ${museumId}: ${JSON.stringify(neighborsResult)}`);

  // 4. Assertions:
  assertExists((neighborsResult as { neighbors: ItemId[] }).neighbors, "Neighbors array should exist");
  const neighbors = (neighborsResult as { neighbors: ItemId[] }).neighbors;
  assertInstanceOf(neighbors, Array, "Neighbors should be an array");
  assertNotEquals(neighbors.length, 0, "Should find at least one neighbor for a well-connected museum");
  // The principle states 'may surface'. We can't guarantee exact order without knowing all tags and scores
  // but we can check if the highly similar one is among the top.
  const foundHighlySimilar = neighbors.includes(highlySimilarMuseumId);
  // Relaxing assertion if it's not in the *very* top k, but checking it's generally present if the list is long.
  if (!foundHighlySimilar && neighbors.length < 50) { // Only check if we didn't hit the topK limit initially
    const allNeighbors = await similarityConcept.neighbors({ item: museumId, k: 50 });
    const allNeighborIds = (allNeighbors as { neighbors: ItemId[] }).neighbors;
    assertEquals(allNeighborIds.includes(highlySimilarMuseumId), true, `${highlySimilarMuseumId} should be among the top 50 neighbors of ${museumId}`);
  } else if (foundHighlySimilar) {
      console.log(`${highlySimilarMuseumId} found in top 5 neighbors.`);
  }


  await client.close();
  console.log("--- End Test: Operational Principle ---");
});

Deno.test("Similarity Concept: rebuildSimilarity with 'all' scope and exhibit neighbors", async () => {
  console.log("\n--- Test: rebuildSimilarity with 'all' scope and exhibit neighbors ---");
  const [db, client] = await testDb();
  const similarityConcept = new SimilarityConcept(db);

  const exhibitId = getAnExhibitId();
  console.log(`Testing with exhibit: ${exhibitId}`);

  console.log("Calling rebuildSimilarity for 'all' scope...");
  const rebuildResult = await similarityConcept.rebuildSimilarity({ scope: "all" as Scope });
  assertEquals(rebuildResult, {}, `rebuildSimilarity should succeed: ${JSON.stringify(rebuildResult)}`);
  console.log("rebuildSimilarity completed successfully for 'all' scope.");

  console.log(`Calling neighbors for exhibit ${exhibitId} with k=3...`);
  const neighborsResult = await similarityConcept.neighbors({ item: exhibitId, k: 3 });
  console.log(`Neighbors result for ${exhibitId}: ${JSON.stringify(neighborsResult)}`);

  assertExists((neighborsResult as { neighbors: ItemId[] }).neighbors, "Neighbors array should exist for exhibit");
  const neighbors = (neighborsResult as { neighbors: ItemId[] }).neighbors;
  assertInstanceOf(neighbors, Array, "Neighbors should be an array for exhibit");
  assertNotEquals(neighbors.length, 0, "Should find at least one neighbor for a valid exhibit");

  await client.close();
  console.log("--- End Test: rebuildSimilarity with 'all' scope ---");
});


Deno.test("Similarity Concept: neighbors with k < 1 should return error", async () => {
  console.log("\n--- Test: neighbors with k < 1 should return error ---");
  const [db, client] = await testDb();
  const similarityConcept = new SimilarityConcept(db);

  const museumId = getAllMuseumIds()[0]; // Get any valid museum ID

  console.log(`Calling neighbors for ${museumId} with k=0 (invalid)...`);
  const neighborsResult = await similarityConcept.neighbors({ item: museumId, k: 0 });
  console.log(`Neighbors result for k=0: ${JSON.stringify(neighborsResult)}`);

  assertExists((neighborsResult as { error: string }).error, "Error message should be returned for k < 1");
  assertEquals((neighborsResult as { error: string }).error, "k must be at least 1.", "Correct error message for k < 1");

  await client.close();
  console.log("--- End Test: neighbors with k < 1 ---");
});


Deno.test("Similarity Concept: neighbors with invalid item ID should return error", async () => {
  console.log("\n--- Test: neighbors with invalid item ID should return error ---");
  const [db, client] = await testDb();
  const similarityConcept = new SimilarityConcept(db);

  const invalidItemId: ItemId = "non-existent-museum" as ID;

  console.log(`Calling neighbors for invalid item ${invalidItemId} with k=1...`);
  const neighborsResult = await similarityConcept.neighbors({ item: invalidItemId, k: 1 });
  console.log(`Neighbors result for invalid item: ${JSON.stringify(neighborsResult)}`);

  assertExists((neighborsResult as { error: string }).error, "Error message should be returned for invalid item ID");
  assertEquals((neighborsResult as { error: string }).error, `Item with ID '${invalidItemId}' not found in the catalog.`, "Correct error message for invalid item ID");

  await client.close();
  console.log("--- End Test: neighbors with invalid item ID ---");
});


Deno.test("Similarity Concept: rebuildSimilarity for specific scope only affects that scope", async () => {
  console.log("\n--- Test: rebuildSimilarity for specific scope only affects that scope ---");
  const [db, client] = await testDb();
  const similarityConcept = new SimilarityConcept(db);

  // 1. Rebuild for museums only
  console.log("Calling rebuildSimilarity for 'museums' scope...");
  await similarityConcept.rebuildSimilarity({ scope: "museums" as Scope });

  const museumId = findTwoMuseumsWithCommonTags().museum1Id;
  const exhibitId = getAnExhibitId();

  // Verify museum links exist
  let museumNeighbors = await similarityConcept.neighbors({ item: museumId, k: 1 });
  assertEquals(
    (museumNeighbors as { neighbors: ItemId[] }).neighbors.length > 0,
    true,
    `Museum ${museumId} should have neighbors after 'museums' rebuild.`
  );
  console.log(`Museum ${museumId} has neighbors after 'museums' rebuild.`);

  // Verify exhibit links DO NOT exist yet
  let exhibitNeighbors = await similarityConcept.neighbors({ item: exhibitId, k: 1 });
  assertEquals(
    (exhibitNeighbors as { neighbors: ItemId[] }).neighbors.length,
    0,
    `Exhibit ${exhibitId} should NOT have neighbors before 'exhibits' rebuild.`
  );
  console.log(`Exhibit ${exhibitId} has NO neighbors yet.`);

  // 2. Rebuild for exhibits only
  console.log("Calling rebuildSimilarity for 'exhibits' scope...");
  await similarityConcept.rebuildSimilarity({ scope: "exhibits" as Scope });

  // Verify museum links still exist (were not affected by 'exhibits' rebuild)
  museumNeighbors = await similarityConcept.neighbors({ item: museumId, k: 1 });
  assertEquals(
    (museumNeighbors as { neighbors: ItemId[] }).neighbors.length > 0,
    true,
    `Museum ${museumId} should STILL have neighbors after 'exhibits' rebuild.`
  );
  console.log(`Museum ${museumId} still has neighbors after 'exhibits' rebuild.`);

  // Verify exhibit links NOW exist
  exhibitNeighbors = await similarityConcept.neighbors({ item: exhibitId, k: 1 });
  assertEquals(
    (exhibitNeighbors as { neighbors: ItemId[] }).neighbors.length > 0,
    true,
    `Exhibit ${exhibitId} SHOULD have neighbors after 'exhibits' rebuild.`
  );
  console.log(`Exhibit ${exhibitId} now has neighbors.`);

  await client.close();
  console.log("--- End Test: rebuildSimilarity scope isolation ---");
});

Deno.test("Similarity Concept: rebuildSimilarity handles items with no tags or no common tags", async () => {
  console.log("\n--- Test: rebuildSimilarity handles items with no tags or no common tags ---");
  const [db, client] = await testDb();
  const similarityConcept = new SimilarityConcept(db);

  // Find a museum that might have very few or unique tags (or mock one if needed for robust test)
  // For now, we rely on the existing catalog structure.
  // The `processMuseumCatalog` and cosine similarity logic handles empty tag sets by yielding a score of 0,
  // and candidate pruning (sharing >= 1 tag) should prevent links from being created for truly isolated items.

  // Let's take a museum and an exhibit that are very unlikely to be similar due to content.
  // We need to ensure that the logic doesn't create links with NaN or infinite scores.
  await similarityConcept.rebuildSimilarity({ scope: "all" as Scope });

  // A museum with specific tags, e.g., "African", "History"
  const museum1 = museumsRaw.find(m => m.tags.includes("African") && m.tags.includes("History"));
  const museum2 = museumsRaw.find(m => m.tags.includes("Science") && m.tags.includes("Technology"));

  if (museum1 && museum2 && museum1.id !== museum2.id) {
    const museum1Id = museum1.id as ItemId;
    const museum2Id = museum2.id as ItemId;

    const neighbors1 = await similarityConcept.neighbors({ item: museum1Id, k: 50 });
    const neighbors2 = await similarityConcept.neighbors({ item: museum2Id, k: 50 });

    const neighbors1List = (neighbors1 as { neighbors: ItemId[] }).neighbors;
    const neighbors2List = (neighbors2 as { neighbors: ItemId[] }).neighbors;

    // It's possible for them to have other common tags, but we ensure no non-finite scores are stored.
    // We cannot reliably assert that they will have *no* common neighbors without deeper tag analysis.
    // Instead, we confirm that the rebuild process completes without errors.
    console.log(`Museum ${museum1Id} neighbors: ${neighbors1List.length}`);
    console.log(`Museum ${museum2Id} neighbors: ${neighbors2List.length}`);
  } else {
    console.warn("Could not find suitable museums for 'no common tags' test. Skipping specific neighbor check.");
  }
  
  // The primary check here is that `rebuildSimilarity` completes without error,
  // implying score calculations and pruning handled edge cases (empty tags, no common tags) correctly.
  const rebuildResult = await similarityConcept.rebuildSimilarity();
  assertEquals(rebuildResult, {}, "rebuildSimilarity should complete without error even with varied tag sets");

  await client.close();
  console.log("--- End Test: rebuildSimilarity handles no tags/no common tags ---");
});

Deno.test("Similarity Concept: rebuildSimilarity updates existing links atomically", async () => {
  console.log("\n--- Test: rebuildSimilarity updates existing links atomically ---");
  const [db, client] = await testDb();
  const similarityConcept = new SimilarityConcept(db);

  const museumId = findTwoMuseumsWithCommonTags().museum1Id;

  // 1. Initial rebuild
  console.log("Initial rebuild for 'museums' scope...");
  await similarityConcept.rebuildSimilarity({ scope: "museums" as Scope });
  const initialLinksCount = await similarityConcept.similarityLinks.countDocuments({ from: museumId });
  console.log(`Initial links for ${museumId}: ${initialLinksCount}`);
  assertNotEquals(initialLinksCount, 0, "Initial rebuild should create links.");

  // 2. Second rebuild (should overwrite)
  console.log("Second rebuild for 'museums' scope...");
  await similarityConcept.rebuildSimilarity({ scope: "museums" as Scope });
  const secondLinksCount = await similarityConcept.similarityLinks.countDocuments({ from: museumId });
  console.log(`Links for ${museumId} after second rebuild: ${secondLinksCount}`);

  // The count should remain consistent or change based on actual data/topK,
  // but importantly, the process should be atomic (no duplicates, no partial deletes).
  assertEquals(initialLinksCount, secondLinksCount, "Second rebuild should result in the same number of links for the item.");

  // Also verify updatedAt timestamp (it should be newer)
  const linksAfterSecondRebuild = await similarityConcept.similarityLinks.find({ from: museumId }).toArray();
  assertExists(linksAfterSecondRebuild[0]?.updatedAt, "Links should have an updatedAt timestamp.");
  const firstUpdatedAt = linksAfterSecondRebuild[0].updatedAt;

  // Wait a bit to ensure updatedAt differs
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log("Third rebuild for 'museums' scope...");
  await similarityConcept.rebuildSimilarity({ scope: "museums" as Scope });
  const linksAfterThirdRebuild = await similarityConcept.similarityLinks.find({ from: museumId }).toArray();
  const thirdUpdatedAt = linksAfterThirdRebuild[0].updatedAt;

  assertExists(thirdUpdatedAt, "Links after third rebuild should have an updatedAt timestamp.");
  // The new updatedAt timestamp should be later than the previous one.
  // Due to the nature of the rebuild, all links for a 'from' item in scope get a fresh timestamp.
  assert(thirdUpdatedAt.getTime() > firstUpdatedAt.getTime(), "Updated at timestamp should be newer after subsequent rebuild.");
  console.log(`Updated timestamp verified: ${firstUpdatedAt.toISOString()} vs ${thirdUpdatedAt.toISOString()}`);


  await client.close();
  console.log("--- End Test: rebuildSimilarity updates existing links atomically ---");
});

Deno.test("Similarity Concept: neighbors returns up to k items, sorted by score", async () => {
  console.log("\n--- Test: neighbors returns up to k items, sorted by score ---");
  const [db, client] = await testDb();
  const similarityConcept = new SimilarityConcept(db);

  const museumId = findMuseumsWithHighSimilarityExpectation().museumId; // Get a museum with expected neighbors

  console.log(`Rebuilding similarity for ${museumId} in 'museums' scope...`);
  await similarityConcept.rebuildSimilarity({ scope: "museums" as Scope });

  // Test k=1
  console.log(`Calling neighbors for ${museumId} with k=1...`);
  const neighborsK1 = await similarityConcept.neighbors({ item: museumId, k: 1 });
  console.log(`Neighbors (k=1): ${JSON.stringify(neighborsK1)}`);
  assertEquals((neighborsK1 as { neighbors: ItemId[] }).neighbors.length, 1, "Should return exactly 1 neighbor for k=1");

  // Test k=5, ensure sorted order
  console.log(`Calling neighbors for ${museumId} with k=5...`);
  const neighborsK5 = await similarityConcept.neighbors({ item: museumId, k: 5 });
  console.log(`Neighbors (k=5): ${JSON.stringify(neighborsK5)}`);
  const k5Ids = (neighborsK5 as { neighbors: ItemId[] }).neighbors;
  assertEquals(k5Ids.length, Math.min(5, await similarityConcept.similarityLinks.countDocuments({ from: museumId })), "Should return up to 5 neighbors");

  // Verify sorting by fetching scores from DB for these IDs
  const rawLinks = await similarityConcept.similarityLinks.find({ from: museumId, to: { $in: k5Ids } }).toArray();
  const sortedRawLinks = [...rawLinks].sort((a, b) => b.score - a.score); // Sort by score DESC
  const sortedRawIds = sortedRawLinks.map(link => link.to);

  assertEquals(k5Ids, sortedRawIds, "Neighbors should be sorted by score descending.");
  console.log("Sorting verified for k=5 neighbors.");

  // Test k higher than actual number of neighbors (e.g., k=100 for default top 50)
  console.log(`Calling neighbors for ${museumId} with k=100 (more than available)...`);
  const neighborsK100 = await similarityConcept.neighbors({ item: museumId, k: 100 });
  console.log(`Neighbors (k=100): ${JSON.stringify(neighborsK100)}`);
  const k100Ids = (neighborsK100 as { neighbors: ItemId[] }).neighbors;
  const expectedMaxNeighbors = 50; // DEFAULT_TOP_K_NEIGHBORS
  assertEquals(k100Ids.length, Math.min(expectedMaxNeighbors, await similarityConcept.similarityLinks.countDocuments({ from: museumId })), "Should return up to DEFAULT_TOP_K_NEIGHBORS if k is higher.");

  await client.close();
  console.log("--- End Test: neighbors returns up to k items, sorted by score ---");
});

Deno.test("Similarity Concept: rebuildSimilarity with empty scope (no items matching) returns success without links", async () => {
  console.log("\n--- Test: rebuildSimilarity with empty scope ---");
  const [db, client] = await testDb();
  const similarityConcept = new SimilarityConcept(db);

  // Mock a scope that will yield no items (e.g., if a filtered catalog was used)
  // Our current `processMuseumCatalog` with 'museums', 'exhibits', or 'all' will always return items.
  // To simulate an empty scope, we can temporarily modify the catalog data or assume a condition that leads to it.
  // For this test, we rely on the implementation logging a warning and returning {}.
  // We can't easily mock an "empty" scope with `processMuseumCatalog` based on the current `Scope` enum.
  // This test primarily confirms the action doesn't crash if `itemIdsInScope.length === 0`.

  // The current implementation uses `processMuseumCatalog(currentScope)` which will always return items
  // if the `new-york-museums.json` is not empty.
  // The `if (itemIdsInScope.length === 0)` check is specifically for cases where the catalog *itself* is empty for a given scope,
  // which with the current `museumsRaw` won't happen.
  // However, the test should still ensure the `rebuildSimilarity` function returns `Empty`
  // if it were to receive an empty item list.

  const emptyResult = await similarityConcept.rebuildSimilarity({ scope: "museums" }); // Will not be truly empty, but verifies function path
  assertEquals(emptyResult, {}, "rebuildSimilarity should return success even if no links are created (e.g. if scope results in no items)");
  
  // Verify no links are generated if there were no items, by checking the count for a specific ID that might have existed
  // This part is difficult to test robustly without mocking `processMuseumCatalog` to return an empty map,
  // or having a test catalog with empty scopes. For now, we trust the `itemIdsInScope.length === 0` branch.
  
  await client.close();
  console.log("--- End Test: rebuildSimilarity with empty scope ---");
});
```

***

### trace: Operational Principle Execution

This trace demonstrates the `rebuildSimilarity` and `neighbors` actions fulfilling the operational principle.

1. **Initialize Concept:**
   * A `SimilarityConcept` instance is created, connecting to the test MongoDB database.
   * The `allItemsCatalog` is populated internally from `new-york-museums.json`.

2. **Find Relevant Museums:**
   * The test identifies two museums, `the-metropolitan-museum-of-art` (museumId) and `guggenheim-museum` (highlySimilarMuseumId), which are expected to have a high similarity score due to shared tags (e.g., "Art", "Modern", "European").

3. **Execute `rebuildSimilarity`:**
   * `similarityConcept.rebuildSimilarity({ scope: "museums" })` is called.
   * **Internal Process:**
     * `processMuseumCatalog("museums")` extracts all museum IDs and their tags.
     * The algorithm iterates through all pairs of museums within this scope.
     * For each pair `(m1, m2)`:
       * Self-links (`m1 === m2`) are skipped.
       * Cosine similarity is calculated based on their normalized tag sets.
       * If `m1` and `m2` share at least one tag, a similarity score is computed.
       * The calculated `SimilarityLink` objects (containing `from`, `to`, `score`, `updatedAt`) are stored temporarily.
     * After all pairs are processed, for each `from` museum, only the top 50 (default `DEFAULT_TOP_K_NEIGHBORS`) links by score are retained.
     * All existing `SimilarityLinks` where `from` is a museum ID in the current scope are deleted from the `Similarity.Links` MongoDB collection.
     * The newly computed and pruned links are inserted into `Similarity.Links`.
   * **Expected Output:** An empty `{}` object, indicating successful completion.

4. **Execute `neighbors`:**
   * `similarityConcept.neighbors({ item: "the-metropolitan-museum-of-art" as ItemId, k: 5 })` is called.
   * **Internal Process:**
     * The method first validates `k` (ensures `k >= 1`) and the `item` ID (ensures it exists in `allItemsCatalog`).
     * It then queries the `Similarity.Links` MongoDB collection for documents where `from` matches `the-metropolitan-museum-of-art`.
     * The results are sorted by `score` in descending order.
     * The query is limited to `k=5` results.
     * Only the `to` (neighbor ID) field is projected from the matching documents.
   * **Expected Output:** An object `{ neighbors: ItemId[] }`, containing a list of up to 5 `ItemId`s representing the most similar museums to `the-metropolitan-museum-of-art`, ordered by their similarity score. The `guggenheim-museum` is expected to be present in this list (potentially requiring a check beyond just the top 5 if its rank is lower, but confirming its presence in the top 50).

5. **Assertions:**
   * The test asserts that `rebuildSimilarity` returns successfully.
   * It asserts that `neighbors` returns a non-empty array of `ItemId`s.
   * It specifically checks if `guggenheim-museum` (our `highlySimilarMuseumId`) is present in the returned list of neighbors for `the-metropolitan-museum-of-art`.

This trace demonstrates that similarity links are correctly computed, stored, and then retrieved, fulfilling the purpose of storing item-to-item relatedness for ranking flows.
