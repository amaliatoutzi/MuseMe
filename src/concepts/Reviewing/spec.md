## concept **Reviewing** [User, Item]

**purpose**
record normalized per-item opinion (1–5 stars) with a required note (rating justification)

**principle**
if **Reviews(user, item)** exists, then it is the single source of truth for that user’s rating of that item; subsequent upserts overwrite the prior rating and update the timestamp.

**state**
a set of **Reviews** with
- a user **User**
- an item **ItemId**
- a stars **STARS_1 | STARS_2 | STARS_3 | STARS_4 | STARS_5**
- a note **String**
- an updatedAt **DateTime**

**actions**
**upsertReview**(user: User, item: ItemId, stars: STARS_1..STARS_5, note: String) : Empty | { error: String }
- requires user exists and `note.trim() !== ""`
- effects if **Reviews(user, item)** exists, update stars and note; otherwise create it; set `updatedAt := now`

**clearReview**(user: User, item: ItemId) : Empty | { error: String }
- requires **Reviews(user, item)** exists
- effects delete that **Reviews**

**queries**
**Review?**(user: User, item: ItemId) : (review: Review)
- effects return the review for `(user, item)` if it exists

**ReviewsByUser**(user: User) : (review: Review)
- effects return every review authored by `user`

**ReviewsByItem**(item: ItemId) : (review: Review)
- effects return every review recorded for `item`
