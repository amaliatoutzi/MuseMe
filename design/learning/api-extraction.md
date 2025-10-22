[@api-extraction-from-code](../tools/api-extraction-from-code.md)

[@api-extraction-from-spec](../tools/api-extraction-from-spec.md)

Please extract an API for this app from the following concepts:

## Following

Specification:

[@Following](../../src/concepts/Following/spec.md)

Code:

[@FollowingConcept.ts](../../src/concepts/Following/FollowingConcept.ts)

## Reviewing

Specification:

[@Following](../../src/concepts/Reviewing/spec.md)

Code:

[@FollowingConcept.ts](../../src/concepts/Reviewing/ReviewingConcept.ts)

## Saving

Specification:

[@Following](../../src/concepts/Saving/spec.md)

Code:

[@FollowingConcept.ts](../../src/concepts/Saving/SavingConcept.ts)

## Similarity

Specification:

[@Following](../../src/concepts/Similarity/spec.md)

Code:

[@FollowingConcept.ts](../../src/concepts/Similarity/SimilarityConcept.ts)

## UserAuthentication

Specification:

[@Following](../../src/concepts/UserAuthentication/spec.md)

Code:

[@FollowingConcept.ts](../../src/concepts/UserAuthentication/UserAuthenticationConcept.ts)

## UserPreferences

Specification:

[@Following](../../src/concepts/UserPreferences/spec.md)

Code:

[@FollowingConcept.ts](../../src/concepts/UserPreferences/UserPreferencesConcept.ts)


## Visit

Specification:

[@Following](../../src/concepts/Visit/spec.md)

Code:

[@FollowingConcept.ts](../../src/concepts/Visit/VisitConcept.ts)

# response:

Here is the API documentation extracted from the provided concept specifications:

---

# API Specification: Following Concept

**Purpose:** maintain directed follow edges; “friends” means mutual follow. used to ensure only friends can view each others visit logs/reviews

---

## API Endpoints

### POST /api/Following/follow

**Description:** Establishes a directed follow relationship between two users.

**Requirements:**
- `follower` must not be the same as `followee`.
- Both `follower` and `followee` users must exist (assumed by this concept).
- No `Follows(follower, followee)` relationship should already exist.

**Effects:**
- Creates a new `Follows(follower, followee, createdAt := now)` entry in the state.

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

---

### POST /api/Following/unfollow

**Description:** Removes an existing directed follow relationship between two users.

**Requirements:**
- A `Follows(follower, followee)` relationship must exist in the state.

**Effects:**
- Deletes the existing `Follows(follower, followee)` entry from the state.

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

---

### POST /api/Following/_getFollows

**Description:** Returns the follow edge document if the specified relationship exists.

**Requirements:**
- None explicit, but `follower` and `followee` should be valid `User` IDs.

**Effects:**
- Returns an array containing the follow edge if it exists, otherwise an empty array.

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

---

### POST /api/Following/_getFollowers

**Description:** Returns a list of users who are following the specified user.

**Requirements:**
- None explicit, but `user` should be a valid `User` ID.

**Effects:**
- Returns an array of dictionaries, each containing the ID of a `User` who is following the given `user`.

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

---

### POST /api/Following/_getFollowees

**Description:** Returns a list of users that the specified user is currently following.

**Requirements:**
- None explicit, but `user` should be a valid `User` ID.

**Effects:**
- Returns an array of dictionaries, each containing the ID of a `User` whom the given `user` is following.

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

---

### POST /api/Following/_areFriends

**Description:** Checks if two users are mutual friends (i.e., they both follow each other).

**Requirements:**
- None explicit, but `userA` and `userB` should be valid `User` IDs.

**Effects:**
- Returns `true` if both `Follows(userA, userB)` and `Follows(userB, userA)` exist, otherwise `false`.

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

---

### POST /api/Following/_getUserIdByUsername

**Description:** Returns the `User` id for a given username (if any).

**Requirements:**
- `username` should be a valid username string.

**Effects:**
- Looks up `UserAuthentication.credentials` by `username`. Returns an array containing `{ user: <User> }` when found or an empty array when no such username exists.

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

---

### POST /api/Following/_getUsernameByUserId

**Description:** Returns the username for a given `User` id (if any).

**Requirements:**
- `user` should be a valid `User` id.

**Effects:**
- Looks up `UserAuthentication.credentials` by `_id`. Returns an array containing `{ username: "..." }` when found or an empty array when no such user exists.

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


# API Specification: Reviewing Concept

