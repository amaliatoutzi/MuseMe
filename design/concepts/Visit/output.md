# Visit

## Output of running tests:1.

running 5 tests from ./src/concepts/Visit/VisitConcept.test.ts
1. Operational Principle: Log a museum visit with entries ...
------- output -------

--- Test 1: Operational Principle ---
Calling createVisit for Alice at The Met.
Visit created with ID: 0199fdfc-db38-783f-9aa1-00a3b8f59bcd
Visit verified.
Calling addEntry for Egyptian Art.
Entry for Egyptian Art added.
Entry for Egyptian Art verified, visit updatedAt updated.
Calling addEntry for European Sculpture.
Entry for European Sculpture added.
Entry for European Sculpture verified, visit updatedAt updated.
----- output end -----
1. Operational Principle: Log a museum visit with entries ... ok (1s)
2. Scenario: Invalid createVisit attempts ...
------- output -------

--- Test 2: Invalid createVisit attempts ---
Attempting createVisit with no owner.
Failed as expected: Owner ID is required.
Attempting createVisit with non-existent museum.
Failed as expected: Museum with ID 'non-existent-museum' not found in catalog.
----- output end -----
2. Scenario: Invalid createVisit attempts ... ok (594ms)
3. Scenario: Invalid addEntry attempts ...
------- output -------

--- Test 3: Invalid addEntry attempts ---
Attempting addEntry to a non-existent visit.
Failed as expected: Visit with ID 'non-existent-visit' not found.
Attempting addEntry by an unauthorized user.
Failed as expected: Unauthorized: User is not the owner of this visit.
Attempting addEntry with an exhibit not from the visit's museum.
Failed as expected: Exhibit with ID 'non-existent-exhibit' not found or does not belong to museum 'the-metropolitan-museum-of-art'.
Attempting to add a duplicate exhibit entry.
Failed as expected: Exhibit 'ancient-egyptian-art' has already been logged for visit '0199fdfc-e0d5-72f6-8d33-3e18701faf83'.
----- output end -----
3. Scenario: Invalid addEntry attempts ... ok (738ms)
4. Scenario: Edit and Remove Visit Entry ...
------- output -------

--- Test 4: Edit and Remove Visit Entry ---
Adding an entry for Arms and Armor to edit/remove.
Arms and Armor entry added.
Editing entry 0199fdfc-e4cb-73ee-a5c2-561f8a9c28ea.
Entry edited.
Edited entry verified, visit updatedAt updated.
Removing entry 0199fdfc-e4cb-73ee-a5c2-561f8a9c28ea.
Entry removed.
Entry deletion verified, visit updatedAt updated.
----- output end -----
4. Scenario: Edit and Remove Visit Entry ... ok (1s)
5. Scenario: Invalid editEntry/removeEntry attempts ...
------- output -------

--- Test 5: Invalid editEntry/removeEntry attempts ---
Attempting to edit a non-existent entry.
Failed as expected: Visit entry with ID 'non-existent-entry' not found.
Attempting to edit an entry by an unauthorized user.
Failed as expected: Unauthorized: User is not the owner of this visit.
Attempting to remove a non-existent entry.
Failed as expected: Visit entry with ID 'another-non-existent-entry' not found.
Attempting to remove an entry by an unauthorized user.
Failed as expected: Unauthorized: User is not the owner of this visit.
----- output end -----
5. Scenario: Invalid editEntry/removeEntry attempts ... ok (795ms)

ok | 5 passed | 0 failed (4s)
