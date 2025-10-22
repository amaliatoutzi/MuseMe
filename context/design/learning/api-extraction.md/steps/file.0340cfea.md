---
timestamp: 'Tue Oct 21 2025 12:05:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_120518.1ade212f.md]]'
content_id: 0340cfea2e4d23521254cca34958f106cb68ad4357891b43fe88ba5e6f838aa2
---

# file: src/concepts/Visit/VisitConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
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
  address: string;
  zip: string;
  borough: string;
  location: { lat: number; lon: number };
  website: string;
  tags: string[];
  exhibits: MuseumCatalogExhibit[];
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
   * createVisit(owner: User, museum: MuseumId, title?: String) : VisitId | { error: String }
   * requires: owner exists and museum exists
   * effects: create visit (owner, museum, title?), set startedAt := now, createdAt := now, updatedAt := now;
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
    const existingEntry = await this.visitEntries.findOne({
      visit: visitId,
      exhibit: exhibit,
    });
    if (existingEntry) {
      return {
        error:
          `Exhibit '${exhibit}' has already been logged for visit '${visitId}'.`,
      };
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
      return { error: "Associated visit not found, data inconsistency." };
    }

    // Requires: user = entry.visit.owner
    if (visit.owner !== user) {
      return { error: "Unauthorized: User is not the owner of this visit." };
    }

    const now = new Date();
    const updateFields: Partial<VisitEntry> = {
      updatedAt: now,
    };
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
      return { error: "Associated visit not found, data inconsistency." };
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
    return await this.visits.find({ owner: user }).sort({ updatedAt: -1 })
      .toArray();
  }

  /**
   * _getEntriesByVisit(visitId: VisitId): VisitEntry[]
   * Effects: Returns all entries for a specific visit, ordered by loggedAt.
   */
  async _getEntriesByVisit(
    { visitId }: { visitId: VisitId },
  ): Promise<VisitEntry[]> {
    return await this.visitEntries.find({ visit: visitId }).sort({
      loggedAt: 1,
    }).toArray();
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
