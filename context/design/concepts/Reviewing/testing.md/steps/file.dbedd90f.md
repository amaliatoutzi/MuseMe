---
timestamp: 'Sat Oct 18 2025 17:09:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_170933.16926655.md]]'
content_id: dbedd90f8e79b128cdc7e5f7c01e7b6b509cbae1f5809037761abc380dbdcaac
---

# file: src/Reviewing/ReviewingConcept.test.ts

```typescript
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Assuming @utils/database.ts provides testDb
import { ID } from "@utils/types.ts"; // Assuming @utils/types.ts provides ID
import ReviewingConcept, { STARS } from "./ReviewingConcept.ts";

Deno.test("ReviewingConcept", async (t) => {
  // Initialize the database for testing
  const [db, client] = await testDb();
  const reviewing = new ReviewingConcept(db);

  // Define some mock IDs for users and items
  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const museumOfArt = "item:MuseumOfArt" as ID;
  const picassoExhibit = "item:ExhibitPicasso" as ID;
  const monetExhibit = "item:ExhibitMonet" as ID;

  // --- Trace: Operational Principle ---
  // Demonstrates how upsertReview creates a new review and then updates it,
  // showing that it's the single source of truth for a user's rating of an item.
  await t.step("should correctly upsert and update reviews (operational principle)", async () => {
    console.log("\n--- Trace: Operational Principle (upsertReview) ---");

    // 1. User Alice reviews Museum of Art for the first time
    const initialNote = "Absolutely loved the contemporary collection!";
    console.log(`Action: upsertReview({ user: ${userAlice}, item: ${museumOfArt}, stars: 5, note: '${initialNote}' })`);
    const result1 = await reviewing.upsertReview({
      user: userAlice,
      item: museumOfArt,
      stars: 5,
      note: initialNote,
    });
    assertEquals(result1, {}, "Expected successful initial upsert");

    // Verify the review was created
    const review1 = await reviewing._getReview({ user: userAlice, item: museumOfArt });
    assertExists(review1, "Review for Alice and Museum of Art should exist");
    assertEquals(review1?.stars, 5, "Initial stars should be 5");
    assertEquals(review1?.note, initialNote, "Initial note should match");
    const initialUpdatedAt = review1?.updatedAt;
    console.log(`State (after 1st upsert): user=${userAlice}, item=${museumOfArt}, stars=${review1?.stars}, note='${review1?.note}', updatedAt=${review1?.updatedAt}`);

    // Introduce a small delay to ensure `updatedAt` changes on subsequent update
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 2. User Alice updates her review for Museum of Art
    const updatedNote = "It was good, but some exhibits were closed for renovation.";
    console.log(`Action: upsertReview({ user: ${userAlice}, item: ${museumOfArt}, stars: 3, note: '${updatedNote}' })`);
    const result2 = await reviewing.upsertReview({
      user: userAlice,
      item: museumOfArt,
      stars: 3,
      note: updatedNote,
    });
    assertEquals(result2, {}, "Expected successful update upsert");

    // Verify the review was updated
    const updatedReview1 = await reviewing._getReview({ user: userAlice, item: museumOfArt });
    assertExists(updatedReview1, "Review for Alice and Museum of Art should still exist after update");
    assertEquals(updatedReview1?.stars, 3, "Stars should be updated to 3");
    assertEquals(updatedReview1?.note, updatedNote, "Note should be updated");
    assertNotEquals(updatedReview1?.updatedAt.getTime(), initialUpdatedAt?.getTime(), "updatedAt should be updated after second upsert");
    const secondUpdatedAt = updatedReview1?.updatedAt;
    console.log(`State (after 2nd upsert): user=${userAlice}, item=${museumOfArt}, stars=${updatedReview1?.stars}, note='${updatedReview1?.note}', updatedAt=${updatedReview1?.updatedAt}`);

    // Introduce a small delay again
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 3. User Alice updates her review for Museum of Art, removing the note
    console.log(`Action: upsertReview({ user: ${userAlice}, item: ${museumOfArt}, stars: 4 })`);
    const result3 = await reviewing.upsertReview({
      user: userAlice,
      item: museumOfArt,
      stars: 4,
    });
    assertEquals(result3, {}, "Expected successful update upsert without note");

    // Verify the review was updated and note removed
    const finalReview1 = await reviewing._getReview({ user: userAlice, item: museumOfArt });
    assertExists(finalReview1, "Review should still exist after update without note");
    assertEquals(finalReview1?.stars, 4, "Stars should be updated to 4");
    assertEquals(finalReview1?.note, undefined, "Note should be removed when not provided in upsert");
    assertNotEquals(finalReview1?.updatedAt.getTime(), secondUpdatedAt?.getTime(), "updatedAt should be updated again");
    console.log(`State (after 3rd upsert): user=${userAlice}, item=${museumOfArt}, stars=${finalReview1?.stars}, note=${finalReview1?.note}, updatedAt=${finalReview1?.updatedAt}`);
  });

  // --- Interesting Scenarios ---

  await t.step("should allow different users to review the same item independently", async () => {
    console.log("\n--- Scenario: Multiple Users, Same Item ---");

    // Ensure Alice has a review for Museum of Art (from principle test, now updated to 4 stars, no note)
    const reviewAliceMuseum = await reviewing._getReview({ user: userAlice, item: museumOfArt });
    assertExists(reviewAliceMuseum, "Alice's review for Museum of Art must exist");
    assertEquals(reviewAliceMuseum?.stars, 4);
    console.log(`Pre-condition: Alice's review for ${museumOfArt}: ${reviewAliceMuseum?.stars} stars`);

    // User Bob reviews Museum of Art
    console.log(`Action: upsertReview({ user: ${userBob}, item: ${museumOfArt}, stars: 2, note: 'Too crowded, not my style.' })`);
    const resultBob = await reviewing.upsertReview({
      user: userBob,
      item: museumOfArt,
      stars: 2,
      note: "Too crowded, not my style.",
    });
    assertEquals(resultBob, {}, "Expected successful upsert for User Bob");

    // Verify Bob's review
    const reviewBobMuseum = await reviewing._getReview({ user: userBob, item: museumOfArt });
    assertExists(reviewBobMuseum, "Review by User Bob for Museum of Art should exist");
    assertEquals(reviewBobMuseum?.stars, 2, "Bob's stars should be 2");
    assertEquals(reviewBobMuseum?.note, "Too crowded, not my style.", "Bob's note should match");
    console.log(`State (Bob's review): user=${userBob}, item=${museumOfArt}, stars=${reviewBobMuseum?.stars}, note='${reviewBobMuseum?.note}'`);

    // Check all reviews for Museum of Art
    const allReviewsForMuseum = await reviewing._getAllReviewsByItem({ item: museumOfArt });
    assertEquals(allReviewsForMuseum.length, 2, "Should have two reviews for Museum of Art");
    console.log(`State (All reviews for ${museumOfArt}): Found ${allReviewsForMuseum.length} reviews.`);
    const aliceReviewSummary = allReviewsForMuseum.find(r => r.user === userAlice);
    const bobReviewSummary = allReviewsForMuseum.find(r => r.user === userBob);
    assertExists(aliceReviewSummary, "Alice's review should be in the list");
    assertExists(bobReviewSummary, "Bob's review should be in the list");
  });

  await t.step("should allow the same user to review multiple items independently", async () => {
    console.log("\n--- Scenario: Same User, Multiple Items ---");

    // User Alice reviews Picasso Exhibit
    console.log(`Action: upsertReview({ user: ${userAlice}, item: ${picassoExhibit}, stars: 4, note: 'Impressive cubist works.' })`);
    const resultAlicePicasso = await reviewing.upsertReview({
      user: userAlice,
      item: picassoExhibit,
      stars: 4,
      note: "Impressive cubist works.",
    });
    assertEquals(resultAlicePicasso, {}, "Expected successful upsert for Alice, Picasso Exhibit");

    // Verify Alice's review for Picasso
    const reviewAlicePicasso = await reviewing._getReview({ user: userAlice, item: picassoExhibit });
    assertExists(reviewAlicePicasso, "Review by Alice for Picasso Exhibit should exist");
    assertEquals(reviewAlicePicasso?.stars, 4);
    console.log(`State (Alice's Picasso review): user=${userAlice}, item=${picassoExhibit}, stars=${reviewAlicePicasso?.stars}`);

    // User Alice reviews Monet Exhibit
    console.log(`Action: upsertReview({ user: ${userAlice}, item: ${monetExhibit}, stars: 5, note: 'Serene and beautiful.' })`);
    const resultAliceMonet = await reviewing.upsertReview({
      user: userAlice,
      item: monetExhibit,
      stars: 5,
      note: "Serene and beautiful.",
    });
    assertEquals(resultAliceMonet, {}, "Expected successful upsert for Alice, Monet Exhibit");

    // Verify Alice's review for Monet
    const reviewAliceMonet = await reviewing._getReview({ user: userAlice, item: monetExhibit });
    assertExists(reviewAliceMonet, "Review by Alice for Monet Exhibit should exist");
    assertEquals(reviewAliceMonet?.stars, 5);
    console.log(`State (Alice's Monet review): user=${userAlice}, item=${monetExhibit}, stars=${reviewAliceMonet?.stars}`);

    // Check all reviews by User Alice
    const allReviewsForAlice = await reviewing._getAllReviewsByUser({ user: userAlice });
    // Alice has reviewed museumOfArt, picassoExhibit, monetExhibit
    assertEquals(allReviewsForAlice.length, 3, "Should have three reviews for User Alice");
    console.log(`State (All reviews by ${userAlice}): Found ${allReviewsForAlice.length} reviews.`);
  });

  await t.step("should correctly clear an existing review", async () => {
    console.log("\n--- Scenario: Clear Existing Review ---");

    // Ensure a review exists for User Bob, Picasso Exhibit for this test
    console.log(`Action: upsertReview({ user: ${userBob}, item: ${picassoExhibit}, stars: 3, note: 'It was okay, but not my favorite.' })`);
    await reviewing.upsertReview({ user: userBob, item: picassoExhibit, stars: 3, note: "It was okay, but not my favorite." });
    let reviewBobPicasso = await reviewing._getReview({ user: userBob, item: picassoExhibit });
    assertExists(reviewBobPicasso, "Review by Bob for Picasso Exhibit should exist before clearing");
    console.log(`Pre-condition: Bob's review for ${picassoExhibit}: ${reviewBobPicasso?.stars} stars`);

    // Clear the review
    console.log(`Action: clearReview({ user: ${userBob}, item: ${picassoExhibit} })`);
    const clearResult = await reviewing.clearReview({ user: userBob, item: picassoExhibit });
    assertEquals(clearResult, {}, "Expected successful clear");

    // Verify the review is gone
    reviewBobPicasso = await reviewing._getReview({ user: userBob, item: picassoExhibit });
    assertEquals(reviewBobPicasso, null, "Review by Bob for Picasso Exhibit should be null after clearing");
    console.log(`State (after clear): Bob's review for ${picassoExhibit} is ${reviewBobPicasso}`);
  });

  await t.step("should return an error when clearing a non-existent review", async () => {
    console.log("\n--- Scenario: Clear Non-Existent Review ---");

    const nonExistentItem = "item:NonExistentExhibit" as ID;
    console.log(`Action: clearReview({ user: ${userBob}, item: ${nonExistentItem} })`);
    const clearResult = await reviewing.clearReview({ user: userBob, item: nonExistentItem });
    assertEquals(
      clearResult,
      { error: `No review found for user ${userBob} and item ${nonExistentItem}.` },
      "Expected error when trying to clear a non-existent review",
    );
    console.log(`Result: ${JSON.stringify(clearResult)}`);
  });

  await t.step("should return an error for invalid star ratings or missing arguments in upsertReview", async () => {
    console.log("\n--- Scenario: Invalid Inputs for upsertReview ---");

    // Invalid stars (below 1)
    console.log(`Action: upsertReview({ user: ${userAlice}, item: ${monetExhibit}, stars: 0 as STARS })`);
    let resultInvalidStars = await reviewing.upsertReview({ user: userAlice, item: monetExhibit, stars: 0 as STARS });
    assertEquals(resultInvalidStars, { error: "Stars must be between 1 and 5." }, "Expected error for 0 stars");
    console.log(`Result (0 stars): ${JSON.stringify(resultInvalidStars)}`);

    // Invalid stars (above 5)
    console.log(`Action: upsertReview({ user: ${userAlice}, item: ${monetExhibit}, stars: 6 as STARS })`);
    resultInvalidStars = await reviewing.upsertReview({ user: userAlice, item: monetExhibit, stars: 6 as STARS });
    assertEquals(resultInvalidStars, { error: "Stars must be between 1 and 5." }, "Expected error for 6 stars");
    console.log(`Result (6 stars): ${JSON.stringify(resultInvalidStars)}`);

    // Missing user
    console.log(`Action: upsertReview({ item: ${monetExhibit}, stars: 3 }) with missing user`);
    let resultMissingArgs = await reviewing.upsertReview({ user: "" as ID, item: monetExhibit, stars: 3 });
    assertEquals(resultMissingArgs, { error: "User, item, and stars are required." }, "Expected error for missing user ID");
    console.log(`Result (missing user): ${JSON.stringify(resultMissingArgs)}`);

    // Missing item
    console.log(`Action: upsertReview({ user: ${userAlice}, stars: 3 }) with missing item`);
    resultMissingArgs = await reviewing.upsertReview({ user: userAlice, item: "" as ID, stars: 3 });
    assertEquals(resultMissingArgs, { error: "User, item, and stars are required." }, "Expected error for missing item ID");
    console.log(`Result (missing item): ${JSON.stringify(resultMissingArgs)}`);

    // Missing stars
    console.log(`Action: upsertReview({ user: ${userAlice}, item: ${monetExhibit} }) with missing stars`);
    resultMissingArgs = await reviewing.upsertReview({ user: userAlice, item: monetExhibit, stars: undefined as unknown as STARS });
    assertEquals(resultMissingArgs, { error: "User, item, and stars are required." }, "Expected error for missing stars");
    console.log(`Result (missing stars): ${JSON.stringify(resultMissingArgs)}`);
  });

  await t.step("should return an error for missing arguments in clearReview", async () => {
    console.log("\n--- Scenario: Missing Inputs for clearReview ---");

    // Missing user
    console.log(`Action: clearReview({ item: ${museumOfArt} }) with missing user`);
    let resultMissingArgs = await reviewing.clearReview({ user: "" as ID, item: museumOfArt });
    assertEquals(resultMissingArgs, { error: "User and item are required." }, "Expected error for missing user ID");
    console.log(`Result (missing user): ${JSON.stringify(resultMissingArgs)}`);

    // Missing item
    console.log(`Action: clearReview({ user: ${userAlice} }) with missing item`);
    resultMissingArgs = await reviewing.clearReview({ user: userAlice, item: "" as ID });
    assertEquals(resultMissingArgs, { error: "User and item are required." }, "Expected error for missing item ID");
    console.log(`Result (missing item): ${JSON.stringify(resultMissingArgs)}`);
  });

  // Close the MongoDB client connection after all tests are done
  await client.close();
});
```
