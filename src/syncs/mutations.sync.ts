/**
 * Mutation synchronizations for excluded routes.
 *
 * Authorization pattern:
 * - For user-scoped actions, require user === sessionUser (or follower === sessionUser)
 * - Respond with Unauthorized on mismatch
 *
 * Success pattern:
 * - Mirror concept action outputs when needed, else respond {}
 * - Provide error responders when concept returns { error }
 */

import {
  Following,
  Profile,
  Requesting,
  Reviewing,
  Saving,
  Sessioning,
  Similarity,
  UserPreferences,
  Visit,
} from "@concepts";
// (Removed unused ID import after refactor)
import { actions, Frames, Sync, Vars } from "@engine";

// -------------------- Following.unfollow --------------------
export const FollowingUnfollowRequest: Sync = (
  { request, follower, followee, sessionUser, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Following/unfollow",
      follower,
      followee,
      sessionUser,
      sessionToken,
    }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[follower] === $[sessionUser]),
  then: actions([Following.unfollow, { follower, followee }]),
});

export const FollowingUnfollowSuccess: Sync = (
  { request, follower, followee }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Following/unfollow" }, { request }],
    [Following.unfollow, { follower, followee }, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const FollowingUnfollowUnauthorized: Sync = (
  { request, follower, sessionUser }: Vars,
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Following/unfollow", follower, sessionUser },
      { request },
    ],
  ),
  where: (frames) => frames.filter(($) => $[follower] !== $[sessionUser]),
  then: actions([Requesting.respond, {
    request,
    error: "Unauthorized: follower must match sessionUser",
  }]),
});

// -------------------- Profile mutations --------------------
const unauthorizedMsg = "Unauthorized: user must match sessionUser";

export const ProfileAddNameRequest: Sync = (
  { request, user, sessionUser, firstName, lastName, sessionToken }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/addName",
    user,
    firstName,
    lastName,
    sessionUser,
    sessionToken,
  }, { request }]),
  // Handle only requests that do NOT provide a sessionToken; sessionToken variants handle those
  where: (frames) => {
    const out: Frames = new Frames();
    for (const frame of frames) {
      const record = frame as Record<string, unknown>;
      const u = record[user as unknown as string];
      const su = record[sessionUser as unknown as string];
      const st = record[sessionToken as unknown as string];
      if (u === su && typeof st === "undefined") out.push(frame);
    }
    return out;
  },
  then: actions([Profile.addName, { user, firstName, lastName }]),
});

export const ProfileAddNameSuccess: Sync = (
  { request, user, firstName, lastName }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/addName" }, { request }],
    [Profile.addName, { user, firstName, lastName }, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const ProfileAddNameUnauthorized: Sync = (
  { request, user, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/addName",
    user,
    sessionUser,
  }, { request }]),
  where: (frames) => {
    const out: Frames = new Frames();
    for (const frame of frames) {
      const record = frame as Record<string, unknown>;
      const u = record[user as unknown as string];
      const su = record[sessionUser as unknown as string];
      const st = record["sessionToken" as unknown as string];
      if (u !== su && typeof st === "undefined") out.push(frame);
    }
    return out;
  },
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

// SessionToken variant for addName (resolve sessionUser via Sessioning._getUser)
export const ProfileAddNameRequestBySessionToken: Sync = (
  { request, user, firstName, lastName, sessionToken, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/addName",
    user,
    firstName,
    lastName,
    sessionToken,
  }, { request }]),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] === $[user]);
  },
  then: actions([Profile.addName, { user, firstName, lastName }]),
});

export const ProfileAddNameUnauthorizedBySessionToken: Sync = (
  { request, user, sessionToken, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/addName",
    user,
    sessionToken,
  }, { request }]),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] !== $[user]);
  },
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

