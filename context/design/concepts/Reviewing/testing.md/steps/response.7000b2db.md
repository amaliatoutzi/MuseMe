---
timestamp: 'Sat Oct 18 2025 17:25:54 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_172554.257df7a0.md]]'
content_id: 7000b2db4c20e0ccd9eb7628e6f8ce95363aee98a9df6e5d68c0f2a0eb8f3104
---

# response:

```typescript
// file: src/Reviewing/ReviewingConcept.test.ts

import { assertEquals, assertNotEquals, assertExists, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ReviewingConcept from "./ReviewingConcept.ts";
import { ID } from "@utils/types.ts";

// Helper for consistent console output
const log = (message: string, data: any = "") => console.log(`\n--- ${message} ---`, data);

// Define some test IDs for users and items
const USER_ALICE: ID = "user:Alice" as ID;
const USER_BOB: ID = "user:Bob" as ID;

// Valid Museum and Exhibit IDs from new-york-museums.json
const MUSEUM_AAH: ID = "alice-austen-house-museum" as ID;
const EXHIBIT_AAH_OLD_HOUSE: ID = "alice-austen-and-the-old-house" as ID;

// An invalid item ID to test validation
const INVALID_ITEM: ID = "non-existent-museum-or-exhibit-id" as ID;

// Star ratings
const STARS_1 = 1 as const;
const STARS_3 = 3 as const;
const STARS_5 = 5 as const;

Deno.test("Reviewing Concept Tests", async (test) => {
  let db: any; // Db from 'npm:mongodb'
  let client: any; // MongoClient from 'npm:mongodb'
  let reviewingConcept: ReviewingConcept;

  // Setup before all tests in this file
  Deno.test.beforeAll(async () => {
    [db, client] = await testDb();
    reviewingConcept = new ReviewingConcept(db);

    // Ensure museum data is loaded before any test runs.
    // The concept's constructor already initiates this, but we explicitly await the promise here
    // to catch any loading errors early and ensure the validation data is ready.
    try {
      await (reviewingConcept as any).museumDataLoadPromise; // Access the private promise
      console.log("Museum data loaded successfully for ReviewingConcept tests.");
    } catch (e) {
      console.error("Failed to load museum data during ReviewingConcept setup:", e);
      throw e; // Propagate the error to fail the test run early
    }
  });

  // Teardown after all tests in this file
  Deno.test.afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  await test.step("Operational Principle: Upserting and overwriting reviews", async () => {
    log("Scenario: Alice reviews AAH, then updates her review, verifying overwrite behavior.");

    // Trace: Alice's initial review for AAH
    const initialReviewResult = await reviewingConcept.upsertReview({
      user: USER_ALICE,
      item: MUSEUM_AAH,
      stars: STARS_3,
      note: "Enjoyed the history and exhibits at Alice Austen House.",
    });
    log("Alice's initial review for AAH:", initialReviewResult);
    assertEquals(initialReviewResult, {}, "Action: upsertReview should succeed for initial review.");

    let review = await reviewingConcept._getReview({ user: USER_ALICE, item: MUSEUM_AAH });
    log("Query: Retrieved initial review:", review);
    assertExists(review, "Query: Review should exist after initial upsert.");
    assertEquals(review!.user, USER_ALICE, "State: User ID should match.");
    assertEquals(review!.item, MUSEUM_AAH, "State: Item ID should match.");
    assertEquals(review!.stars, STARS_3, "State: Stars should match initial rating.");
    assertEquals(review!.note, "Enjoyed the history and exhibits at Alice Austen House.", "State: Note should match initial note.");
    const initialUpdatedAt = review!.updatedAt;

    // Trace: Alice updates her review for AAH
    // Introduce a small delay to ensure `updatedAt` will be different.
    await new Promise((r) => setTimeout(r, 10));
    const updatedReviewResult = await reviewingConcept.upsertReview({
      user: USER_ALICE,
      item: MUSEUM_AAH,
      stars: STARS_5,
      note: "Absolutely loved it, changed my mind after a second visit!",
    });
    log("Alice's updated review for AAH:", updatedReviewResult);
    assertEquals(updatedReviewResult, {}, "Action: upsertReview should succeed for updated review.");

    review = await reviewingConcept._getReview({ user: USER_ALICE, item: MUSEUM_AAH });
    log("Query: Retrieved updated review:", review);
    assertExists(review, "Query: Review should still exist after update.");
    assertEquals(review!.stars, STARS_5, "State: Stars should be updated.");
    assertEquals(review!.note, "Absolutely loved it, changed my mind after a second visit!", "State: Note should be updated.");
    assertNotEquals(review!.updatedAt.getTime(), initialUpdatedAt.getTime(), "State: updatedAt timestamp should be updated.");
  });

  await test.step("Scenario: Clearing an existing review", async () => {
    log("Scenario: Alice reviews an exhibit, then clears her review.");

    // Trace: Alice reviews an exhibit
    await reviewingConcept.upsertReview({
      user: USER_ALICE,
      item: EXHIBIT_AAH_OLD_HOUSE,
      stars: STARS_3,
      note: "Interesting permanent exhibit.",
    });
    let review = await reviewingConcept._getReview({ user: USER_ALICE, item: EXHIBIT_AAH_OLD_HOUSE });
    assertExists(review, "Precondition: Review for exhibit should exist before clearing.");

    // Trace: Alice clears her review
    const clearResult = await reviewingConcept.clearReview({ user: USER_ALICE, item: EXHIBIT_AAH_OLD_HOUSE });
    log("Action: Clear review result:", clearResult);
    assertEquals(clearResult, {}, "Action: clearReview should succeed for existing review.");

    review = await reviewingConcept._getReview({ user: USER_ALICE, item: EXHIBIT_AAH_OLD_HOUSE });
    log("Query: Retrieved review after clearing:", review);
    assertEquals(review, null, "State: Review for exhibit should be null after clearing.");
  });

  await test.step("Scenario: Attempting to clear a non-existent review", async () => {
    log("Scenario: Bob attempts to clear a review he never made for MUSEUM_AAH.");

    // Trace: Bob tries to clear a review that does not exist
    const clearResult = await reviewingConcept.clearReview({ user: USER_BOB, item: MUSEUM_AAH });
    log("Action: Clear non-existent review result:", clearResult);
    assertObjectMatch(clearResult, { error: /No review found/ }, "Action: clearReview should return an error for non-existent review.");
  });

  await test.step("Scenario: Upserting reviews for multiple users/items and querying by user/item", async () => {
    log("Scenario: Multiple users review multiple items. Verify using _getReviewsByUser and _getReviewsByItem queries.");

    // Trace: Setup reviews
    await reviewingConcept.upsertReview({ user: USER_ALICE, item: MUSEUM_AAH, stars: STARS_3, note: "Good museum." });
    await reviewingConcept.upsertReview({ user: USER_BOB, item: MUSEUM_AAH, stars: STARS_5, note: "Excellent museum!" });
    await reviewingConcept.upsertReview({ user: USER_ALICE, item: EXHIBIT_AAH_OLD_HOUSE, stars: STARS_1, note: "Not for me." });

    // Query: Verify reviews by Alice
    const aliceReviews = await reviewingConcept._getReviewsByUser({ user: USER_ALICE });
    log("Query: Alice's reviews:", aliceReviews.map(r => ({ item: r.item, stars: r.stars })));
    assertEquals(aliceReviews.length, 2, "Query: Alice should have 2 reviews.");
    assertExists(aliceReviews.find((r) => r.item === MUSEUM_AAH && r.stars === STARS_3), "Query: Alice's review for AAH should exist.");
    assertExists(aliceReviews.find((r) => r.item === EXHIBIT_AAH_OLD_HOUSE && r.stars === STARS_1), "Query: Alice's review for EXHIBIT should exist.");

    // Query: Verify reviews by Bob
    const bobReviews = await reviewingConcept._getReviewsByUser({ user: USER_BOB });
    log("Query: Bob's reviews:", bobReviews.map(r => ({ item: r.item, stars: r.stars })));
    assertEquals(bobReviews.length, 1, "Query: Bob should have 1 review.");
    assertExists(bobReviews.find((r) => r.item === MUSEUM_AAH && r.stars === STARS_5), "Query: Bob's review for AAH should exist.");

    // Query: Verify reviews for MUSEUM_AAH
    const aahReviews = await reviewingConcept._getReviewsByItem({ item: MUSEUM_AAH });
    log("Query: Reviews for MUSEUM_AAH:", aahReviews.map(r => ({ user: r.user, stars: r.stars })));
    assertEquals(aahReviews.length, 2, "Query: MUSEUM_AAH should have 2 reviews.");
    assertExists(aahReviews.find((r) => r.user === USER_ALICE), "Query: Alice's review for AAH should be present.");
    assertExists(aahReviews.find((r) => r.user === USER_BOB), "Query: Bob's review for AAH should be present.");

    // Query: Verify reviews for EXHIBIT_AAH_OLD_HOUSE
    const exhibitReviews = await reviewingConcept._getReviewsByItem({ item: EXHIBIT_AAH_OLD_HOUSE });
    log("Query: Reviews for EXHIBIT_AAH_OLD_HOUSE:", exhibitReviews.map(r => ({ user: r.user, stars: r.stars })));
    assertEquals(exhibitReviews.length, 1, "Query: Exhibit should have 1 review.");
    assertExists(exhibitReviews.find((r) => r.user === USER_ALICE), "Query: Alice's review for Exhibit should be present.");
  });

  await test.step("Scenario: Handling invalid item IDs for upsert and clear", async () => {
    log("Scenario: Attempting to review/clear an invalid item ID, expecting validation errors.");

    // Trace: Upsert with invalid item ID
    const upsertInvalidResult = await reviewingConcept.upsertReview({
      user: USER_ALICE,
      item: INVALID_ITEM,
      stars: STARS_3,
      note: "This review should not be created.",
    });
    log("Action: Upsert invalid item result:", upsertInvalidResult);
    assertObjectMatch(upsertInvalidResult, { error: /Invalid item ID/ }, "Action: upsertReview should return an error for invalid item ID.");

    // Trace: Clear with invalid item ID
    const clearInvalidResult = await reviewingConcept.clearReview({
      user: USER_ALICE,
      item: INVALID_ITEM,
    });
    log("Action: Clear invalid item result:", clearInvalidResult);
    assertObjectMatch(clearInvalidResult, { error: /Invalid item ID/ }, "Action: clearReview should return an error for invalid item ID.");
  });

  await test.step("Scenario: Handling invalid stars rating for upsert", async () => {
    log("Scenario: Attempting to upsert a review with out-of-range stars, expecting validation errors.");

    // Trace: Upsert with stars too low (0)
    const lowStarsResult = await reviewingConcept.upsertReview({
      user: USER_ALICE,
      item: MUSEUM_AAH,
      stars: 0 as any, // Cast to any to bypass TypeScript's static type checking for this specific test case
      note: "Stars should be 1-5.",
    });
    log("Action: Upsert with 0 stars result:", lowStarsResult);
    assertObjectMatch(lowStarsResult, { error: /Stars rating must be between 1 and 5/ }, "Action: upsertReview should return an error for stars < 1.");

    // Trace: Upsert with stars too high (6)
    const highStarsResult = await reviewingConcept.upsertReview({
      user: USER_ALICE,
      item: MUSEUM_AAH,
      stars: 6 as any, // Cast to any for the same reason
      note: "Stars should be 1-5.",
    });
    log("Action: Upsert with 6 stars result:", highStarsResult);
    assertObjectMatch(highStarsResult, { error: /Stars rating must be between 1 and 5/ }, "Action: upsertReview should return an error for stars > 5.");
  });
});
```
