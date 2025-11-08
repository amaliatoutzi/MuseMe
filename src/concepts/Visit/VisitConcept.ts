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
 * purpose: capture the list of exhibits seen, each with a required note, at least one photo, and a rating
 */
interface VisitEntry {
  _id: VisitEntryId;
  visit: VisitId; // Reference to the parent Visit
  exhibit: ExhibitId;
  note: string;
  photoUrls: string[];
  rating: number;
  loggedAt: Date;
  updatedAt: Date;
}

/**
 * MuseMe Visit Concept
 * purpose: capture a user’s visit to a museum, including an overall museum tag and the list of exhibits seen, each with a required note, at least one photo, and a rating
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
    const sanitizedTitle = (typeof title === "string" && title.trim() !== "")
      ? title.trim()
      : undefined;
    const newVisit: Visit = {
      _id: freshID() as VisitId,
      owner,
      museum,
      title: sanitizedTitle,
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
   * addEntry(visit: VisitId, exhibit: ExhibitId, note: String, photoUrls: [String], rating: Number, user: User) : Empty | { error: String }
   * requires: Visits[visit] exists, user = Visits[visit].owner, exhibit belongs to Visits[visit].museum; note.trim() !== ""; photoUrls length >= 1; 1 <= rating <= 5
   * effects: create VisitEntries(visit, exhibit, note, photoUrls, rating, loggedAt := now, updatedAt := now); set Visits[visit].updatedAt := now; returns error if exhibit already logged for this visit.
   */
  async addEntry(
    { visit: visitId, exhibit, note, photoUrls, rating, user }: {
      visit: VisitId;
      exhibit: ExhibitId;
      note: string; // now required
      photoUrls: string[]; // now required (>=1)
      rating: number; // now required (1..5)
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
      exhibit,
    });
    if (existingEntry) {
      return {
        error:
          `Exhibit '${exhibit}' has already been logged for visit '${visitId}'.`,
      };
    }

    // Validate required fields
    if (typeof note !== "string" || note.trim() === "") {
      return { error: "Note is required and cannot be blank." };
    }
    if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
      return { error: "At least one photo URL is required." };
    }
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return { error: "Rating must be a number between 1 and 5." };
    }
    const sanitizedNote = note.trim();
    const sanitizedPhotoUrls = photoUrls
      .filter((u) => typeof u === "string")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (sanitizedPhotoUrls.length === 0) {
      return {
        error: "Provided photo URLs are invalid or empty after sanitization.",
      };
    }
    const sanitizedRating = rating; // already validated

    const now = new Date();
    const newEntry: VisitEntry = {
      _id: freshID() as VisitEntryId,
      visit: visitId,
      exhibit,
      note: sanitizedNote,
      photoUrls: sanitizedPhotoUrls,
      rating: sanitizedRating,
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
   * removeEntry(visitEntryId: VisitEntryId, user: User) : Empty | { error: String }
   * requires: entry exists and user = entry.visit.owner
   * effects: delete ALL entries for the parent visit and then delete the visit itself (cascading removal)
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
      // Cascade: delete all entries for the visit
      await this.visitEntries.deleteMany({ visit: entry.visit });
      // Delete the visit itself
      await this.visits.deleteOne({ _id: entry.visit });
      // ALSO: clear any reviews user left for this museum (and optionally its exhibits) so profile & similarity ignore them.
      // We assume a ReviewingConcept collection prefix 'Reviewing.reviews' with documents shaped { user, item }.
      // Remove reviews for the museum and its exhibits to fully detach the visit’s opinion data.
      try {
        const reviewingCollection = this.db.collection("Reviewing.reviews");
        // Remove museum-level review
        await reviewingCollection.deleteMany({ user, item: visit.museum });
        // Remove exhibit-level reviews for exhibits that were part of this visit
        const exhibitIds = await this.visitEntries.distinct("exhibit", {
          visit: entry.visit,
        });
        if (Array.isArray(exhibitIds) && exhibitIds.length) {
          await reviewingCollection.deleteMany({
            user,
            item: { $in: exhibitIds },
          });
        }
      } catch (e) {
        console.warn(
          "Failed to cascade delete related reviews for visit",
          entry.visit,
          e,
        );
        // Non-fatal: proceed without blocking visit removal
      }
      return {};
    } catch (e) {
      console.error("Error cascading removal of visit:", e);
      return { error: "Failed to remove visit due to a database error." };
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
   * Effects: Returns all visits by a specific user that have at least one entry, ordered by updatedAt.
   */
  async _getVisitsByUser(
    { user }: { user: User },
  ): Promise<Visit[]> {
    const cursor = this.visits.aggregate<Visit>([
      { $match: { owner: user } },
      {
        $lookup: {
          from: PREFIX + "visitEntries",
          localField: "_id",
          foreignField: "visit",
          as: "entries",
        },
      },
      { $addFields: { entryCount: { $size: "$entries" } } },
      { $match: { entryCount: { $gt: 0 } } },
      { $sort: { updatedAt: -1 } },
      { $project: { entries: 0, entryCount: 0 } },
    ]);
    return await cursor.toArray();
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

  /**
   * updateEntryNote(visit: VisitId, exhibit: ExhibitId, note?: string, user: User)
   * requires: entry exists; user owns parent visit
   * effects: sets/clears note (undefined clears)
   */
  async updateEntryNote(
    { visit: visitId, exhibit, note, user }: {
      visit: VisitId;
      exhibit: ExhibitId;
      note?: string;
      user: User;
    },
  ): Promise<Empty | { error: string }> {
    const entry = await this.visitEntries.findOne({ visit: visitId, exhibit });
    if (!entry) return { error: "Visit entry not found for note update." };
    const visit = await this.visits.findOne({ _id: visitId });
    if (!visit || visit.owner !== user) return { error: "Unauthorized." };
    const sanitizedNote = (note && note.trim() !== "")
      ? note.trim()
      : undefined;
    await this.visitEntries.updateOne({ _id: entry._id }, {
      $set: { updatedAt: new Date(), note: sanitizedNote },
    });
    return {};
  }

  /**
   * updateEntryPhotos(visit, exhibit, photoUrls?, user)
   * effects: replaces photoUrls array (empty clears)
   */
  async updateEntryPhotos(
    { visit: visitId, exhibit, photoUrls, user }: {
      visit: VisitId;
      exhibit: ExhibitId;
      photoUrls?: string[];
      user: User;
    },
  ): Promise<Empty | { error: string }> {
    const entry = await this.visitEntries.findOne({ visit: visitId, exhibit });
    if (!entry) return { error: "Visit entry not found for photos update." };
    const visit = await this.visits.findOne({ _id: visitId });
    if (!visit || visit.owner !== user) return { error: "Unauthorized." };
    let sanitized: string[] = [];
    if (Array.isArray(photoUrls)) {
      sanitized = photoUrls
        .filter((u) => typeof u === "string")
        .map((u) => u.trim())
        .filter((u) => u.length > 0);
    }
    await this.visitEntries.updateOne({ _id: entry._id }, {
      $set: { updatedAt: new Date(), photoUrls: sanitized },
    });
    return {};
  }

  /**
   * updateEntryRating(visit, exhibit, rating?, user)
   * effects: sets rating if valid; ignores invalid values
   */
  async updateEntryRating(
    { visit: visitId, exhibit, rating, user }: {
      visit: VisitId;
      exhibit: ExhibitId;
      rating?: number;
      user: User;
    },
  ): Promise<Empty | { error: string }> {
    const entry = await this.visitEntries.findOne({ visit: visitId, exhibit });
    if (!entry) return { error: "Visit entry not found for rating update." };
    const visit = await this.visits.findOne({ _id: visitId });
    if (!visit || visit.owner !== user) return { error: "Unauthorized." };
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return { error: "Invalid rating value." };
    }
    await this.visitEntries.updateOne({ _id: entry._id }, {
      $set: { updatedAt: new Date(), rating },
    });
    return {};
  }
}
