---
timestamp: 'Sun Oct 19 2025 14:38:56 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_143856.25360e9c.md]]'
content_id: c4fefa32a691d97f17d0a178e44fbb1a4b3f0a866921ec1c9733a7f614af3234
---

# response:

You've done an excellent job with the `FollowingConcept` implementation! It's clear, robust, and correctly separates concerns. The proposed changes below are solely to bring the query return types into strict alignment with the concept design rubric's explicit guidance: "queries MUST return an **array** of the type specified by the return signature" and "all arguments and results are named."

### Proposed Changes to `src/Following/FollowingConcept.ts`

These are the changes to the concept file to adjust the query return types.

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
      .project<Pick<FollowsDoc, 'follower'>>({ follower: 1, _id: 0 }) // Only return the follower ID
      .toArray();
    return followers.map(f => ({ follower: f.follower })); // Map to array of named dictionaries
  }

  /**
   * _getFollowees (user: User) : (followee: User)
   *
   * effects: Returns an array of dictionaries, each containing the ID of a User whom the given `user` is following.
   */
  async _getFollowees({ user }: { user: User }): Promise<{ followee: User }[]> { // Changed return type to array of named dictionaries
    const followees = await this.follows
      .find({ follower: user })
      .project<Pick<FollowsDoc, 'followee'>>({ followee: 1, _id: 0 }) // Only return the followee ID
      .toArray();
    return followees.map(f => ({ followee: f.followee })); // Map to array of named dictionaries
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

### Edits to `src/Following/FollowingConcept.test.ts`

Here's how you would update your test cases to match the refined concept implementation.

```typescript
import {
  assertEquals,
  assertNotEquals,
  assertObjectMatch,
} from "jsr:@std/assert";
import { Collection, Db, MongoClient } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts"; // Adjust path as per your project structure
import { freshID, testDb } from "@utils/database.ts"; // Adjust path as per your project structure

import FollowingConcept from "./FollowingConcept.ts";

// Define some user IDs for testing
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCharlie = "user:Charlie" as ID;
const userDavid = "user:David" as ID;

Deno.test("FollowingConcept: Operational Principle - Mutual Follows Grant Friendship", async (t) => {
  const [db, client] = await testDb();
  const followingConcept = new FollowingConcept(db);

  try {
    console.log(`--- Test: Operational Principle ---`);

    // Trace: Alice follows Bob
    console.log(`Action: Alice (${userAlice}) follows Bob (${userBob})`);
    const followAliceBobResult = await followingConcept.follow({
      follower: userAlice,
      followee: userBob,
    });
    assertEquals(
      followAliceBobResult,
      {},
      "Alice should successfully follow Bob",
    );
    // Query: _getFollows now returns an array of named dictionaries
    const aliceFollowsBobArray = await followingConcept._getFollows({
      follower: userAlice,
      followee: userBob,
    });
    assertEquals(
      aliceFollowsBobArray.length,
      1,
      "Alice's follow of Bob should be recorded (one result)",
    );
    assertObjectMatch(aliceFollowsBobArray[0].follow, { // Access `follow` property
      follower: userAlice,
      followee: userBob,
    });
    console.log(`Query: Alice's follow of Bob found: ${JSON.stringify(aliceFollowsBobArray[0].follow)}`);


    // Trace: Check if Alice and Bob are friends (should be false, as it's not mutual yet)
    // Query: _areFriends now returns an array of named dictionaries
    let areAliceBobFriendsResult = await followingConcept._areFriends({
      userA: userAlice,
      userB: userBob,
    });
    assertEquals(
      areAliceBobFriendsResult[0].areFriends, // Access `areFriends` property
      false,
      "Alice and Bob should not be friends yet",
    );
    console.log(`Query: Alice and Bob are friends? ${areAliceBobFriendsResult[0].areFriends}`);

    // Trace: Bob follows Alice
    console.log(`Action: Bob (${userBob}) follows Alice (${userAlice})`);
    const followBobAliceResult = await followingConcept.follow({
      follower: userBob,
      followee: userAlice,
    });
    assertEquals(
      followBobAliceResult,
      {},
      "Bob should successfully follow Alice",
    );
    // Query: _getFollows now returns an array of named dictionaries
    const bobFollowsAliceArray = await followingConcept._getFollows({
      follower: userBob,
      followee: userAlice,
    });
    assertEquals(
      bobFollowsAliceArray.length,
      1,
      "Bob's follow of Alice should be recorded (one result)",
    );
    assertObjectMatch(bobFollowsAliceArray[0].follow, { // Access `follow` property
      follower: userBob,
      followee: userAlice,
    });
    console.log(`Query: Bob's follow of Alice found: ${JSON.stringify(bobFollowsAliceArray[0].follow)}`);


    // Trace: Check if Alice and Bob are friends (should be true now)
    // Query: _areFriends now returns an array of named dictionaries
    areAliceBobFriendsResult = await followingConcept._areFriends({
      userA: userAlice,
      userB: userBob,
    });
    assertEquals(
      areAliceBobFriendsResult[0].areFriends, // Access `areFriends` property
      true,
      "Alice and Bob should now be friends",
    );
    console.log(`Query: Alice and Bob are friends? ${areAliceBobFriendsResult[0].areFriends}`);

    console.log(`--- Operational Principle Test Complete ---`);
  } finally {
    await client.close();
  }
});