export const ProfileAddProfilePictureRequest: Sync = (
  { request, user, sessionUser, url, sessionToken }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/addProfilePicture",
    user,
    url,
    sessionUser,
    sessionToken,
  }, { request }]),
  // Handle only requests that do NOT provide a sessionToken; sessionToken variants handle those
  where: (frames) => {
    const out: Frames = new Frames();
    for (const frame of frames) {
      const record = frame as Record<string, unknown>;
      const u = record[user as unknown as string];
      const su = record[sessionUser as unknown as string];
      const st = record[sessionToken as unknown as string];
      if (u === su && typeof st === "undefined") out.push(frame);
    }
    return out;
  },
  then: actions([Profile.addProfilePicture, { user, url }]),
});

export const ProfileAddProfilePictureSuccess: Sync = (
  { request, user, url }: Vars,
) => ({
  when: actions([Requesting.request, { path: "/Profile/addProfilePicture" }, {
    request,
  }], [Profile.addProfilePicture, { user, url }, {}]),
  then: actions([Requesting.respond, { request }]),
});

export const ProfileAddProfilePictureUnauthorized: Sync = (
  { request, user, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/addProfilePicture",
    user,
    sessionUser,
  }, { request }]),
  where: (frames) => {
    const out: Frames = new Frames();
    for (const frame of frames) {
      const record = frame as Record<string, unknown>;
      const u = record[user as unknown as string];
      const su = record[sessionUser as unknown as string];
      const st = record["sessionToken" as unknown as string];
      if (u !== su && typeof st === "undefined") out.push(frame);
    }
    return out;
  },
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

// SessionToken variant for addProfilePicture
export const ProfileAddProfilePictureRequestBySessionToken: Sync = (
  { request, user, url, sessionToken, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/addProfilePicture",
    user,
    url,
    sessionToken,
  }, { request }]),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] === $[user]);
  },
  then: actions([Profile.addProfilePicture, { user, url }]),
});

export const ProfileAddProfilePictureUnauthorizedBySessionToken: Sync = (
  { request, user, url, sessionToken, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/addProfilePicture",
    user,
    url,
    sessionToken,
  }, { request }]),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] !== $[user]);
  },
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

export const ProfileEditProfilePictureRequest: Sync = (
  { request, user, sessionUser, url, sessionToken }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/editProfilePicture",
    user,
    url,
    sessionUser,
    sessionToken,
  }, { request }]),
  // Handle only requests that do NOT provide a sessionToken; sessionToken variants handle those
  where: (frames) => {
    const out: Frames = new Frames();
    for (const frame of frames) {
      const record = frame as Record<string, unknown>;
      const u = record[user as unknown as string];
      const su = record[sessionUser as unknown as string];
      const st = record[sessionToken as unknown as string];
      if (u === su && typeof st === "undefined") out.push(frame);
    }
    return out;
  },
  then: actions([Profile.editProfilePicture, { user, url }]),
});

export const ProfileEditProfilePictureSuccess: Sync = (
  { request, user, url }: Vars,
) => ({
  when: actions([Requesting.request, { path: "/Profile/editProfilePicture" }, {
    request,
  }], [Profile.editProfilePicture, { user, url }, {}]),
  then: actions([Requesting.respond, { request }]),
});

export const ProfileEditProfilePictureUnauthorized: Sync = (
  { request, user, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/editProfilePicture",
    user,
    sessionUser,
  }, { request }]),
  where: (frames) => {
    const out: Frames = new Frames();
    for (const frame of frames) {
      const record = frame as Record<string, unknown>;
      const u = record[user as unknown as string];
      const su = record[sessionUser as unknown as string];
      const st = record["sessionToken" as unknown as string];
      if (u !== su && typeof st === "undefined") out.push(frame);
    }
    return out;
  },
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

// SessionToken variant for editProfilePicture
export const ProfileEditProfilePictureRequestBySessionToken: Sync = (
  { request, user, url, sessionToken, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/editProfilePicture",
    user,
    url,
    sessionToken,
  }, { request }]),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] === $[user]);
  },
  then: actions([Profile.editProfilePicture, { user, url }]),
});

