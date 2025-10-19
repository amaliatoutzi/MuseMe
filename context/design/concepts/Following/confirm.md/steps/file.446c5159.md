---
timestamp: 'Sun Oct 19 2025 14:38:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_143817.3611e219.md]]'
content_id: 446c51592d32a2b879b4761a53f9d3c56703d341134d0405b0bb761ef2cd5ed3
---

# file: src/Following/FollowingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "../../utils/types.ts"; // Adjust path as per your project structure
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
      return { error: "Failed to establish follow relationship due to an unexpected error." };
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
   * _getFollows (follower: User, followee: User)
   *
   * effects: Returns the Follows document if the specified relationship exists, otherwise null.
   */
  async _getFollows({
    follower,
    followee,
  }: {
    follower: User;
    followee: User;
  }): Promise<FollowsDoc | null> {
    return this.follows.findOne({ follower, followee });
  }

  /**
   * _getFollowers (user: User)
   *
   * effects: Returns a list of Users (their IDs) who are following the given `user`.
   */
  async _getFollowers({ user }: { user: User }): Promise<User[]> {
    const followers = await this.follows
      .find({ followee: user })
      .project<Pick<FollowsDoc, 'follower'>>({ follower: 1, _id: 0 }) // Only return the follower ID
      .toArray();
    return followers.map(f => f.follower);
  }

  /**
   * _getFollowees (user: User)
   *
   * effects: Returns a list of Users (their IDs) whom the given `user` is following.
   */
  async _getFollowees({ user }: { user: User }): Promise<User[]> {
    const followees = await this.follows
      .find({ follower: user })
      .project<Pick<FollowsDoc, 'followee'>>({ followee: 1, _id: 0 }) // Only return the followee ID
      .toArray();
    return followees.map(f => f.followee);
  }

  /**
   * _areFriends (userA: User, userB: User)
   *
   * effects: Returns `true` if `userA` follows `userB` AND `userB` follows `userA` (mutual follow),
   *          thereby fulfilling the "friends" principle of the concept. Otherwise, returns `false`.
   *          A user is generally not considered "friends" with themselves in this context.
   */
  async _areFriends({
    userA,
    userB,
  }: {
    userA: User;
    userB: User;
  }): Promise<boolean> {
    // A user cannot be friends with themselves in this context, as friendship implies distinct entities.
    if (userA === userB) {
      return false;
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

    // If both relationships exist, they are friends.
    return !!(followAtoB && followBtoA);
  }
}
```

***