Deno.test("FollowingConcept: Basic Follow/Unfollow and Querying", async (t) => {
  const [db, client] = await testDb();
  const followingConcept = new FollowingConcept(db);

  try {
    console.log(`--- Test: Basic Follow/Unfollow ---`);

    // Scenario: Alice follows Charlie
    console.log(
      `Action: Alice (${userAlice}) follows Charlie (${userCharlie})`,
    );
    const followResult = await followingConcept.follow({
      follower: userAlice,
      followee: userCharlie,
    });
    assertEquals(followResult, {}, "Alice should successfully follow Charlie");

    // Verify the follow exists
    // Query: _getFollows now returns an array of named dictionaries
    const aliceToCharlieArray = await followingConcept._getFollows({
      follower: userAlice,
      followee: userCharlie,
    });
    assertEquals(
      aliceToCharlieArray.length,
      1,
      "Follow relationship (Alice -> Charlie) should exist",
    );
    assertObjectMatch(aliceToCharlieArray[0].follow, { // Access `follow` property
      follower: userAlice,
      followee: userCharlie,
    });
    console.log(`Query: Alice follows Charlie? Yes (${JSON.stringify(aliceToCharlieArray[0].follow)})`);

    // Get followees for Alice
    // Query: _getFollowees now returns an array of named dictionaries
    let aliceFollowees = await followingConcept._getFollowees({
      user: userAlice,
    });
    assertEquals(
      aliceFollowees.map(f => f.followee).includes(userCharlie), // Map to get the user IDs
      true,
      "Alice's followees should include Charlie",
    );
    assertEquals(aliceFollowees.length, 1, "Alice should have 1 followee");
    console.log(`Query: Alice's followees: ${JSON.stringify(aliceFollowees.map(f => f.followee))}`);


    // Get followers for Charlie
    // Query: _getFollowers now returns an array of named dictionaries
    let charlieFollowers = await followingConcept._getFollowers({
      user: userCharlie,
    });
    assertEquals(
      charlieFollowers.map(f => f.follower).includes(userAlice), // Map to get the user IDs
      true,
      "Charlie's followers should include Alice",
    );
    assertEquals(charlieFollowers.length, 1, "Charlie should have 1 follower");
    console.log(`Query: Charlie's followers: ${JSON.stringify(charlieFollowers.map(f => f.follower))}`);


    // Scenario: Alice unfollows Charlie
    console.log(
      `Action: Alice (${userAlice}) unfollows Charlie (${userCharlie})`,
    );
    const unfollowResult = await followingConcept.unfollow({
      follower: userAlice,
      followee: userCharlie,
    });
    assertEquals(
      unfollowResult,
      {},
      "Alice should successfully unfollow Charlie",
    );

    // Verify the follow no longer exists
    // Query: _getFollows now returns an array of named dictionaries
    const noAliceToCharlieArray = await followingConcept._getFollows({
      follower: userAlice,
      followee: userCharlie,
    });
    assertEquals(
      noAliceToCharlieArray.length,
      0, // Expect empty array
      "Follow relationship (Alice -> Charlie) should no longer exist",
    );
    console.log(`Query: Alice follows Charlie? No`);

    // Get followees for Alice again
    // Query: _getFollowees now returns an array of named dictionaries
    aliceFollowees = await followingConcept._getFollowees({ user: userAlice });
    assertEquals(
      aliceFollowees.map(f => f.followee).includes(userCharlie),
      false,
      "Alice's followees should no longer include Charlie",
    );
    assertEquals(aliceFollowees.length, 0, "Alice should have 0 followees");
    console.log(`Query: Alice's followees: ${JSON.stringify(aliceFollowees.map(f => f.followee))}`);

    // Get followers for Charlie again
    // Query: _getFollowers now returns an array of named dictionaries
    charlieFollowers = await followingConcept._getFollowers({
      user: userCharlie,
    });
    assertEquals(
      charlieFollowers.map(f => f.follower).includes(userAlice),
      false,
      "Charlie's followers should no longer include Alice",
    );
    assertEquals(charlieFollowers.length, 0, "Charlie should have 0 followers");
    console.log(`Query: Charlie's followers: ${JSON.stringify(charlieFollowers.map(f => f.follower))}`);


    console.log(`--- Basic Follow/Unfollow Test Complete ---`);
  } finally {
    await client.close();
  }
});

