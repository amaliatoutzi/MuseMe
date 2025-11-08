# 6.104 Assignment 4: Implementing Concepts

MuseMe is the codebase for the 6.104 Assignment 4 deliverable. It collects the runtime implementation of the concepts that back the product idea as well as the design artifacts created while iterating on those concepts.

## Repository Structure (key areas)
- [`src/`](src/) – Runtime code.
  - [`concept_server.ts`](src/concept_server.ts) exposes every concept class as a REST-style API using Hono.
  - [`reflection.md`](src/reflection.md) has my reflection for the project a sa whole (what went well/not so well, mistakes, learnings, etc.)
   - [`final-video.md`](src/final-video.md) contains my final video demonstration of my app.
  - [`interesting-moments.md`](src/interesting-moments.md) This is the design doc. It records notable Context interactions and decisions captured during implementation.
  - [`trace.md`](src/trace.md) This shows the trace produced by the video actions.
  - [`concepts/`](src/concepts/) groups each concept (for example [`Visit`](src/concepts/Visit), [`Following`](src/concepts/Following), [`UserAuthentication`](src/concepts/UserAuthentication)). Each subdirectory holds the implementation, the scenario spec (`spec.md`), the tests (`*.test.ts`), the generated output (`output.md`), and the change log (`changes.md`).


## Prerequisites
- [Deno](https://docs.deno.com/runtime/manual) 1.40+ for running tests and tasks.
- A MongoDB instance reachable by the application and tests (local `mongod` or a cloud cluster).

## Additional Notes
- The New York museums data ([`src/utils/new-york-museums.json`](src/utils/new-york-museums.json)) was produced with Context.
- The final deliverables ALL all under src.
