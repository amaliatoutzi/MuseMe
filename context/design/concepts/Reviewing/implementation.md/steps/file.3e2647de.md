---
timestamp: 'Sat Oct 18 2025 17:04:10 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_170410.b0d8d36b.md]]'
content_id: 3e2647def9a876a2a67a07fc12e251c773f2d07d82f4316546d7777832d89e16
---

# file: src/Reviewing/ReviewingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts"; // Assuming these are defined as per instructions
import { freshID } from "@utils/database.ts"; // Assuming this is defined as per instructions

// Declare collection prefix, use concept name
const PREFIX = "Reviewing" + ".";

// Generic types of this concept
type User = ID;
type ItemId = ID; // Can be MuseumId or ExhibitId

/**
 * Valid star ratings for a review.
 */
export type STARS = 1 | 2 | 3 | 4 | 5;

/**
 * Represents a single review entry in the system.
 *
 * a set of Reviews with
 *   a user User
 *   an item ItemId (MuseumId or ExhibitId)
 *   a stars of STARS_1 | STARS_2 | STARS_3 | STARS_4 | STARS_5
 *   an optional note String
 *   an updatedAt DateTime
 */
interface Review {
  _id: ID; // Unique ID for the review document itself
  user: User;
  item: ItemId;
  stars: STARS;
  note?: string;
  updatedAt: Date;
}

export default class ReviewingConcept {
  reviews: Collection<Review>;

  constructor(private readonly db: Db) {
    this.reviews = this.db.collection<Review>(PREFIX + "reviews");
    // Ensure a unique compound index on user and item to enforce the "single source of truth" principle.
    // This allows efficient upserts and prevents multiple reviews by the same user for the same item.
    this.reviews.createIndex({ user: 1, item: 1 }, { unique: true });
  }

  /**
   * upsertReview (user: User, item: ItemId, stars: STARS_1..STARS_5, note?: String)
   *
   * @param {Object} args - The arguments for the action.
   * @param {User} args.user - The ID of the user submitting the review.
   * @param {ItemId} args.item - The ID of the item being reviewed (museum or exhibit).
   * @param {STARS} args.stars - The star rating (1-5).
   * @param {string} [args.note] - An optional note for the review.
   * @returns {Empty | {error: string}} An empty object on success, or an error object.
   *
   * requires user exists
   * effects if Reviews(user, item) exists, update stars and note if it exists;
   *   else create review; set updatedAt := now
   */
  async upsertReview(
    { user, item, stars, note }: {
      user: User;
      item: ItemId;
      stars: STARS;
      note?: string;
    },
  ): Promise<Empty | { error: string }> {
    if (!user || !item || !stars) {
      return { error: "User, item, and stars are required." };
    }
    if (stars < 1 || stars > 5) {
      return { error: "Stars must be between 1 and 5." };
    }

    const now = new Date();
    const filter = { user, item };
    const update = {
      $set: {
        stars,
        updatedAt: now,
        ...(note !== undefined && { note }), // Only update note if provided
      },
      $setOnInsert: {
        _id: freshID(), // Generate a new ID if inserting
      },
    };

    try {
      // findOneAndUpdate with upsert:true atomically updates an existing review
      // or inserts a new one if not found, based on the user and item.
      await this.reviews.findOneAndUpdate(filter, update, { upsert: true });
      return {};
    } catch (e) {
      console.error(`Error upserting review for user ${user}, item ${item}:`, e);
      return { error: "Failed to upsert review." };
    }
  }

  /**
   * clearReview (user: User, item: ItemId)
   *
   * @param {Object} args - The arguments for the action.
   * @param {User} args.user - The ID of the user whose review is to be cleared.
   * @param {ItemId} args.item - The ID of the item whose review is to be cleared.
   * @returns {Empty | {error: string}} An empty object on success, or an error object.
   *
   * requires Reviews(user, item) exists
   * effects delete that Reviews
   */
  async clearReview(
    { user, item }: { user: User; item: ItemId },
  ): Promise<Empty | { error: string }> {
    if (!user || !item) {
      return { error: "User and item are required." };
    }

    try {
      const result = await this.reviews.deleteOne({ user, item });

      if (result.deletedCount === 0) {
        // As per 'requires', if no review exists, this is an error condition.
        return { error: `No review found for user ${user} and item ${item}.` };
      }
      return {};
    } catch (e) {
      console.error(`Error clearing review for user ${user}, item ${item}:`, e);
      return { error: "Failed to clear review." };
    }
  }

  // --- Queries ---

  /**
   * _getReview (user: User, item: ItemId): (review: Review | null)
   *
   * @param {Object} args - The arguments for the query.
   * @param {User} args.user - The ID of the user.
   * @param {ItemId} args.item - The ID of the item.
   * @returns {Review | null} The review object if found, otherwise null.
   */
  async _getReview(
    { user, item }: { user: User; item: ItemId },
  ): Promise<Review | null> {
    return await this.reviews.findOne({ user, item });
  }

  /**
   * _getAllReviewsByItem (item: ItemId): (reviews: Review[])
   *
   * @param {Object} args - The arguments for the query.
   * @param {ItemId} args.item - The ID of the item.
   * @returns {Review[]} An array of all reviews for the given item.
   */
  async _getAllReviewsByItem(
    { item }: { item: ItemId },
  ): Promise<Review[]> {
    return await this.reviews.find({ item }).toArray();
  }

  /**
   * _getAllReviewsByUser (user: User): (reviews: Review[])
   *
   * @param {Object} args - The arguments for the query.
   * @param {User} args.user - The ID of the user.
   * @returns {Review[]} An array of all reviews submitted by the given user.
   */
  async _getAllReviewsByUser(
    { user }: { user: User },
  ): Promise<Review[]> {
    return await this.reviews.find({ user }).toArray();
  }
}
```
