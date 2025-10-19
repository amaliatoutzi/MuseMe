---
timestamp: 'Sat Oct 18 2025 17:04:10 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_170410.b0d8d36b.md]]'
content_id: 64ca3f284ddea0b36d36343973205dd2f0219d6579696330f79b203e1e27a677
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

* requires user exists (This check is typically handled by syncs from a User concept, not by `Reviewing` itself, which treats `User` as an opaque ID).
* effects if Reviews(user, item) exists, update stars and note if it exists;
  else create review; set updatedAt := now

**clearReview**(user: User, item: ItemId)

* requires Reviews(user, item) exists
* effects delete that Reviews

***
