---
timestamp: 'Sun Oct 19 2025 15:24:00 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_152400.f647a974.md]]'
content_id: 1d291d49eda18ad7c1b93ad7e6dadbbeda35745bce21e6d6dbf8faababc0736f
---

# concept: Visit

## concept **Visit** \[User, MuseumId, ExhibitId, VisitEntryId]

**purpose**
capture a user’s visit to a museum, including an overall museum tag and the list of exhibits seen, each with optional note/photo and a share setting

**principle**
when a user logs a museum visit and records the exhibits they saw (with optional notes/photos and a visibility setting), the visit becomes an editable diary entry owned by that user.

**state**
a set of **Visits** with

* an id **VisitId**
* an owner **User**
* a museum **MuseumId**
* an optional title **String**
* a createdAt **DateTime**
* an updatedAt **DateTime**

a set of **VisitEntries** with

* a visit **VisitId**
* an exhibit **ExhibitId**
* an optional note **String**
* an optional photoUrl **String**
* a loggedAt **DateTime**
* an updatedAt **DateTime**

**actions**
**createVisit**(owner: User, museum: MuseumId, title?: String) : VisitId | { error: String }

* requires owner exists and museum exists
* effects create visit (owner, museum, title?), set startedAt := now, createdAt := now, updatedAt := now;

**addEntry**(visit: VisitId, exhibit: ExhibitId, note?: String, photoUrl?: String, user: User) : Empty | { error: String }

* requires Visits\[visit] exists, user = Visits\[visit].owner, and exhibit belongs to Visits\[visit].museum
* effects create VisitEntries(visit, exhibit, note?, photoUrl?, loggedAt := now, updatedAt := now); set Visits\[visit].updatedAt := now; returns error if exhibit already logged for this visit.

**editEntry**(visitEntryId: VisitEntryId, note?: String, photoUrl?: String, user: User) : Empty | { error: String }

* requires entry exists and user = entry.visit.owner
* effects update provided fields; set entry.updatedAt := now; set entry.visit.updatedAt := now

**removeEntry**(visitEntryId: VisitEntryId, user: User) : Empty | { error: String }

* requires entry exists and user = entry.visit.owner
* effects delete the entry; set entry.visit.updatedAt := now
