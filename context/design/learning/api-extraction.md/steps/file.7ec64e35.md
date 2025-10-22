---
timestamp: 'Tue Oct 21 2025 12:05:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_120518.1ade212f.md]]'
content_id: 7ec64e35f92efb2018cec8197a907ba4ab969778873333fdb59714a7bfd065e3
---

# file: src/concepts/UserPreferences/UserPreferencesConcept.ts

```typescript
// src/UserPreferences/UserPreferencesConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * @concept UserPreferences [User, Tag]
 * @purpose store durable taste tags for ranking and cold-start for individual users.
 * @principle if a Preference(user, tag) exists, then ranking functions may treat that tag as an enduring positive signal for user until removed. The validity of the `tag` ID itself is guaranteed by the calling context (e.g., a TagCatalog concept or application-level validation).
 */
// Declare collection prefix, use concept name
const PREFIX = "UserPreferences.";

// Generic types of this concept, treated polymorphically as IDs.
type User = ID;
type Tag = ID;

// REMOVED: The PresetTagDoc interface is no longer part of this concept's state.
// The concept no longer manages the list of preset tags directly.

/**
 * @state a set of Preferences
 * Documents representing a user's chosen taste tags, referencing externally managed tags.
 */
interface PreferenceDoc {
  _id: ID; // Unique ID for this specific preference entry
  user: User; // The ID of the user who made the preference
  tag: Tag; // The ID of the preferred tag (assumed to be externally valid)
  createdAt: Date; // Timestamp when the preference was added
}

export default class UserPreferencesConcept {
  // REMOVED: private presetTags: Collection<PresetTagDoc>;
  // This collection is no longer managed by UserPreferencesConcept.
  private preferences: Collection<PreferenceDoc>;

  constructor(private readonly db: Db) {
    // Only the preferences collection is relevant to this concept's state.
    this.preferences = this.db.collection(PREFIX + "preferences");
  }

  /**
   * @action addPreference
   * @param {Object} args - The arguments for the action.
   * @param {User} args.user - The ID of the user.
   * @param {Tag} args.tag - The ID of the tag to add as a preference.
   * @returns {Promise<Empty | { error: string }>} An empty object on success, or an object with an error message on failure.
   * @requires user exists, tag is a valid and existing tag ID (externally verified), and Preferences(user, tag) not present
   * @effects create Preferences(user, tag, createdAt := now)
   */
  async addPreference(
    { user, tag }: { user: User; tag: Tag },
  ): Promise<Empty | { error: string }> {
    // PRECONDITION 1: tag is a valid and existing tag ID (externally verified)
    // As per the revised spec, this validation is handled by the calling context (e.g., a sync).
    // This concept assumes that the 'tag' ID passed here is already verified as valid.
    // If an invalid tag ID were passed, it would be treated as a preference for that specific ID.

    // PRECONDITION 2: user exists
    // Similar to tag validation, user existence is handled by external concepts/syncs.
    // This concept assumes the 'user' ID passed is valid.

    // PRECONDITION 3: Preferences(user, tag) not present
    const existingPreference = await this.preferences.findOne({ user, tag });
    if (existingPreference) {
      return {
        error: `User '${user}' already has a preference for tag '${tag}'.`,
      };
    }

    // EFFECTS: create Preferences(user, tag, createdAt := now)
    const newPreference: PreferenceDoc = {
      _id: freshID(), // Generate a unique ID for this preference entry
      user,
      tag,
      createdAt: new Date(),
    };

    try {
      await this.preferences.insertOne(newPreference);
      return {};
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { error: `Failed to add preference: ${msg}` };
    }
  }

  /**
   * @action removePreference
   * @param {Object} args - The arguments for the action.
   * @param {User} args.user - The ID of the user.
   * @param {Tag} args.tag - The ID of the tag to remove from preferences.
   * @returns {Promise<Empty | { error: string }>} An empty object on success, or an object with an error message on failure.
   * @requires Preferences(user, tag) exists
   * @effects delete that Preferences
   */
  async removePreference(
    { user, tag }: { user: User; tag: Tag },
  ): Promise<Empty | { error: string }> {
    // PRECONDITION: Preferences(user, tag) exists
    const existingPreference = await this.preferences.findOne({ user, tag });
    if (!existingPreference) {
      return {
        error: `No preference found for user '${user}' and tag '${tag}'.`,
      };
    }

    // EFFECTS: delete that Preferences
    try {
      await this.preferences.deleteOne({ _id: existingPreference._id });
      return {};
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { error: `Failed to remove preference: ${msg}` };
    }
  }

  // --- Queries (Implicitly defined, but useful to add explicit ones for visibility and testing) ---

  /**
   * @query _getPreferencesForUser
   * @param {User} user - The ID of the user.
   * @returns {Promise<Tag[]>} A list of tag IDs preferred by the specified user.
   * @effects Returns all tags preferred by a specific user.
   */
  async _getPreferencesForUser(user: User): Promise<Tag[]> {
    const userPreferences = await this.preferences.find({ user }).toArray();
    return userPreferences.map((pref) => pref.tag);
  }

  /**
   * @query _getUsersByPreferenceTag
   * @param {Tag} tag - The ID of the tag.
   * @returns {Promise<User[]>} A list of user IDs who have preferred the specific tag.
   * @effects Returns all users who have preferred a specific tag.
   */
  async _getUsersByPreferenceTag(tag: Tag): Promise<User[]> {
    const usersWithTag = await this.preferences.find({ tag }).toArray();
    return usersWithTag.map((pref) => pref.user);
  }

  // REMOVED: _getPresetTags query, as PresetTags are no longer managed by this concept.
}

```

