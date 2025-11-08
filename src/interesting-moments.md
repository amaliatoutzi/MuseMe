# Design Document — Final vs. Initial (A2) and Visual (A4b)

## 1) Final Project Overview

* **Product:** Friends-only museum diary & discovery **web** app for NYC.
* **Core loop:** Log a visit → rate (1–5 stars) → notes/photos → friends see it → **Save for later** shortlists → museum recommendation .
---

## 2) What Changed From Assignment 2 (Initial Concept)

### Navigation & Layout

* **Mobile → Web shift:** Primary nav moved to a **top menu bar** (A2 assumed bottom tabs for mobile).
* **Profile simplified:** From a long scroll to **Preferences / Saved / Reviews** tabs.

### Features & Scope

* **Map view:** Pins for museums; select to view details and actions.
* **Unified search:** Single bar for **museums and users** (follow/unfollow).
* **Save vs. Favorite:** Reframed as **“Save for later”** to reduce decision fatigue. I think the terms were creating misconceptions about their intended purpose.
* **Unified ratings:** Replaced LIKE/MEH/LOVE with **1–5 stars** for consistency.
* **Recs trimmed:** Recommend **museums only** to keep the task focused, instead of museums and exhibits.

### Concept Model Adjustments (raised by confirmations)

* **Keep preset tags outside `UserPreferences`:** Confirm workflow showed the concept shouldn’t manage preset tag state; removing the extra collection improved independence and grading alignment. Design-wise, this let me use the tags in different places (like recommendation and profile) without coupling.
  ↳ [updated impl](../context/design/concepts/UserPreferences/testing.md/steps/response.b66749f6.md) · [confirm suggestion](../context/design/concepts/UserPreferences/confirm.md/steps/response.cf8ce21d.md)
* **Normalize query return shapes:** Following’s confirm caught that some queries returned single docs/bools; standardized on **arrays of named dictionaries** across concepts. This allowed me to portray the following in my profile page on the front end.
  ↳ [return-shape note](../context/design/concepts/Following/confirm.md/steps/response.90d546c8.md)

---

## 3) What Changed From Assignment 4b (Visual Design)

### Visual System

* **Color & type:** Darker theme with **burgundy + gold**; typography tuned for an **elegant** feel. This matches my design study.
* **Branding:** Added a **favicon** with the app logo for the web app to be recognizable.
* **OS highlight overrides:** Replaced default pink focus highlights with theme-consistent states. Ensures consistency and adds to the elegant and deep vibe.

### Interaction & UX Polish

* **Accessibility:** Higher contrast hovers (e.g., **burgundy bg + white text**), larger targets, clearer keyboard order.
* **Micro-animations:** Subtle **“hop”** on Profile tabs to support orientation.
* **Ratings affordance:** Stars **turn gold on hover** to guide precise selection and improve accessibility.
* **Form trims:** Removed misleading **Preview** on Add Visit, as it did not really preview anything; **Photos required** to avoid empty feed cards (and make the app more consistent).
* **Self-search guard:** Hide **Follow** when viewing your own profile. This was confusing as users would think they could follow themselves, which not only breaks the backend, but also does not make sense.
* **Search hygiene:** Clear the search bar after submit to speed subsequent searches.

### Data Loading

* **Lean catalog loader:** Rejected a heavier async path-resolver/loader in favor of **simple JSON import + inline set population** for ID validation (smaller and easier to reason about). Initially, I was going to allow users like museum staff to update this, but the design was way too complex, so I chose this simpler and more focused approach.
  ↳ [loader suggestion](../context/design/concepts/Reviewing/testing.md/steps/response.731a4777.md) · [lean import](../src/concepts/Similarity/SimilarityConcept.ts)

---

## 4) Data & Integrity Decisions (catalog and similarity)

### Catalog Accuracy

* **Removed hallucinated fields:** Early drafts invented ratings/reviews/URLs; final kept only **verifiable** fields and sources. I noticed this issue while looking at the design.
  ↳ [hallucinated draft](../context/design/database/new-york-museums.md/steps/response.30bbeef1.md) · [sanitized revision](../context/design/database/new-york-museums.md/steps/response.3ad43cac.md)

### Similarity & Determinism

* **Stable neighbor ordering:** Added a **secondary sort by neighbor ID** to break score ties and make outputs reproducible. This issue showed up when developing the front end when the UI looked funky.
  ↳ [tie-break note](../context/design/concepts/Similarity/confirm.md/steps/response.c9a9deba.md)

---

## 5) Why These Changes Helped

* **Clarity over overload:** Friends-only + Save-for-later + museum-level recs focus decisions on planning visits.
* **Consistency:** One rating scale; one search; simpler profile model; consistent colors → faster learning and fewer edge cases.
* **Reliability:** Contracted query shapes, deterministic similarity, and vetted data reduce flakiness and non-reproducible bugs.
* **Accessibility & polish:** Contrast, focus, empty states, and restrained animations improve comprehension and flow.
