---
timestamp: 'Sun Oct 19 2025 13:46:01 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_134601.0746b14b.md]]'
content_id: b3aad2a6f3a98012628ffc68832ffe4ab04d5be94cfa86f4bf95b2715ce66454
---

# implement: UserAuthentication

## concept **UserAuthentication** \[User]

**purpose**
limit access to known users

**principle**
after a user registers with a username and a password, they can authenticate with the same username+password and be treated as the same user.

**state**
a set of **Credentials** with

* an owner **User**
* a username **String** (unique)
* a passwordHash **Hash**
* a createdAt **DateTime**
* an updatedAt **DateTime**

**actions**
**register**(username: String, password: String) : {user: User} | {error: string}

* requires no existing Credentials with this username AND username/password are not empty
* effects create Credentials(owner := new User, username, passwordHash := hash(password), createdAt := now, updatedAt := now); return owner

**authenticate**(username: String, password: String): {user: User} | {error: string}

* requires Credentials(username) exists AND verifyHash(password, passwordHash) AND username/password are not empty
* effects none
