# Changes - Saving

## Changes

- Removed the generic favorites logic out of the old `Profile` concept into a focused `Saving` concept whose state is just `Saved(user, item, createdAt)`, without usernames, bios, tags, or visibility.
- `Favorites` did not have a clear purpose as it could be used to just like your most liked museums/exhibits or to save the ones you want to visit in the future. Now it has a clear purpose to save the ones you want to visit.
- Introduced two actions matching the new spec: `saveItem` creates a `Saved` edge (guarded by existence checks), and `unsaveItem` deletes it; all other profile-mutating actions were removed from this concept.
- Added the query `_listSaved`

## Issues encountered

- Validating that an `item` ID is real required loading `new-york-museums.json` and caching both museum IDs and their exhibit IDs so we can reject bad saves without a database join.
- Enforcing “no duplicate saves” needed a unique index on `(user, item)` plus defensive error handling to translate duplicate-key violations into `{ error }` responses.
- These issues were all discovered whikle testing.
