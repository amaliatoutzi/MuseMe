# Changes - Similarity

## Changes

- Collapsed the old Spotlight/Curations concepts into a single item-agnostic `Similarity` concept; the state is now just `SimilarityLinks(from, to, score, updatedAt)` and no longer co-stores user taste signals or star ratings.
- Now it is a generalized concept and not item specific. This also simplifies my app a sa whole.
- Replaced the old recommendation actions with `rebuildSimilarity`, which recomputes links for a chosen scope (museums, exhibits, or all) using the cosine-on-tags policy and prunes to the top-k neighbors.
- It used to be a black box algorithm, but now i needed to decide on one in order to proceed with implementing.
- Added a `neighbors` query that exposes concept notation `Neighbors(item, k)` and returns `{ item: ItemId }[]` ranked by score.

## Issues encountered

- Needed to preprocess `new-york-museums.json` to build reusable tag sets for every museum and exhibit so the cosine similarity scores stay deterministic across rebuilds.
- Ensuring we only keep the strongest neighbors required a delete-and-insert transaction per rebuild and careful sorting to apply the top-k cutoff while avoiding self-links. This became an issue when i tested the respective testcase
