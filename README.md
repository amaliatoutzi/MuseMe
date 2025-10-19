# 6.104 Assignment 4: Implementing Concepts

MuseMe is the codebase for the 6.104 Assignment 4 deliverable. It contains both the runtime implementation of the concepts that back the MuseMe product idea and the design artifacts created while iterating on those concepts.

## Repository Structure
- `src/` – Runtime code.
  - `concept_server.ts` exposes every concept class as a REST-style API using Hono.
  - `concepts/` groups each concept (Following, Reviewing, Saving, Similarity, UserAuthentication, UserPreferences, Visit). Each subdirectory holds the implementation, concept spec, test file, and output. It also has a changes.md file with the changes made compared to Assignment 2.
  - `utils/` provides shared MongoDB helpers, type aliases, and the New York museums data set used by Visit.
- `design/` – Assignment design work. Every concept folder keeps its specification, implementation notes, testing plan, and confirmation materials; other subdirectories capture background research, brainstorming, tools, and database sketches. Note that the confirm markdown files, have the prompt to confirm that my spec and implementation/testing are in line with the rubric.
- `context/` – [not edited.] As produced by Context.
- `media/` – Screenshots referenced by the design docs.
- `deno.json` / `deno.lock` – Deno task definitions, import maps, and dependency lock file.

## Prerequisites
- [Deno](https://docs.deno.com/runtime/manual) 1.40+ (for `deno test` and `deno task`).
- MongoDB instance available to the application and tests (local `mongod` or a cloud cluster).

## Additional Notes
- I did not edit the learning or brainstorming folders. All the thought process was within concepts and background in the design folder.
- I used Context to produce the New York museums JSON.
