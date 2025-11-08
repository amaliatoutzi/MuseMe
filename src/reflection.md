## Project Snapshot

* Built a **museum diary/discovery app**. The ideation phase was surprisingly productive (ratings model, “save for later,” mutual-follow privacy).
* Writing very detailed **concept specs** too early led to a lot of **rework**. Seeing real screens first would have made the specs more accurate.

## What Was Easy vs. Hard

* **Easy**

  * Generating ideas and picking a brand (name + logo) with help from an agent.
  * Iterating on UI once components existed: cards, filters, empty states.
  * Creating test cases and small example payloads with guided prompts.
* **Hard**

  * **API sync (“4c”)**: keeping front end and back end in agreement (optional vs. required fields, auth timing, version mismatches).
  * **Data planning (more detail):** I didn’t define a concrete data plan for museums/exhibits early on. I should have:

    * Chosen **authoritative sources** (museum APIs, NYC Open Data, licensed sets) instead of ad-hoc scraping.
    * Locked a **schema** up front (museum, exhibits, stable IDs, hours, ticketing, accessibility, image license/credit, temporary vs. permanent exhibits).
    * Set an **update strategy** (seed JSON → weekly hours/ticketing refresh → monthly exhibitions).
    * Assigned **ownership & moderation** (who imports, PR review rules, conflict resolution, audit logs).
    * Planned **IDs & deduping** (external IDs, geospatial matching, fuzzy names).
    * Added **fallbacks** (graceful UI when a field is missing; placeholders).
  * **Large edits by agents** across many files: helpful in parts, risky end-to-end.

## What Went Well

* **Scoped down** to NYC and used a **curated JSON dataset** to unblock UI and recommendations.
* Focused on **accessibility**: contrast checks, larger tap targets, keyboard order, and helpful alt/aria text.
* Broke prompts into smaller tasks with clear acceptance criteria, which sped up implementation.

## Mistakes & How I’ll Avoid Them (Expanded)

* **Too much scope** (multi-role staff UI, live curation).

  * **What happened:** tried to support museum-staff workflows and public user workflows in v1; this doubled routes, permissions, and reviews.
  * **Impact:** slower delivery; UI states multiplied; more bugs from role-based logic.
  * **How I’ll avoid it:** ship a **thin vertical slice** (visit → rate → feed) first; put **role-based features behind flags**; require a written business case before adding a new role; measure adoption before expanding in the future.
* **Specs before screens** led to rework.

  * **What happened:** I spec’d flows I hadn’t validated; later UI revealed missing states (empty data, slow network).
  * **Impact:** re-writing specs, renaming fields, extra migration, and a lot of back-and-forth.
  * **How I’ll avoid it:** start with **mockups/clickable prototype**, then write **lean specs** anchored to screenshots; add a **“states checklist”** (loading/empty/error/paginated/offline) for each screen before coding.
* **No data owner or update plan.**

  * **What happened:** unclear who adds/edits exhibits; images lacked license metadata; duplicate museums appeared.
  * **Impact:** brittle UI, inconsistent details, legal risk for images.
  * **How I’ll avoid it:** define a **data contract** (JSON Schema + required license fields), choose **sources and licenses** day 1, set a **refresh cadence** (cron + CI validation), keep **stable IDs**.
* **Front end/back end drift.**

  * **What happened:** optional registration fields on FE didn’t match required BE; enums (e.g., `MuseumType`) diverged.
  * **Impact:** lots of errors; agents “fixed” code by deleting checks, which broke other paths.
  * **How I’ll avoid it:** one **contract** (OpenAPI/JSON Schema), **generated clients**, **runtime validation**, **contract tests**.
* **Agent edits across multiple files without diffs.**

  * **What happened:** sweeping refactors overwrote working code and type guards.
  * **Impact:** hidden regressions.
  * **How I’ll avoid it:** require **unified diffs** in outputs; limit prompts to **one change per PR**; run **unit + contract + visual checks** before merge; prefer **editor-apply patches** over copy/paste. Continue checking agent output.

## Skills I Built & What to Develop Next

* **Built:** clearer prompts, Vue component structure, quick test generation, UI polish, and a stronger eye for color/type and accessibility.
* **Next:** deeper **API** skills (auth flows, pagination, avoiding duplicate requests) and better **validation** at boundaries to prevent drift.

## How I Used the Context Tool

* **Helped** on the first run to outline components and tasks.
* **Hurt** later: it rewrote earlier results (renamed keys, removed props) and broke builds.
* **Rule for me:** use it for one-time planning or summaries; don’t let it overwrite working code without a diff. I generally prefered AI agents.

## How I Used an Agentic Coding Tool

* **Branding & content:** names, logo drafts, microcopy.
* **Code:** test data, boilerplate components, targeted edits.
* **Workflow that worked:** small prompts, give input/output examples, ask for a **unified diff**, review before commit.

## LLMs in Software Development — My View

* **Where they do well (keep using):**

  * **Ideation & exploration:** fast brainstorming of features, names, and UI patterns.
  * **Learning new stacks:** translate docs into examples (“show a Vue component that paginates with cursor tokens”).
  * **Boilerplate & tests:** generate starter components, fixtures, property-based test ideas.
  * **Targeted refactors:** isolated changes (e.g., “add keyboard navigation to this dropdown”).
* **Where they struggle:**

  * **Cross-cutting changes** across FE+BE; tendency to invent types or remove checks.
  * **Ambiguous prompts**; it assumes missing context and produces confident but wrong code.
  * **Stateful edits**; it forgets earlier constraints and undoes prior fixes.
* **Practices I’m adopting because of this:**

  * **Contract-first development:** generate clients from OpenAPI; validate at runtime; reject unmatched responses.
  * **Prompt design:** one change per prompt, include **before/after code snippets**, ask for **diffs**, specify file paths.
  * **Verification:** run unit + contract tests locally; add **visual regression** checks for UI; keep a **playbook of failure cases** to test agent outputs.
  * **Change management:** prefer **small PRs**; require “why this change” and “affected routes” in PR template; rollback plan for risky edits.
  * **Reliability stance:** treat LLMs as **speed boosters (but ~75% reliable)**
