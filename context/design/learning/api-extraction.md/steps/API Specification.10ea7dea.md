---
timestamp: 'Tue Oct 21 2025 12:06:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_120629.8f34776d.md]]'
content_id: 10ea7deac8ee91067e977619eb111380d3820a522679499911f611fe968f9476
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

***

### POST /api/Following/unfollow

**Description:** Removes an existing directed follow relationship between two users.

**Requirements:**

* A `Follows(follower, followee)` relationship must exist in the state.

**Effects:**

* Deletes the existing `Follows(follower, followee)` entry from the state.

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

***

### POST /api/Following/\_getFollows

**Description:** Returns the follow edge document if the specified relationship exists.

**Requirements:**

* None explicit, but `follower` and `followee` should be valid `User` IDs.

**Effects:**

* Returns an array containing the follow edge if it exists, otherwise an empty array.

**Request Body:**

```json
{
  "follower": "string",
  "followee": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "follow": {
      "_id": "string",
      "follower": "string",
      "followee": "string",
      "createdAt": "string"
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

### POST /api/Following/\_getFollowers

**Description:** Returns a list of users who are following the specified user.

**Requirements:**

* None explicit, but `user` should be a valid `User` ID.

**Effects:**

* Returns an array of dictionaries, each containing the ID of a `User` who is following the given `user`.

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
    "follower": "string"
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

### POST /api/Following/\_getFollowees

**Description:** Returns a list of users that the specified user is currently following.

**Requirements:**

* None explicit, but `user` should be a valid `User` ID.

**Effects:**

* Returns an array of dictionaries, each containing the ID of a `User` whom the given `user` is following.

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
    "followee": "string"
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

### POST /api/Following/\_areFriends

**Description:** Checks if two users are mutual friends (i.e., they both follow each other).

**Requirements:**

* None explicit, but `userA` and `userB` should be valid `User` IDs.

**Effects:**

* Returns `true` if both `Follows(userA, userB)` and `Follows(userB, userA)` exist, otherwise `false`.

**Request Body:**

```json
{
  "userA": "string",
  "userB": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "areFriends": "boolean"
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
