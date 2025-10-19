# Changes - Visit

## Changes
- Replaced the old museum-log concept (museumVisit) with the streamlined `Visit` since it used to be overly complex (now it is modular)
- The state now holds `Visits(visitId, owner, museumId, title?, createdAt, updatedAt)` plus `VisitEntries(visitEntryId, visitId, exhibitId, note?, photoUrl?, loggedAt, updatedAt)`.
- Narrowed the action surface to match the new spec: removed tag/visibility setters and star ratings, and standardized on `createVisit`, `addEntry`, `editEntry`, and `removeEntry` that always verify ownership, ensure exhibits belong to the visit’s museum, and bump the parent visit’s `updatedAt`.
- Updated return shapes: `createVisit` now yields `{ visitId }` (or `{ error }`), while the entry mutations return `Empty | { error: string }`
- Added concept-aligned queries `_getVisit`, `_getVisitsByUser`, `_getEntriesByVisit`, and `_getEntry`

## Issues encountered

- Enforcing the “exhibit belongs to the visit’s museum” precondition required loading the local `new-york-museums.json` catalog at construction time and caching exhibit ID sets to keep lookups fast.
- At first, I had not thought about how to access museums. I had a MuseumRegistry concept for another type of user but it was too compelx as it required invite codes and was beyond the scope of the class. Therefore, I decided to make a JSON with museums (for now in New York) and I just import it. There is no need for separate concepts as there is no loading etc.
- Preventing duplicate exhibit entries surfaced the need for a manual uniqueness check on `(visitId, exhibitId)` before insert
- MongoDB lacks a partial unique index in this local setup, so I handled the race defensively in code.
