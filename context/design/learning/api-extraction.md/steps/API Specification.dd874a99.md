---
timestamp: 'Tue Oct 21 2025 12:06:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_120629.8f34776d.md]]'
content_id: dd874a99fd8970e463563faa7ea1ae9ea819cf2501f6b3c413f6e23154c77e9b
---

# API Specification: UserAuthentication Concept

**Purpose:** limit access to known users

***

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and password.

**Requirements:**

* No existing `Credentials` with the provided `username`.
* `username` and `password` cannot be empty or contain leading/trailing spaces.

**Effects:**

* Creates a new `User` ID.
* Creates `Credentials(owner := new User, username, passwordHash := hash(password), createdAt := now, updatedAt := now)`.
* Returns the new `User` ID as `user`.

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

***

### POST /api/UserAuthentication/authenticate

**Description:** Authenticates a user with their username and password.

**Requirements:**

* `Credentials(username)` must exist.
* `verifyHash(password, passwordHash)` must return true.
* `username` and `password` cannot be empty or contain leading/trailing spaces.

**Effects:**

* None.

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

***
