# Changes - UserAuthentication

## Changes

- Split the credential logic out of the old `Profile` concept into a dedicated `UserAuthentication` module whose state is just `Credentials(owner, username, passwordHash, createdAt, updatedAt)`.
- Introduced PBKDF2 password hashing (random salt, 100k iterations, sha512) so the concept never stores or compares plaintext passwords.
- Replaced `createProfile` with `register`, which allocates a new `User` ID, hashes the submitted password, writes the credential row, and returns the owner.
- Added an `authenticate` action that verifies a username/password pair by re-deriving the hash and returns the associated `User` on success.
- Added a unique index on `username` so duplicate registrations fail fast.

## Issues encountered

- Wiring PBKDF2 required pulling in Node’s `crypto` helpers, storing `saltHex:hashHex`, and using `timingSafeEqual` to avoid timing side-channels. The documentation was a little complex and I needed a couple iterations.
- Untangling authentication from the old profile concept meant changing my plans since I previously expected bios, favorites, or follows here
- the new concept now owns only credential state and delegates everything else to other concepts
