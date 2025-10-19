# UserAuthentication

## Output of running tests:

UserAuthenticationConcept: Operational Principle (Register and Authenticate) ...
------- output -------

--- Operational Principle Test ---
Action: register({ username: "principleUser", password: "..." })
Result: { user: "0199fdb3-d5f5-78fe-9144-a14bb04e3440" }
User registered with ID: 0199fdb3-d5f5-78fe-9144-a14bb04e3440
Action: authenticate({ username: "principleUser", password: "..." })
Result: { user: "0199fdb3-d5f5-78fe-9144-a14bb04e3440" }
Successfully authenticated user with ID: 0199fdb3-d5f5-78fe-9144-a14bb04e3440
Action: authenticate({ username: "principleUser", password: "wrongPassword" })
Result: { error: "Invalid username or password." }
Action: authenticate({ username: "nonExistent", password: "..." })
Result: { error: "Invalid username or password." }
----- output end -----
UserAuthenticationConcept: Operational Principle (Register and Authenticate) ... ok (1s)
UserAuthenticationConcept: Prevent duplicate username registration ...
------- output -------

--- Scenario 1: Duplicate Username Registration ---
Action: register({ username: "uniqueUser", password: "..." }) (First registration)
Result: { user: "0199fdb3-d9fb-7aee-a68d-b0283d8007f5" }
Action: register({ username: "uniqueUser", password: "..." }) (Attempt with same username)
Result: { error: "Username already taken." }
----- output end -----
UserAuthenticationConcept: Prevent duplicate username registration ... ok (841ms)
UserAuthenticationConcept: Handle multiple successful registrations and authentications ...
------- output -------

--- Scenario 2: Multiple Users ---
Action: register({ username: "Alice", password: "..." })
Result: { user: "0199fdb3-dd93-7c19-9eb0-b0af6ec67c38" }
Action: register({ username: "Bob", password: "..." })
Result: { user: "0199fdb3-de39-772d-8bbc-72c5004ae1d1" }
Action: authenticate({ username: "Alice", password: "..." })
Result: { user: "0199fdb3-dd93-7c19-9eb0-b0af6ec67c38" }
Action: authenticate({ username: "Bob", password: "..." })
Result: { user: "0199fdb3-de39-772d-8bbc-72c5004ae1d1" }
----- output end -----
UserAuthenticationConcept: Handle multiple successful registrations and authentications ... ok (1s)
UserAuthenticationConcept: Reject empty or whitespace credentials ...
------- output -------

--- Scenario 3: Empty/Whitespace Credentials ---
Action: register({ username: "", password: "..." })
Result: { error: "Username cannot be empty." }
Action: register({ username: " ", password: "..." })
Result: { error: "Username cannot be empty." }
Action: register({ username: "someuser", password: "" })
Result: { error: "Password cannot be empty." }
Action: authenticate({ username: "", password: "..." })
Result: { error: "Username cannot be empty." }
Action: authenticate({ username: " ", password: "..." })
Result: { error: "Username cannot be empty." }
Action: authenticate({ username: "user", password: "" })
Result: { error: "Password cannot be empty." }
UserAuth index creation failed (non-fatal): MongoExpiredSessionError: Cannot use a session that has ended
    at applySession (file:///Users/amalia/Library/Caches/deno/npm/registry.npmjs.org/mongodb/6.10.0/lib/sessions.js:720:16)
    at Connection.prepareCommand (file:///Users/amalia/Library/Caches/deno/npm/registry.npmjs.org/mongodb/6.10.0/lib/cmap/connection.js:169:62)
    at Connection.sendCommand (file:///Users/amalia/Library/Caches/deno/npm/registry.npmjs.org/mongodb/6.10.0/lib/cmap/connection.js:259:30)
    at sendCommand.next (<anonymous>)
    at Connection.command (file:///Users/amalia/Library/Caches/deno/npm/registry.npmjs.org/mongodb/6.10.0/lib/cmap/connection.js:317:26)
    at Server.command (file:///Users/amalia/Library/Caches/deno/npm/registry.npmjs.org/mongodb/6.10.0/lib/sdam/server.js:167:40)
    at Object.runMicrotasks (ext:core/01_core.js:693:26)
    at processTicksAndRejections (ext:deno_node/_next_tick.ts:59:10)
    at runNextTicks (ext:deno_node/_next_tick.ts:76:3)
    at eventLoopTick (ext:core/01_core.js:186:21) {
  [Symbol(errorLabels)]: Set(0) {}
}
----- output end -----
UserAuthenticationConcept: Reject empty or whitespace credentials ... ok (703ms)
UserAuthenticationConcept: Usernames are case-sensitive ...
------- output -------

--- Scenario 4: Case-Sensitive Usernames ---
Action: register({ username: "caseUser", password: "..." })
Result: { user: "0199fdb3-e4b2-7d86-9147-417cb1b2e695" }
Action: authenticate({ username: "caseUser", password: "..." }) (Correct casing)
Result: { user: "0199fdb3-e4b2-7d86-9147-417cb1b2e695" }
Action: authenticate({ username: "caseuser", password: "..." }) (Incorrect casing, expecting failure)
Result: { error: "Invalid username or password." }
----- output end -----
UserAuthenticationConcept: Usernames are case-sensitive ... ok (896ms)
UserAuthenticationConcept: Usernames cannot contain leading/trailing spaces ...
------- output -------

--- Scenario 5: Usernames with leading/trailing spaces ---
Action: register({ username: "  userWithSpaces  ", password: "..." })
Result: { error: "Username cannot be empty." }
Action: register({ username: "userWithSpaces", password: "..." })
Result: { user: "0199fdb3-e871-7c69-a5f5-a0b8e42e4763" }
Action: authenticate({ username: "  userWithSpaces  ", password: "..." })
Result: { error: "Username cannot be empty." }
Action: authenticate({ username: "userWithSpaces", password: "..." })
Result: { user: "0199fdb3-e871-7c69-a5f5-a0b8e42e4763" }
----- output end -----
UserAuthenticationConcept: Usernames cannot contain leading/trailing spaces ... ok (942ms)

ok | 6 passed | 0 failed (5s)