export const ProfileEditProfilePictureUnauthorizedBySessionToken: Sync = (
  { request, user, url, sessionToken, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/editProfilePicture",
    user,
    url,
    sessionToken,
  }, { request }]),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] !== $[user]);
  },
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

export const ProfileRemoveProfilePictureRequest: Sync = (
  { request, user, sessionUser, sessionToken }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/removeProfilePicture",
    user,
    sessionUser,
    sessionToken,
  }, { request }]),
  // Handle only requests that do NOT provide a sessionToken; sessionToken variants handle those
  where: (frames) => {
    const out: Frames = new Frames();
    for (const frame of frames) {
      const record = frame as Record<string, unknown>;
      const u = record[user as unknown as string];
      const su = record[sessionUser as unknown as string];
      const st = record[sessionToken as unknown as string];
      if (u === su && typeof st === "undefined") out.push(frame);
    }
    return out;
  },
  then: actions([Profile.removeProfilePicture, { user }]),
});

export const ProfileRemoveProfilePictureSuccess: Sync = (
  { request, user }: Vars,
) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/removeProfilePicture" },
    { request },
  ], [Profile.removeProfilePicture, { user }, {}]),
  then: actions([Requesting.respond, { request }]),
});

export const ProfileRemoveProfilePictureUnauthorized: Sync = (
  { request, user, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/removeProfilePicture",
    user,
    sessionUser,
  }, { request }]),
  where: (frames) => {
    const out: Frames = new Frames();
    for (const frame of frames) {
      const record = frame as Record<string, unknown>;
      const u = record[user as unknown as string];
      const su = record[sessionUser as unknown as string];
      const st = record["sessionToken" as unknown as string];
      if (u !== su && typeof st === "undefined") out.push(frame);
    }
    return out;
  },
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

// SessionToken variant for removeProfilePicture
export const ProfileRemoveProfilePictureRequestBySessionToken: Sync = (
  { request, user, sessionToken, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/removeProfilePicture",
    user,
    sessionToken,
  }, { request }]),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] === $[user]);
  },
  then: actions([Profile.removeProfilePicture, { user }]),
});

export const ProfileRemoveProfilePictureUnauthorizedBySessionToken: Sync = (
  { request, user, sessionToken, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Profile/removeProfilePicture",
    user,
    sessionToken,
  }, { request }]),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] !== $[user]);
  },
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

// -------------------- Saving mutations --------------------
// Saving.saveItem authorized via sessionUser
export const SavingSaveItemRequestBySessionUser: Sync = (
  { request, user, item, sessionUser, sessionToken }: Vars,
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Saving/saveItem", user, item, sessionUser, sessionToken },
      { request },
    ],
  ),
  where: (frames) => frames.filter(($) => $[user] === $[sessionUser]),
  then: actions([Saving.saveItem, { user, item }]),
});

// Saving.saveItem authorized via sessionToken -> resolve to sessionUser
export const SavingSaveItemRequestBySessionToken: Sync = (
  { request, user, item, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Saving/saveItem", user, item, sessionToken },
      { request },
    ],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[user] === $[sessionUser]);
  },
  then: actions([Saving.saveItem, { user, item }]),
});

export const SavingSaveItemSuccess: Sync = (
  { request, user, item }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Saving/saveItem" }, { request }],
    [Saving.saveItem, { user, item }, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const SavingSaveItemUnauthorizedBySessionUser: Sync = (
  { request, user, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Saving/saveItem", user, sessionUser }, {
      request,
    }],
  ),
  where: (frames) => frames.filter(($) => $[user] !== $[sessionUser]),
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

export const SavingSaveItemUnauthorizedBySessionToken: Sync = (
  { request, user, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Saving/saveItem", user, sessionToken }, {
      request,
    }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[user] !== $[sessionUser]);
  },
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

