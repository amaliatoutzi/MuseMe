/**
 * Sessioning synchronizations
 *
 * Routes excluded from passthrough are handled here:
 * - Sessioning.create            (no auth required; typically called after authenticate)
 * - Sessioning.delete            (auth: sessionUser must own the session)
 * - Sessioning._getUser          (query via where)
 */

import { Requesting, Sessioning } from "@concepts";
import { actions, Frames, Sync, Vars } from "@engine";
import type { ID } from "@utils/types.ts";

// --- Create session ---
export const SessioningCreateRequest: Sync = (
  { request, user }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Sessioning/create", user }, { request }],
  ),
  then: actions([Sessioning.create, { user }]),
});

export const SessioningCreateResponse: Sync = (
  { request, session }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Sessioning/create" }, { request }],
    [Sessioning.create, {}, { session }],
  ),
  then: actions([Requesting.respond, { request, session }]),
});

// --- Delete session (authorized) ---
// Guard: sessionUser must own the session; use _getUser in where
export const SessioningDeleteAuthorized: Sync = (
  { request, session, sessionUser, user }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Sessioning/delete", session, sessionUser }, {
      request,
    }],
  ),
  where: async (frames) => {
    // Bind the owning user for the session
    const rows = await frames.query(Sessioning._getUser, { session }, { user });
    // Keep only frames where owner matches sessionUser
    return rows.filter(($) => $[user] === $[sessionUser]);
  },
  then: actions([Sessioning.delete, { session }]),
});

export const SessioningDeleteSuccess: Sync = (
  { request, session }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Sessioning/delete" }, { request }],
    [Sessioning.delete, { session }, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const SessioningDeleteUnauthorized: Sync = (
  { request, session, sessionUser, user }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Sessioning/delete", session, sessionUser }, {
      request,
    }],
  ),
  where: async (frames) => {
    const rows = await frames.query(Sessioning._getUser, { session }, { user });
    // If no rows or mismatched owner, respond unauthorized
    return rows.length === 0
      ? frames
      : rows.filter(($) => $[user] !== $[sessionUser]);
  },
  then: actions([Requesting.respond, {
    request,
    error: "Unauthorized: session does not belong to sessionUser",
  }]),
});

// --- _getUser query: respond with either { user } or { error } ---
export const SessioningGetUserQuery: Sync = (
  { request, session, user, error }: Vars,
) => ({
  when: actions(
    [Requesting.request, { path: "/Sessioning/_getUser", session }, {
      request,
    }],
  ),
  where: async (frames) => {
    const out: Frames = new Frames();
    for (const f of frames) {
      const res = await Sessioning._getUser({
        session: f[session] as unknown as ID,
      });
      if (Array.isArray(res) && res.length > 0) {
        const row = res[0] as { user?: ID; error?: string };
        if (row.user !== undefined) {
          out.push({ ...f, [user]: row.user });
          continue;
        }
        if (row.error !== undefined) {
          out.push({ ...f, [error]: row.error });
          continue;
        }
      }
      out.push({ ...f, [error]: "Unknown session lookup result" });
    }
    return out;
  },
  then: actions([Requesting.respond, { request, user, error }]),
});

export const sessioningSyncs = {
  SessioningCreateRequest,
  SessioningCreateResponse,
  SessioningDeleteAuthorized,
  SessioningDeleteSuccess,
  SessioningDeleteUnauthorized,
  SessioningGetUserQuery,
};
