---
timestamp: 'Sat Oct 18 2025 17:01:00 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_170100.1652b0fa.md]]'
content_id: fea48042cebcdeb90308bb6e77d0b1eccf6ad85e16a3df81cf080bfac838d8b6
---

# file: src/Following/FollowingConcept.test.ts

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
    const aliceFollowsBob = await followingConcept._getFollows({
      follower: userAlice,
      followee: userBob,
    });
    assertNotEquals(
      aliceFollowsBob,
      null,
      "Alice's follow of Bob should be recorded",
    );

    // Trace: Check if Alice and Bob are friends (should be false, as it's not mutual yet)
    let areAliceBobFriends = await followingConcept._areFriends({
      userA: userAlice,
      userB: userBob,
    });
    assertEquals(
      areAliceBobFriends,
      false,
      "Alice and Bob should not be friends yet",
    );
    console.log(`Query: Alice and Bob are friends? ${areAliceBobFriends}`);

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
    const bobFollowsAlice = await followingConcept._getFollows({
      follower: userBob,
      followee: userAlice,
    });
    assertNotEquals(
      bobFollowsAlice,
      null,
      "Bob's follow of Alice should be recorded",
    );

    // Trace: Check if Alice and Bob are friends (should be true now)
    areAliceBobFriends = await followingConcept._areFriends({
      userA: userAlice,
      userB: userBob,
    });
    assertEquals(
      areAliceBobFriends,
      true,
      "Alice and Bob should now be friends",
    );
    console.log(`Query: Alice and Bob are friends? ${areAliceBobFriends}`);

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
    const aliceToCharlie = await followingConcept._getFollows({
      follower: userAlice,
      followee: userCharlie,
    });
    assertNotEquals(
      aliceToCharlie,
      null,
      "Follow relationship (Alice -> Charlie) should exist",
    );
    assertObjectMatch(aliceToCharlie!, {
      follower: userAlice,
      followee: userCharlie,
    });
    console.log(`Query: Alice follows Charlie? Yes`);

    // Get followees for Alice
    let aliceFollowees = await followingConcept._getFollowees({
      user: userAlice,
    });
    assertEquals(
      aliceFollowees.includes(userCharlie),
      true,
      "Alice's followees should include Charlie",
    );
    assertEquals(aliceFollowees.length, 1, "Alice should have 1 followee");
    console.log(`Query: Alice's followees: ${aliceFollowees}`);

    // Get followers for Charlie
    let charlieFollowers = await followingConcept._getFollowers({
      user: userCharlie,
    });
    assertEquals(
      charlieFollowers.includes(userAlice),
      true,
      "Charlie's followers should include Alice",
    );
    assertEquals(charlieFollowers.length, 1, "Charlie should have 1 follower");
    console.log(`Query: Charlie's followers: ${charlieFollowers}`);

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
    const noAliceToCharlie = await followingConcept._getFollows({
      follower: userAlice,
      followee: userCharlie,
    });
    assertEquals(
      noAliceToCharlie,
      null,
      "Follow relationship (Alice -> Charlie) should no longer exist",
    );
    console.log(`Query: Alice follows Charlie? No`);

    // Get followees for Alice again
    aliceFollowees = await followingConcept._getFollowees({ user: userAlice });
    assertEquals(
      aliceFollowees.includes(userCharlie),
      false,
      "Alice's followees should no longer include Charlie",
    );
    assertEquals(aliceFollowees.length, 0, "Alice should have 0 followees");
    console.log(`Query: Alice's followees: ${aliceFollowees}`);

    // Get followers for Charlie again
    charlieFollowers = await followingConcept._getFollowers({
      user: userCharlie,
    });
    assertEquals(
      charlieFollowers.includes(userAlice),
      false,
      "Charlie's followers should no longer include Alice",
    );
    assertEquals(charlieFollowers.length, 0, "Charlie should have 0 followers");
    console.log(`Query: Charlie's followers: ${charlieFollowers}`);

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

    const edge = await followingConcept._getFollows({
      follower: userDavid,
      followee: userCharlie,
    });

    assertNotEquals(edge, null, "David should successfully follow Charlie");
    console.log(`(David follows Charlie)`);

    // Check friendship status: should be false
    const areDavidCharlieFriends = await followingConcept._areFriends({
      userA: userDavid,
      userB: userCharlie,
    });
    assertEquals(
      areDavidCharlieFriends,
      false,
      "David and Charlie should not be friends (asymmetric)",
    );
    console.log(
      `Query: David and Charlie are friends? ${areDavidCharlieFriends}`,
    );

    // Check David's followees
    const davidFollowees = await followingConcept._getFollowees({
      user: userDavid,
    });
    assertEquals(
      davidFollowees,
      [userCharlie],
      "David should follow only Charlie",
    );
    console.log(`Query: David's followees: ${davidFollowees}`);

    // Check Charlie's followers
    const charlieFollowers = await followingConcept._getFollowers({
      user: userCharlie,
    });
    assertEquals(
      charlieFollowers,
      [userDavid],
      "Charlie should have only David as a follower",
    );
    console.log(`Query: Charlie's followers: ${charlieFollowers}`);

    // Scenario: Charlie decides to follow David
    console.log(
      `Action: Charlie (${userCharlie}) follows David (${userDavid})`,
    );

    const res2 = await followingConcept.follow({
      follower: userCharlie,
      followee: userDavid,
    });
    assertEquals(res2, {}, "follow() should succeed");

    const edge2 = await followingConcept._getFollows({
      follower: userCharlie,
      followee: userDavid,
    });

    assertNotEquals(edge2, null, "Charlie should successfully follow David");
    console.log(`(Charlie follows David)`);

    // Check friendship status again: should be true now
    const nowAreDavidCharlieFriends = await followingConcept._areFriends({
      userA: userDavid,
      userB: userCharlie,
    });
    assertEquals(
      nowAreDavidCharlieFriends,
      true,
      "David and Charlie should now be friends (mutual)",
    );
    console.log(
      `Query: David and Charlie are friends? ${nowAreDavidCharlieFriends}`,
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
    assertEquals(
      (await followingConcept._getFollowees({ user: userAlice })).length,
      3,
      "Alice should follow 3 users",
    );
    console.log(
      `Query: Alice's followees: ${await followingConcept._getFollowees({
        user: userAlice,
      })}`,
    );

    // Bob follows Alice, Charlie
    console.log(`Action: Bob follows Alice, Charlie`);
    await followingConcept.follow({ follower: userBob, followee: userAlice });
    await followingConcept.follow({ follower: userBob, followee: userCharlie });
    assertEquals(
      (await followingConcept._getFollowees({ user: userBob })).length,
      2,
      "Bob should follow 2 users",
    );
    console.log(
      `Query: Bob's followees: ${await followingConcept._getFollowees({
        user: userBob,
      })}`,
    );

    // Check friendship: Alice & Bob
    let areAliceBobFriends = await followingConcept._areFriends({
      userA: userAlice,
      userB: userBob,
    });
    assertEquals(areAliceBobFriends, true, "Alice and Bob should be friends");
    console.log(`Query: Alice & Bob friends? ${areAliceBobFriends}`);

    // Check friendship: Alice & Charlie
    let areAliceCharlieFriends = await followingConcept._areFriends({
      userA: userAlice,
      userB: userCharlie,
    });
    assertEquals(
      areAliceCharlieFriends,
      false,
      "Alice and Charlie should not be friends yet (Charlie doesn't follow Alice)",
    );
    console.log(`Query: Alice & Charlie friends? ${areAliceCharlieFriends}`);

    // Check Charlie's followers (Alice, Bob)
    const charlieFollowers = await followingConcept._getFollowers({
      user: userCharlie,
    });
    assertEquals(
      charlieFollowers.sort(),
      [userAlice, userBob].sort(),
      "Charlie should have Alice and Bob as followers",
    );
    console.log(`Query: Charlie's followers: ${charlieFollowers}`);

    // Alice unfollows David
    console.log(`Action: Alice unfollows David`);
    await followingConcept.unfollow({
      follower: userAlice,
      followee: userDavid,
    });
    assertEquals(
      (await followingConcept._getFollowees({ user: userAlice })).length,
      2,
      "Alice should now follow 2 users",
    );
    const davidFollowers = await followingConcept._getFollowers({
      user: userDavid,
    });
    assertEquals(davidFollowers.length, 0, "David should have no followers");
    console.log(
      `Query: Alice's followees: ${await followingConcept._getFollowees({
        user: userAlice,
      })}`,
    );
    console.log(`Query: David's followers: ${davidFollowers}`);

    console.log(`--- Multiple Follows and Complex Scenarios Test Complete ---`);
  } finally {
    await client.close();
  }
});
```