export const SavingUnsaveItemRequestBySessionUser: Sync = (
  { request, user, item, sessionUser, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Saving/unsaveItem",
      user,
      item,
      sessionUser,
      sessionToken,
    }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[user] === $[sessionUser]),
  then: actions([Saving.unsaveItem, { user, item }]),
});

export const SavingUnsaveItemRequestBySessionToken: Sync = (
  { request, user, item, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Saving/unsaveItem",
      user,
      item,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[user] === $[sessionUser]);
  },
  then: actions([Saving.unsaveItem, { user, item }]),
});

export const SavingUnsaveItemSuccess: Sync = (
  { request, user, item }: Vars,
) => ({
  when: actions([Requesting.request, { path: "/Saving/unsaveItem" }, {
    request,
  }], [Saving.unsaveItem, { user, item }, {}]),
  then: actions([Requesting.respond, { request }]),
});

export const SavingUnsaveItemUnauthorizedBySessionUser: Sync = (
  { request, user, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Saving/unsaveItem", user, sessionUser }, {
      request,
    }],
  ),
  where: (frames) => frames.filter(($) => $[user] !== $[sessionUser]),
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

export const SavingUnsaveItemUnauthorizedBySessionToken: Sync = (
  { request, user, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Saving/unsaveItem", user, sessionToken }, {
      request,
    }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[user] !== $[sessionUser]);
  },
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

// -------------------- Reviewing mutations --------------------
export const ReviewingClearReviewRequest: Sync = (
  { request, user, item, sessionUser, sessionToken }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Reviewing/clearReview",
    user,
    item,
    sessionUser,
    sessionToken,
  }, { request }]),
  where: (frames) => frames.filter(($) => $[user] === $[sessionUser]),
  then: actions([Reviewing.clearReview, { user, item }]),
});

export const ReviewingClearReviewSuccess: Sync = (
  { request, user, item }: Vars,
) => ({
  when: actions([Requesting.request, { path: "/Reviewing/clearReview" }, {
    request,
  }], [Reviewing.clearReview, { user, item }, {}]),
  then: actions([Requesting.respond, { request }]),
});

export const ReviewingClearReviewUnauthorized: Sync = (
  { request, user, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Reviewing/clearReview",
    user,
    sessionUser,
  }, { request }]),
  where: (frames) => frames.filter(($) => $[user] !== $[sessionUser]),
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

export const ReviewingInitRequest: Sync = (
  { request }: Vars,
) => ({
  when: actions([Requesting.request, { path: "/Reviewing/init" }, { request }]),
  then: actions([Reviewing.init, {}]),
});

export const ReviewingInitSuccess: Sync = (
  { request }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Reviewing/init" }, { request }],
    [Reviewing.init, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

// -------------------- Visit mutations --------------------
export const VisitAddEntryRequest: Sync = (
  {
    request,
    visit,
    exhibit,
    note,
    photoUrls,
    rating,
    user,
    sessionUser,
    sessionToken,
  }: Vars,
) => ({
  // Require all fields, including enrichment fields
  when: actions([Requesting.request, {
    path: "/Visit/addEntry",
    visit,
    exhibit,
    note,
    photoUrls,
    rating,
    user,
    sessionUser,
  }, { request }]),
  // Exclusivity: only handle requests that do NOT provide a sessionToken.
  // If a sessionToken is present, let the sessionToken-based variants handle it.
  where: (frames) => {
    const out: Frames = new Frames();
    for (const frame of frames) {
      const record = frame as Record<string, unknown>;
      const u = record[user as unknown as string];
      const su = record[sessionUser as unknown as string];
      const st = record[sessionToken as unknown as string];
      if (u === su && typeof st === "undefined") {
        out.push(frame);
      }
    }
    return out;
  },
  then: actions([Visit.addEntry, {
    visit,
    exhibit,
    note,
    photoUrls,
    rating,
    user,
  }]),
});

// Variant (sessionUser path) for requests omitting photoUrls entirely (not just empty array)

// Visit.addEntry authorized via sessionToken (resolve user via Sessioning._getUser)
export const VisitAddEntryRequestBySessionToken: Sync = (
  {
    request,
    visit,
    exhibit,
    note,
    photoUrls,
    rating,
    user,
    sessionToken,
    sessionUser,
  }: Vars,
) => ({
  // Require all fields, including enrichment fields
  when: actions([Requesting.request, {
    path: "/Visit/addEntry",
    visit,
    exhibit,
    note,
    photoUrls,
    rating,
    user,
    sessionToken,
  }, { request }]),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    const out: Frames = new Frames();
    for (const frame of rows) {
      const record = frame as Record<string, unknown>;
      const su = record[sessionUser as unknown as string];
      const u = record[user as unknown as string];
      if (su === u) out.push(frame);
    }
    return out;
  },
  then: actions([Visit.addEntry, {
    visit,
    exhibit,
    note,
    photoUrls,
    rating,
    user,
  }]),
});

// Enrichment: apply note if present and non-empty AFTER successful base creation (sessionUser path)
// Removed enrichment syncs; all fields are now required in the base addEntry

// Variant (sessionToken path) for requests omitting photoUrls entirely

export const VisitAddEntryUnauthorizedBySessionToken: Sync = (
  { request, visit, exhibit, user, sessionToken, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Visit/addEntry",
    visit,
    exhibit,
    user,
    sessionToken,
  }, { request }]),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] !== $[user]);
  },
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

// Variant: Visit.addEntry via sessionToken where request omits photoUrls but includes note + rating

export const VisitAddEntrySuccess: Sync = (
  { request, visit, exhibit, user }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Visit/addEntry" }, { request }],
    [Visit.addEntry, { visit, exhibit, user }, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const VisitAddEntryError: Sync = (
  { request, visit, exhibit, user, error }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Visit/addEntry" }, { request }],
    [Visit.addEntry, { visit, exhibit, user }, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Success/Error responders for Visit.addEntry (all fields required)

export const VisitRemoveEntryRequest: Sync = (
  { request, visitEntryId, user, sessionUser, sessionToken }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Visit/removeEntry",
    visitEntryId,
    user,
    sessionUser,
    sessionToken,
  }, { request }]),
  // Exclusivity: handle only requests that do NOT provide a sessionToken
  where: (frames) => {
    const out: Frames = new Frames();
    for (const frame of frames) {
      const record = frame as Record<string, unknown>;
      const u = record[user as unknown as string];
      const su = record[sessionUser as unknown as string];
      const st = record[sessionToken as unknown as string];
      if (u === su && typeof st === "undefined") out.push(frame);
    }
    return out;
  },
  then: actions([Visit.removeEntry, { visitEntryId, user }]),
});

// Visit.removeEntry authorized via sessionToken (resolve user via Sessioning._getUser)
export const VisitRemoveEntryRequestBySessionToken: Sync = (
  { request, visitEntryId, user, sessionToken, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Visit/removeEntry",
    visitEntryId,
    user,
    sessionToken,
  }, { request }]),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    const out: Frames = new Frames();
    for (const frame of rows) {
      const record = frame as Record<string, unknown>;
      const su = record[sessionUser as unknown as string];
      const u = record[user as unknown as string];
      if (su === u) out.push(frame);
    }
    return out;
  },
  then: actions([Visit.removeEntry, { visitEntryId, user }]),
});

export const VisitRemoveEntrySuccess: Sync = (
  { request, visitEntryId }: Vars,
) => ({
  when: actions([Requesting.request, { path: "/Visit/removeEntry" }, {
    request,
  }], [Visit.removeEntry, { visitEntryId }, {}]),
  then: actions([Requesting.respond, { request }]),
});

