/**
 * Authentication / Authorization Synchronizations
 *
 * These synchronizations consume excluded Requesting.request actions
 * and transform them into underlying concept actions only when
 * preconditions (authentication, ownership, validation) hold.
 *
 * Assumptions:
 * - Front-end sends a sessionUser (the authenticated User id) with each request.
 * - For actions acting "as" a user (e.g. Following.follow, Reviewing.upsertReview)
 *   we require sessionUser === actor parameter.
 * - For Visit.editEntry, we verify ownership by checking the Visit's owner.
 * - Error responses use Requesting.respond with { error }
 * - Successful responses mirror original concept action outputs (if any) or {}
 */

import { Following, Requesting, Reviewing, Sessioning, Visit } from "@concepts";
import { actions, Sync, Vars } from "@engine";

// FOLLOWING.follow guarded by authenticated session
export const FollowingFollowRequest: Sync = (
  { request, follower, followee, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Following/follow",
      follower,
      followee,
      sessionUser,
    }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[follower] === $[sessionUser]),
  then: actions([Following.follow, { follower, followee }]),
});

export const FollowingFollowSuccess: Sync = (
  { request, follower, followee }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Following/follow" }, { request }],
    [Following.follow, { follower, followee }, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

// Because frames are untyped symbol-keyed records, we detect auth failure by pattern splitting.
export const FollowingFollowAuthFailure: Sync = (
  { request, follower, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Following/follow", follower, sessionUser }, {
      request,
    }],
  ),
  where: (frames) => frames.filter(($) => $[follower] !== $[sessionUser]),
  then: actions([Requesting.respond, {
    request,
    error: "Unauthorized: follower must match sessionUser",
  }]),
});

// FOLLOWING.follow via sessionToken (resolve owner)
export const FollowingFollowRequestBySessionToken: Sync = (
  { request, follower, followee, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Following/follow",
      follower,
      followee,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] === $[follower]);
  },
  then: actions([Following.follow, { follower, followee }]),
});

export const FollowingFollowAuthFailureBySessionToken: Sync = (
  { request, follower, followee, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Following/follow",
      follower,
      followee,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] !== $[follower]);
  },
  then: actions([Requesting.respond, {
    request,
    error: "Unauthorized: follower must match session (resolved user)",
  }]),
});

// FOLLOWING.unfollow guarded by authenticated session
export const FollowingUnfollowRequest: Sync = (
  { request, follower, followee, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Following/unfollow",
      follower,
      followee,
      sessionUser,
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

export const FollowingUnfollowAuthFailure: Sync = (
  { request, follower, sessionUser }: Vars,
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Following/unfollow", follower, sessionUser },
      {
        request,
      },
    ],
  ),
  where: (frames) => frames.filter(($) => $[follower] !== $[sessionUser]),
  then: actions([Requesting.respond, {
    request,
    error: "Unauthorized: follower must match sessionUser",
  }]),
});

// FOLLOWING.unfollow via sessionToken (resolve owner)
export const FollowingUnfollowRequestBySessionToken: Sync = (
  { request, follower, followee, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Following/unfollow",
      follower,
      followee,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] === $[follower]);
  },
  then: actions([Following.unfollow, { follower, followee }]),
});

export const FollowingUnfollowAuthFailureBySessionToken: Sync = (
  { request, follower, followee, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Following/unfollow",
      follower,
      followee,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] !== $[follower]);
  },
  then: actions([Requesting.respond, {
    request,
    error: "Unauthorized: follower must match session (resolved user)",
  }]),
});

// REVIEWING.upsertReview guarded by authenticated session (note required)
export const ReviewingUpsertRequest: Sync = (
  { request, user, item, stars, note, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Reviewing/upsertReview",
      user,
      item,
      stars,
      note,
      sessionUser,
    }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[user] === $[sessionUser]),
  then: actions([Reviewing.upsertReview, { user, item, stars, note }]),
});

export const ReviewingUpsertSuccess: Sync = (
  { request, user, item, stars }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Reviewing/upsertReview" }, { request }],
    [Reviewing.upsertReview, { user, item, stars }, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const ReviewingUpsertAuthFailure: Sync = (
  { request, user, sessionUser }: Vars,
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Reviewing/upsertReview", user, sessionUser },
      { request },
    ],
  ),
  where: (frames) => frames.filter(($) => $[user] !== $[sessionUser]),
  then: actions([Requesting.respond, {
    request,
    error: "Unauthorized: user must match sessionUser",
  }]),
});

