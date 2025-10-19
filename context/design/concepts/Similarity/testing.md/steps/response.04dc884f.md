---
timestamp: 'Sat Oct 18 2025 19:13:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_191359.7702ee91.md]]'
content_id: 04dc884ffc3986a1fade2f14ebbcc77b31179a8c541cbb60995d39808a72ab3d
---

# response:

```typescript
/// file: src/Similarity/SimilarityConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
// Adjust the import path if your file structure differs, e.g., `../utils/new-york-museums.json`
import museumsRaw from "@utils/new-york-museums.json" with {
  type: "json",
};

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
export type Scope = "museums" | "exhibits" | "all";

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
        itemTags.set(exhibitId, museumTags); // Exhibits inherit tags from their parent museum
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
      return { error: `No items found in catalog for scope: ${currentScope}` };
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
        const intersection = new Set(
          [...tags1].filter((tag) => tags2.has(tag)),
        );
        if (intersection.size === 0) {
          continue;
        }

        // Calculate Cosine Similarity: |tags(i) ∩ tags(j)| / sqrt(|tags(i)| * |tags(j)|)
        const numCommonTags = intersection.size;
        const denom = Math.sqrt(tags1.size * tags2.size);

        let score = 0;
        if (denom > 0) {
          score = numCommonTags / denom;
        }
        // If denom is 0 (e.g., one or both tag sets are empty), score remains 0.
        // This scenario should largely be covered by the `intersection.size === 0` check.

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
    for (const [, links] of potentialLinksByFrom.entries()) {
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
