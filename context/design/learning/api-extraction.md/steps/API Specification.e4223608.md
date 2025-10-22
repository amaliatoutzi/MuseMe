---
timestamp: 'Tue Oct 21 2025 12:06:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_120629.8f34776d.md]]'
content_id: e422360801d9c48266bede2883d6c9a3f169e430ec75ea9dbf322313816aca5a
---

# API Specification: UserPreferences Concept

**Purpose:** store durable taste tags for ranking and cold-start for individual users.

***

## API Endpoints

### POST /api/UserPreferences/addPreference

**Description:** Adds a tag as a preference for a user.

**Requirements:**

* `user` exists (externally verified).
* `tag` is a valid tag ID (externally verified).
* No `Preferences(user, tag)` entry should already be present.

**Effects:**

* Creates a new `Preferences(user, tag, createdAt := now)` entry.

**Request Body:**

```json
{
  "user": "string",
  "tag": "string"
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

### POST /api/UserPreferences/removePreference

**Description:** Removes a tag preference for a user.

**Requirements:**

* `Preferences(user, tag)` entry must exist.

**Effects:**

* Deletes the specified `Preferences` entry.

**Request Body:**

```json
{
  "user": "string",
  "tag": "string"
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

### POST /api/UserPreferences/\_getPreferencesForUser

**Description:** Returns all tags currently preferred by a specific user.

**Requirements:**

* None explicit, but `user` should be a valid `User` ID.

**Effects:**

* Returns an array of tag IDs preferred by the given `user`.

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
    "tag": "string"
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

### POST /api/UserPreferences/\_getUsersByPreferenceTag

**Description:** Returns all users who have recorded a preference for a specific tag.

**Requirements:**

* None explicit, but `tag` should be a valid `Tag` ID.

**Effects:**

* Returns an array of user IDs who have preferred the given `tag`.

**Request Body:**

```json
{
  "tag": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "user": "string"
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
