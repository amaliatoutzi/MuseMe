/**
 * Query synchronizations
 *
 * Implements professor-recommended flow: serve excluded queries via Requesting
 * by catching Requesting.request and responding with concept query results.
 *
 * Pattern used here (single-sync per query):
 *   when:  Requesting.request(path, ...)
 *   where: frames.query(Concept._query, { inputs }, { outputs }) [optionally .collectAs([...], as)]
 *   then:  Requesting.respond({ ...mapped symbols })
 *
 * Notes:
 * - We target queries that return a single, named value in their result rows to
 *   keep response shaping straightforward. Multi-row queries can follow the same
 *   pattern and respond with arrays, but may require additional aggregation if
 *   the engine emits one frame per row. We'll extend as needed.
 */

import {
  Following,
  Profile,
  Requesting,
  Reviewing,
  Saving,
  Similarity,
  UserPreferences,
  Visit,
} from "@concepts";
import { actions, Frames, Sync, Vars } from "@engine";
import type { ID } from "@utils/types.ts";

// Following._areFriends
export const FollowingAreFriendsQuery: Sync = (
  { request, userA, userB, areFriends, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Following/_areFriends",
      userA,
      userB,
      sessionToken,
    }, {
      request,
    }],
  ),
  where: async (frames) => {
    const q = await frames.query(Following._areFriends, { userA, userB }, {
      areFriends,
    });
    // Fallback: if no rows (shouldn't happen), default to false
    if (q.length === 0) {
      return frames.map(($) => ({ ...$, [areFriends]: false }));
    }
    return q;
  },
  then: actions([Requesting.respond, { request, areFriends }]),
});

// Following._getUserIdByUsername
export const FollowingGetUserIdByUsernameQuery: Sync = (
  { request, username, user, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Following/_getUserIdByUsername",
      username,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const q = await frames.query(
      Following._getUserIdByUsername,
      { username },
      { user },
    );
    if (q.length === 0) {
      return frames.map(($) => ({ ...$, [user]: null }));
    }
    return q;
  },
  then: actions([Requesting.respond, { request, user }]),
});

// Following._getUsernameByUserId
export const FollowingGetUsernameByUserIdQuery: Sync = (
  { request, user, username, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Following/_getUsernameByUserId",
      user,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const q = await frames.query(
      Following._getUsernameByUserId,
      { user },
      { username },
    );
    if (q.length === 0) {
      return frames.map(($) => ({ ...$, [username]: null }));
    }
    return q;
  },
  then: actions([Requesting.respond, { request, username }]),
});

// Profile._getProfile
export const ProfileGetProfileQuery: Sync = (
  { request, user, profile, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/_getProfile", user, sessionToken }, {
      request,
    }],
  ),
  where: async (frames) => {
    const q = await frames.query(Profile._getProfile, { user }, { profile });
    if (q.length === 0) {
      return frames.map(($) => ({ ...$, [profile]: null }));
    }
    return q;
  },
  then: actions([Requesting.respond, { request, profile }]),
});

export const querySyncs = {
  FollowingAreFriendsQuery,
  FollowingGetUserIdByUsernameQuery,
  FollowingGetUsernameByUserIdQuery,
  ProfileGetProfileQuery,
};

/**
 * EXTENDED QUERIES
 * Add more syncs to cover common query patterns (list + single fetch).
 */

// Following._getFollowers (returns { follower }[])
export const FollowingGetFollowersQuery: Sync = (
  { request, user, follower, followers, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Following/_getFollowers",
      user,
      sessionToken,
    }, {
      request,
    }],
  ),
  where: async (frames) => {
    const rows = await frames.query(
      Following._getFollowers,
      { user },
      { follower },
    );
    if (rows.length === 0) {
      return frames.map(($) => ({ ...$, [followers]: [] })) as typeof rows;
    }
    return rows.collectAs([follower], followers) as typeof rows;
  },
  then: actions([Requesting.respond, { request, followers }]),
});

// Following._getFollowees (returns { followee }[])
export const FollowingGetFolloweesQuery: Sync = (
  { request, user, followee, followees, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Following/_getFollowees",
      user,
      sessionToken,
    }, {
      request,
    }],
  ),
  where: async (frames) => {
    const rows = await frames.query(
      Following._getFollowees,
      { user },
      { followee },
    );
    if (rows.length === 0) {
      return frames.map(($) => ({ ...$, [followees]: [] })) as typeof rows;
    }
    return rows.collectAs([followee], followees) as typeof rows;
  },
  then: actions([Requesting.respond, { request, followees }]),
});

// Following._getFollows (returns { follow }[])
export const FollowingGetFollowsQuery: Sync = (
  { request, follower, followee, follow, follows, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Following/_getFollows",
      follower,
      followee,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(
      Following._getFollows,
      { follower, followee },
      { follow },
    );
    if (rows.length === 0) {
      return frames.map(($) => ({ ...$, [follows]: [] })) as typeof rows;
    }
    return rows.collectAs([follow], follows) as typeof rows;
  },
  then: actions([Requesting.respond, { request, follows }]),
});