Deno.test("FollowingConcept: Follow Precondition Violations", async (t) => {
  const [db, client] = await testDb();
  const followingConcept = new FollowingConcept(db);

  try {
    console.log(`--- Test: Follow Precondition Violations ---`);

    // Scenario: Alice tries to follow herself
    console.log(`Action: Alice (${userAlice}) tries to follow herself`);
    const selfFollowResult = await followingConcept.follow({
      follower: userAlice,
      followee: userAlice,
    });
    assertNotEquals(selfFollowResult, {}, "Self-follow should return an error");
    assertObjectMatch(selfFollowResult, {
      error: "A user cannot follow themselves.",
    });
    console.log(`Result: ${JSON.stringify(selfFollowResult)}`);

    // Scenario: Alice follows Bob successfully first
    console.log(`Action: Alice (${userAlice}) follows Bob (${userBob})`);
    const followSuccess = await followingConcept.follow({
      follower: userAlice,
      followee: userBob,
    });
    assertEquals(followSuccess, {}, "Alice should successfully follow Bob");
    console.log(`Result: ${JSON.stringify(followSuccess)}`);

    // Scenario: Alice tries to follow Bob again (duplicate)
    console.log(
      `Action: Alice (${userAlice}) tries to follow Bob (${userBob}) again`,
    );
    const duplicateFollowResult = await followingConcept.follow({
      follower: userAlice,
      followee: userBob,
    });
    assertNotEquals(
      duplicateFollowResult,
      {},
      "Duplicate follow should return an error",
    );
    assertObjectMatch(duplicateFollowResult, {
      error: `User ${userAlice} is already following user ${userBob}.`,
    });
    console.log(`Result: ${JSON.stringify(duplicateFollowResult)}`);

    console.log(`--- Follow Precondition Violations Test Complete ---`);
  } finally {
    await client.close();
  }
});

Deno.test("FollowingConcept: Unfollow Precondition Violations", async (t) => {
  const [db, client] = await testDb();
  const followingConcept = new FollowingConcept(db);

  try {
    console.log(`--- Test: Unfollow Precondition Violations ---`);

    // Scenario: Alice tries to unfollow Bob, whom she is not following
    console.log(
      `Action: Alice (${userAlice}) tries to unfollow Bob (${userBob}) (not following)`,
    );
    const unfollowNonExistent = await followingConcept.unfollow({
      follower: userAlice,
      followee: userBob,
    });
    assertNotEquals(
      unfollowNonExistent,
      {},
      "Unfollowing a non-existent relationship should return an error",
    );
    assertObjectMatch(unfollowNonExistent, {
      error: `User ${userAlice} is not following user ${userBob}.`,
    });
    console.log(`Result: ${JSON.stringify(unfollowNonExistent)}`);

    // Scenario: Alice follows Charlie first
    await followingConcept.follow({
      follower: userAlice,
      followee: userCharlie,
    });
    console.log(`(Setup: Alice follows Charlie)`);

    // Scenario: Bob tries to unfollow Charlie, whom he is not following
    console.log(
      `Action: Bob (${userBob}) tries to unfollow Charlie (${userCharlie}) (not following)`,
    );
    const bobUnfollowCharlie = await followingConcept.unfollow({
      follower: userBob,
      followee: userCharlie,
    });
    assertNotEquals(
      bobUnfollowCharlie,
      {},
      "Bob unfollowing Charlie should return an error",
    );
    assertObjectMatch(bobUnfollowCharlie, {
      error: `User ${userBob} is not following user ${userCharlie}.`,
    });
    console.log(`Result: ${JSON.stringify(bobUnfollowCharlie)}`);

    console.log(`--- Unfollow Precondition Violations Test Complete ---`);
  } finally {
    await client.close();
  }
});

