## concept **Profile** [User]

**purpose**
store minimal user profile details for display

**principle**
- a user can add their first and last name when creating their profile; hey cannot edit it in the future n
- a user can optionally add a profile picture (through URL) and may be added, edited, or removed independently of name

**state**
a set of **Profile** with
- an owner **User**
- a firstName **String**
- a lastName **String**
- an optional profilePictureUrl **String**
- a createdAt **DateTime**
- an updatedAt **DateTime**

**actions**
**addName**(user: User, firstName: String, lastName: String)
- requires no name has been set for this user yet
- effects if no Profile(owner := user) exists, create it; set **firstName** and **lastName**; set **createdAt := now** (if created) and **updatedAt := now**

**addProfilePicture**(user: User, url: String)
- requires none
- effects if no Profile(owner := user) exists, create it; set **profilePictureUrl := url**; set **createdAt := now** (if created) and **updatedAt := now**

**editProfilePicture**(user: User, url: String)
- requires Profile(owner := user).profilePictureUrl exists and user Exists
- effects set **profilePictureUrl := url**; set **updatedAt := now**

**removeProfilePicture**(user: User)
- requires Profile(owner := user).profilePictureUrl exists and User exists
- effects remove **profilePictureUrl** (unset it); set **updatedAt := now**

**queries**
**Profile?**(user: User) : (profile: Profile)
- effects return the Profile for **user** if it exists (with whatever fields have been added), otherwise return nothing


Coded using an AI agent:

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

/**
 * concept Profile [User]
 *
 * purpose: store minimal user profile details for display: immutable first and last name (added once),
 * and an optional profile picture URL that can be added/edited/removed
 */

// Generic type of this concept
type User = ID;

/**
 * a set of Profile with
 *   an owner User (stored as _id)
 *   optional firstName String
 *   optional lastName String
 *   optional profilePictureUrl String
 *   a createdAt DateTime
 *   an updatedAt DateTime
 */
interface ProfileDoc {
  _id: User; // owner
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Collection prefix to ensure isolation in the database
const PREFIX = "Profile" + ".";

export default class ProfileConcept {
  private profiles: Collection<ProfileDoc>;

  constructor(private readonly db: Db) {
    this.profiles = this.db.collection(PREFIX + "profiles");
  }

  private isBlank(s: string) {
    return !s || s.trim().length === 0;
  }

  /**
   * addName(user: User, firstName: String, lastName: String)
   *
   * requires: user exists and no name has been set for this user yet
   * effects: if no Profile(owner := user) exists, create it; set firstName and lastName;
   *          set createdAt := now (if created) and updatedAt := now
   */
  async addName({
    user,
    firstName,
    lastName,
  }: {
    user: User;
    firstName: string;
    lastName: string;
  }): Promise<Empty | { error: string }> {
    // validate inputs
    if (this.isBlank(firstName) || this.isBlank(lastName)) {
      return { error: "First and last name cannot be empty." };
    }

    // user existence
    {
      const usersColl = this.db.collection("UserAuthentication.credentials");
      const doc = await usersColl.findOne({ _id: user });
      if (!doc) return { error: `User ${user} does not exist.` };
    }

    const now = new Date();
    const existing = await this.profiles.findOne({ _id: user });
    if (!existing) {
      const doc: ProfileDoc = {
        _id: user,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        createdAt: now,
        updatedAt: now,
      };
      await this.profiles.insertOne(doc);
      return {};
    }

    if (existing.firstName !== undefined || existing.lastName !== undefined) {
      return { error: "Name has already been set and cannot be modified." };
    }

    const res = await this.profiles.updateOne(
      {
        _id: user,
        firstName: { $exists: false },
        lastName: { $exists: false },
      },
      {
        $set: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          updatedAt: now,
        },
      },
    );
    if (res.matchedCount === 0) {
      // concurrent write likely set a name
      return { error: "Name has already been set and cannot be modified." };
    }
    return {};
  }

  /**
   * addProfilePicture(user: User, url: String)
   *
   * requires: user exists and no profile picture currently set
   * effects: upsert profile if needed; set profilePictureUrl := url; set timestamps
   */
  async addProfilePicture({
    user,
    url,
  }: {
    user: User;
    url: string;
  }): Promise<Empty | { error: string }> {
    if (this.isBlank(url)) {
      return { error: "Profile picture URL cannot be empty." };
    }
    {
      const usersColl = this.db.collection("UserAuthentication.credentials");
      const doc = await usersColl.findOne({ _id: user });
      if (!doc) return { error: `User ${user} does not exist.` };
    }

    const now = new Date();
    const existing = await this.profiles.findOne({ _id: user });
    if (!existing) {
      const doc: ProfileDoc = {
        _id: user,
        profilePictureUrl: url.trim(),
        createdAt: now,
        updatedAt: now,
      };
      await this.profiles.insertOne(doc);
      return {};
    }

    if (existing.profilePictureUrl !== undefined) {
      return {
        error: "Profile picture already set. Use editProfilePicture instead.",
      };
    }

    const res = await this.profiles.updateOne(
      { _id: user, profilePictureUrl: { $exists: false } },
      { $set: { profilePictureUrl: url.trim(), updatedAt: now } },
    );
    if (res.matchedCount === 0) {
      return {
        error: "Profile picture already set. Use editProfilePicture instead.",
      };
    }
    return {};
  }

  /**
   * editProfilePicture(user: User, url: String)
   *
   * requires: user exists and profile picture currently set
   * effects: set profilePictureUrl := url; updatedAt := now
   */
  async editProfilePicture({
    user,
    url,
  }: {
    user: User;
    url: string;
  }): Promise<Empty | { error: string }> {
    if (this.isBlank(url)) {
      return { error: "Profile picture URL cannot be empty." };
    }
    {
      const usersColl = this.db.collection("UserAuthentication.credentials");
      const doc = await usersColl.findOne({ _id: user });
      if (!doc) return { error: `User ${user} does not exist.` };
    }

    const now = new Date();
    const res = await this.profiles.updateOne(
      { _id: user, profilePictureUrl: { $exists: true } },
      { $set: { profilePictureUrl: url.trim(), updatedAt: now } },
    );
    if (res.matchedCount === 0) {
      return {
        error: "No profile picture to edit. Use addProfilePicture first.",
      };
    }
    return {};
  }

  /**
   * removeProfilePicture(user: User)
   *
   * requires: user exists and profile picture currently set
   * effects: unset profilePictureUrl; updatedAt := now
   */
  async removeProfilePicture(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    {
      const usersColl = this.db.collection("UserAuthentication.credentials");
      const doc = await usersColl.findOne({ _id: user });
      if (!doc) return { error: `User ${user} does not exist.` };
    }
    const now = new Date();
    const res = await this.profiles.updateOne(
      { _id: user, profilePictureUrl: { $exists: true } },
      { $unset: { profilePictureUrl: "" }, $set: { updatedAt: now } },
    );
    if (res.matchedCount === 0) {
      return { error: "No profile picture to remove." };
    }
    return {};
  }

  // --- Queries ---

  /**
   * _getProfile(user: User) : (profile: Profile)
   *
   * effects: returns an array containing the Profile document if it exists, otherwise []
   */
  async _getProfile(
    { user }: { user: User },
  ): Promise<{ profile: ProfileDoc }[]> {
    const doc = await this.profiles.findOne({ _id: user });
    return doc ? [{ profile: doc }] : [];
  }
}
