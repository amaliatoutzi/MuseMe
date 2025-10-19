---
timestamp: 'Sat Oct 18 2025 17:13:00 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_171300.51f8dda2.md]]'
content_id: f728d9994e6b366ad4c0b8f42ba4d3df1018a700e139e1fa96aa09a39a711f9f
---

# concept: Reviewing

## concept **Reviewing** \[User, Item]

**purpose**
record normalized per-item opinion (1–5 stars) with optional note

**principle**
if **Reviews(user,item)** exists, then it is the single source of truth for that user’s rating of that item; subsequent upserts overwrite the prior rating and update the timestamp.

**state**
a set of **Reviews** with

* a user **User**
* an item **ItemId** *(MuseumId or ExhibitId)*
* a stars of **STARS\_1 | STARS\_2 | STARS\_3 | STARS\_4 | STARS\_5**
* an optional note **String**
* an updatedAt **DateTime**

**actions**
**upsertReview**(user: User, item: ItemId, stars: STARS\_1..STARS\_5, note?: String)

* requires user exists (This check is typically handled by syncs from a User concept, not by `Reviewing` itself, which treats `User` as an opaque ID, meaning it doesn't validate if `User` corresponds to an actual registered user within its own logic).
* effects if Reviews(user, item) exists, update stars and note if it exists;
  else create review; set updatedAt := now

**clearReview**(user: User, item: ItemId)

* requires Reviews(user, item) exists
* effects delete that Reviews

***
