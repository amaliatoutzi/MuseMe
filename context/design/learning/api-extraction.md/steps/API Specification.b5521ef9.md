---
timestamp: 'Wed Oct 22 2025 11:47:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251022_114728.45ea008c.md]]'
content_id: b5521ef98065a66f31b7a0379e4e04fc7a1613047b2878df087af4183c33861f
---

# API Specification: Following Concept

**Purpose:** maintain directed follow edges; “friends” means mutual follow. used to ensure only friends can view each others visit logs/reviews

***

## API Endpoints

### POST /api/Following/follow

**Description:** Establishes a directed follow relationship between two users.

**Requirements:**

* `follower` must not be the same as `followee`.
* Both `follower` and `followee` users must exist (assumed by this concept).
* No `Follows(follower, followee)` relationship should already exist.

**Effects:**

* Creates a new `Follows(follower, followee, createdAt := now)` entry in the state.

**Request Body:**

```json
{
  "follower": "string",
  "followee": "string"
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