export const VisitRemoveEntryError: Sync = (
  { request, visitEntryId, error }: Vars,
) => ({
  when: actions([Requesting.request, { path: "/Visit/removeEntry" }, {
    request,
  }], [Visit.removeEntry, { visitEntryId }, { error }]),
  then: actions([Requesting.respond, { request, error }]),
});

export const VisitRemoveEntryUnauthorizedBySessionUser: Sync = (
  { request, visitEntryId, user, sessionUser, sessionToken }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Visit/removeEntry",
    visitEntryId,
    user,
    sessionUser,
    sessionToken,
  }, { request }]),
  where: (frames) => {
    const out: Frames = new Frames();
    for (const frame of frames) {
      const record = frame as Record<string, unknown>;
      const u = record[user as unknown as string];
      const su = record[sessionUser as unknown as string];
      const st = record[sessionToken as unknown as string];
      // sessionToken must be undefined for this variant
      if (u !== su && typeof st === "undefined") out.push(frame);
    }
    return out;
  },
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

export const VisitRemoveEntryUnauthorizedBySessionToken: Sync = (
  { request, visitEntryId, user, sessionToken, sessionUser }: Vars,
) => ({
  when: actions([Requesting.request, {
    path: "/Visit/removeEntry",
    visitEntryId,
    user,
    sessionToken,
  }, { request }]),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] !== $[user]);
  },
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

// -------------------- Similarity (admin-ish) --------------------
export const SimilarityRebuildRequest: Sync = (
  { request }: Vars,
) => ({
  when: actions([
    Requesting.request,
    { path: "/Similarity/rebuildSimilarity" },
    { request },
  ]),
  then: actions([Similarity.rebuildSimilarity, {}]),
});

export const SimilarityRebuildSuccess: Sync = (
  { request }: Vars,
) => ({
  when: actions([
    Requesting.request,
    { path: "/Similarity/rebuildSimilarity" },
    { request },
  ], [Similarity.rebuildSimilarity, {}, {}]),
  then: actions([Requesting.respond, { request }]),
});

// -------------------- UserPreferences mutations --------------------
export const UserPreferencesAddPreferenceRequestBySessionUser: Sync = (
  { request, user, tag, sessionUser, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/UserPreferences/addPreference",
      user,
      tag,
      sessionUser,
      sessionToken,
    }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[user] === $[sessionUser]),
  then: actions([UserPreferences.addPreference, { user, tag }]),
});

export const UserPreferencesAddPreferenceRequestBySessionToken: Sync = (
  { request, user, tag, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/UserPreferences/addPreference",
      user,
      tag,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] === $[user]);
  },
  then: actions([UserPreferences.addPreference, { user, tag }]),
});

export const UserPreferencesAddPreferenceSuccess: Sync = (
  { request, user, tag }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/UserPreferences/addPreference" }, {
      request,
    }],
    [UserPreferences.addPreference, { user, tag }, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const UserPreferencesAddPreferenceUnauthorizedBySessionUser: Sync = (
  { request, user, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/UserPreferences/addPreference",
      user,
      sessionUser,
    }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[user] !== $[sessionUser]),
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

export const UserPreferencesAddPreferenceUnauthorizedBySessionToken: Sync = (
  { request, user, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/UserPreferences/addPreference",
      user,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] !== $[user]);
  },
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

export const UserPreferencesRemovePreferenceRequestBySessionUser: Sync = (
  { request, user, tag, sessionUser, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/UserPreferences/removePreference",
      user,
      tag,
      sessionUser,
      sessionToken,
    }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[user] === $[sessionUser]),
  then: actions([UserPreferences.removePreference, { user, tag }]),
});

export const UserPreferencesRemovePreferenceRequestBySessionToken: Sync = (
  { request, user, tag, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/UserPreferences/removePreference",
      user,
      tag,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] === $[user]);
  },
  then: actions([UserPreferences.removePreference, { user, tag }]),
});

