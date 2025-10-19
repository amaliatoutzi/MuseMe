## concept **Similarity** [Item]

**purpose**  
store item-to-item relatedness usable by ranking flows

**principle**  
if **SimilarityLinks(from, to)** with **score** exists, then neighbor queries for **from** may surface **to** ranked by **score**; rebuilding recomputes these scores atomically for the chosen scope.

**state**  
a set of **SimilarityLinks** with  
- a from **ItemId**  
- a to **ItemId**  
- a score **Number** *(higher means more similar)*  
- an updatedAt **DateTime**

**actions**  
**rebuildSimilarity**(scope?: Scope) : Empty | { error: String }  
- effects (re)compute **SimilarityLinks** for the specified scope *(e.g., all museums or exhibits)*; set `updatedAt := now`

**neighbors**(item: ItemId, k: Number) : { neighbors: ItemId[] } | { error: String }  
- requires `k ≥ 1`  
- effects return up to `k` items with highest score where `from = item`
