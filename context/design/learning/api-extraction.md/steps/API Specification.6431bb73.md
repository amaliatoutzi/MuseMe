---
timestamp: 'Tue Oct 21 2025 12:06:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_120629.8f34776d.md]]'
content_id: 6431bb73cbbe2762953eaffc2775c96c57a407015110290b2868252f9045e44d
---

# API Specification: Reviewing Concept

**Purpose:** record normalized per-item opinion (1–5 stars) with optional note

***

## API Endpoints

### POST /api/Reviewing/upsertReview

**Description:** Creates a new review or updates an existing one for a user and an item.

**Requirements:**

* `user` must exist (conceptually, handled by application boundary).
* `item` must exist (validated against loaded museum data).

**Effects:**

* If a review for `(user, item)` already exists, updates its `stars` and `note` (if provided).
* Otherwise, creates a new review.
* Sets `updatedAt := now` for the review.

**Request Body:**

```json
{
  "user": "string",
  "item": "string",
  "stars": "number",
  "note?": "string"
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

### POST /api/Reviewing/clearReview

**Description:** Deletes a specific review made by a user for an item.

**Requirements:**

* A `Reviews(user, item)` entry must exist.
* `item` must exist (validated against loaded museum data).

**Effects:**

* Deletes the specified `Reviews` entry.

**Request Body:**

```json
{
  "user": "string",
  "item": "string"
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

### POST /api/Reviewing/\_getReview

**Description:** Returns the review for a specific user and item, if it exists.

**Requirements:**

* None explicit, but `user` and `item` should be valid IDs.

**Effects:**

* Returns an array containing the review for `(user, item)` if it exists, otherwise an empty array.

**Request Body:**

```json
{
  "user": "string",
  "item": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "review": {
      "_id": "string",
      "user": "string",
      "item": "string",
      "stars": "number",
      "note?": "string",
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

### POST /api/Reviewing/\_getReviewsByUser

**Description:** Returns all reviews authored by a specified user.

**Requirements:**

* None explicit, but `user` should be a valid `User` ID.

**Effects:**

* Returns an array of dictionaries, each containing a `Review` object authored by the given `user`.

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
    "review": {
      "_id": "string",
      "user": "string",
      "item": "string",
      "stars": "number",
      "note?": "string",
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

### POST /api/Reviewing/\_getReviewsByItem

**Description:** Returns all reviews recorded for a specified item.

**Requirements:**

* None explicit, but `item` should be a valid `ItemId`.

**Effects:**

* Returns an array of dictionaries, each containing a `Review` object recorded for the given `item`.

**Request Body:**

```json
{
  "item": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "review": {
      "_id": "string",
      "user": "string",
      "item": "string",
      "stars": "number",
      "note?": "string",
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
