---
timestamp: 'Fri Nov 07 2025 23:28:39 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251107_232839.c17ec781.md]]'
content_id: f5425724f00fe2525fc3150439d7773ff98aa93aabb334a12952e396b87dfb0f
---

# response:

```typescript
// file: src/Reviewing/ReviewingConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import museumsRaw from "@utils/new-york-museums.json" with { type: "json" };

// Declare collection prefix, use concept name
const PREFIX = "Reviewing.";

// Generic type parameters for this concept
type User = ID;
type ItemId = ID; // Represents either a MuseumId or an ExhibitId
type STARS = 1 | 2 | 3 | 4 | 5;

/**
 * Helper function to generate a composite ID for a review document.
 * This ID uniquely identifies a review for a specific user and item,
 * serving as the MongoDB `_id` for the review document.
 */
function getReviewId(user: User, item: ItemId): ID {
  return `${user}::${item}` as ID;
}

/**
 * Interface representing a single review document stored in MongoDB.
 * @state a set of Reviews with properties:
 *   - `_id`: The unique composite identifier for the review (user::item).
 *   - `user`: The ID of the user who submitted the review.
 *   - `item`: The ID of the museum or exhibit being reviewed.
 *   - `stars`: The rating given, from 1 to 5 stars.
 *   - `note?`: An optional textual note accompanying the review.
 *   - `updatedAt`: A timestamp indicating the last time the review was created or updated.
 */
interface Review {
  _id: ID;
  user: User;
  item: ItemId;
  stars: STARS;
  note: string; // now required
  updatedAt: Date;
}

// --- Interfaces for parsing the new-york-museums.json data ---
interface Exhibit {
  id: ID;
  name: string;
  type: string;
}

interface Museum {
  id: ID;
  name: string;
  address: string;
  zip: string;
  borough: string;
  location: { lat: number; lon: number };
  website: string;
  tags: string[];
  exhibits: Exhibit[];
}
// --- End Museum Data Interfaces ---

/**
 * @concept Reviewing [User, Item]
 * @purpose record normalized per-item opinion (1–5 stars) with a required note
 */
export default class ReviewingConcept {
  private reviews: Collection<Review>;
  private initialized = false;
  private readonly validItemIds: Set<ID> = new Set(); // Stores all valid MuseumIds and ExhibitIds

  constructor(private readonly db: Db) {
    this.reviews = this.db.collection(PREFIX + "reviews");
    const museums = (museumsRaw as Museum[]) ?? [];
    const ids = new Set<ID>();
    for (const m of museums) {
      if (m?.id) ids.add(m.id);
      const exs = m.exhibits ?? [];
      for (const e of exs) if (e?.id) ids.add(e.id);
    }
    this.validItemIds = ids;
  }

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
  }

  /**
   * @query _isValidItem
   * Purpose: Checks if an item ID corresponds to a known museum or exhibit.
   * This method assumes `_ensureMuseumDataLoaded` has been called and awaited
   * prior to its invocation for operations that require strict validation.
   * @param itemId The ID of the museum or exhibit to validate.
   * @returns `true` if the item ID is found in the loaded valid items set, `false` otherwise.
   */
  private _isValidItem(itemId: ItemId): boolean {
    return this.validItemIds.has(itemId);
  }

  /**
   * @action upsertReview
   * @principle if Reviews(user,item) exists, then it is the single source of truth for that user’s rating of that item;
   *   subsequent upserts overwrite the prior rating and update the timestamp.
   * @requires user exists (conceptually; this concept treats `User` as a polymorphic `ID` type).
   * @requires item exists (validated against the loaded `new-york-museums.json` data).
   * @effects if a review for `(user, item)` already exists, its `stars` and `note` will be updated, and `updatedAt` set to `now`.
   *   Otherwise, a new review will be created with the provided details and `updatedAt` set to `now`.
   * @param {object} params - The parameters for the review.
   * @param {User} params.user - The ID of the user.
   * @param {ItemId} params.item - The ID of the item (museum or exhibit) being reviewed.
   * @param {STARS} params.stars - The star rating (1-5).
   * @param {string} params.note - A required note (non-empty) justifying the rating.
   * @returns `Empty` on success, or `{ error: string }` if validation fails or an unexpected error occurs.
   */
  async upsertReview(
    { user, item, stars, note }: {
      user: User;
      item: ItemId;
      stars: STARS;
      note: string; // required
    },
  ): Promise<Empty | { error: string }> {
    // Validate the item ID against the loaded museum data.
    if (!this._isValidItem(item)) {
      return {
        error:
          `Invalid item ID: '${item}'. Must be a valid museum or exhibit ID.`,
      };
    }

    // Validate stars rating.
    if (stars < 1 || stars > 5) {
      return {
        error: `Stars rating must be between 1 and 5, received ${stars}.`,
      };
    }

    if (typeof note !== "string" || note.trim() === "") {
      return { error: "Note is required and cannot be blank." };
    }
    const reviewId = getReviewId(user, item);
    const sanitizedNote = note.trim(); // guaranteed non-empty
    const now = new Date();

    try {
      // Use `updateOne` with `upsert: true` to create or update the review atomically.
      await this.reviews.updateOne(
        { _id: reviewId }, // Query for the specific review
        { $set: { user, item, stars, note: sanitizedNote, updatedAt: now } }, // Data to set/update
        { upsert: true }, // Create if not found
      );
      return {}; // Success
    } catch (e) {
      console.error(
        `Error upserting review for user ${user}, item ${item}:`,
        e,
      );
      return { error: "Failed to upsert review due to a database error." };
    }
  }

  /**
   * @action clearReview
   * @requires Reviews(user, item) exists (checked by attempting to find it first).
   * @requires item exists (validated against the loaded `new-york-museums.json` data).
   * @effects Deletes the review associated with the given `user` and `item`.
   * @param {object} params - The parameters to identify the review to clear.
   * @param {User} params.user - The ID of the user whose review is to be cleared.
   * @param {ItemId} params.item - The ID of the item (museum or exhibit) whose review is to be cleared.
   * @returns `Empty` on successful deletion, or `{ error: string }` if the review doesn't exist,
   *   validation fails, or an unexpected error occurs.
   */
  async clearReview(
    { user, item }: { user: User; item: ItemId },
  ): Promise<Empty | { error: string }> {
    // Validate the item ID against the loaded museum data.
    if (!this._isValidItem(item)) {
      return {
        error:
          `Invalid item ID: '${item}'. Must be a valid museum or exhibit ID.`,
      };
    }

    const reviewId = getReviewId(user, item);

    // As per `requires`, check if the review exists before attempting deletion.
    const existingReview = await this.reviews.findOne({ _id: reviewId });
    if (!existingReview) {
      return {
        error: `No review found for user '${user}' and item '${item}'.`,
      };
    }

    try {
      const result = await this.reviews.deleteOne({ _id: reviewId });
      if (result.deletedCount === 1) {
        return {}; // Success
      } else {
        // This case should ideally not be reached if `existingReview` was found.
        console.warn(
          `Attempted to clear review for ${reviewId} but it was not deleted.`,
        );
        return {
          error:
            `Failed to clear review for user '${user}' and item '${item}'.`,
        };
      }
    } catch (e) {
      console.error(`Error clearing review for user ${user}, item ${item}:`, e);
      return { error: "Failed to clear review due to a database error." };
    }
  }

  /**
   * @query _getReview
   * Effects: Returns a single review document in an array if found for the specified user and item.
   *   Returns an empty array if no review is found.
   * @param {object} params - The parameters to identify the review.
   * @param {User} params.user - The ID of the user.
   * @param {ItemId} params.item - The ID of the item.
   * @returns An array containing a `Review` object if found, otherwise an empty array.
   */
  async _getReview(
    { user, item }: { user: User; item: ItemId },
  ): Promise<Review[]> { // Changed return type to Promise<Review[]>
    const reviewId = getReviewId(user, item);
    const review = await this.reviews.findOne({ _id: reviewId });
    return review ? [review] : []; // Wrap the result in an array
  }

  /**
   * @query _getReviewsByUser
   * Effects: Returns all review documents made by a specific user.
   * @param {object} params - The parameters.
   * @param {User} params.user - The ID of the user.
   * @returns An array of `Review` objects.
   */
  async _getReviewsByUser({ user }: { user: User }): Promise<Review[]> {
    return await this.reviews.find({ user }).toArray();
  }

  /**
   * @query _getReviewsByItem
   * Effects: Returns all review documents for a specific item (museum or exhibit).
   * @param {object} params - The parameters.
   * @param {ItemId} params.item - The ID of the item.
   * @returns An array of `Review` objects.
   */
  async _getReviewsByItem({ item }: { item: ItemId }): Promise<Review[]> {
    return await this.reviews.find({ item }).toArray();
  }
}

```