Deno.test("FollowingConcept: Asymmetric Follow and Friendship Status", async (t) => {
  const [db, client] = await testDb();
  const followingConcept = new FollowingConcept(db);

  try {
    console.log(`--- Test: Asymmetric Follow ---`);

    // Scenario: David follows Charlie, but Charlie does not follow David
    console.log(
      `Action: David (${userDavid}) follows Charlie (${userCharlie})`,
    );
    const res = await followingConcept.follow({
      follower: userDavid,
      followee: userCharlie,
    });

    assertEquals(res, {}, "follow() should succeed");

    // Query: _getFollows now returns an array of named dictionaries
    const edgeArray = await followingConcept._getFollows({
      follower: userDavid,
      followee: userCharlie,
    });

    assertEquals(edgeArray.length, 1, "David should successfully follow Charlie");
    assertObjectMatch(edgeArray[0].follow, {
      follower: userDavid,
      followee: userCharlie,
    });
    console.log(`(David follows Charlie)`);

    // Check friendship status: should be false
    // Query: _areFriends now returns an array of named dictionaries
    const areDavidCharlieFriendsResult = await followingConcept._areFriends({
      userA: userDavid,
      userB: userCharlie,
    });
    assertEquals(
      areDavidCharlieFriendsResult[0].areFriends, // Access `areFriends` property
      false,
      "David and Charlie should not be friends (asymmetric)",
    );
    console.log(
      `Query: David and Charlie are friends? ${areDavidCharlieFriendsResult[0].areFriends}`,
    );

    // Check David's followees
    // Query: _getFollowees now returns an array of named dictionaries
    const davidFollowees = await followingConcept._getFollowees({
      user: userDavid,
    });
    assertEquals(
      davidFollowees.map(f => f.followee), // Map to get the user IDs
      [userCharlie],
      "David should follow only Charlie",
    );
    console.log(`Query: David's followees: ${JSON.stringify(davidFollowees.map(f => f.followee))}`);


    // Check Charlie's followers
    // Query: _getFollowers now returns an array of named dictionaries
    const charlieFollowers = await followingConcept._getFollowers({
      user: userCharlie,
    });
    assertEquals(
      charlieFollowers.map(f => f.follower), // Map to get the user IDs
      [userDavid],
      "Charlie should have only David as a follower",
    );
    console.log(`Query: Charlie's followers: ${JSON.stringify(charlieFollowers.map(f => f.follower))}`);


    // Scenario: Charlie decides to follow David
    console.log(
      `Action: Charlie (${userCharlie}) follows David (${userDavid})`,
    );

    const res2 = await followingConcept.follow({
      follower: userCharlie,
      followee: userDavid,
    });
    assertEquals(res2, {}, "follow() should succeed");

    // Query: _getFollows now returns an array of named dictionaries
    const edge2Array = await followingConcept._getFollows({
      follower: userCharlie,
      followee: userDavid,
    });

    assertEquals(edge2Array.length, 1, "Charlie should successfully follow David");
    assertObjectMatch(edge2Array[0].follow, {
      follower: userCharlie,
      followee: userDavid,
    });
    console.log(`(Charlie follows David)`);


    // Check friendship status again: should be true now
    // Query: _areFriends now returns an array of named dictionaries
    const nowAreDavidCharlieFriendsResult = await followingConcept._areFriends({
      userA: userDavid,
      userB: userCharlie,
    });
    assertEquals(
      nowAreDavidCharlieFriendsResult[0].areFriends, // Access `areFriends` property
      true,
      "David and Charlie should now be friends (mutual)",
    );
    console.log(
      `Query: David and Charlie are friends? ${nowAreDavidCharlieFriendsResult[0].areFriends}`,
    );

    console.log(`--- Asymmetric Follow Test Complete ---`);
  } finally {
    await client.close();
  }
});

