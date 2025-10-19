# Changes - Following

## Changes

- Replaced the Profile concept with more smaller concepts. One of them  is a narrowly scoped follow-graph concept. Profiles, bios, favorites, preset tags, and visibility flags were removed from the state; the state now tracks only `Follows(follower, followee, createdAt)`.
- Simplified the action surface to match the new spec: only `follow` and `unfollow` remain.
- All former profile editing actions (add/remove favorites, preference tags, visibility edits, etc.) were deleted because they now belong to other concepts.
- I decided to remove visiibility as a whole, and only allow visibility for friends (no public accounts) gto simplify my project for the scope of the class.
- Added a `createdAt` timestamp to each follow edge so syncs can reason about when relationships were established.
- Added rubric-compliant query helpers `_getFollows`, `_getFollowers`, `_getFollowees`, and `_areFriends`
- Captured the access-control principle explicitly: mutual follows (`Follows(a,b)` and `Follows(b,a)`) are the mechanism for granting friend-level visibility to visit logs and reviews.

## Issues encountered

- Mongo query helpers had to be rewritten to return arrays of named dictionaries (`{ follow: ... }[]`, `{ areFriends: boolean }[]`, etc.) to satisfy the concept rubric; the existing tests were updated to account for the new shapes. This is because Context did not follow the instructions from the background docs properly.
- Enforcing the “no duplicate follows” precondition surfaced race-condition risk, so I added a compound unique index on `(follower, followee)` and extra error handling for duplicate key violations.
