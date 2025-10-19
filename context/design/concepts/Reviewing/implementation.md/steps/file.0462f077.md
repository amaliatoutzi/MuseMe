---
timestamp: 'Sat Oct 18 2025 17:13:00 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_171300.51f8dda2.md]]'
content_id: 0462f0770577a7813db9a661e1daf86ef6ec9fd2ef7851980cdfbd87464cd275
---

# file: src/Reviewing/ReviewingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts"; // Assumed to provide `ID = string` and `Empty = Record<PropertyKey, never>`
import { freshID } from "@utils/database.ts"; // Assumed to provide a unique string ID generator

// Declare collection prefix, uses concept name for modularity
const PREFIX = "Reviewing" + ".";

// Generic types for this concept, treated as opaque IDs
type User = ID;
type ItemId = ID; // Can represent a MuseumId or an ExhibitId

/**
 * Valid star ratings for a review, ranging from 1 to 5.
 */
export type STARS = 1 | 2 | 3 | 4 | 5;

/**
 * Represents a single review entry in the system.
 * This structure maps directly to a document in the 'reviews' MongoDB collection.
 *
 * State:
 * a set of Reviews with
 *   a user User
 *   an item ItemId (MuseumId or ExhibitId)
 *   a stars of STARS_1 | STARS_2 | STARS_3 | STARS_4 | STARS_5
 *   an optional note String
 *   an updatedAt DateTime
 */
interface Review {
  _id: ID; // Unique ID for the review document itself
  user: User; // The ID of the user who submitted the review
  item: ItemId; // The ID of the item (museum or exhibit) being reviewed
  stars: STARS; // The star rating (1-5)
  note?: string; // An optional textual note for the review
  updatedAt: Date; // Timestamp of the last update to the review
}

/**
 * The ReviewingConcept manages the creation, updating, and deletion of user reviews
 * for items (museums or exhibits). It ensures that each user has at most one
 * review per item, acting as the single source of truth for their opinion.
 */
export default class ReviewingConcept {
  reviews: Collection<Review>;

  /**
   * Initializes the ReviewingConcept with a MongoDB database instance.
   * Sets up the 'reviews' collection and ensures a unique compound index
   * on 'user' and 'item' to uphold the "single source of truth" principle.
   *
   * @param db The MongoDB database instance.
   */
  constructor(private readonly db: Db) {
    this.reviews = this.db.collection<Review>(PREFIX + "reviews");
    // Ensure a unique compound index on user and item.
    // This allows efficient upserts and prevents multiple reviews by the same user for the same item.
    this.reviews.createIndex({ user: 1, item: 1 }, { unique: true });
  }

  /**
   * upsertReview (user: User, item: ItemId, stars: STARS_1..STARS_5, note?: String)
   *
   * Records or updates a user's review for a specific item. If a review by the
   * given user for the given item already exists, it will be updated. Otherwise,
   * a new review will be created. The `updatedAt` timestamp is always refreshed.
   *
   * @param args - The arguments for the action.
   * @param args.user - The ID of the user submitting the review.
   * @param args.item - The ID of the item being reviewed (museum or exhibit).
   * @param args.stars - The star rating (1-5).
   * @param [args.note] - An optional note for the review.
   * @returns An empty object `{}` on success, or an `{ error: string }` object if validation fails or an unexpected error occurs.
   *
   * requires user exists (caller/sync ensures this)
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
    // Basic validation for required fields
    if (!user || !item || !stars) {
      return { error: "User, item, and stars are required." };
    }
    // Validate star rating range
    if (stars < 1 || stars > 5) {
      return { error: "Stars must be between 1 and 5." };
    }

    const now = new Date(); // Current timestamp for `updatedAt`
    const filter = { user, item }; // Used to find an existing review
    const update = {
      $set: {
        stars,
        updatedAt: now,
        ...(note !== undefined && { note }), // Only update 'note' if it's explicitly provided
      },
      $setOnInsert: {
        _id: freshID(), // Generate a new unique ID only if a new document is inserted
      },
    };

    try {
      // findOneAndUpdate with upsert:true atomically updates an existing review
      // or inserts a new one based on the user and item, leveraging the unique index.
      await this.reviews.findOneAndUpdate(filter, update, { upsert: true });
      return {}; // Success
    } catch (e) {
      console.error(`Error upserting review for user ${user}, item ${item}:`, e);
      return { error: "Failed to upsert review." }; // Generic error for unexpected issues
    }
  }

  /**
   * clearReview (user: User, item: ItemId)
   *
   * Deletes a user's review for a specific item.
   *
   * @param args - The arguments for the action.
   * @param args.user - The ID of the user whose review is to be cleared.
   * @param args.item - The ID of the item whose review is to be cleared.
   * @returns An empty object `{}` on success, or an `{ error: string }` object if the review does not exist or an unexpected error occurs.
   *
   * requires Reviews(user, item) exists
   * effects delete that Reviews
   */
  async clearReview(
    { user, item }: { user: User; item: ItemId },
  ): Promise<Empty | { error: string }> {
    // Basic validation for required fields
    if (!user || !item) {
      return { error: "User and item are required." };
    }

    try {
      const result = await this.reviews.deleteOne({ user, item });

      // According to the 'requires' clause, a review must exist to be cleared.
      // If no document was deleted, it means the review didn't exist.
      if (result.deletedCount === 0) {
        return { error: `No review found for user ${user} and item ${item}.` };
      }
      return {}; // Success
    } catch (e) {
      console.error(`Error clearing review for user ${user}, item ${item}:`, e);
      return { error: "Failed to clear review." }; // Generic error for unexpected issues
    }
  }

  // --- Queries ---
  // The following methods are internal queries, prefixed with an underscore,
  // allowing other concepts or the application layer to read the state.

  /**
   * _getReview (user: User, item: ItemId): (review: Review | null)
   *
   * Retrieves a single review by a specific user for a specific item.
   *
   * @param args - The arguments for the query.
   * @param args.user - The ID of the user.
   * @param args.item - The ID of the item.
   * @returns The review object if found, otherwise `null`.
   */
  async _getReview(
    { user, item }: { user: User; item: ItemId },
  ): Promise<Review | null> {
    return await this.reviews.findOne({ user, item });
  }

  /**
   * _getAllReviewsByItem (item: ItemId): (reviews: Review[])
   *
   * Retrieves all reviews submitted for a particular item.
   *
   * @param args - The arguments for the query.
   * @param args.item - The ID of the item.
   * @returns An array of all review objects for the given item.
   */
  async _getAllReviewsByItem(
    { item }: { item: ItemId },
  ): Promise<Review[]> {
    return await this.reviews.find({ item }).toArray();
  }

  /**
   * _getAllReviewsByUser (user: User): (reviews: Review[])
   *
   * Retrieves all reviews submitted by a particular user.
   *
   * @param args - The arguments for the query.
   * @param args.user - The ID of the user.
   * @returns An array of all review objects submitted by the given user.
   */
  async _getAllReviewsByUser(
    { user }: { user: User },
  ): Promise<Review[]> {
    return await this.reviews.find({ user }).toArray();
  }
}
```