**Purpose:** record normalized per-item opinion (1–5 stars) with optional note

---

## API Endpoints

### POST /api/Reviewing/upsertReview

**Description:** Creates a new review or updates an existing one for a user and an item.

**Requirements:**
- `user` must exist (conceptually, handled by application boundary).
- `item` must exist (validated against loaded museum data).

**Effects:**
- If a review for `(user, item)` already exists, updates its `stars` and `note` (if provided).
- Otherwise, creates a new review.
- Sets `updatedAt := now` for the review.

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

---

### POST /api/Reviewing/clearReview

**Description:** Deletes a specific review made by a user for an item.

**Requirements:**
- A `Reviews(user, item)` entry must exist.
- `item` must exist (validated against loaded museum data).

**Effects:**
- Deletes the specified `Reviews` entry.

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

---

### POST /api/Reviewing/_getReview

**Description:** Returns the review for a specific user and item, if it exists.

**Requirements:**
- None explicit, but `user` and `item` should be valid IDs.

**Effects:**
- Returns an array containing the review for `(user, item)` if it exists, otherwise an empty array.

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

---

### POST /api/Reviewing/_getReviewsByUser

**Description:** Returns all reviews authored by a specified user.

**Requirements:**
- None explicit, but `user` should be a valid `User` ID.

**Effects:**
- Returns an array of dictionaries, each containing a `Review` object authored by the given `user`.

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

---

### POST /api/Reviewing/_getReviewsByItem

**Description:** Returns all reviews recorded for a specified item.

**Requirements:**
- None explicit, but `item` should be a valid `ItemId`.

**Effects:**
- Returns an array of dictionaries, each containing a `Review` object recorded for the given `item`.

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

---

# API Specification: Saving Concept

**Purpose:** let a user mark/unmark any item to revisit later

---

## API Endpoints

### POST /api/Saving/saveItem

**Description:** Marks an item as saved by a user.

**Requirements:**
- `user` must exist (conceptually, handled by application boundary).
- `item` must exist (validated against the external museum catalog).
- No `Saved(user, item)` entry should already be present.

**Effects:**
- Creates a new `Saved(user, item, createdAt := now)` entry.

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

---

### POST /api/Saving/unsaveItem

**Description:** Unmarks an item previously saved by a user.

**Requirements:**
- A `Saved(user, item)` entry must exist.

**Effects:**
- Deletes the matching `Saved` entry.

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

---

### POST /api/Saving/_listSaved

**Description:** Returns a list of items saved by a user.

**Requirements:**
- `user` must exist (conceptually, handled by application boundary).

**Effects:**
- Returns an array of items saved by the `user`, ordered by `createdAt` descending, up to an optional `limit`.

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

---

# API Specification: Similarity Concept

**Purpose:** store item-to-item relatedness usable by ranking flows

---

## API Endpoints

### POST /api/Similarity/rebuildSimilarity

**Description:** Recomputes and updates item-to-item similarity links for a specified scope.

**Requirements:**
- None explicit.

**Effects:**
- (Re)computes `SimilarityLinks` for the specified scope (e.g., all museums or exhibits) using a content-based similarity algorithm.
- Sets `updatedAt := now` for all new links.

