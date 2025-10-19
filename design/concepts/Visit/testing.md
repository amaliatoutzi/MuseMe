[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: Visit

Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Some more details about the test cases you should include:
- Operational principle. A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example.
- Interesting scenarios. Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors.
- Number required. For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios.
- No state setup. Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state.

# response:

# concept: Visit

## concept **Visit** \[User, MuseumId, ExhibitId, VisitEntryId]

**purpose**
capture a user’s visit to a museum, including an overall museum tag and the list of exhibits seen, each with optional note/photo and a share setting

**principle**
when a user logs a museum visit and records the exhibits they saw (with optional notes/photos and a visibility setting), the visit becomes an editable diary entry owned by that user.

**state**
a set of **Visits** with

* an id **VisitId**
* an owner **User**
* a museum **MuseumId**
* an optional title **String**
* a createdAt **DateTime**
* an updatedAt **DateTime**

a set of **VisitEntries** with

* a visit **VisitId**
* an exhibit **ExhibitId**
* an optional note **String**
* an optional photoUrl **String**
* a loggedAt **DateTime**
* an updatedAt **DateTime**

**actions**
**createVisit**(owner: User, museum: MuseumId, title?: String) : { visitId: VisitId } | { error: String }

* requires owner exists and museum exists
* effects create visit (owner, museum, title?), set createdAt := now, updatedAt := now;

**addEntry**(visit: VisitId, exhibit: ExhibitId, note?: String, photoUrl?: String, user: User) : Empty | { error: String }

* requires Visits\[visit] exists, user = Visits\[visit].owner, and exhibit belongs to Visits\[visit].museum
* effects create VisitEntries(visit, exhibit, note?, photoUrl?, loggedAt := now, updatedAt := now); set Visits\[visit].updatedAt := now; returns error if exhibit already logged for this visit.

**editEntry**(visitEntryId: VisitEntryId, note?: String, photoUrl?: String, user: User) : Empty | { error: String }

* requires entry exists and user = entry.visit.owner
* effects update provided fields; set entry.updatedAt := now; set entry.visit.updatedAt := now

**removeEntry**(visitEntryId: VisitEntryId, user: User) : Empty | { error: String }

* requires entry exists and user = entry.visit.owner
* effects delete the entry; set entry.visit.updatedAt := now

# file: src/Visit/VisitConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import museumsRaw from "@utils/new-york-museums.json" with { type: "json" };

// Declare collection prefix, use concept name
const PREFIX = "Visit" + ".";

// Generic types of this concept
type User = ID; // User ID from an external authentication concept
type MuseumId = ID;
type ExhibitId = ID;
type VisitId = ID;
type VisitEntryId = ID;

/**
 * Interface for a Museum catalog entry
 */
interface MuseumCatalogExhibit {
  id: ExhibitId;
  name: string;
  type: string;
}

interface MuseumCatalogEntry {
  id: MuseumId;
  name: string;
  exhibits: MuseumCatalogExhibit[];
  // Other fields omitted for brevity as they are not used for validation
}

/**
 * State: a set of Visits
 * purpose: capture a user’s visit to a museum, including an overall museum tag
 */
interface Visit {
  _id: VisitId;
  owner: User;
  museum: MuseumId;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * State: a set of VisitEntries
 * purpose: capture the list of exhibits seen, each with optional note/photo
 */
interface VisitEntry {
  _id: VisitEntryId;
  visit: VisitId; // Reference to the parent Visit
  exhibit: ExhibitId;
  note?: string;
  photoUrl?: string;
  loggedAt: Date;
  updatedAt: Date;
}

/**
 * MuseMe Visit Concept
 * purpose: capture a user’s visit to a museum, including an overall museum tag and the list of exhibits seen, each with optional note/photo and a share setting
 */
export default class VisitConcept {
  visits: Collection<Visit>;
  visitEntries: Collection<VisitEntry>;
  private museumCatalog: Map<MuseumId, MuseumCatalogEntry>;
  private museumExhibits: Map<MuseumId, Set<ExhibitId>>;

  constructor(private readonly db: Db) {
    this.visits = this.db.collection(PREFIX + "visits");
    this.visitEntries = this.db.collection(PREFIX + "visitEntries");

    // Initialize museum catalog for validation
    this.museumCatalog = new Map();
    this.museumExhibits = new Map();

    (museumsRaw as MuseumCatalogEntry[]).forEach((museum) => {
      this.museumCatalog.set(museum.id, museum);
      const exhibitIds = new Set<ExhibitId>();
      museum.exhibits.forEach((exhibit) => exhibitIds.add(exhibit.id));
      this.museumExhibits.set(museum.id, exhibitIds);
    });
  }

  /**
   * createVisit(owner: User, museum: MuseumId, title?: String) : { visitId: VisitId } | { error: String }
   * requires: owner exists and museum exists
   * effects: create visit (owner, museum, title?), set createdAt := now, updatedAt := now;
   */
  async createVisit(
    { owner, museum, title }: { owner: User; museum: MuseumId; title?: string },
  ): Promise<{ visitId: VisitId } | { error: string }> {
    // Requires: museum exists
    if (!this.museumCatalog.has(museum)) {
      return { error: `Museum with ID '${museum}' not found in catalog.` };
    }

    // Requires: owner exists (assuming owner is a valid ID from UserAuthentication concept, cannot validate actual user here)
    if (!owner) {
      return { error: "Owner ID is required." };
    }

    const now = new Date();
    const newVisit: Visit = {
      _id: freshID() as VisitId,
      owner,
      museum,
      title,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.visits.insertOne(newVisit);
      return { visitId: newVisit._id };
    } catch (e) {
      console.error("Error creating visit:", e);
      return { error: "Failed to create visit due to a database error." };
    }
  }

  /**
   * addEntry(visit: VisitId, exhibit: ExhibitId, note?: String, photoUrl?: String, user: User) : Empty | { error: String }
   * requires: Visits[visit] exists, user = Visits[visit].owner, and exhibit belongs to Visits[visit].museum
   * effects: create VisitEntries(visit, exhibit, note?, photoUrl?, loggedAt := now, updatedAt := now); set Visits[visit].updatedAt := now; returns error if exhibit already logged for this visit.
   */
  async addEntry(
    { visit: visitId, exhibit, note, photoUrl, user }: {
      visit: VisitId;
      exhibit: ExhibitId;
      note?: string;
      photoUrl?: string;
      user: User;
    },
  ): Promise<Empty | { error: string }> {
    // Requires: Visits[visit] exists
    const visit = await this.visits.findOne({ _id: visitId });
    if (!visit) {
      return { error: `Visit with ID '${visitId}' not found.` };
    }

    // Requires: user = Visits[visit].owner
    if (visit.owner !== user) {
      return { error: "Unauthorized: User is not the owner of this visit." };
    }

    // Requires: exhibit belongs to Visits[visit].museum
    const museumExhibits = this.museumExhibits.get(visit.museum);
    if (!museumExhibits || !museumExhibits.has(exhibit)) {
      return {
        error:
          `Exhibit with ID '${exhibit}' not found or does not belong to museum '${visit.museum}'.`,
      };
    }

    // Guard against duplicate entries: check if this exhibit is already logged for this visit
    const existingEntry = await this.visitEntries.findOne({ visit: visitId, exhibit: exhibit });
    if (existingEntry) {
      return { error: `Exhibit '${exhibit}' has already been logged for visit '${visitId}'.` };
    }

    const now = new Date();
    const newEntry: VisitEntry = {
      _id: freshID() as VisitEntryId,
      visit: visitId,
      exhibit,
      note,
      photoUrl,
      loggedAt: now,
      updatedAt: now,
    };

    try {
      await this.visitEntries.insertOne(newEntry);
      // Effects: set Visits[visit].updatedAt := now
      await this.visits.updateOne(
        { _id: visitId },
        { $set: { updatedAt: now } },
      );
      return {};
    } catch (e) {
      console.error("Error adding visit entry:", e);
      return { error: "Failed to add visit entry due to a database error." };
    }
  }

  /**
   * editEntry(visitEntryId: VisitEntryId, note?: String, photoUrl?: String, user: User) : Empty | { error: String }
   * requires: entry exists and user = entry.visit.owner
   * effects: update provided fields; set entry.updatedAt := now; set entry.visit.updatedAt := now
   */
  async editEntry(
    { visitEntryId, note, photoUrl, user }: {
      visitEntryId: VisitEntryId;
      note?: string;
      photoUrl?: string;
      user: User;
    },
  ): Promise<Empty | { error: string }> {
    // Requires: entry exists
    const entry = await this.visitEntries.findOne({ _id: visitEntryId });
    if (!entry) {
      return { error: `Visit entry with ID '${visitEntryId}' not found.` };
    }

    // Retrieve the parent visit to check ownership
    const visit = await this.visits.findOne({ _id: entry.visit });
    if (!visit) {
      // This should ideally not happen if entry exists and refers to a valid visitId
      return { error: `Associated visit with ID '${entry.visit}' not found, data inconsistency.` };
    }

    // Requires: user = entry.visit.owner
    if (visit.owner !== user) {
      return { error: "Unauthorized: User is not the owner of this visit." };
    }

    const now = new Date();
    const updateFields: Partial<VisitEntry> = {
      updatedAt: now,
    };
    // Only update if provided and not undefined (allowing null/empty string if intended)
    if (note !== undefined) updateFields.note = note;
    if (photoUrl !== undefined) updateFields.photoUrl = photoUrl;

    try {
      // Effects: update provided fields; set entry.updatedAt := now
      await this.visitEntries.updateOne(
        { _id: visitEntryId },
        { $set: updateFields },
      );
      // Effects: set entry.visit.updatedAt := now
      await this.visits.updateOne(
        { _id: entry.visit },
        { $set: { updatedAt: now } },
      );
      return {};
    } catch (e) {
      console.error("Error editing visit entry:", e);
      return { error: "Failed to edit visit entry due to a database error." };
    }
  }

  /**
   * removeEntry(visitEntryId: VisitEntryId, user: User) : Empty | { error: String }
   * requires: entry exists and user = entry.visit.owner
   * effects: delete the entry; set entry.visit.updatedAt := now
   */
  async removeEntry(
    { visitEntryId, user }: {
      visitEntryId: VisitEntryId;
      user: User;
    },
  ): Promise<Empty | { error: string }> {
    // Requires: entry exists
    const entry = await this.visitEntries.findOne({ _id: visitEntryId });
    if (!entry) {
      return { error: `Visit entry with ID '${visitEntryId}' not found.` };
    }

    // Retrieve the parent visit to check ownership
    const visit = await this.visits.findOne({ _id: entry.visit });
    if (!visit) {
      // This should ideally not happen if entry exists and refers to a valid visitId
      return { error: `Associated visit with ID '${entry.visit}' not found, data inconsistency.` };
    }

    // Requires: user = entry.visit.owner
    if (visit.owner !== user) {
      return { error: "Unauthorized: User is not the owner of this visit." };
    }

    try {
      // Effects: delete the entry
      await this.visitEntries.deleteOne({ _id: visitEntryId });
      // Effects: set entry.visit.updatedAt := now
      await this.visits.updateOne(
        { _id: entry.visit },
        { $set: { updatedAt: new Date() } },
      );
      return {};
    } catch (e) {
      console.error("Error removing visit entry:", e);
      return { error: "Failed to remove visit entry due to a database error." };
    }
  }

  // --- Queries ---

  /**
   * _getVisit(visitId: VisitId): Visit | null
   * Effects: Returns a visit by its ID.
   */
  async _getVisit(
    { visitId }: { visitId: VisitId },
  ): Promise<Visit | null> {
    return await this.visits.findOne({ _id: visitId });
  }

  /**
   * _getVisitsByUser(user: User): Visit[]
   * Effects: Returns all visits by a specific user, ordered by updatedAt.
   */
  async _getVisitsByUser(
    { user }: { user: User },
  ): Promise<Visit[]> {
    return await this.visits.find({ owner: user }).sort({ updatedAt: -1 }).toArray();
  }

  /**
   * _getEntriesByVisit(visitId: VisitId): VisitEntry[]
   * Effects: Returns all entries for a specific visit, ordered by loggedAt.
   */
  async _getEntriesByVisit(
    { visitId }: { visitId: VisitId },
  ): Promise<VisitEntry[]> {
    return await this.visitEntries.find({ visit: visitId }).sort({ loggedAt: 1 }).toArray();
  }

  /**
   * _getEntry(visitEntryId: VisitEntryId): VisitEntry | null
   * Effects: Returns a specific visit entry by its ID.
   */
  async _getEntry(
    { visitEntryId }: { visitEntryId: VisitEntryId },
  ): Promise<VisitEntry | null> {
    return await this.visitEntries.findOne({ _id: visitEntryId });
  }
}
```

# file: src/Visit/VisitConcept.test.ts

```typescript
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

    // Setup: fresh visit and an entry to edit/remove
    // Setup: fresh visit and an entry to edit/remove
    const { visitId: aliceVisitId } = (await visitConcept.createVisit({
      owner: userAlice,
      museum: metMuseumId,
    })) as { visitId: ID };

    await visitConcept.addEntry({
      visit: aliceVisitId,
      exhibit: egyptianArtExhibit, // or whichever you’ll edit/remove
      note: "Initially liked it.",
      user: userAlice,
    });

    await visitConcept.addEntry({
      visit: aliceVisitId,
      exhibit: europeanSculptureExhibit,
      user: userAlice,
    });

    const entry =
      (await visitConcept._getEntriesByVisit({ visitId: aliceVisitId }))[0];
    const armsAndArmorEntryId = entry._id;

    // Action: add a new entry to edit/remove later
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
    //const armsAndArmorEntryId = armsAndArmorEntry!._id;
    const visitUpdatedAtBeforeEdit =
      (await visitConcept._getVisit({ visitId: aliceVisitId }))?.updatedAt;
    console.log("Arms and Armor entry added.");

    // Action: editEntry
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

    // Query: Verify entry updated and visit updatedAt
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

    // Action: removeEntry
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

    // Query: Verify entry is deleted and visit updatedAt
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

```
