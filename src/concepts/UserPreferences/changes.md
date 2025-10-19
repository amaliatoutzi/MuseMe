# Changes - UserPreferences

## Changes

- Split the old profile concept and extracted a focused `UserPreferences` concept whose state is just `Preferences(user, tag, createdAt)`; usernames, bios, follows, favorites, and visibility are handled elsewhere.
- Dropped the embedded `PresetTags` from this concept and clarified that tag validity comes from an external catalog/sync, so `addPreference` only enforces uniqueness in `Preferences`.
- PresetTags is preset so it did not belong in the state since it had no actions related to it. I assume that checks that the tags are in preset tags will happen externally through syncs later on.
- Implemented two actions matching the new spec: `addPreference` creates the preference edge, `removePreference` deletes it; both return `{}` or `{ error }` and assume user/tag existence is validated upstream.
- Added queries `_getPreferencesForUser` and `_getUsersByPreferenceTag`

## Issues encountered

- Removing the PresetTags state surfaced the need to document how preset tag selection now works
- once PresetTags moved out of this concept, the code itself no longer checks whether a tag ID is valid. That responsibility now sits “outside” (in whatever TagCatalog or validation logic you already have). To make that clear for anyone using the concept, I left comments and the spec language explaining that addPreference assumes the caller will only pass legitimate tag IDs, referencing the TagCatalog/background docs that define the valid tag list.
- Because preferences moved out of `Profile`, existing tests and syncs had to be updated to reference the new module, ensuring I didn’t accidentally recreate profile coupling.
