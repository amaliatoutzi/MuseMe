---
timestamp: 'Sat Oct 18 2025 17:22:41 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_172241.99f89a3f.md]]'
content_id: df268d229b017264f0ce24dbb2e9784385b9d445c06cb7106bd963a7367d4e70
---

# response:

```typescript
// file: src/Reviewing/ReviewingConcept.test.ts

import { assertEquals, assertNotEquals, assertExists, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ReviewingConcept from "./ReviewingConcept.ts";

// Define sample User and Item IDs for testing
const USER_ALICE = "user:Alice" as ID;
const USER_BOB = "user:Bob" as ID;
const USER_CHARLIE = "user:Charlie" as ID;
const USER_DAVID = "user:David" as ID;
const USER_EVE = "user:Eve" as ID;
const USER_FRANK = "user:Frank" as ID;
const USER_GRACE = "user:Grace" as ID;
const USER_HEIDI = "user:Heidi" as ID;

// Valid IDs from new-york-museums.json (ensure these are present in your JSON file)
const MUSEUM_ALICE_AUSTEN = "alice-austen-house-museum" as ID;
const EXHIBIT_ALICE_AUSTEN_OLD_HOUSE = "alice-austen-and-the-old-house" as ID; // From Alice Austen House
const MUSEUM_AMNH = "american-museum-of-natural-history" as ID;
const EXHIBIT_AMNH_ROSE_CENTER = "rose-center-for-earth-and-space" as ID; // From AMNH

// Invalid IDs for testing error cases
const INVALID_MUSEUM_ID = "non-existent-museum-123" as ID;
const INVALID_EXHIBIT_ID = "non-existent-exhibit-456" as ID;

Deno.test("ReviewingConcept Test Suite", async (t) => {
  const [db, client] = await testDb();
  const reviewing = new ReviewingConcept(db);

  // Helper to wait for museum data to load, for test reliability
  // The concept itself ensures this, but for tests, we might want to explicitly
  // check for errors related to data loading, though usually it's successful.
  const dataLoadResult = await (reviewing as any)._ensureMuseumDataLoaded();
  if (dataLoadResult.error) {
    console.error("Museum data loading failed:", dataLoadResult.error);
    // If data loading fails, it's a critical setup error for the concept,
    // so tests depending on validation will also fail.
    await client.close();
    throw new Error(dataLoadResult.error);
  }

  // # trace: Operational principle - Upsert and Update Review
  await t.step("Principle: User reviews an item, then updates the review", async () => {
    console.log(`\n--- Test: Principle Upsert and Update Review ---`);

    const initialNote = "Really enjoyed the historical context!";
    const initialStars = 4;

    console.log(
      `[Alice] is reviewing [${MUSEUM_ALICE_AUSTEN}] with ${initialStars} stars and note: "${initialNote}"`,
    );
    const initialReviewResult = await reviewing.upsertReview({
      user: USER_ALICE,
      item: MUSEUM_ALICE_AUSTEN,
      stars: initialStars,
      note: initialNote,
    });
    assertEquals(initialReviewResult, {}, "Should successfully create initial review");

    const reviewAfterInitial = await reviewing._getReview({
      user: USER_ALICE,
      item: MUSEUM_ALICE_AUSTEN,
    });
    assertExists(reviewAfterInitial, "Initial review should exist");
    assertEquals(reviewAfterInitial?.user, USER_ALICE);
    assertEquals(reviewAfterInitial?.item, MUSEUM_ALICE_AUSTEN);
    assertEquals(reviewAfterInitial?.stars, initialStars);
    assertEquals(reviewAfterInitial?.note, initialNote);
    const initialUpdatedAt = reviewAfterInitial?.updatedAt;
    assertExists(initialUpdatedAt, "Initial review should have an updatedAt timestamp");
    console.log(
      `Initial review by ${USER_ALICE} for ${MUSEUM_ALICE_AUSTEN}: ${initialStars} stars. Updated at: ${initialUpdatedAt}`,
    );

    // Simulate some time passing
    await new Promise((resolve) => setTimeout(resolve, 10));

    const updatedNote = "Even better than expected, a must-visit!";
    const updatedStars = 5;

    console.log(
      `[Alice] is updating review for [${MUSEUM_ALICE_AUSTEN}] to ${updatedStars} stars and note: "${updatedNote}"`,
    );
    const updatedReviewResult = await reviewing.upsertReview({
      user: USER_ALICE,
      item: MUSEUM_ALICE_AUSTEN,
      stars: updatedStars,
      note: updatedNote,
    });
    assertEquals(updatedReviewResult, {}, "Should successfully update the review");

    const reviewAfterUpdate = await reviewing._getReview({
      user: USER_ALICE,
      item: MUSEUM_ALICE_AUSTEN,
    });
    assertExists(reviewAfterUpdate, "Updated review should still exist");
    assertEquals(reviewAfterUpdate?.user, USER_ALICE);
    assertEquals(reviewAfterUpdate?.item, MUSEUM_ALICE_AUSTEN);
    assertEquals(reviewAfterUpdate?.stars, updatedStars);
    assertEquals(reviewAfterUpdate?.note, updatedNote);
    assertNotEquals(reviewAfterUpdate?.updatedAt, initialUpdatedAt, "Updated timestamp should change");
    assert(
      reviewAfterUpdate!.updatedAt.getTime() > initialUpdatedAt!.getTime(),
      "Updated timestamp should be later than initial timestamp",
    );
    console.log(
      `Updated review by ${USER_ALICE} for ${MUSEUM_ALICE_AUSTEN}: ${updatedStars} stars. Updated at: ${reviewAfterUpdate?.updatedAt}`,
    );
  });

  // # trace: Clear a Review
  await t.step("Clear an existing review", async () => {
    console.log(`\n--- Test: Clear an existing review ---`);

    console.log(`[Bob] is reviewing [${MUSEUM_AMNH}] with 3 stars.`);
    await reviewing.upsertReview({
      user: USER_BOB,
      item: MUSEUM_AMNH,
      stars: 3,
      note: "Decent, but crowded.",
    });

    const reviewBeforeClear = await reviewing._getReview({
      user: USER_BOB,
      item: MUSEUM_AMNH,
    });
    assertExists(reviewBeforeClear, "Review by Bob should exist before clearing");
    console.log(
      `Review by ${USER_BOB} for ${MUSEUM_AMNH} found: ${reviewBeforeClear?.stars} stars.`,
    );

    console.log(`[Bob] is clearing review for [${MUSEUM_AMNH}].`);
    const clearResult = await reviewing.clearReview({ user: USER_BOB, item: MUSEUM_AMNH });
    assertEquals(clearResult, {}, "Should successfully clear the review");

    const reviewAfterClear = await reviewing._getReview({
      user: USER_BOB,
      item: MUSEUM_AMNH,
    });
    assertEquals(reviewAfterClear, null, "Review by Bob should not exist after clearing");
    console.log(`Review by ${USER_BOB} for ${MUSEUM_AMNH} is now gone.`);
  });

  // # trace: Invalid Item ID handling
  await t.step("Handle invalid museum/exhibit IDs", async () => {
    console.log(`\n--- Test: Invalid Item ID Handling ---`);

    console.log(`[Charlie] tries to review [${INVALID_MUSEUM_ID}]`);
    const upsertErrorResult = await reviewing.upsertReview({
      user: USER_CHARLIE,
      item: INVALID_MUSEUM_ID,
      stars: 5,
    });
    assertExists(upsertErrorResult.error, "Upserting with invalid item ID should return an error");
    assertObjectMatch(upsertErrorResult, {
      error: `Invalid item ID: '${INVALID_MUSEUM_ID}'. Must be a valid museum or exhibit ID.`,
    });
    console.log(`Upsert failed as expected: ${upsertErrorResult.error}`);

    console.log(`[Charlie] tries to clear review for [${INVALID_EXHIBIT_ID}]`);
    const clearErrorResult = await reviewing.clearReview({
      user: USER_CHARLIE,
      item: INVALID_EXHIBIT_ID,
    });
    assertExists(clearErrorResult.error, "Clearing with invalid item ID should return an error");
    assertObjectMatch(clearErrorResult, {
      error: `Invalid item ID: '${INVALID_EXHIBIT_ID}'. Must be a valid museum or exhibit ID.`,
    });
    console.log(`Clear failed as expected: ${clearErrorResult.error}`);
  });

  // # trace: Invalid Stars Rating handling
  await t.step("Handle invalid stars rating", async () => {
    console.log(`\n--- Test: Invalid Stars Rating Handling ---`);

    console.log(`[David] tries to review [${MUSEUM_AMNH}] with 0 stars.`);
    const zeroStarsResult = await reviewing.upsertReview({
      user: USER_DAVID,
      item: MUSEUM_AMNH,
      stars: 0 as any, // Cast to any to test the validation logic
    });
    assertExists(zeroStarsResult.error, "Upserting with 0 stars should return an error");
    assertObjectMatch(zeroStarsResult, {
      error: `Stars rating must be between 1 and 5, received 0.`,
    });
    console.log(`Upsert failed as expected: ${zeroStarsResult.error}`);

    console.log(`[David] tries to review [${MUSEUM_AMNH}] with 6 stars.`);
    const sixStarsResult = await reviewing.upsertReview({
      user: USER_DAVID,
      item: MUSEUM_AMNH,
      stars: 6 as any, // Cast to any to test the validation logic
    });
    assertExists(sixStarsResult.error, "Upserting with 6 stars should return an error");
    assertObjectMatch(sixStarsResult, {
      error: `Stars rating must be between 1 and 5, received 6.`,
    });
    console.log(`Upsert failed as expected: ${sixStarsResult.error}`);
  });

  // # trace: Multiple Reviews - Same User, Different Items
  await t.step("Multiple reviews by the same user for different items", async () => {
    console.log(`\n--- Test: Same User, Different Items ---`);

    console.log(`[Eve] reviews [${MUSEUM_ALICE_AUSTEN}] with 4 stars.`);
    await reviewing.upsertReview({
      user: USER_EVE,
      item: MUSEUM_ALICE_AUSTEN,
      stars: 4,
    });

    console.log(`[Eve] reviews [${EXHIBIT_ALICE_AUSTEN_OLD_HOUSE}] with 3 stars.`);
    await reviewing.upsertReview({
      user: USER_EVE,
      item: EXHIBIT_ALICE_AUSTEN_OLD_HOUSE,
      stars: 3,
    });

    const eveReviews = await reviewing._getReviewsByUser({ user: USER_EVE });
    assertEquals(eveReviews.length, 2, "Eve should have 2 reviews");

    const museumReview = eveReviews.find((r) => r.item === MUSEUM_ALICE_AUSTEN);
    assertExists(museumReview);
    assertEquals(museumReview?.stars, 4);

    const exhibitReview = eveReviews.find((r) => r.item === EXHIBIT_ALICE_AUSTEN_OLD_HOUSE);
    assertExists(exhibitReview);
    assertEquals(exhibitReview?.stars, 3);
    console.log(`[Eve] has ${eveReviews.length} reviews as expected.`);
  });

  // # trace: Multiple Reviews - Different Users, Same Item
  await t.step("Multiple reviews by different users for the same item", async () => {
    console.log(`\n--- Test: Different Users, Same Item ---`);

    console.log(`[Frank] reviews [${MUSEUM_AMNH}] with 5 stars.`);
    await reviewing.upsertReview({ user: USER_FRANK, item: MUSEUM_AMNH, stars: 5 });

    console.log(`[Grace] reviews [${MUSEUM_AMNH}] with 3 stars.`);
    await reviewing.upsertReview({ user: USER_GRACE, item: MUSEUM_AMNH, stars: 3 });

    const amnhReviews = await reviewing._getReviewsByItem({ item: MUSEUM_AMNH });
    assertEquals(amnhReviews.length, 2, "AMNH should have 2 reviews");

    const frankReview = amnhReviews.find((r) => r.user === USER_FRANK);
    assertExists(frankReview);
    assertEquals(frankReview?.stars, 5);

    const graceReview = amnhReviews.find((r) => r.user === USER_GRACE);
    assertExists(graceReview);
    assertEquals(graceReview?.stars, 3);
    console.log(`[${MUSEUM_AMNH}] has ${amnhReviews.length} reviews as expected.`);
  });

  // # trace: Edge Case: Clearing a Non-Existent Review
  await t.step("Attempt to clear a non-existent review", async () => {
    console.log(`\n--- Test: Clearing Non-Existent Review ---`);

    const nonExistentReview = await reviewing._getReview({
      user: USER_HEIDI,
      item: EXHIBIT_AMNH_ROSE_CENTER,
    });
    assertEquals(nonExistentReview, null, "No review should exist for Heidi initially");

    console.log(`[Heidi] tries to clear a non-existent review for [${EXHIBIT_AMNH_ROSE_CENTER}]`);
    const clearErrorResult = await reviewing.clearReview({
      user: USER_HEIDI,
      item: EXHIBIT_AMNH_ROSE_CENTER,
    });
    assertExists(clearErrorResult.error, "Clearing a non-existent review should return an error");
    assertObjectMatch(clearErrorResult, {
      error: `No review found for user '${USER_HEIDI}' and item '${EXHIBIT_AMNH_ROSE_CENTER}'.`,
    });
    console.log(`Clear failed as expected: ${clearErrorResult.error}`);
  });

  await client.close();
});
```
