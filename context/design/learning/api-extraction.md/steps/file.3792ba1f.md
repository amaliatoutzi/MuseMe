---
timestamp: 'Wed Oct 22 2025 11:47:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251022_114728.45ea008c.md]]'
content_id: 3792ba1f09ff0fdd96041aeb7e263a8551af8c074761fface9efbe5ccf8dff83
---

# file: src/concepts/Following/FollowingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts"; // Adjust path as per your project structure
import { freshID } from "../../utils/database.ts"; // Adjust path as per your project structure

/**
 * concept Following [User]
 *
 * purpose: maintain directed follow edges; "friends" means mutual follow.
 * used to ensure only friends can view each others visit logs/reviews.
 *
 * principle: if Follows(a,b) and Follows(b,a) both exist, then a and b are friends;
 * only friendship (mutual follows) grants read access to each other’s content at the application boundary.
 */

// Generic types of this concept
type User = ID;

/**
 * a set of Follows with
 *   a follower User
 *   a followee User
 *   a createdAt DateTime
 */
interface FollowsDoc {
  _id: ID; // Unique identifier for the follow relationship document
  follower: User;
  followee: User;
  createdAt: Date;
}

// Collection prefix to ensure isolation in the database
const PREFIX = "Following" + ".";

export default class FollowingConcept {
  private follows: Collection<FollowsDoc>;

  constructor(private readonly db: Db) {
    this.follows = this.db.collection(PREFIX + "follows");
    // Ensure a unique index on (follower, followee) to prevent duplicate follow relationships.
    // This also helps optimize queries for specific follow relationships and enforce uniqueness.
    this.follows.createIndex({ follower: 1, followee: 1 }, { unique: true });
  }

  /**
   * follow (follower: User, followee: User)
   *
   * requires:
   *   - follower ≠ followee (a user cannot follow themselves).
   *   - both users exist (this is an application boundary concern, handled by syncs;
   *     this concept assumes valid User IDs are provided).
   *   - no Follows(follower, followee) currently exists.
   * effects:
   *   - create a new Follows(follower, followee, createdAt := now) entry in the state.
   */
  async follow({
    follower,
    followee,
  }: {
    follower: User;
    followee: User;
  }): Promise<Empty | { error: string }> {
    // Precondition check: follower cannot follow themselves
    if (follower === followee) {
      return { error: "A user cannot follow themselves." };
    }

    // Precondition check: both users must exist in UserAuthentication.credentials
    const usersColl = this.db.collection("UserAuthentication.credentials");
    const followerDoc = await usersColl.findOne({ _id: follower });
    if (!followerDoc) {
      return { error: `Follower user ${follower} does not exist.` };
    }
    const followeeDoc = await usersColl.findOne({ _id: followee });
    if (!followeeDoc) {
      return { error: `Followee user ${followee} does not exist.` };
    }

    // Precondition check: no Follows(follower, followee) currently exists.
    // We check this explicitly to return a more informative error.
    const existingFollow = await this.follows.findOne({ follower, followee });
    if (existingFollow) {
      return {
        error: `User ${follower} is already following user ${followee}.`,
      };
    }

    // Effects: Create the new follow relationship document
    const newFollow: FollowsDoc = {
      _id: freshID(), // Generate a unique ID for this specific follow document
      follower,
      followee,
      createdAt: new Date(),
    };

    try {
      await this.follows.insertOne(newFollow);
      return {}; // Success: Relationship created
    } catch (e) {
      // Catch potential race conditions where another `follow` operation for the same pair
      // might have succeeded right before `findOne` completed. The unique index will prevent it.
      if (e instanceof Error && e.message.includes("duplicate key error")) {
        return {
          error: `User ${follower} is already following user ${followee}.`,
        };
      }
      console.error("Error creating follow relationship:", e);
      return {
        error:
          "Failed to establish follow relationship due to an unexpected error.",
      };
    }
  }

  /**
   * unfollow (follower: User, followee: User)
   *
   * requires:
   *   - A Follows(follower, followee) relationship must exist in the state.
   * effects:
   *   - delete the existing Follows(follower, followee) entry from the state.
   */
  async unfollow({
    follower,
    followee,
  }: {
    follower: User;
    followee: User;
  }): Promise<Empty | { error: string }> {
    // Effects: Attempt to delete the follow relationship.
    // The `deletedCount` will tell us if a matching document was found and removed.
    const result = await this.follows.deleteOne({ follower, followee });

    // Precondition check: If no document was deleted, the relationship didn't exist.
    if (result.deletedCount === 0) {
      return { error: `User ${follower} is not following user ${followee}.` };
    }

    return {}; // Success: Relationship deleted
  }

  // --- Queries (for internal use, testing, and application boundary syncs) ---

