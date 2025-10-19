import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertObjectMatch,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { Empty, ID } from "@utils/types.ts";
import VisitConcept from "./VisitConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const metMuseumId = "the-metropolitan-museum-of-art" as ID;
const egyptianArtExhibit = "ancient-egyptian-art" as ID;
const europeanSculptureExhibit = "european-sculpture-and-decorative-arts" as ID;
const armsAndArmorExhibit = "arms-and-armor" as ID;
const nonExistentMuseum = "non-existent-museum" as ID;
const nonExistentExhibit = "non-existent-exhibit" as ID;

// Store visitId and visitEntryIds for later tests
let aliceVisitId: ID;
let egyptianArtEntryId: ID;
let europeanSculptureEntryId: ID;

Deno.test("1. Operational Principle: Log a museum visit with entries", async () => {
  const [db, client] = await testDb();
  const visitConcept = new VisitConcept(db);
  try {
    console.log("\n--- Test 1: Operational Principle ---");

    // Action: createVisit
    console.log("Calling createVisit for Alice at The Met.");
    const createResult = await visitConcept.createVisit({
      owner: userAlice,
      museum: metMuseumId,
      title: "My first visit to The Met",
    });
    assertExists(createResult, "createVisit should return a result");
    assertEquals(
      (createResult as { error: string }).error,
      undefined,
      "createVisit should succeed without error",
    );
    aliceVisitId = (createResult as { visitId: ID }).visitId;
    assertExists(aliceVisitId, "Visit ID should be returned");
    console.log(`Visit created with ID: ${aliceVisitId}`);

    // Query: Verify visit exists
    const visit = await visitConcept._getVisit({ visitId: aliceVisitId });
    assertExists(visit, "Visit should exist in the database");
    assertEquals(visit.owner, userAlice);
    assertEquals(visit.museum, metMuseumId);
    assertEquals(visit.title, "My first visit to The Met");
    assertExists(visit.createdAt);
    assertExists(visit.updatedAt);
    const initialUpdatedAt = visit.updatedAt;
    console.log("Visit verified.");

    // Action: addEntry for Egyptian Art
    console.log("Calling addEntry for Egyptian Art.");
    const addEntryResult1 = await visitConcept.addEntry({
      visit: aliceVisitId,
      exhibit: egyptianArtExhibit,
      note: "Loved the Temple of Dendur!",
      photoUrl: "http://example.com/egyptian-art.jpg",
      user: userAlice,
    });
    assertExists(addEntryResult1, "addEntry should return a result");
    assertEquals(
      (addEntryResult1 as { error: string }).error,
      undefined,
      "addEntry for Egyptian Art should succeed",
    );
    console.log("Entry for Egyptian Art added.");

    // Query: Verify entry exists and visit updatedAt is updated
    const entries1 = await visitConcept._getEntriesByVisit({
      visitId: aliceVisitId,
    });
    assertEquals(entries1.length, 1, "There should be 1 entry for the visit");
    assertObjectMatch(entries1[0], {
      visit: aliceVisitId,
      exhibit: egyptianArtExhibit,
      note: "Loved the Temple of Dendur!",
      photoUrl: "http://example.com/egyptian-art.jpg",
    });
    egyptianArtEntryId = entries1[0]._id;
    const updatedVisit1 = await visitConcept._getVisit({
      visitId: aliceVisitId,
    });
    assertNotEquals(
      updatedVisit1?.updatedAt.getTime(),
      initialUpdatedAt.getTime(),
      "Visit updatedAt should be updated after adding entry",
    );
    const updatedAtAfterEntry1 = updatedVisit1?.updatedAt;
    console.log("Entry for Egyptian Art verified, visit updatedAt updated.");

    // Action: addEntry for European Sculpture
    console.log("Calling addEntry for European Sculpture.");
    const addEntryResult2 = await visitConcept.addEntry({
      visit: aliceVisitId,
      exhibit: europeanSculptureExhibit,
      note: "Impressive collection of classical works.",
      user: userAlice,
    });
    assertExists(addEntryResult2, "addEntry should return a result");
    assertEquals(
      (addEntryResult2 as { error: string }).error,
      undefined,
      "addEntry for European Sculpture should succeed",
    );
    console.log("Entry for European Sculpture added.");

    // Query: Verify entries and visit updatedAt is updated again
    const entries2 = await visitConcept._getEntriesByVisit({
      visitId: aliceVisitId,
    });
    assertEquals(
      entries2.length,
      2,
      "There should be 2 entries for the visit",
    );
    // Find the European Sculpture entry because order might not be strictly creation time if loggedAt happens too fast
    const europeanSculptureEntry = entries2.find((e) =>
      e.exhibit === europeanSculptureExhibit
    );
    assertExists(
      europeanSculptureEntry,
      "European Sculpture entry should exist",
    );
    assertObjectMatch(europeanSculptureEntry!, {
      visit: aliceVisitId,
      exhibit: europeanSculptureExhibit,
      note: "Impressive collection of classical works.",
    });
    europeanSculptureEntryId = europeanSculptureEntry!._id;
    const updatedVisit2 = await visitConcept._getVisit({
      visitId: aliceVisitId,
    });
    assertNotEquals(
      updatedVisit2?.updatedAt.getTime(),
      updatedAtAfterEntry1?.getTime(),
      "Visit updatedAt should be updated again",
    );
    console.log(
      "Entry for European Sculpture verified, visit updatedAt updated.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("2. Scenario: Invalid createVisit attempts", async () => {
  const [db, client] = await testDb();
  const visitConcept = new VisitConcept(db);
  try {
    console.log("\n--- Test 2: Invalid createVisit attempts ---");

    // Test: Missing owner
    console.log("Attempting createVisit with no owner.");
    const resultNoOwner = await visitConcept.createVisit({
      owner: "" as ID, // Invalid owner ID
      museum: metMuseumId,
      title: "Should fail",
    });
    assertExists(
      (resultNoOwner as { error: string }).error,
      "createVisit should fail with no owner",
    );
    assertEquals(
      (resultNoOwner as { error: string }).error,
      "Owner ID is required.",
      "Error message for no owner",
    );
    console.log(
      `Failed as expected: ${(resultNoOwner as { error: string }).error}`,
    );

    // Test: Non-existent museum
    console.log("Attempting createVisit with non-existent museum.");
    const resultNonExistentMuseum = await visitConcept.createVisit({
      owner: userAlice,
      museum: nonExistentMuseum,
      title: "Should fail",
    });
    assertExists(
      (resultNonExistentMuseum as { error: string }).error,
      "createVisit should fail with non-existent museum",
    );
    assertEquals(
      (resultNonExistentMuseum as { error: string }).error,
      `Museum with ID '${nonExistentMuseum}' not found in catalog.`,
      "Error message for non-existent museum",
    );
    console.log(
      `Failed as expected: ${
        (resultNonExistentMuseum as { error: string }).error
      }`,
    );
  } finally {
    await db.dropDatabase();
    await client.close();
  }
});

Deno.test("3. Scenario: Invalid addEntry attempts", async () => {
  const [db, client] = await testDb();
  const visitConcept = new VisitConcept(db);
  try {
    console.log("\n--- Test 3: Invalid addEntry attempts ---");

    // Setup: create Alice's visit in THIS test
    const create = await visitConcept.createVisit({
      owner: userAlice,
      museum: metMuseumId,
      title: "Alice's Met visit",
    });
    const aliceVisitId = (create as { visitId: ID }).visitId;

    // Test: Non-existent visit
    console.log("Attempting addEntry to a non-existent visit.");
    const resultNonExistentVisit = await visitConcept.addEntry({
      visit: "non-existent-visit" as ID,
      exhibit: egyptianArtExhibit,
      user: userAlice,
    });
    assertExists(
      (resultNonExistentVisit as { error: string }).error,
      "addEntry should fail for non-existent visit",
    );
    assertEquals(
      (resultNonExistentVisit as { error: string }).error,
      "Visit with ID 'non-existent-visit' not found.",
      "Error message for non-existent visit",
    );
    console.log(
      `Failed as expected: ${
        (resultNonExistentVisit as { error: string }).error
      }`,
    );

    // Test: Unauthorized user
    console.log("Attempting addEntry by an unauthorized user.");
    const resultUnauthorized = await visitConcept.addEntry({
      visit: aliceVisitId,
      exhibit: armsAndArmorExhibit,
      user: userBob, // Bob is not the owner
    });
    assertExists(
      (resultUnauthorized as { error: string }).error,
      "addEntry should fail for unauthorized user",
    );
    assertEquals(
      (resultUnauthorized as { error: string }).error,
      "Unauthorized: User is not the owner of this visit.",
      "Error message for unauthorized user",
    );
    console.log(
      `Failed as expected: ${(resultUnauthorized as { error: string }).error}`,
    );

    // Test: Exhibit not belonging to the museum
    console.log(
      "Attempting addEntry with an exhibit not from the visit's museum.",
    );
    const resultWrongExhibit = await visitConcept.addEntry({
      visit: aliceVisitId,
      exhibit: nonExistentExhibit, // Not a valid exhibit for The Met
      user: userAlice,
    });
    assertExists(
      (resultWrongExhibit as { error: string }).error,
      "addEntry should fail for wrong exhibit",
    );
    assertEquals(
      (resultWrongExhibit as { error: string }).error,
      `Exhibit with ID '${nonExistentExhibit}' not found or does not belong to museum '${metMuseumId}'.`,
      "Error message for wrong exhibit",
    );
    console.log(
      `Failed as expected: ${(resultWrongExhibit as { error: string }).error}`,
    );

    // Test: Duplicate exhibit entry
    console.log("Attempting to add a duplicate exhibit entry.");

    const result = await visitConcept.addEntry({
      visit: aliceVisitId,
      exhibit: egyptianArtExhibit,
      user: userAlice,
    });

    const resultDuplicate = await visitConcept.addEntry({
      visit: aliceVisitId,
      exhibit: egyptianArtExhibit, // Already added
      user: userAlice,
    });
    assertExists(
      (resultDuplicate as { error: string }).error,
      "addEntry should fail for duplicate exhibit",
    );
    assertEquals(
      (resultDuplicate as { error: string }).error,
      `Exhibit '${egyptianArtExhibit}' has already been logged for visit '${aliceVisitId}'.`,
      "Error message for duplicate exhibit",
    );
    console.log(
      `Failed as expected: ${(resultDuplicate as { error: string }).error}`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("4. Scenario: Edit and Remove Visit Entry", async () => {
  const [db, client] = await testDb();
  const visitConcept = new VisitConcept(db);

  try {
    console.log("\n--- Test 4: Edit and Remove Visit Entry ---");

    // Fresh visit
    const { visitId: aliceVisitId } = (await visitConcept.createVisit({
      owner: userAlice,
      museum: metMuseumId,
    })) as { visitId: ID };

    // Seed two entries
    await visitConcept.addEntry({
      visit: aliceVisitId,
      exhibit: egyptianArtExhibit,
      note: "Initially liked it.",
      user: userAlice,
    });
    await visitConcept.addEntry({
      visit: aliceVisitId,
      exhibit: europeanSculptureExhibit,
      user: userAlice,
    });

    // Add the Arms & Armor entry (the one we will edit/remove)
    console.log("Adding an entry for Arms and Armor to edit/remove.");
    const addResult = await visitConcept.addEntry({
      visit: aliceVisitId,
      exhibit: armsAndArmorExhibit,
      note: "Initially liked it.",
      user: userAlice,
    });
    assertExists(
      addResult,
      "addEntry for Arms and Armor should return a result",
    );
    assertEquals(
      (addResult as { error: string }).error,
      undefined,
      "addEntry for Arms and Armor should succeed",
    );

    // Now get THAT entry's id
    const entriesBeforeEdit = await visitConcept._getEntriesByVisit({
      visitId: aliceVisitId,
    });
    assertEquals(
      entriesBeforeEdit.length,
      3,
      "There should be 3 entries before editing",
    );

    const armsAndArmorEntry = entriesBeforeEdit.find((e) =>
      e.exhibit === armsAndArmorExhibit
    );
    assertExists(armsAndArmorEntry, "Arms and Armor entry should exist");
    const armsAndArmorEntryId = armsAndArmorEntry!._id; // <-- correct ID, captured after creation

    const visitUpdatedAtBeforeEdit =
      (await visitConcept._getVisit({ visitId: aliceVisitId }))?.updatedAt;
    console.log("Arms and Armor entry added.");

    // Edit that entry
    console.log(`Editing entry ${armsAndArmorEntryId}.`);
    const editResult = await visitConcept.editEntry({
      visitEntryId: armsAndArmorEntryId,
      note: "Actually, it was absolutely fascinating!",
      photoUrl: "http://example.com/arms-and-armor-edited.jpg",
      user: userAlice,
    });
    assertExists(editResult, "editEntry should return a result");
    assertEquals(
      (editResult as { error: string }).error,
      undefined,
      "editEntry should succeed",
    );
    console.log("Entry edited.");

    // Verify edit + updatedAt bump
    const editedEntry = await visitConcept._getEntry({
      visitEntryId: armsAndArmorEntryId,
    });
    assertExists(editedEntry, "Edited entry should still exist");
    assertEquals(editedEntry.note, "Actually, it was absolutely fascinating!");
    assertEquals(
      editedEntry.photoUrl,
      "http://example.com/arms-and-armor-edited.jpg",
    );

    const visitUpdatedAtAfterEdit =
      (await visitConcept._getVisit({ visitId: aliceVisitId }))?.updatedAt;
    assertNotEquals(
      visitUpdatedAtAfterEdit?.getTime(),
      visitUpdatedAtBeforeEdit?.getTime(),
      "Visit updatedAt should be updated after editing entry",
    );
    console.log("Edited entry verified, visit updatedAt updated.");

    // Remove the same entry
    console.log(`Removing entry ${armsAndArmorEntryId}.`);
    const removeResult = await visitConcept.removeEntry({
      visitEntryId: armsAndArmorEntryId,
      user: userAlice,
    });
    assertExists(removeResult, "removeEntry should return a result");
    assertEquals(
      (removeResult as { error: string }).error,
      undefined,
      "removeEntry should succeed",
    );
    console.log("Entry removed.");

    // Verify deletion + updatedAt bump
    const removedEntry = await visitConcept._getEntry({
      visitEntryId: armsAndArmorEntryId,
    });
    assertEquals(
      removedEntry,
      null,
      "Entry should no longer exist after removal",
    );

    const entriesAfterRemove = await visitConcept._getEntriesByVisit({
      visitId: aliceVisitId,
    });
    assertEquals(
      entriesAfterRemove.length,
      2,
      "There should be 2 entries after removal",
    );

    const visitUpdatedAtAfterRemove =
      (await visitConcept._getVisit({ visitId: aliceVisitId }))?.updatedAt;
    assertNotEquals(
      visitUpdatedAtAfterRemove?.getTime(),
      visitUpdatedAtAfterEdit?.getTime(),
      "Visit updatedAt should be updated after removing entry",
    );
    console.log("Entry deletion verified, visit updatedAt updated.");
  } finally {
    await client.close();
  }
});

Deno.test("5. Scenario: Invalid editEntry/removeEntry attempts", async () => {
  const [db, client] = await testDb();
  const visitConcept = new VisitConcept(db);
  try {
    console.log("\n--- Test 5: Invalid editEntry/removeEntry attempts ---");

    // Setup: real entry owned by Alice
    const { visitId: aliceVisitId } = (await visitConcept.createVisit({
      owner: userAlice,
      museum: metMuseumId,
    })) as { visitId: ID };

    await visitConcept.addEntry({
      visit: aliceVisitId,
      exhibit: egyptianArtExhibit,
      user: userAlice,
    });

    const aliceEntry =
      (await visitConcept._getEntriesByVisit({ visitId: aliceVisitId }))[0]._id;

    // Test: Non-existent entry for edit
    console.log("Attempting to edit a non-existent entry.");
    const resultEditNonExistent = await visitConcept.editEntry({
      visitEntryId: "non-existent-entry" as ID,
      note: "this should fail",
      user: userAlice,
    });
    assertExists(
      (resultEditNonExistent as { error: string }).error,
      "editEntry should fail for non-existent entry",
    );
    assertEquals(
      (resultEditNonExistent as { error: string }).error,
      "Visit entry with ID 'non-existent-entry' not found.",
      "Error message for non-existent entry (edit)",
    );
    console.log(
      `Failed as expected: ${
        (resultEditNonExistent as { error: string }).error
      }`,
    );

    // Test: Unauthorized user for edit
    console.log("Attempting to edit an entry by an unauthorized user.");
    const resultEditUnauthorized = await visitConcept.editEntry({
      visitEntryId: aliceEntry, // Alice's entry
      note: "Bob trying to edit",
      user: userBob, // Bob is not the owner
    });
    assertExists(
      (resultEditUnauthorized as { error: string }).error,
      "editEntry should fail for unauthorized user",
    );
    assertEquals(
      (resultEditUnauthorized as { error: string }).error,
      "Unauthorized: User is not the owner of this visit.",
      "Error message for unauthorized user (edit)",
    );
    console.log(
      `Failed as expected: ${
        (resultEditUnauthorized as { error: string }).error
      }`,
    );

    // Test: Non-existent entry for remove
    console.log("Attempting to remove a non-existent entry.");
    const resultRemoveNonExistent = await visitConcept.removeEntry({
      visitEntryId: "another-non-existent-entry" as ID,
      user: userAlice,
    });
    assertExists(
      (resultRemoveNonExistent as { error: string }).error,
      "removeEntry should fail for non-existent entry",
    );
    assertEquals(
      (resultRemoveNonExistent as { error: string }).error,
      "Visit entry with ID 'another-non-existent-entry' not found.",
      "Error message for non-existent entry (remove)",
    );
    console.log(
      `Failed as expected: ${
        (resultRemoveNonExistent as { error: string }).error
      }`,
    );

    // Test: Unauthorized user for remove
    console.log("Attempting to remove an entry by an unauthorized user.");
    const resultRemoveUnauthorized = await visitConcept.removeEntry({
      visitEntryId: aliceEntry, // Alice's entry
      user: userBob, // Bob is not the owner
    });
    assertExists(
      (resultRemoveUnauthorized as { error: string }).error,
      "removeEntry should fail for unauthorized user",
    );
    assertEquals(
      (resultRemoveUnauthorized as { error: string }).error,
      "Unauthorized: User is not the owner of this visit.",
      "Error message for unauthorized user (remove)",
    );
    console.log(
      `Failed as expected: ${
        (resultRemoveUnauthorized as { error: string }).error
      }`,
    );
  } finally {
    await client.close();
  }
});