## Visit

Specification:

## concept **Visit** \[User, MuseumId, ExhibitId, VisitEntryId]

**purpose**
capture a user’s personal diary of a museum visit, including the list of exhibits seen, each with optional note and photo

**principle**
when a user logs a museum visit and records the exhibits they saw (with optional notes/photos), the visit becomes an editable diary entry owned by that user.

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
* effects create **Visit(visitId, owner, museum, title?)**; set `createdAt := now`, `updatedAt := now`

**addEntry**(visit: VisitId, exhibit: ExhibitId, note?: String, photoUrl?: String, user: User) : Empty | { error: String }

* requires **Visits\[visit]** exists, `user = Visits[visit].owner`, and exhibit belongs to **Visits\[visit].museum**
* effects create **VisitEntries(visitEntryId, visit, exhibit, note?, photoUrl?, loggedAt := now, updatedAt := now)**; set **Visits\[visit].updatedAt := now**; returns error if exhibit already logged for this visit

**editEntry**(visitEntryId: VisitEntryId, note?: String, photoUrl?: String, user: User) : Empty | { error: String }

* requires entry exists and `user = entry.visit.owner`
* effects update provided fields; set **VisitEntries\[visitEntryId].updatedAt := now**; set **Visits\[entry.visit].updatedAt := now**

**removeEntry**(visitEntryId: VisitEntryId, user: User) : Empty | { error: String }

* requires entry exists and `user = entry.visit.owner`
* effects delete the entry; set **Visits\[entry.visit].updatedAt := now**

**queries**
**Visit?**(visitId: VisitId) : (visit: Visit)

* effects return the visit with the given `visitId`, if it exists

**VisitsByUser**(user: User) : (visit: Visit)

* effects return every visit owned by `user`, ordered by `updatedAt` descending

**EntriesByVisit**(visitId: VisitId) : (entry: VisitEntry)

* effects return every visit entry for `visitId`, ordered by `loggedAt` ascending

**VisitEntry?**(visitEntryId: VisitEntryId) : (entry: VisitEntry)

* effects return the visit entry with the given `visitEntryId`, if it exists

Code:
