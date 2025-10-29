---
timestamp: 'Wed Oct 22 2025 11:47:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251022_114728.45ea008c.md]]'
content_id: d3496095da8143d03d789d12b6501ccbc870e9e06e646f38d51aef29aca54ab8
---

# API Specification: Profile Concept

**Purpose:** store minimal user profile details: immutable first/last name (added once) and an optional profile picture URL that can be added/edited/removed.

***

## API Endpoints

### POST /api/Profile/addName

**Description:** Adds first and last name for a user. Names are immutable once set.

**Requirements:**

* `user` must exist.
* No name must have been previously set for this user.

**Effects:**

* If no Profile exists, creates one. Sets `firstName` and `lastName`. Updates timestamps.

**Request Body:**

```json
{
  "user": "string",
  "firstName": "string",
  "lastName": "string"
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

### POST /api/Profile/addProfilePicture

**Description:** Adds a profile picture URL for a user.

**Requirements:**

* `user` must exist.
* No profile picture must currently be set.

**Effects:**

* If no Profile exists, creates one. Sets `profilePictureUrl := url`. Updates timestamps.

**Request Body:**

```json
{
  "user": "string",
  "url": "string"
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

### POST /api/Profile/editProfilePicture

**Description:** Replaces the existing profile picture URL for a user.

**Requirements:**

* `user` must exist.
* A profile picture must already be set.

**Effects:**

* Sets `profilePictureUrl := url`. Updates `updatedAt := now`.

**Request Body:**

```json
{
  "user": "string",
  "url": "string"
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

### POST /api/Profile/removeProfilePicture

**Description:** Removes the existing profile picture URL for a user.

**Requirements:**

* `user` must exist.
* A profile picture must already be set.

**Effects:**

* Unsets `profilePictureUrl`. Updates `updatedAt := now`.

**Request Body:**

```json
{
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

### POST /api/Profile/\_getProfile

**Description:** Returns the profile for a user, if any.

**Requirements:**

* None explicit, but `user` should be a valid `User` ID.

**Effects:**

* Returns an array containing the Profile if it exists, otherwise an empty array.

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
    "profile": {
      "_id": "string",
      "firstName?": "string",
      "lastName?": "string",
      "profilePictureUrl?": "string",
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

### POST /api/Following/\_getUserIdByUsername

**Description:** Returns the `User` id for a given username (if any).

**Requirements:**

* `username` should be a valid username string.

**Effects:**

* Looks up `UserAuthentication.credentials` by `username`. Returns an array containing `{ user: <User> }` when found or an empty array when no such username exists.

**Request Body:**

```json
{
  "username": "string"
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

### POST /api/Following/\_getUsernameByUserId

**Description:** Returns the username for a given `User` id (if any).

**Requirements:**

* `user` should be a valid `User` id.

**Effects:**

* Looks up `UserAuthentication.credentials` by `_id`. Returns an array containing `{ username: "..." }` when found or an empty array when no such user exists.

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
    "username": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