// Reviewing._getReview (returns Review[] -> respond as reviews)
export const ReviewingGetReviewQuery: Sync = (
  { request, user, item, review, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Reviewing/_getReview",
      user,
      item,
      sessionToken,
    }, {
      request,
    }],
  ),
  where: async (frames) => {
    const q = await frames.query(Reviewing._getReview, { user, item }, {
      review,
    });
    if (q.length === 0) {
      return frames.map(($) => ({ ...$, [review]: null }));
    }
    return q;
  },
  then: actions([Requesting.respond, { request, review }]),
});

export const ReviewingGetReviewsByUserQuery: Sync = (
  { request, user, review: _review, reviews, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Reviewing/_getReviewsByUser",
      user,
      sessionToken,
    }, {
      request,
    }],
  ),
  where: async (frames) => {
    const out: Frames = new Frames();
    for (const f of frames) {
      const list = await Reviewing._getReviewsByUser({
        user: f[user] as unknown as ID,
      });
      out.push({ ...f, [reviews]: list });
    }
    return out;
  },
  then: actions([Requesting.respond, { request, reviews }]),
});

export const ReviewingGetReviewsByItemQuery: Sync = (
  { request, item, review: _review, reviews, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Reviewing/_getReviewsByItem",
      item,
      sessionToken,
    }, {
      request,
    }],
  ),
  where: async (frames) => {
    const out: Frames = new Frames();
    for (const f of frames) {
      const list = await Reviewing._getReviewsByItem({
        item: f[item] as unknown as ID,
      });
      out.push({ ...f, [reviews]: list });
    }
    return out;
  },
  then: actions([Requesting.respond, { request, reviews }]),
});

// Saving._listSaved (returns { item }[])
export const SavingListSavedQuery: Sync = (
  { request, user, limit, items, error, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Saving/_listSaved", user, sessionToken }, {
      request,
    }],
  ),
  where: async (frames) => {
    // Ensure binding of `error` symbol for every frame to avoid Missing binding errors.
    const out: Frames = new Frames();
    for (const f of frames) {
      let errorVal: string | null = null;
      let itemsVal: unknown[] = [];
      try {
        const result = await Saving._listSaved({
          user: f[user] as unknown as ID,
          limit: f[limit] as unknown as number | undefined,
        });
        if (Array.isArray(result)) {
          itemsVal = result.map((r) => r.item);
        } else if (result && typeof result === "object" && "error" in result) {
          errorVal = (result as { error: string }).error;
        } else if (result != null) {
          errorVal = "Unknown result shape";
        }
      } catch (e) {
        errorVal = e instanceof Error ? e.message : "Unexpected error";
      }
      out.push({ ...f, [items]: itemsVal, [error]: errorVal });
    }
    return out;
  },
  then: actions([Requesting.respond, { request, items, error }]),
});

// UserPreferences._getPreferencesForUser (list Tag IDs -> tags)
export const UserPreferencesGetPreferencesForUserQuery: Sync = (
  { request, user, tag, tags, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/UserPreferences/_getPreferencesForUser",
      user,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(
      UserPreferences._getPreferencesForUser,
      { user },
      { tag },
    );
    if (rows.length === 0) {
      return frames.map(($) => ({ ...$, [tags]: [] })) as typeof rows;
    }
    return rows.collectAs([tag], tags) as typeof rows;
  },
  then: actions([Requesting.respond, { request, tags }]),
});

// UserPreferences._getUsersByPreferenceTag (list User IDs -> users)
export const UserPreferencesGetUsersByPreferenceTagQuery: Sync = (
  { request, tag, user, users, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/UserPreferences/_getUsersByPreferenceTag",
      tag,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const rows = await frames.query(
      UserPreferences._getUsersByPreferenceTag,
      { tag },
      { user },
    );
    if (rows.length === 0) {
      return frames.map(($) => ({ ...$, [users]: [] })) as typeof rows;
    }
    return rows.collectAs([user], users) as typeof rows;
  },
  then: actions([Requesting.respond, { request, users }]),
});

// Visit._getVisit (single Visit) -> visit
export const VisitGetVisitQuery: Sync = (
  { request, visitId, visit, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Visit/_getVisit", visitId, sessionToken }, {
      request,
    }],
  ),
  where: async (frames) => {
    const out: Frames = new Frames();
    for (const f of frames) {
      const v = await Visit._getVisit({ visitId: f[visitId] as unknown as ID });
      out.push({ ...f, [visit]: v });
    }
    return out;
  },
  then: actions([Requesting.respond, { request, visit }]),
});

// Visit._getVisitsByUser -> visit
export const VisitGetVisitsByUserQuery: Sync = (
  { request, user, visit: _visit, visits, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Visit/_getVisitsByUser",
      user,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const out: Frames = new Frames();
    for (const f of frames) {
      const list = await Visit._getVisitsByUser({
        user: f[user] as unknown as ID,
      });
      out.push({ ...f, [visits]: list });
    }
    return out;
  },
  then: actions([Requesting.respond, { request, visits }]),
});

