# Reviewing

## Output of running tests:

running 8 tests from ./src/concepts/Reviewing/ReviewingConcept.test.ts
should successfully load museum data for validation ...
------- output -------
[Test Step] Initial upsert check for data load: User user:Alice reviewed alice-austen-house-museum, result: {}
----- output end -----
should successfully load museum data for validation ... ok (632ms)
Operational Principle: Upserting reviews correctly updates or creates, and tracks timestamp ...
------- output -------
[Trace] Creating first review for user user:Alice, item alice-austen-house-museum with 4 stars.
[Trace] First review created: {"_id":"user:Alice::alice-austen-house-museum","item":"alice-austen-house-museum","note":"Great place!","stars":4,"updatedAt":"2025-10-19T18:53:55.059Z","user":"user:Alice"}
[Trace] Updating review for user user:Alice, item alice-austen-house-museum to 5 stars with a new note.
[Trace] Review updated: {"_id":"user:Alice::alice-austen-house-museum","item":"alice-austen-house-museum","note":"Absolutely loved it!","stars":5,"updatedAt":"2025-10-19T18:53:55.135Z","user":"user:Alice"}
----- output end -----
Operational Principle: Upserting reviews correctly updates or creates, and tracks timestamp ... ok (719ms)
Scenario 1: Multiple users review the same item ...
------- output -------
[Trace] User user:Alice reviews item alice-austen-house-museum with 4 stars.
[Trace] User user:Bob reviews item alice-austen-house-museum with 3 stars.
[Trace] Getting all reviews for item alice-austen-house-museum.
[Trace] Reviews for item alice-austen-house-museum: [{"_id":"user:Alice::alice-austen-house-museum","item":"alice-austen-house-museum","note":null,"stars":4,"updatedAt":"2025-10-19T18:53:55.808Z","user":"user:Alice"},{"_id":"user:Bob::alice-austen-house-museum","item":"alice-austen-house-museum","note":"It was okay.","stars":3,"updatedAt":"2025-10-19T18:53:55.849Z","user":"user:Bob"}]
----- output end -----
Scenario 1: Multiple users review the same item ... ok (748ms)
Scenario 2: Same user reviews multiple items (museum and exhibit) ...
------- output -------
[Trace] User user:Alice reviews museum alice-austen-house-museum with 5 stars.
[Trace] User user:Alice reviews exhibit alice-austen-and-the-old-house with 4 stars.
[Trace] Getting all reviews by user user:Alice.
[Trace] Reviews by user user:Alice: [{"_id":"user:Alice::alice-austen-house-museum","item":"alice-austen-house-museum","note":"Amazing experience!","stars":5,"updatedAt":"2025-10-19T18:53:56.447Z","user":"user:Alice"},{"_id":"user:Alice::alice-austen-and-the-old-house","item":"alice-austen-and-the-old-house","note":"The exhibit was great.","stars":4,"updatedAt":"2025-10-19T18:53:56.483Z","user":"user:Alice"}]
----- output end -----
Scenario 2: Same user reviews multiple items (museum and exhibit) ... ok (626ms)
Scenario 3: Clear an existing review successfully ...
------- output -------
[Trace] Creating review for user user:Bob, item brooklyn-museum before clearing.
[Trace] Review before clear: {"_id":"user:Bob::brooklyn-museum","item":"brooklyn-museum","note":"Needs improvement.","stars":2,"updatedAt":"2025-10-19T18:53:57.121Z","user":"user:Bob"}
[Trace] Clearing review for user user:Bob, item brooklyn-museum.
[Trace] Verifying review for user user:Bob, item brooklyn-museum is gone.
[Trace] Review after clear: []
----- output end -----
Scenario 3: Clear an existing review successfully ... ok (627ms)
Scenario 4: Attempt to clear a non-existent review (expect error) ...
------- output -------
[Trace] Attempting to clear non-existent review for user user:Alice, item brooklyn-museum.
[Trace] Expected error received: {"error":"No review found for user 'user:Alice' and item 'brooklyn-museum'."}
----- output end -----
Scenario 4: Attempt to clear a non-existent review (expect error) ... ok (523ms)
Scenario 5: Upsert review with an invalid item ID (expect error) ...
------- output -------
[Trace] Attempting to upsert review for invalid item ID: non-existent-museum-or-exhibit.
[Trace] Expected error received: {"error":"Invalid item ID: 'non-existent-museum-or-exhibit'. Must be a valid museum or exhibit ID."}
----- output end -----
Scenario 5: Upsert review with an invalid item ID (expect error) ... ok (548ms)
Scenario 6: Upsert review with invalid stars rating (expect error) ...
------- output -------
[Trace] Attempting to upsert review for item alice-austen-house-museum with 0 stars.
[Trace] Expected error received for 0 stars: {"error":"Stars rating must be between 1 and 5, received 0."}
[Trace] Attempting to upsert review for item alice-austen-house-museum with 6 stars.
[Trace] Expected error received for 6 stars: {"error":"Stars rating must be between 1 and 5, received 6."}
----- output end -----
Scenario 6: Upsert review with invalid stars rating (expect error) ... ok (633ms)

ok | 8 passed | 0 failed (5s)
