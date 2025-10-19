# UserPreferences

## Output of running tests:

Operational principle: Add a preference and verify ...
------- output -------

--- Test: Operational Principle ---
Action: addPreference(user:Alice, tag:impressionist)
Result: {}
Query: _getPreferencesForUser(user:Alice) -> ["tag:impressionist"]
Query: _getUsersByPreferenceTag(tag:impressionist) -> ["user:Alice"]
----- output end -----
Operational principle: Add a preference and verify ... ok (716ms)
Scenario 1: Attempt to add a preference for a non-existent tag ...
------- output -------

--- Test: Add Preference with Non-Existent Tag ---
Action: addPreference(user:Alice, tag:nonexistent)
Result: {"error":"Tag 'tag:nonexistent' does not exist in the list of preset tags."}
----- output end -----
Scenario 1: Attempt to add a preference for a non-existent tag ... ok (702ms)
Scenario 2: Attempt to add an existing preference (duplicate) ...
------- output -------

--- Test: Add Duplicate Preference ---
Action: addPreference(user:Alice, tag:impressionist)
Result: {"error":"User 'user:Alice' already has a preference for tag 'tag:impressionist'."}
----- output end -----
Scenario 2: Attempt to add an existing preference (duplicate) ... ok (726ms)
Scenario 3: Add multiple distinct preferences for a user ...
------- output -------

--- Test: Add Multiple Preferences ---
Action: addPreference(user:Alice, tag:modern)
Action: addPreference(user:Alice, tag:photography)
Action: addPreference(user:Bob, tag:modern)
Action: addPreference(user:Bob, tag:sculpture)
Query: _getPreferencesForUser(user:Alice) -> ["tag:modern","tag:photography","tag:impressionist"]
Query: _getPreferencesForUser(user:Bob) -> ["tag:modern","tag:sculpture"]
Query: _getUsersByPreferenceTag(tag:modern) -> ["user:Alice","user:Bob"]
----- output end -----
Scenario 3: Add multiple distinct preferences for a user ... ok (1s)
Scenario 4: Remove an existing preference ...
------- output -------

--- Test: Remove Existing Preference ---
Action: removePreference(user:Alice, tag:modern)
Result: {}
Query: _getPreferencesForUser(user:Alice) -> ["tag:impressionist","tag:photography"]
Query: _getUsersByPreferenceTag(tag:modern) -> ["user:Bob"]
----- output end -----
Scenario 4: Remove an existing preference ... ok (974ms)
Scenario 5: Attempt to remove a non-existent preference ...
------- output -------

--- Test: Remove Non-Existent Preference ---
Action: removePreference(user:Alice, tag:sculpture)
Result: {"error":"No preference found for user 'user:Alice' and tag 'tag:sculpture'."}
----- output end -----
Scenario 5: Attempt to remove a non-existent preference ... ok (809ms)
Scenario 6: Verify _getPresetTags query ...
------- output -------

--- Test: _getPresetTags Query ---
Query: _getPresetTags() -> [{"_id":"tag:impressionist","name":"Impressionist"},{"_id":"tag:modern","name":"Modern"},{"_id":"tag:photography","name":"Photography"},{"_id":"tag:sculpture","name":"Sculpture"}]
----- output end -----
Scenario 6: Verify _getPresetTags query ... ok (619ms)

ok | 7 passed | 0 failed (5s)
