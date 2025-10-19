[@application-pitch](../../background/application-pitch.md)

[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

# implement: UserPreferences

# ROLE
You are a senior TypeScript engineer implementing a small, self-contained domain module from a formal concept spec.

# CONCEPT TO IMPLEMENT (authoritative spec; treat “principle” as operational behavior)


## concept **UserPreferences** [User, Tag]

**purpose**
store durable taste tags for ranking and cold-start

**principle**
if a **Preference(user, tag)** exists and **tag ∈ PresetTags**, then ranking functions may treat that tag as an enduring positive signal for **user** until removed.

**state**
a set of **PresetTags** with
- a tag **Tag**  *(e.g., Impressionist, Modern, Photography, Sculpture, Science)*

a set of **Preferences** with
- a user **User**
- a tag **Tag**  *(must be in PresetTags)*
- a createdAt **DateTime**

**actions**
**addPreference**(user: User, tag: Tag)
- requires user exists, tag ∈ PresetTags, and Preferences(user, tag) not present
- effects create Preferences(user, tag, createdAt := now)

**removePreference**(user: User, tag: Tag)
- requires Preferences(user, tag) exists
- effects delete that Preferences

# response:

```typescript
// src/UserPreferences/UserPreferencesConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * @concept UserPreferences [User, Tag]
 * @purpose store durable taste tags for ranking and cold-start
 * @principle if a Preference(user, tag) exists and tag ∈ PresetTags, then ranking functions may treat that tag as an enduring positive signal for user until removed.
 */
// Declare collection prefix, use concept name
const PREFIX = "UserPreferences.";

// Generic types of this concept, treated polymorphically as IDs.
type User = ID;
type Tag = ID;

/**
 * @state a set of PresetTags
 * Documents representing the predefined tags available for users to select.
 * These are assumed to be pre-populated and managed by an external system/concept.
 * Example tags: "Impressionist", "Modern", "Photography", "Sculpture", "Science".
 */
interface PresetTagDoc {
  _id: Tag; // The unique identifier for the tag (e.g., "tag:impressionist")
  name: string; // The human-readable name of the tag (e.g., "Impressionist")
}

/**
 * @state a set of Preferences
 * Documents representing a user's chosen taste tags.
 */
interface PreferenceDoc {
  _id: ID; // Unique ID for this specific preference entry
  user: User; // The ID of the user who made the preference
  tag: Tag; // The ID of the preferred tag (must exist in PresetTags)
  createdAt: Date; // Timestamp when the preference was added
}

export default class UserPreferencesConcept {
  private presetTags: Collection<PresetTagDoc>;
  private preferences: Collection<PreferenceDoc>;

  constructor(private readonly db: Db) {
    this.presetTags = this.db.collection(PREFIX + "presetTags");
    this.preferences = this.db.collection(PREFIX + "preferences");
  }

  /**
   * @action addPreference
   * @param {Object} args - The arguments for the action.
   * @param {User} args.user - The ID of the user.
   * @param {Tag} args.tag - The ID of the tag to add as a preference.
   * @returns {Promise<Empty | { error: string }>} An empty object on success, or an object with an error message on failure.
   * @requires user exists, tag ∈ PresetTags, and Preferences(user, tag) not present
   * @effects create Preferences(user, tag, createdAt := now)
   */
  async addPreference(
    { user, tag }: { user: User; tag: Tag },
  ): Promise<Empty | { error: string }> {
    // Precondition 1: tag ∈ PresetTags
    const tagExists = await this.presetTags.findOne({ _id: tag });
    if (!tagExists) {
      return {
        error: `Tag '${tag}' does not exist in the list of preset tags.`,
      };
    }

    // Precondition 2: Preferences(user, tag) not present
    const existingPreference = await this.preferences.findOne({ user, tag });
    if (existingPreference) {
      return {
        error: `User '${user}' already has a preference for tag '${tag}'.`,
      };
    }

    // Precondition 3: user exists
    // As per concept design principles, this concept is independent.
    // The "user exists" check is typically handled by a UserAuthentication or UserProfile concept
    // and would be enforced via a synchronization rule at the application boundary.
    // For this self-contained concept, we assume the 'user' ID passed is valid.

    // Effects: create Preferences(user, tag, createdAt := now)
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
    // Precondition: Preferences(user, tag) exists
    const existingPreference = await this.preferences.findOne({ user, tag });
    if (!existingPreference) {
      return {
        error: `No preference found for user '${user}' and tag '${tag}'.`,
      };
    }

    // Effects: delete that Preferences
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

  /**
   * @query _getPresetTags
   * @returns {Promise<PresetTagDoc[]>} A list of all available preset tags with their IDs and names.
   * @effects Returns all available preset tags.
   */
  async _getPresetTags(): Promise<PresetTagDoc[]> {
    return await this.presetTags.find({}).toArray();
  }
}

```
