# 6.104 Assignment 4: Implementing Concepts

MuseMe is the codebase for the 6.104 Assignment 4 deliverable. It collects the runtime implementation of the concepts that back the product idea as well as the design artifacts created while iterating on those concepts.

## Repository Structure
- [`src/`](src/) – Runtime code.
  - [`concept_server.ts`](src/concept_server.ts) exposes every concept class as a REST-style API using Hono.
  - [`interesting-moments.md`](src/interesting-moments.md) records notable Context interactions and decisions captured during implementation.
  - [`concepts/`](src/concepts/) groups each concept (for example [`Visit`](src/concepts/Visit), [`Following`](src/concepts/Following), [`UserAuthentication`](src/concepts/UserAuthentication)). Each subdirectory holds the implementation, the scenario spec (`spec.md`), the tests (`*.test.ts`), the generated output (`output.md`), and the change log (`changes.md`).
  - [`utils/`](src/utils) provides shared MongoDB helpers ([`database.ts`](src/utils/database.ts)), type aliases ([`types.ts`](src/utils/types.ts)), and the New York museums data set used by Visit ([`new-york-museums.json`](src/utils/new-york-museums.json)).
- [`design/`](design/) – Assignment design work. Each concept folder supplies its specification, implementation notes, testing plan, and confirmation checklist (e.g. [`design/concepts/Visit`](design/concepts/Visit)). The other subdirectories capture background research, brainstorming, tooling, and database sketches.
- [`context/`](context/) – Snapshot of the starter materials produced by Context; left unmodified.
- [`media/`](media/) – Screenshots referenced from the design docs (e.g. [`media/obsidian_settings.png`](media/obsidian_settings.png)).
- [`deno.json`](deno.json) / [`deno.lock`](deno.lock) – Deno task definitions, import maps, and dependency lock file.
- [`geminiConfig.json`](geminiConfig.json) – Local configuration for the Gemini assistant workflow.
- [`package-lock.json`](package-lock.json) – Present from earlier experiments; runtime relies on Deno’s npm compatibility layer rather than Node tooling.

## Prerequisites
- [Deno](https://docs.deno.com/runtime/manual) 1.40+ for running tests and tasks.
- A MongoDB instance reachable by the application and tests (local `mongod` or a cloud cluster).

## Additional Notes
- The learning and brainstorming folders under [`design/`](design/) were not edited; concept work lives alongside the spec/testing/confirm files.
- The New York museums data ([`src/utils/new-york-museums.json`](src/utils/new-york-museums.json)) was produced with Context.
- The final deliverables ALL all under src.