  /**
   * _getFollows (follower: User, followee: User) : (follow: FollowsDoc)
   *
   * effects: Returns an array containing the Follows document if the specified relationship exists,
   *          otherwise an empty array.
   */
  async _getFollows({
    follower,
    followee,
  }: {
    follower: User;
    followee: User;
  }): Promise<{ follow: FollowsDoc }[]> { // Changed return type to array of named dictionaries
    const doc = await this.follows.findOne({ follower, followee });
    return doc ? [{ follow: doc }] : []; // Wrap in array and named field
  }

  /**
   * _getFollowers (user: User) : (follower: User)
   *
   * effects: Returns an array of dictionaries, each containing the ID of a User who is following the given `user`.
   */
  async _getFollowers({ user }: { user: User }): Promise<{ follower: User }[]> { // Changed return type to array of named dictionaries
    const followers = await this.follows
      .find({ followee: user })
      .project<Pick<FollowsDoc, "follower">>({ follower: 1, _id: 0 }) // Only return the follower ID
      .toArray();
    return followers.map((f) => ({ follower: f.follower })); // Map to array of named dictionaries
  }

  /**
   * _getFollowees (user: User) : (followee: User)
   *
   * effects: Returns an array of dictionaries, each containing the ID of a User whom the given `user` is following.
   */
  async _getFollowees({ user }: { user: User }): Promise<{ followee: User }[]> { // Changed return type to array of named dictionaries
    const followees = await this.follows
      .find({ follower: user })
      .project<Pick<FollowsDoc, "followee">>({ followee: 1, _id: 0 }) // Only return the followee ID
      .toArray();
    return followees.map((f) => ({ followee: f.followee })); // Map to array of named dictionaries
  }

  /**
   * _getUserIdByUsername (username: string) : (user: User)
   *
   * effects: Looks up `UserAuthentication.credentials` for the given `username` and
   * returns an array containing `{ user }` if found, otherwise an empty array.
   */
  async _getUserIdByUsername({ username }: { username: string }): Promise<{ user: User }[]> {
    const usersColl = this.db.collection("UserAuthentication.credentials");
    const cred = await usersColl.findOne({ username });
    return cred ? [{ user: (cred._id as unknown) as User }] : [];
  }

  /**
   * _getUsernameByUserId (user: User) : (username: string)
   *
   * effects: Looks up `UserAuthentication.credentials` for the given `user` id and
   * returns an array containing `{ username }` if found, otherwise an empty array.
   */
  async _getUsernameByUserId({ user }: { user: User }): Promise<{ username: string }[]> {
    const usersColl = this.db.collection("UserAuthentication.credentials");
    const cred = await usersColl.findOne({ _id: user });
    return cred ? [{ username: (cred.username as string) }] : [];
  }

  /**
   * _areFriends (userA: User, userB: User) : (areFriends: boolean)
   *
   * effects: Returns an array containing a single dictionary with `areFriends: true` if `userA` follows `userB`
   *          AND `userB` follows `userA` (mutual follow). Otherwise, returns an array with `areFriends: false`.
   *          A user is generally not considered "friends" with themselves in this context.
   */
  async _areFriends({
    userA,
    userB,
  }: {
    userA: User;
    userB: User;
  }): Promise<{ areFriends: boolean }[]> { // Changed return type to array of named dictionaries
    // A user cannot be friends with themselves in this context, as friendship implies distinct entities.
    if (userA === userB) {
      return [{ areFriends: false }]; // Wrap the boolean in an array and a named dictionary field
    }

    // Check if userA follows userB
    const followAtoB = await this.follows.findOne({
      follower: userA,
      followee: userB,
    });

    // Check if userB follows userA
    const followBtoA = await this.follows.findOne({
      follower: userB,
      followee: userA,
    });

    return [{ areFriends: !!(followAtoB && followBtoA) }]; // Wrap the boolean
  }
}

```

## Reviewing

Specification:

## concept **Reviewing** \[User, Item]

**purpose**\
record normalized per-item opinion (1–5 stars) with optional note

**principle**\
if **Reviews(user, item)** exists, then it is the single source of truth for that user’s rating of that item; subsequent upserts overwrite the prior rating and update the timestamp.

**state**\
a set of **Reviews** with

* a user **User**
* an item **ItemId**
* a stars **STARS\_1 | STARS\_2 | STARS\_3 | STARS\_4 | STARS\_5**
* an optional note **String**
* an updatedAt **DateTime**

**actions**\
**upsertReview**(user: User, item: ItemId, stars: STARS\_1..STARS\_5, note?: String) : Empty | { error: String }

* requires user exists
* effects if **Reviews(user, item)** exists, update stars and note (if provided); otherwise create it; set `updatedAt := now`

**clearReview**(user: User, item: ItemId) : Empty | { error: String }

* requires **Reviews(user, item)** exists
* effects delete that **Reviews**

**queries**\
**Review?**(user: User, item: ItemId) : (review: Review)

* effects return the review for `(user, item)` if it exists

**ReviewsByUser**(user: User) : (review: Review)

* effects return every review authored by `user`

**ReviewsByItem**(item: ItemId) : (review: Review)

* effects return every review recorded for `item`

Code:
