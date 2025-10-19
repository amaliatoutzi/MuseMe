# Saving

## Output of running tests:

Saving Concept - Operational Principle ...
------- output -------

--- Test: Operational Principle for Saving ---
User user:Alice wants to save and unsave items.
Action: user:Alice saves staten-island-museum
Query: List saved items for user:Alice
Result: Alice's saved items: [{"item":"staten-island-museum"}]
Action: user:Alice unsaves staten-island-museum
Query: List saved items for user:Alice after unsaving
Result: Alice's saved items: []
Operational Principle: Successfully demonstrated saving and unsaving an item.
----- output end -----
Saving Concept - Operational Principle ... ok (993ms)
Saving Concept - Invalid Item ID Error ...
------- output -------

--- Test: Invalid Item ID Error ---
User user:Bob attempts to save an invalid item ID.
Action: user:Bob saves invalid-museum-or-exhibit
Expected Error: Item ID 'invalid-museum-or-exhibit' is not a valid museum or exhibit in the catalog.
Invalid Item ID Error: Successfully handled.
----- output end -----
Saving Concept - Invalid Item ID Error ... ok (781ms)
Saving Concept - Duplicate Save Error ...
------- output -------

--- Test: Duplicate Save Error ---
User user:Alice attempts to save the same item twice.
Action: user:Alice saves alice-austen-house-museum
Action: user:Alice attempts to save alice-austen-house-museum again
Expected Error: User 'user:Alice' has already saved item 'alice-austen-house-museum'.
Duplicate Save Error: Successfully handled.
----- output end -----
Saving Concept - Duplicate Save Error ... ok (847ms)
Saving Concept - Unsave Non-Existent Item Error ...
------- output -------

--- Test: Unsave Non-Existent Item Error ---
User user:Bob attempts to unsave an item they haven't saved.
Action: user:Bob unsaves alice-austen-house-museum
Expected Error: No saved item 'alice-austen-house-museum' found for user 'user:Bob' to unsave.
Unsave Non-Existent Item Error: Successfully handled.
----- output end -----
Saving Concept - Unsave Non-Existent Item Error ... ok (816ms)
Saving Concept - Multiple Saves and Listing with Limit ...
------- output -------

--- Test: Multiple Saves and Listing with Limit ---
User user:Charlie saves multiple items and lists them.
Query: List all saved items for user:Charlie
Result: Charlie's all saved items: ["alice-austen-house-museum","the-story-of-the-house","whitney-museum-of-american-art"]
Query: List 2 most recent saved items for user:Charlie
Result: Charlie's limited saved items: ["alice-austen-house-museum","the-story-of-the-house"]
Multiple Saves and Listing: Successfully demonstrated.
----- output end -----
Saving Concept - Multiple Saves and Listing with Limit ... ok (941ms)
Saving Concept - Mixed User Saves and Independent Lists ...
------- output -------

--- Test: Mixed User Saves and Independent Lists ---
Alice and Bob save items independently.
Action: user:Alice saves staten-island-museum
Action: user:Bob saves staten-island-museum
Action: user:Bob saves whitney-museum-of-american-art
Query: List saved items for user:Alice
Result: Alice's saved items: ["staten-island-museum"]
Query: List saved items for user:Bob
Result: Bob's saved items: ["whitney-museum-of-american-art","staten-island-museum"]
Action: user:Bob unsaves staten-island-museum
Query: List saved items for user:Bob after unsaving one
Result: Bob's remaining saved items: ["whitney-museum-of-american-art"]
Query: List saved items for user:Alice (should be unaffected)
Result: Alice's saved items: ["staten-island-museum"]
Mixed User Saves: Successfully demonstrated independent saving and lists.
----- output end -----
Saving Concept - Mixed User Saves and Independent Lists ... ok (923ms)

ok | 6 passed | 0 failed (5s)