export const UserPreferencesRemovePreferenceSuccess: Sync = (
  { request, user, tag }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/UserPreferences/removePreference" }, {
      request,
    }],
    [UserPreferences.removePreference, { user, tag }, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const UserPreferencesRemovePreferenceUnauthorizedBySessionUser: Sync = (
  { request, user, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/UserPreferences/removePreference",
      user,
      sessionUser,
    }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[user] !== $[sessionUser]),
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

export const UserPreferencesRemovePreferenceUnauthorizedBySessionToken: Sync = (
  { request, user, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/UserPreferences/removePreference",
      user,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] !== $[user]);
  },
  then: actions([Requesting.respond, { request, error: unauthorizedMsg }]),
});

export const mutationsSyncs = {
  FollowingUnfollowRequest,
  FollowingUnfollowSuccess,
  FollowingUnfollowUnauthorized,

  ProfileAddNameRequest,
  ProfileAddNameSuccess,
  ProfileAddNameUnauthorized,
  ProfileAddNameRequestBySessionToken,
  ProfileAddNameUnauthorizedBySessionToken,
  ProfileAddProfilePictureRequest,
  ProfileAddProfilePictureSuccess,
  ProfileAddProfilePictureUnauthorized,
  ProfileAddProfilePictureRequestBySessionToken,
  ProfileAddProfilePictureUnauthorizedBySessionToken,
  ProfileEditProfilePictureRequest,
  ProfileEditProfilePictureSuccess,
  ProfileEditProfilePictureUnauthorized,
  ProfileEditProfilePictureRequestBySessionToken,
  ProfileEditProfilePictureUnauthorizedBySessionToken,
  ProfileRemoveProfilePictureRequest,
  ProfileRemoveProfilePictureSuccess,
  ProfileRemoveProfilePictureUnauthorized,
  ProfileRemoveProfilePictureRequestBySessionToken,
  ProfileRemoveProfilePictureUnauthorizedBySessionToken,

  SavingSaveItemRequestBySessionUser,
  SavingSaveItemRequestBySessionToken,
  SavingSaveItemSuccess,
  SavingSaveItemUnauthorizedBySessionUser,
  SavingSaveItemUnauthorizedBySessionToken,
  SavingUnsaveItemRequestBySessionUser,
  SavingUnsaveItemRequestBySessionToken,
  SavingUnsaveItemSuccess,
  SavingUnsaveItemUnauthorizedBySessionUser,
  SavingUnsaveItemUnauthorizedBySessionToken,

  ReviewingClearReviewRequest,
  ReviewingClearReviewSuccess,
  ReviewingClearReviewUnauthorized,
  ReviewingInitRequest,
  ReviewingInitSuccess,

  VisitAddEntryRequest,
  VisitAddEntryRequestBySessionToken,
  VisitAddEntryUnauthorizedBySessionToken,
  VisitAddEntrySuccess,
  VisitAddEntryError,
  VisitRemoveEntryRequest,
  VisitRemoveEntryRequestBySessionToken,
  VisitRemoveEntrySuccess,
  VisitRemoveEntryError,
  VisitRemoveEntryUnauthorizedBySessionUser,
  VisitRemoveEntryUnauthorizedBySessionToken,

  SimilarityRebuildRequest,
  SimilarityRebuildSuccess,

  UserPreferencesAddPreferenceRequestBySessionUser,
  UserPreferencesAddPreferenceRequestBySessionToken,
  UserPreferencesAddPreferenceSuccess,
  UserPreferencesAddPreferenceUnauthorizedBySessionUser,
  UserPreferencesAddPreferenceUnauthorizedBySessionToken,
  UserPreferencesRemovePreferenceRequestBySessionUser,
  UserPreferencesRemovePreferenceRequestBySessionToken,
  UserPreferencesRemovePreferenceSuccess,
  UserPreferencesRemovePreferenceUnauthorizedBySessionUser,
  UserPreferencesRemovePreferenceUnauthorizedBySessionToken,
};