// Compatibility shim: allow owner param and map to user
export const VisitGetVisitsByOwnerQuery: Sync = (
  { request, owner, user: _user, visit: _visit, visits, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Visit/_getVisitsByUser",
      owner,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const out: Frames = new Frames();
    for (const f of frames) {
      const u = f[owner] as unknown as ID;
      const list = await Visit._getVisitsByUser({ user: u });
      out.push({ ...f, [visits]: list });
    }
    return out;
  },
  then: actions([Requesting.respond, { request, visits }]),
});

// Visit._getEntriesByVisit -> entry
export const VisitGetEntriesByVisitQuery: Sync = (
  { request, visitId, entries, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Visit/_getEntriesByVisit",
      visitId,
      sessionToken,
    }, {
      request,
    }],
  ),
  where: async (frames) => {
    const out: Frames = new Frames();
    for (const f of frames) {
      const list = await Visit._getEntriesByVisit({
        visitId: f[visitId] as unknown as ID,
      });
      out.push({ ...f, [entries]: list });
    }
    return out;
  },
  then: actions([Requesting.respond, { request, entries }]),
});

// Visit._getEntry -> entry
export const VisitGetEntryQuery: Sync = (
  { request, visitEntryId, entry, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Visit/_getEntry",
      visitEntryId,
      sessionToken,
    }, {
      request,
    }],
  ),
  where: async (frames) => {
    const out: Frames = new Frames();
    for (const f of frames) {
      const e = await Visit._getEntry({
        visitEntryId: f[visitEntryId] as unknown as ID,
      });
      out.push({ ...f, [entry]: e });
    }
    return out;
  },
  then: actions([Requesting.respond, { request, entry }]),
});

Object.assign(querySyncs, {
  FollowingGetFollowersQuery,
  FollowingGetFolloweesQuery,
  FollowingGetFollowsQuery,
  ReviewingGetReviewQuery,
  ReviewingGetReviewsByUserQuery,
  ReviewingGetReviewsByItemQuery,
  SavingListSavedQuery,
  UserPreferencesGetPreferencesForUserQuery,
  UserPreferencesGetUsersByPreferenceTagQuery,
  VisitGetVisitQuery,
  VisitGetVisitsByUserQuery,
  VisitGetVisitsByOwnerQuery,
  VisitGetEntriesByVisitQuery,
  VisitGetEntryQuery,
});

// --- Additional owner-specific visit query (direct path) ---
export const VisitGetVisitsByOwnerDirectQuery: Sync = (
  { request, owner, user, visit, visits, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Visit/_getVisitsByOwner",
      owner,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const mapped = frames.map(($) => ({ ...$, [user]: $[owner] }));
    const rows = await mapped.query(Visit._getVisitsByUser, { user }, {
      visit,
    });
    if (rows.length === 0) {
      return mapped.map(($) => ({ ...$, [visits]: [] })) as typeof rows;
    }
    return rows.collectAs([visit], visits) as typeof rows;
  },
  then: actions([Requesting.respond, { request, visits }]),
});

Object.assign(querySyncs, {
  VisitGetVisitsByOwnerDirectQuery,
});

// --- Alias: /Visit/_listEntriesByVisit (requires sessionToken present) ---
export const VisitListEntriesByVisitQuery: Sync = (
  { request, visitId, entries, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Visit/_listEntriesByVisit",
      visitId,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const out: Frames = new Frames();
    for (const f of frames) {
      const list = await Visit._getEntriesByVisit({
        visitId: f[visitId] as unknown as ID,
      });
      out.push({ ...f, [entries]: list });
    }
    return out;
  },
  then: actions([Requesting.respond, { request, entries }]),
});

Object.assign(querySyncs, {
  VisitListEntriesByVisitQuery,
});

// --- Similarity.neighbors (returns { neighbors } or array) ---
export const SimilarityNeighborsQuery: Sync = (
  { request, item, k, neighbors, error, sessionToken }: Vars,
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Similarity/neighbors",
      item,
      k,
      sessionToken,
    }, { request }],
  ),
  where: async (frames) => {
    const out: Frames = new Frames();
    for (const f of frames) {
      let err: string | null = null;
      let neigh: unknown = [];
      try {
        const result = await Similarity.neighbors({
          item: f[item] as unknown as ID,
          k: f[k] as unknown as number,
        });
        if (result && typeof result === "object" && "neighbors" in result) {
          neigh = (result as { neighbors: unknown[] }).neighbors;
        } else if (result && typeof result === "object" && "error" in result) {
          err = (result as { error: string }).error;
        } else if (Array.isArray(result)) {
          neigh = result;
        } else {
          // unknown shape, pass through as array
          neigh = [];
        }
      } catch (e) {
        err = e instanceof Error ? e.message : "Unexpected error";
      }
      out.push({ ...f, [neighbors]: neigh, [error]: err });
    }
    return out;
  },
  then: actions([Requesting.respond, { request, neighbors, error }]),
});

Object.assign(querySyncs, {
  SimilarityNeighborsQuery,
});
