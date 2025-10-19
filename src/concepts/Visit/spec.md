## concept **Visit** [User, MuseumId, ExhibitId, VisitEntryId]

**purpose**
capture a user’s personal diary of a museum visit, including the list of exhibits seen, each with optional note and photo

**principle**
when a user logs a museum visit and records the exhibits they saw (with optional notes/photos), the visit becomes an editable diary entry owned by that user.

**state**
a set of **Visits** with
- an id **VisitId**
- an owner **User**
- a museum **MuseumId**
- an optional title **String**
- a createdAt **DateTime**
- an updatedAt **DateTime**

a set of **VisitEntries** with
- a visit **VisitId**
- an exhibit **ExhibitId**
- an optional note **String**
- an optional photoUrl **String**
- a loggedAt **DateTime**
- an updatedAt **DateTime**

**actions**
**createVisit**(owner: User, museum: MuseumId, title?: String) : { visitId: VisitId } | { error: String }
- requires owner exists and museum exists
- effects create **Visit(visitId, owner, museum, title?)**; set `createdAt := now`, `updatedAt := now`

**addEntry**(visit: VisitId, exhibit: ExhibitId, note?: String, photoUrl?: String, user: User) : Empty | { error: String }
- requires **Visits\[visit]** exists, `user = Visits[visit].owner`, and exhibit belongs to **Visits\[visit].museum**
- effects create **VisitEntries(visitEntryId, visit, exhibit, note?, photoUrl?, loggedAt := now, updatedAt := now)**; set **Visits[visit].updatedAt := now**; returns error if exhibit already logged for this visit

**editEntry**(visitEntryId: VisitEntryId, note?: String, photoUrl?: String, user: User) : Empty | { error: String }
- requires entry exists and `user = entry.visit.owner`
- effects update provided fields; set **VisitEntries[visitEntryId].updatedAt := now**; set **Visits[entry.visit].updatedAt := now**

**removeEntry**(visitEntryId: VisitEntryId, user: User) : Empty | { error: String }
- requires entry exists and `user = entry.visit.owner`
- effects delete the entry; set **Visits[entry.visit].updatedAt := now**

**queries**
**Visit?**(visitId: VisitId) : (visit: Visit)
- effects return the visit with the given `visitId`, if it exists

**VisitsByUser**(user: User) : (visit: Visit)
- effects return every visit owned by `user`, ordered by `updatedAt` descending

**EntriesByVisit**(visitId: VisitId) : (entry: VisitEntry)
- effects return every visit entry for `visitId`, ordered by `loggedAt` ascending

**VisitEntry?**(visitEntryId: VisitEntryId) : (entry: VisitEntry)
- effects return the visit entry with the given `visitEntryId`, if it exists