Deno.test("FollowingConcept: Multiple Follows and Complex Scenarios", async (t) => {
  const [db, client] = await testDb();
  const followingConcept = new FollowingConcept(db);

  try {
    console.log(`--- Test: Multiple Follows and Complex Scenarios ---`);

    // Alice follows Bob, Charlie, David
    console.log(`Action: Alice follows Bob, Charlie, David`);
    await followingConcept.follow({ follower: userAlice, followee: userBob });
    await followingConcept.follow({
      follower: userAlice,
      followee: userCharlie,
    });
    await followingConcept.follow({ follower: userAlice, followee: userDavid });
    // Query: _getFollowees now returns an array of named dictionaries
    assertEquals(
      (await followingConcept._getFollowees({ user: userAlice })).length,
      3,
      "Alice should follow 3 users",
    );
    console.log(
      `Query: Alice's followees: ${JSON.stringify((await followingConcept._getFollowees({ user: userAlice })).map(f => f.followee))}`,
    );

    // Bob follows Alice, Charlie
    console.log(`Action: Bob follows Alice, Charlie`);
    await followingConcept.follow({ follower: userBob, followee: userAlice });
    await followingConcept.follow({ follower: userBob, followee: userCharlie });
    // Query: _getFollowees now returns an array of named dictionaries
    assertEquals(
      (await followingConcept._getFollowees({ user: userBob })).length,
      2,
      "Bob should follow 2 users",
    );
    console.log(
      `Query: Bob's followees: ${JSON.stringify((await followingConcept._getFollowees({ user: userBob })).map(f => f.followee))}`,
    );

    // Check friendship: Alice & Bob
    // Query: _areFriends now returns an array of named dictionaries
    let areAliceBobFriendsResult = await followingConcept._areFriends({
      userA: userAlice,
      userB: userBob,
    });
    assertEquals(areAliceBobFriendsResult[0].areFriends, true, "Alice and Bob should be friends");
    console.log(`Query: Alice & Bob friends? ${areAliceBobFriendsResult[0].areFriends}`);

    // Check friendship: Alice & Charlie
    // Query: _areFriends now returns an array of named dictionaries
    let areAliceCharlieFriendsResult = await followingConcept._areFriends({
      userA: userAlice,
      userB: userCharlie,
    });
    assertEquals(
      areAliceCharlieFriendsResult[0].areFriends,
      false,
      "Alice and Charlie should not be friends yet (Charlie doesn't follow Alice)",
    );
    console.log(`Query: Alice & Charlie friends? ${areAliceCharlieFriendsResult[0].areFriends}`);

    // Check Charlie's followers (Alice, Bob)
    // Query: _getFollowers now returns an array of named dictionaries
    const charlieFollowers = await followingConcept._getFollowers({
      user: userCharlie,
    });
    assertEquals(
      charlieFollowers.map(f => f.follower).sort(), // Map to get user IDs, then sort for comparison
      [userAlice, userBob].sort(),
      "Charlie should have Alice and Bob as followers",
    );
    console.log(`Query: Charlie's followers: ${JSON.stringify(charlieFollowers.map(f => f.follower))}`);

    // Alice unfollows David
    console.log(`Action: Alice unfollows David`);
    await followingConcept.unfollow({
      follower: userAlice,
      followee: userDavid,
    });
    // Query: _getFollowees now returns an array of named dictionaries
    assertEquals(
      (await followingConcept._getFollowees({ user: userAlice })).length,
      2,
      "Alice should now follow 2 users",
    );
    // Query: _getFollowers now returns an array of named dictionaries
    const davidFollowers = await followingConcept._getFollowers({
      user: userDavid,
    });
    assertEquals(davidFollowers.length, 0, "David should have no followers");
    console.log(
      `Query: Alice's followees: ${JSON.stringify((await followingConcept._getFollowees({ user: userAlice })).map(f => f.followee))}`,
    );
    console.log(`Query: David's followers: ${JSON.stringify(davidFollowers.map(f => f.follower))}`);

    console.log(`--- Multiple Follows and Complex Scenarios Test Complete ---`);
  } finally {
    await client.close();
  }
});
```
