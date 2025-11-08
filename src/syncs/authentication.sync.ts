/**
 * Authentication session orchestration (decoupled)
 * Excluded routes: /UserAuthentication/authenticate, /UserAuthentication/register
 * Flow:
 *   Requesting.request -> UserAuthentication.authenticate/register -> Sessioning.create -> Requesting.respond { user, session }
 */
import { Requesting, Sessioning, UserAuthentication } from "@concepts";
import { actions, Sync, Vars } from "@engine";

// Authenticate flow
export const AuthenticateRequest: Sync = ({ request, username, password }: Vars) => ({
  when: actions([Requesting.request, { path: "/UserAuthentication/authenticate", username, password }, { request }]),
  then: actions([UserAuthentication.authenticate, { username, password }]),
});

export const AuthenticateCreateSession: Sync = ({ request, user }: Vars) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/authenticate" }, { request }],
    [UserAuthentication.authenticate, {}, { user }],
  ),
  then: actions([Sessioning.create, { user }]),
});

export const AuthenticateRespondOK: Sync = ({ request, user, session }: Vars) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/authenticate" }, { request }],
    [UserAuthentication.authenticate, {}, { user }],
    [Sessioning.create, {}, { session }],
  ),
  then: actions([Requesting.respond, { request, user, session }]),
});

export const AuthenticateRespondError: Sync = ({ request, error }: Vars) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/authenticate" }, { request }],
    [UserAuthentication.authenticate, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Register flow
export const RegisterRequest: Sync = ({ request, username, password }: Vars) => ({
  when: actions([Requesting.request, { path: "/UserAuthentication/register", username, password }, { request }]),
  then: actions([UserAuthentication.register, { username, password }]),
});

export const RegisterCreateSession: Sync = ({ request, user }: Vars) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/register" }, { request }],
    [UserAuthentication.register, {}, { user }],
  ),
  then: actions([Sessioning.create, { user }]),
});

export const RegisterRespondOK: Sync = ({ request, user, session }: Vars) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/register" }, { request }],
    [UserAuthentication.register, {}, { user }],
    [Sessioning.create, {}, { session }],
  ),
  then: actions([Requesting.respond, { request, user, session }]),
});

export const RegisterRespondError: Sync = ({ request, error }: Vars) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/register" }, { request }],
    [UserAuthentication.register, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const authenticationSyncs = {
  AuthenticateRequest,
  AuthenticateCreateSession,
  AuthenticateRespondOK,
  AuthenticateRespondError,
  RegisterRequest,
  RegisterCreateSession,
  RegisterRespondOK,
  RegisterRespondError,
};
