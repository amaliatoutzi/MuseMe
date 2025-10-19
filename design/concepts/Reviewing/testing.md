[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: Reviewing

Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Some more details about the test cases you should include:
- Operational principle. A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example.
- Interesting scenarios. Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors.
- Number required. For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios.
- No state setup. Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state.

# Make edits:
The ID of museum or exhibit that you use must be in the file `new-york-museums.json`  for them to be valid. Add a testcase to check that invalid names give errors.

Each test should be a new Dyno.test so Deno.test("", async (t) => { ... } ) for eaach testcase. Mark clearly which is the test for the operational principle. Each testcase should be at top level

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

    const firstReview = await concept._getReview({ user, item });
    assertExists(firstReview);
    assertObjectMatch(firstReview!, {
      user,
      item,
      stars: 4,
      note: "Great place!",
    });
    const firstUpdatedAt = firstReview!.updatedAt;
    console.log(
      `[Trace] First review created: ${JSON.stringify(firstReview)}`,
    );

    // Introduce a small delay to ensure updatedAt changes in the next upsert
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 2. Update the existing review
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

    const updatedReview = await concept._getReview({ user, item });
    assertExists(updatedReview);
    assertObjectMatch(updatedReview!, {
      user,
      item,
      stars: 5,
      note: "Absolutely loved it!",
    });
    assertNotEquals(updatedReview!.updatedAt, firstUpdatedAt); // Verify updatedAt changed
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
    const reviewBeforeClear = await concept._getReview({ user, item });
    assertExists(reviewBeforeClear);
    console.log(
      `[Trace] Review before clear: ${JSON.stringify(reviewBeforeClear)}`,
    );

    // Now, clear the review
    console.log(`[Trace] Clearing review for user ${user}, item ${item}.`);
    const clearResult = await concept.clearReview({ user, item });
    assertEquals(clearResult, {});

    // Verify the review is gone
    console.log(
      `[Trace] Verifying review for user ${user}, item ${item} is gone.`,
    );
    const reviewAfterClear = await concept._getReview({ user, item });
    assertEquals(reviewAfterClear, null);
    console.log(
      `[Trace] Review after clear: ${JSON.stringify(reviewAfterClear)}`,
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