// REVIEWING.upsertReview via sessionToken (resolve owner; note required)
export const ReviewingUpsertRequestBySessionToken: Sync = (
  { request, user, item, stars, note, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Reviewing/upsertReview",
      user,
      item,
      stars,
      note,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] === $[user]);
  },
  then: actions([Reviewing.upsertReview, { user, item, stars, note }]),
});

export const ReviewingUpsertAuthFailureBySessionToken: Sync = (
  { request, user, item, stars, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Reviewing/upsertReview",
      user,
      item,
      stars,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] !== $[user]);
  },
  then: actions([Requesting.respond, {
    request,
    error: "Unauthorized: user must match session (resolved user)",
  }]),
});

// VISIT.createVisit guarded by authenticated session (two paths: with/without title)
export const VisitCreateRequestNoTitle: Sync = (
  { request, owner, museum, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Visit/createVisit",
      owner,
      museum,
      sessionUser,
    }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[owner] === $[sessionUser]),
  then: actions([Visit.createVisit, { owner, museum }]),
});

export const VisitCreateRequestWithTitle: Sync = (
  { request, owner, museum, title, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Visit/createVisit",
      owner,
      museum,
      title,
      sessionUser,
    }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[owner] === $[sessionUser]),
  then: actions([Visit.createVisit, { owner, museum, title }]),
});

export const VisitCreateSuccess: Sync = (
  { request, owner, museum, visitId }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Visit/createVisit" }, { request }],
    [Visit.createVisit, { owner, museum }, { visitId }],
  ),
  then: actions([Requesting.respond, { request, visitId }]),
});

export const VisitCreateSuccessWithTitle: Sync = (
  { request, owner, museum, title, visitId }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Visit/createVisit" }, { request }],
    [Visit.createVisit, { owner, museum, title }, { visitId }],
  ),
  then: actions([Requesting.respond, { request, visitId }]),
});

export const VisitCreateAuthFailure: Sync = (
  { request, owner, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Visit/createVisit", owner, sessionUser }, {
      request,
    }],
  ),
  where: (frames) => frames.filter(($) => $[owner] !== $[sessionUser]),
  then: actions([Requesting.respond, {
    request,
    error: "Unauthorized: owner must match sessionUser",
  }]),
});

// VISIT.createVisit via sessionToken (resolve owner)
export const VisitCreateRequestBySessionTokenNoTitle: Sync = (
  { request, owner, museum, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Visit/createVisit",
      owner,
      museum,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] === $[owner]);
  },
  then: actions([Visit.createVisit, { owner, museum }]),
});

export const VisitCreateRequestBySessionTokenWithTitle: Sync = (
  { request, owner, museum, title, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Visit/createVisit",
      owner,
      museum,
      title,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] === $[owner]);
  },
  then: actions([Visit.createVisit, { owner, museum, title }]),
});

export const VisitCreateAuthFailureBySessionToken: Sync = (
  { request, owner, museum, sessionToken, sessionUser }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Visit/createVisit",
      owner,
      museum,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, {
      session: sessionToken,
    }, { user: sessionUser });
    return rows.filter(($) => $[sessionUser] !== $[owner]);
  },
  then: actions([Requesting.respond, {
    request,
    error: "Unauthorized: owner must match session (resolved user)",
  }]),
});

/**
 * NOTE: Error handling syncs can be generalized; for brevity these are illustrative.
 * You may want unified error surfacing (matching any concept action output containing { error }).
 */

export const authSyncs = {
  FollowingFollowRequest,
  FollowingFollowSuccess,
  FollowingFollowAuthFailure,
  FollowingFollowRequestBySessionToken,
  FollowingFollowAuthFailureBySessionToken,
  FollowingUnfollowRequest,
  FollowingUnfollowSuccess,
  FollowingUnfollowAuthFailure,
  FollowingUnfollowRequestBySessionToken,
  FollowingUnfollowAuthFailureBySessionToken,
  ReviewingUpsertRequest,
  ReviewingUpsertSuccess,
  ReviewingUpsertAuthFailure,
  ReviewingUpsertRequestBySessionToken,
  ReviewingUpsertAuthFailureBySessionToken,
  VisitCreateRequestNoTitle,
  VisitCreateRequestWithTitle,
  VisitCreateSuccess,
  VisitCreateSuccessWithTitle,
  VisitCreateAuthFailure,
  VisitCreateRequestBySessionTokenNoTitle,
  VisitCreateRequestBySessionTokenWithTitle,
  VisitCreateAuthFailureBySessionToken,
};
