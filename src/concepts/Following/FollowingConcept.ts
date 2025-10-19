import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts"; // Adjust path as per your project structure
import { freshID } from "@utils/database.ts"; // Adjust path as per your project structure

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
  _id: ID; // Unique identifier for the follow relationship itself
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
    // This also helps optimize queries for specific follow relationships.
    this.follows.createIndex({ follower: 1, followee: 1 }, { unique: true });
  }

  /**
   * follow (follower: User, followee: User)
   *
   * requires: follower ≠ followee, both users exist (implicitly handled by syncs),
   *           and no Follows(follower, followee) currently exists.
   * effects: create a new Follows(follower, followee, createdAt := now) entry in the state.
   */
  async follow({
    follower,
    followee,
  }: {
    follower: User;
    followee: User;
  }): Promise<Empty | { error: string }> {
    // Precondition: follower cannot follow themselves
    if (follower === followee) {
      return { error: "A user cannot follow themselves." };
    }

    // Precondition: `both users exist` is a concern for a higher-level synchronization logic
    // (e.g., via a `UserAuthentication` or `UserProfile` concept).
    // This `Following` concept assumes that `follower` and `followee` IDs are valid inputs.

    // Check if the follow relationship already exists before attempting insertion
    // to provide a more specific error message than a MongoDB duplicate key error.
    const existingFollow = await this.follows.findOne({ follower, followee });
    if (existingFollow) {
      return {
        error: `User ${follower} is already following user ${followee}.`,
      };
    }

    // Effects: Create the new follow relationship
    const newFollow: FollowsDoc = {
      _id: freshID(), // Generate a unique ID for this specific follow document
      follower,
      followee,
      createdAt: new Date(),
    };

    try {
      await this.follows.insertOne(newFollow);
      return {}; // Success
    } catch (e) {
      // In case of a race condition leading to a duplicate key error, catch and report.
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
   * requires: A Follows(follower, followee) relationship must exist.
   * effects: delete the existing Follows(follower, followee) entry from the state.
   */
  async unfollow({
    follower,
    followee,
  }: {
    follower: User;
    followee: User;
  }): Promise<Empty | { error: string }> {
    // Precondition: Check if the relationship exists by attempting to delete it.
    // MongoDB's deleteOne operation returns `deletedCount`.
    const result = await this.follows.deleteOne({ follower, followee });

    // If no document was deleted, the relationship didn't exist.
    if (result.deletedCount === 0) {
      return { error: `User ${follower} is not following user ${followee}.` };
    }

    // Effects: The follow relationship has been successfully deleted.
    return {}; // Success
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
   * effects: Returns a list of Users who are following the given `user`.
   */
  async _getFollowers({ user }: { user: User }): Promise<User[]> {
    const rows = await this.follows
      .find({ followee: user }, { projection: { follower: 1, _id: 0 } })
      .toArray();
    return rows.map((r) => r.follower);
  }

  /**
   * _getFollowees (user: User)
   *
   * effects: Returns a list of Users whom the given `user` is following.
   */
  async _getFollowees({ user }: { user: User }): Promise<User[]> {
    const rows = await this.follows
      .find({ follower: user }, { projection: { followee: 1, _id: 0 } })
      .toArray();
    return rows.map((r) => r.followee);
  }

  /**
   * _areFriends (userA: User, userB: User)
   *
   * effects: Returns `true` if `userA` follows `userB` AND `userB` follows `userA` (mutual follow),
   *          thereby fulfilling the "friends" principle of the concept. Otherwise, returns `false`.
   */
  async _areFriends({
    userA,
    userB,
  }: {
    userA: User;
    userB: User;
  }): Promise<boolean> {
    // A user cannot be friends with themselves in this context, though the definition still holds.
    if (userA === userB) {
      return false; // Or true, depending on exact application logic for "self-friendship". Sticking to mutual follow implies two distinct entities.
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