**Request Body:**
```json
{
  "scope?": "string"
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

---

### POST /api/Similarity/neighbors

**Description:** Retrieves up to `k` most similar neighbor ItemIds for a given source item.

**Requirements:**
- `k` must be greater than or equal to 1.
- `item` must exist in the catalog.

**Effects:**
- Returns up to `k` items with the highest similarity score where the `from` item matches the provided `item`.

**Request Body:**
```json
{
  "item": "string",
  "k": "number"
}
```

**Success Response Body (Action):**
```json
{
  "neighbors": [
    "string"
  ]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: UserAuthentication Concept

**Purpose:** limit access to known users

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and password.

**Requirements:**
- No existing `Credentials` with the provided `username`.
- `username` and `password` cannot be empty or contain leading/trailing spaces.

**Effects:**
- Creates a new `User` ID.
- Creates `Credentials(owner := new User, username, passwordHash := hash(password), createdAt := now, updatedAt := now)`.
- Returns the new `User` ID as `user`.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/authenticate

**Description:** Authenticates a user with their username and password.

**Requirements:**
- `Credentials(username)` must exist.
- `verifyHash(password, passwordHash)` must return true.
- `username` and `password` cannot be empty or contain leading/trailing spaces.

**Effects:**
- None.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: UserPreferences Concept

**Purpose:** store durable taste tags for ranking and cold-start for individual users.

---

## API Endpoints

### POST /api/UserPreferences/addPreference

**Description:** Adds a tag as a preference for a user.

**Requirements:**
- `user` exists (externally verified).
- `tag` is a valid tag ID (externally verified).
- No `Preferences(user, tag)` entry should already be present.

**Effects:**
- Creates a new `Preferences(user, tag, createdAt := now)` entry.

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

---

### POST /api/UserPreferences/removePreference

**Description:** Removes a tag preference for a user.

**Requirements:**
- `Preferences(user, tag)` entry must exist.

**Effects:**
- Deletes the specified `Preferences` entry.

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

---

### POST /api/UserPreferences/_getPreferencesForUser

**Description:** Returns all tags currently preferred by a specific user.

**Requirements:**
- None explicit, but `user` should be a valid `User` ID.

**Effects:**
- Returns an array of tag IDs preferred by the given `user`.

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

---

### POST /api/UserPreferences/_getUsersByPreferenceTag

**Description:** Returns all users who have recorded a preference for a specific tag.

**Requirements:**
- None explicit, but `tag` should be a valid `Tag` ID.

**Effects:**
- Returns an array of user IDs who have preferred the given `tag`.

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

---

# API Specification: Visit Concept

**Purpose:** capture a user’s personal diary of a museum visit, including the list of exhibits seen, each with optional note and photo

---

## API Endpoints

### POST /api/Visit/createVisit

**Description:** Creates a new museum visit entry for a user.

**Requirements:**
- `owner` must exist (conceptually, handled by application boundary).
- `museum` must exist in the catalog.

**Effects:**
- Creates a new `Visit` entry with the provided details.
- Sets `createdAt := now` and `updatedAt := now`.
- Returns the `visitId` of the newly created visit.

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

---

### POST /api/Visit/addEntry

**Description:** Adds an entry for an exhibit seen during a specific visit.

**Requirements:**
- The `Visits[visit]` must exist.
- The `user` performing the action must be the `owner` of the `Visits[visit]`.
- The `exhibit` must belong to the `Visits[visit].museum`.
- The `exhibit` must not have been already logged for this visit.

**Effects:**
- Creates a new `VisitEntries` record for the exhibit.
- Sets `loggedAt := now` and `updatedAt := now` for the new entry.
- Updates `Visits[visit].updatedAt := now`.

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

---

### POST /api/Visit/editEntry

**Description:** Edits the details of an existing visit entry.

**Requirements:**
- The `visitEntryId` must correspond to an existing entry.
- The `user` performing the action must be the `owner` of the associated visit.

**Effects:**
- Updates the provided fields (`note`, `photoUrl`) of the `VisitEntries[visitEntryId]`.
- Sets `VisitEntries[visitEntryId].updatedAt := now`.
- Sets `Visits[entry.visit].updatedAt := now`.

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

---

### POST /api/Visit/removeEntry

**Description:** Removes a specific exhibit entry from a visit.

**Requirements:**
- The `visitEntryId` must correspond to an existing entry.
- The `user` performing the action must be the `owner` of the associated visit.

**Effects:**
- Deletes the specified `VisitEntries[visitEntryId]`.
- Sets `Visits[entry.visit].updatedAt := now`.

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

---

### POST /api/Visit/_getVisit

**Description:** Returns a specific museum visit by its ID.

**Requirements:**
- None explicit, but `visitId` should be a valid `VisitId`.

**Effects:**
- Returns an array containing the visit with the given `visitId`, if it exists, otherwise an empty array.

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

---

### POST /api/Visit/_getVisitsByUser

**Description:** Returns all museum visits owned by a specific user.

**Requirements:**
- None explicit, but `user` should be a valid `User` ID.

**Effects:**
- Returns an array of dictionaries, each containing a `Visit` object, owned by the given `user`, ordered by `updatedAt` descending.

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

---

### POST /api/Visit/_getEntriesByVisit

**Description:** Returns all exhibit entries recorded for a specific visit.

**Requirements:**
- None explicit, but `visitId` should be a valid `VisitId`.

**Effects:**
- Returns an array of dictionaries, each containing a `VisitEntry` object, for the given `visitId`, ordered by `loggedAt` ascending.

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

---

### POST /api/Visit/_getEntry

**Description:** Returns a specific visit entry by its ID.

**Requirements:**
- None explicit, but `visitEntryId` should be a valid `VisitEntryId`.

**Effects:**
- Returns an array containing the visit entry with the given `visitEntryId`, if it exists, otherwise an empty array.

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

---
