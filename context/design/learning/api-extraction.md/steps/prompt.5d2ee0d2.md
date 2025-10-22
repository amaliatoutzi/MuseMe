---
timestamp: 'Tue Oct 21 2025 12:05:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_120518.1ade212f.md]]'
content_id: 5d2ee0d202f6f5740a5ac5df59113fcb7e9aa8a738d608e48470335ae6e2486a
---

# prompt:

Now, analyze the following Concept Specification and generate the API documentation based on these instructions.

Please extract an API for this app from the following concepts:

## Following

Specification:

## concept **Following** \[User]

**purpose**
maintain directed follow edges; “friends” means mutual follow. used to ensure only friends can view each others visit logs/reviews

**principle**
if **Follows(a,b)** and **Follows(b,a)** both exist, then **a** and **b** are friends; only friendship (mutual follows) grants read access to each other’s content at the application boundary.

**state**
a set of **Follows** with

* a follower **User**
* a followee **User**
* a createdAt **DateTime**

**actions**
**follow**(follower: User, followee: User)

* requires follower ≠ followee, both users exist, and no **Follows(follower, followee)**
* effects create **Follows(follower, followee, createdAt := now)**

**unfollow**(follower: User, followee: User)

* requires **Follows(follower, followee)** exists
* effects delete that **Follows**

**queries**
**Follows?**(follower: User, followee: User) : (follow: Follows)

* effects return the follow edge if it exists, otherwise return nothing

**Followers**(user: User) : (follower: User)

* effects return every follower of **user**

**Followees**(user: User) : (followee: User)

* effects return every followee **user** currently follows

**AreFriends**(userA: User, userB: User) : (areFriends: Boolean)

* effects return `true` when both **Follows(userA, userB)** and **Follows(userB, userA)** exist, otherwise `false`

Code:
