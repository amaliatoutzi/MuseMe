Again, tests generated using AI agent

import {
  assertEquals,
  assertNotEquals,
  assertObjectMatch,
} from "jsr:@std/assert";
import { Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { testDb } from "@utils/database.ts";

import ProfileConcept from "./ProfileConcept.ts";

// Test users
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userNoCreds = "user:Ghost" as ID;

async function seedUsers(db: Db, users: Array<{ _id: ID; username: string }>) {
  const coll = db.collection<
    {
      _id: ID;
      username: string;
      passwordHash: string;
      createdAt: Date;
      updatedAt: Date;
    }
  >(
    "UserAuthentication.credentials",
  );
  const now = new Date();
  if (users.length > 0) {
    await coll.insertMany(
      users.map((u) => ({
        _id: u._id,
        username: u.username,
        passwordHash: "00:00", // not used in these tests
        createdAt: now,
        updatedAt: now,
      })),
    );
  }
}

Deno.test("ProfileConcept: addName once and query", async () => {
  const [db, client] = await testDb();
  const concept = new ProfileConcept(db);

  try {
    await seedUsers(db, [
      { _id: userAlice, username: "alice" },
    ]);

    // Initially, no profile
    let profileArr = await concept._getProfile({ user: userAlice });
    assertEquals(profileArr.length, 0, "No profile should exist initially");

    // Add name
    const addNameRes = await concept.addName({
      user: userAlice,
      firstName: "Alice",
      lastName: "Muse",
    });
    assertEquals(addNameRes, {}, "addName should succeed once");

    // Query profile
    profileArr = await concept._getProfile({ user: userAlice });
    assertEquals(profileArr.length, 1, "Profile should exist after addName");
    assertObjectMatch(profileArr[0].profile, {
      _id: userAlice,
      firstName: "Alice",
      lastName: "Muse",
    });

    // Adding name again should error (immutable)
    const addNameAgain = await concept.addName({
      user: userAlice,
      firstName: "Alicia",
      lastName: "Musee",
    });
    assertNotEquals(addNameAgain, {}, "Second addName should fail");
    assertObjectMatch(addNameAgain, {
      error: "Name has already been set and cannot be modified.",
    });
  } finally {
    await client.close();
  }
});

Deno.test("ProfileConcept: profile picture add/edit/remove flows", async () => {
  const [db, client] = await testDb();
  const concept = new ProfileConcept(db);

  try {
    await seedUsers(db, [
      { _id: userBob, username: "bob" },
    ]);

    // Add picture where profile doesn't exist yet -> upserts
    const addPicRes = await concept.addProfilePicture({
      user: userBob,
      url: "https://example.com/pic1.jpg",
    });
    assertEquals(addPicRes, {}, "addProfilePicture should upsert and succeed");

    // Trying to add again should fail (should edit instead)
    const addPicAgain = await concept.addProfilePicture({
      user: userBob,
      url: "https://example.com/pic2.jpg",
    });
    assertNotEquals(addPicAgain, {}, "Second addProfilePicture should fail");
    assertObjectMatch(addPicAgain, {
      error: "Profile picture already set. Use editProfilePicture instead.",
    });

    // Edit existing picture
    const editPic = await concept.editProfilePicture({
      user: userBob,
      url: "https://example.com/pic3.jpg",
    });
    assertEquals(editPic, {}, "editProfilePicture should succeed");

    // Verify via query
    const profileArr = await concept._getProfile({ user: userBob });
    assertEquals(profileArr.length, 1, "Profile should be present");
    assertObjectMatch(profileArr[0].profile, {
      _id: userBob,
      profilePictureUrl: "https://example.com/pic3.jpg",
    });

    // Remove picture
    const removePic = await concept.removeProfilePicture({ user: userBob });
    assertEquals(removePic, {}, "removeProfilePicture should succeed");

    // Removing again should error
    const removeAgain = await concept.removeProfilePicture({ user: userBob });
    assertNotEquals(removeAgain, {}, "Second removeProfilePicture should fail");
    assertObjectMatch(removeAgain, { error: "No profile picture to remove." });
  } finally {
    await client.close();
  }
});

Deno.test("ProfileConcept: error cases (unknown user, edit/remove without picture)", async () => {
  const [db, client] = await testDb();
  const concept = new ProfileConcept(db);

  try {
    await seedUsers(db, [{ _id: userAlice, username: "alice" }]);

    // Unknown user
    const addNameGhost = await concept.addName({
      user: userNoCreds,
      firstName: "Ghost",
      lastName: "User",
    });
    assertNotEquals(addNameGhost, {}, "addName for unknown user should fail");
    assertObjectMatch(addNameGhost, {
      error: `User ${userNoCreds} does not exist.`,
    });

    const addPicGhost = await concept.addProfilePicture({
      user: userNoCreds,
      url: "https://x/pic.jpg",
    });
    assertNotEquals(
      addPicGhost,
      {},
      "addProfilePicture for unknown user should fail",
    );
    assertObjectMatch(addPicGhost, {
      error: `User ${userNoCreds} does not exist.`,
    });

    // edit/remove without existing picture
    const editNoPic = await concept.editProfilePicture({
      user: userAlice,
      url: "https://x/new.jpg",
    });
    assertNotEquals(
      editNoPic,
      {},
      "editProfilePicture without picture should fail",
    );
    assertObjectMatch(editNoPic, {
      error: "No profile picture to edit. Use addProfilePicture first.",
    });

    const removeNoPic = await concept.removeProfilePicture({ user: userAlice });
    assertNotEquals(
      removeNoPic,
      {},
      "removeProfilePicture without picture should fail",
    );
    assertObjectMatch(removeNoPic, { error: "No profile picture to remove." });
  } finally {
    await client.close();
  }
});
