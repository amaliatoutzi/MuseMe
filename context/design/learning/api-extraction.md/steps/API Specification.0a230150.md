---
timestamp: 'Tue Oct 21 2025 12:06:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_120629.8f34776d.md]]'
content_id: 0a230150714ba723ba3172b7e1cc7c4b08e39c8f6c692ede5272e327cd782ea2
---

# API Specification: Saving Concept

**Purpose:** let a user mark/unmark any item to revisit later

***

## API Endpoints

### POST /api/Saving/saveItem

**Description:** Marks an item as saved by a user.

**Requirements:**

* `user` must exist (conceptually, handled by application boundary).
* `item` must exist (validated against the external museum catalog).
* No `Saved(user, item)` entry should already be present.

**Effects:**

* Creates a new `Saved(user, item, createdAt := now)` entry.

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

### POST /api/Saving/unsaveItem

**Description:** Unmarks an item previously saved by a user.

**Requirements:**

* A `Saved(user, item)` entry must exist.

**Effects:**

* Deletes the matching `Saved` entry.

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

### POST /api/Saving/\_listSaved

**Description:** Returns a list of items saved by a user.

**Requirements:**

* `user` must exist (conceptually, handled by application boundary).

**Effects:**

* Returns an array of items saved by the `user`, ordered by `createdAt` descending, up to an optional `limit`.

**Request Body:**

```json
{
  "user": "string",
  "limit?": "number"
}
```

**Success Response Body (Query):**

```json
[
  {
    "item": "string"
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
