# Changes - Reviewing

## Changes

- Pulled the per-exhibit star rating behavior out of the old `MuseumVisit` concept into a focused `Reviewing` concept whose state is just `Reviews(user, item, stars, note?, updatedAt)`.
- Replaced the previous log-entry star mutations with two actions: `upsertReview` overwrites or creates the single `Reviews(user, item)` row, while `clearReview` deletes it.
- Note, museums and exhibits used to be reviewed in different scales (one with LIKE, MEH, LOVE and the other with stars). This has since been changed and now I review everyhting with stars. This is to simplify and generalize my concept and make it reusable.
- Added query helpers `_getReview`, `_getReviewsByUser`, and `_getReviewsByItem`

## Issues encountered

- Needed to validate every museum/exhibit ID against `new-york-museums.json`, so the constructor loads that catalog and caches all item IDs for quick lookups. (As mentioned previously, this used to be a concept MuseumRegistry) that I have now replaced with a simple JSON.
- Ensuring one review per (user, item) required composing a deterministic `_id` (`user::item`) and using MongoDB upserts; error handling translates database failures into `{ error }` results.
- I discovered these issues while testing
