---
timestamp: 'Tue Oct 21 2025 12:06:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_120629.8f34776d.md]]'
content_id: 4a5e19e7bd5e8e12fb70b32893b7fb4dc65c262d5608e7a7d3d46d494405781d
---

# API Specification: Visit Concept

**Purpose:** capture a user’s personal diary of a museum visit, including the list of exhibits seen, each with optional note and photo

***

## API Endpoints

### POST /api/Visit/createVisit

**Description:** Creates a new museum visit entry for a user.

**Requirements:**

* `owner` must exist (conceptually, handled by application boundary).
* `museum` must exist in the catalog.

**Effects:**

* Creates a new `Visit` entry with the provided details.
* Sets `createdAt := now` and `updatedAt := now`.
* Returns the `visitId` of the newly created visit.

**Request Body:**

```json
{
  "owner": "string",
  "museum": "string",
  "title?": "string"
}
```

**Success Response Body (Action):**

```json
{
  "visitId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Visit/addEntry

**Description:** Adds an entry for an exhibit seen during a specific visit.

**Requirements:**

* The `Visits[visit]` must exist.
* The `user` performing the action must be the `owner` of the `Visits[visit]`.
* The `exhibit` must belong to the `Visits[visit].museum`.
* The `exhibit` must not have been already logged for this visit.

**Effects:**

* Creates a new `VisitEntries` record for the exhibit.
* Sets `loggedAt := now` and `updatedAt := now` for the new entry.
* Updates `Visits[visit].updatedAt := now`.

**Request Body:**

```json
{
  "visit": "string",
  "exhibit": "string",
  "note?": "string",
  "photoUrl?": "string",
  "user": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Visit/editEntry

**Description:** Edits the details of an existing visit entry.

**Requirements:**

* The `visitEntryId` must correspond to an existing entry.
* The `user` performing the action must be the `owner` of the associated visit.

**Effects:**

* Updates the provided fields (`note`, `photoUrl`) of the `VisitEntries[visitEntryId]`.
* Sets `VisitEntries[visitEntryId].updatedAt := now`.
* Sets `Visits[entry.visit].updatedAt := now`.

**Request Body:**

```json
{
  "visitEntryId": "string",
  "note?": "string",
  "photoUrl?": "string",
  "user": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Visit/removeEntry

**Description:** Removes a specific exhibit entry from a visit.

**Requirements:**

* The `visitEntryId` must correspond to an existing entry.
* The `user` performing the action must be the `owner` of the associated visit.

**Effects:**

* Deletes the specified `VisitEntries[visitEntryId]`.
* Sets `Visits[entry.visit].updatedAt := now`.

**Request Body:**

```json
{
  "visitEntryId": "string",
  "user": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Visit/\_getVisit

**Description:** Returns a specific museum visit by its ID.

**Requirements:**

* None explicit, but `visitId` should be a valid `VisitId`.

**Effects:**

* Returns an array containing the visit with the given `visitId`, if it exists, otherwise an empty array.

**Request Body:**

```json
{
  "visitId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "visit": {
      "_id": "string",
      "owner": "string",
      "museum": "string",
      "title?": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Visit/\_getVisitsByUser

**Description:** Returns all museum visits owned by a specific user.

**Requirements:**

* None explicit, but `user` should be a valid `User` ID.

**Effects:**

* Returns an array of dictionaries, each containing a `Visit` object, owned by the given `user`, ordered by `updatedAt` descending.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "visit": {
      "_id": "string",
      "owner": "string",
      "museum": "string",
      "title?": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Visit/\_getEntriesByVisit

**Description:** Returns all exhibit entries recorded for a specific visit.

**Requirements:**

* None explicit, but `visitId` should be a valid `VisitId`.

**Effects:**

* Returns an array of dictionaries, each containing a `VisitEntry` object, for the given `visitId`, ordered by `loggedAt` ascending.

**Request Body:**

```json
{
  "visitId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "entry": {
      "_id": "string",
      "visit": "string",
      "exhibit": "string",
      "note?": "string",
      "photoUrl?": "string",
      "loggedAt": "string",
      "updatedAt": "string"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Visit/\_getEntry

**Description:** Returns a specific visit entry by its ID.

**Requirements:**

* None explicit, but `visitEntryId` should be a valid `VisitEntryId`.

**Effects:**

* Returns an array containing the visit entry with the given `visitEntryId`, if it exists, otherwise an empty array.

**Request Body:**

```json
{
  "visitEntryId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "entry": {
      "_id": "string",
      "visit": "string",
      "exhibit": "string",
      "note?": "string",
      "photoUrl?": "string",
      "loggedAt": "string",
      "updatedAt": "string"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
