---
timestamp: 'Sun Oct 19 2025 15:45:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_154531.644bb47a.md]]'
content_id: 077ec7f3b62aa311ceb4dcd4584b31276923b1316a91226688837d5fc6b0fa33
---

# response:

```typescript
// file: src/Reviewing/ReviewingConcept.test.ts

import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertObjectMatch,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ReviewingConcept from "./ReviewingConcept.ts";

// Define generic types for easier use in tests
type User = ID;
type ItemId = ID;
type STARS = 1 | 2 | 3 | 4 | 5;

// Valid IDs from new-york-museums.json for testing
const VALID_MUSEUM_ID: ItemId = "alice-austen-house-museum" as ItemId;
const VALID_EXHIBIT_ID: ItemId = "alice-austen-and-the-old-house" as ItemId; // From Alice Austen House
const ANOTHER_VALID_MUSEUM_ID: ItemId = "brooklyn-museum" as ItemId;

// User IDs for testing
const USER_ALICE: User = "user:Alice" as User;
const USER_BOB: User = "user:Bob" as User;

// Invalid ID for testing
const INVALID_ITEM_ID: ItemId = "non-existent-museum-or-exhibit" as ItemId;

Deno.test("should successfully load museum data for validation", async () => {
  const [db, client] = await testDb();
  const concept = new ReviewingConcept(db);

  try {
    // The constructor already initiates the load, we just need to wait for it.
    // If there was an error during load, the subsequent tests will fail.
    // We can indirectly check by trying to upsert a valid item.
    const result = await concept.upsertReview({
      user: USER_ALICE,
      item: VALID_MUSEUM_ID,
      stars: 3,
    });
    console.log(
      `[Test Step] Initial upsert check for data load: User ${USER_ALICE} reviewed ${VALID_MUSEUM_ID}, result: ${
        JSON.stringify(result)
      }`,
    );
    assertEquals(result, {});
    await concept.clearReview({ user: USER_ALICE, item: VALID_MUSEUM_ID }); // Clean up
  } finally {
    await client.close();
  }
});

// --- Operational Principle Test ---
Deno.test("Operational Principle: Upserting reviews correctly updates or creates, and tracks timestamp", async () => {
  const [db, client] = await testDb();
  const concept = new ReviewingConcept(db);

  try {
    const user = USER_ALICE;
    const item = VALID_MUSEUM_ID;

    // 1. Create a new review
    console.log(
      `[Trace] Creating first review for user ${user}, item ${item} with 4 stars.`,
    );
    const firstUpsertResult = await concept.upsertReview({
      user,
      item,
      stars: 4,
      note: "Great place!",
    });
    assertEquals(firstUpsertResult, {});

    const firstReviews = await concept._getReview({ user, item }); // Renamed variable
    assertEquals(firstReviews.length, 1); // Assert array length
    const firstReview = firstReviews[0]; // Get the single review
    assertObjectMatch(firstReview, {
      user,
      item,
      stars: 4,
      note: "Great place!",
    });
    const firstUpdatedAt = firstReview.updatedAt;
    console.log(
      `[Trace] First review created: ${JSON.stringify(firstReview)}`,
    );

    // Introduce a small delay to ensure updatedAt changes in the next upsert
    await new Promise((resolve) => setTimeout(resolve, 10));

    console.log(
      `[Trace] Updating review for user ${user}, item ${item} to 5 stars with a new note.`,
    );
    const secondUpsertResult = await concept.upsertReview({
      user,
      item,
      stars: 5,
      note: "Absolutely loved it!",
    });
    assertEquals(secondUpsertResult, {});
    const updatedReviews = await concept._getReview({ user, item }); // Renamed variable
    assertEquals(updatedReviews.length, 1); // Assert array length
    const updatedReview = updatedReviews[0]; // Get the single review
    assertObjectMatch(updatedReview, {
      user,
      item,
      stars: 5,
      note: "Absolutely loved it!",
    });
    assertNotEquals(updatedReview.updatedAt, firstUpdatedAt); // Verify updatedAt changed
    console.log(`[Trace] Review updated: ${JSON.stringify(updatedReview)}`);

    // Clean up
    await concept.clearReview({ user, item });
  } finally {
    await client.close();
  }
});

// --- Interesting Scenarios ---

Deno.test("Scenario 1: Multiple users review the same item", async () => {
  const [db, client] = await testDb();
  const concept = new ReviewingConcept(db);

  try {
    const item = VALID_MUSEUM_ID;

    // Alice reviews the museum
    console.log(
      `[Trace] User ${USER_ALICE} reviews item ${item} with 4 stars.`,
    );
    const aliceUpsertResult = await concept.upsertReview({
      user: USER_ALICE,
      item,
      stars: 4,
    });
    assertEquals(aliceUpsertResult, {});

    // Bob reviews the same museum
    console.log(
      `[Trace] User ${USER_BOB} reviews item ${item} with 3 stars.`,
    );
    const bobUpsertResult = await concept.upsertReview({
      user: USER_BOB,
      item,
      stars: 3,
      note: "It was okay.",
    });
    assertEquals(bobUpsertResult, {});

    // Verify both reviews exist for the item
    console.log(`[Trace] Getting all reviews for item ${item}.`);
    const reviews = await concept._getReviewsByItem({ item });
    assertEquals(reviews.length, 2);
    assertObjectMatch(reviews.find((r) => r.user === USER_ALICE)!, {
      user: USER_ALICE,
      stars: 4,
    });
    assertObjectMatch(reviews.find((r) => r.user === USER_BOB)!, {
      user: USER_BOB,
      stars: 3,
      note: "It was okay.",
    });
    console.log(`[Trace] Reviews for item ${item}: ${JSON.stringify(reviews)}`);

    // Clean up
    await concept.clearReview({ user: USER_ALICE, item });
    await concept.clearReview({ user: USER_BOB, item });
  } finally {
    await client.close();
  }
});

Deno.test("Scenario 2: Same user reviews multiple items (museum and exhibit)", async () => {
  const [db, client] = await testDb();
  const concept = new ReviewingConcept(db);

  try {
    const user = USER_ALICE;
    const museum = VALID_MUSEUM_ID;
    const exhibit = VALID_EXHIBIT_ID;

    // Alice reviews the museum
    console.log(
      `[Trace] User ${user} reviews museum ${museum} with 5 stars.`,
    );
    const museumReviewResult = await concept.upsertReview({
      user,
      item: museum,
      stars: 5,
      note: "Amazing experience!",
    });
    assertEquals(museumReviewResult, {});

    // Alice reviews an exhibit within the museum
    console.log(
      `[Trace] User ${user} reviews exhibit ${exhibit} with 4 stars.`,
    );
    const exhibitReviewResult = await concept.upsertReview({
      user,
      item: exhibit,
      stars: 4,
      note: "The exhibit was great.",
    });
    assertEquals(exhibitReviewResult, {});

    // Verify Alice's reviews
    console.log(`[Trace] Getting all reviews by user ${user}.`);
    const aliceReviews = await concept._getReviewsByUser({ user });
    assertEquals(aliceReviews.length, 2);
    assertObjectMatch(aliceReviews.find((r) => r.item === museum)!, {
      item: museum,
      stars: 5,
    });
    assertObjectMatch(aliceReviews.find((r) => r.item === exhibit)!, {
      item: exhibit,
      stars: 4,
    });
    console.log(
      `[Trace] Reviews by user ${user}: ${JSON.stringify(aliceReviews)}`,
    );

    // Clean up
    await concept.clearReview({ user, item: museum });
    await concept.clearReview({ user, item: exhibit });
  } finally {
    await client.close();
  }
});

Deno.test("Scenario 3: Clear an existing review successfully", async () => {
  const [db, client] = await testDb();
  const concept = new ReviewingConcept(db);

  try {
    const user = USER_BOB;
    const item = ANOTHER_VALID_MUSEUM_ID;

    // First, create a review
    console.log(
      `[Trace] Creating review for user ${user}, item ${item} before clearing.`,
    );
    await concept.upsertReview({
      user,
      item,
      stars: 2,
      note: "Needs improvement.",
    });

    const reviewsBeforeClear = await concept._getReview({ user, item }); // Renamed variable
    assertEquals(reviewsBeforeClear.length, 1); // Assert array length
    const reviewBeforeClear = reviewsBeforeClear[0]; // Get the single review
    console.log(
      `[Trace] Review before clear: ${JSON.stringify(reviewBeforeClear)}`,
    );

    // ... (clear action)

    // Now, clear the review
    console.log(`[Trace] Clearing review for user ${user}, item ${item}.`);
    const clearResult = await concept.clearReview({ user, item });
    assertEquals(clearResult, {});

    // Verify the review is gone
    console.log(
      `[Trace] Verifying review for user ${user}, item ${item} is gone.`,
    );
    const reviewsAfterClear = await concept._getReview({ user, item }); // Renamed variable
    assertEquals(reviewsAfterClear.length, 0); // Assert empty array
    console.log(
      `[Trace] Review after clear: ${JSON.stringify(reviewsAfterClear)}`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Scenario 4: Attempt to clear a non-existent review (expect error)", async () => {
  const [db, client] = await testDb();
  const concept = new ReviewingConcept(db);

  try {
    const user = USER_ALICE;
    const item = ANOTHER_VALID_MUSEUM_ID; // Assuming no review for this user/item exists

    // Attempt to clear review without creating it first
    console.log(
      `[Trace] Attempting to clear non-existent review for user ${user}, item ${item}.`,
    );
    const clearResult = await concept.clearReview({ user, item });
    assertNotEquals(clearResult, {});
    assertExists((clearResult as { error: string }).error);
    assertEquals(
      (clearResult as { error: string }).error,
      `No review found for user '${user}' and item '${item}'.`,
    );
    console.log(
      `[Trace] Expected error received: ${JSON.stringify(clearResult)}`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Scenario 5: Upsert review with an invalid item ID (expect error)", async () => {
  const [db, client] = await testDb();
  const concept = new ReviewingConcept(db);

  try {
    const user = USER_ALICE;
    const item = INVALID_ITEM_ID;

    // Attempt to upsert a review for an invalid item
    console.log(
      `[Trace] Attempting to upsert review for invalid item ID: ${item}.`,
    );
    const upsertResult = await concept.upsertReview({ user, item, stars: 1 });
    assertNotEquals(upsertResult, {});
    assertExists((upsertResult as { error: string }).error);
    assertEquals(
      (upsertResult as { error: string }).error,
      `Invalid item ID: '${item}'. Must be a valid museum or exhibit ID.`,
    );
    console.log(
      `[Trace] Expected error received: ${JSON.stringify(upsertResult)}`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Scenario 6: Upsert review with invalid stars rating (expect error)", async () => {
  const [db, client] = await testDb();
  const concept = new ReviewingConcept(db);

  try {
    const user = USER_BOB;
    const item = VALID_MUSEUM_ID;

    // Attempt to upsert with 0 stars
    console.log(
      `[Trace] Attempting to upsert review for item ${item} with 0 stars.`,
    );
    const zeroStarsResult = await concept.upsertReview({
      user,
      item,
      stars: 0 as STARS,
    }); // Cast to STARS to bypass TS compiler, but it should be caught at runtime
    assertNotEquals(zeroStarsResult, {});
    assertExists((zeroStarsResult as { error: string }).error);
    assertEquals(
      (zeroStarsResult as { error: string }).error,
      "Stars rating must be between 1 and 5, received 0.",
    );
    console.log(
      `[Trace] Expected error received for 0 stars: ${
        JSON.stringify(zeroStarsResult)
      }`,
    );

    // Attempt to upsert with 6 stars
    console.log(
      `[Trace] Attempting to upsert review for item ${item} with 6 stars.`,
    );
    const sixStarsResult = await concept.upsertReview({
      user,
      item,
      stars: 6 as STARS,
    }); // Cast to STARS to bypass TS compiler
    assertNotEquals(sixStarsResult, {});
    assertExists((sixStarsResult as { error: string }).error);
    assertEquals(
      (sixStarsResult as { error: string }).error,
      "Stars rating must be between 1 and 5, received 6.",
    );
    console.log(
      `[Trace] Expected error received for 6 stars: ${
        JSON.stringify(sixStarsResult)
      }`,
    );

    // Clean up (if any invalid upserts somehow created a review)
    await concept.clearReview({ user, item });
  } finally {
    await client.close();
  }
});

```
