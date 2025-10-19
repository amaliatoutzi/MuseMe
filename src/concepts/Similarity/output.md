# Similarity

## Output of running tests:

Similarity Concept: Operational Principle - Rebuild and Query ...
------- output -------

--- Test: Operational Principle - Rebuild and Query ---
Specific high-similarity museum pair not found or suitable. Falling back to generic search.
Testing with museum: alice-austen-house-museum and expected similar: new-york-historical-society
Calling rebuildSimilarity for 'museums' scope...
rebuildSimilarity completed successfully.
Calling neighbors for alice-austen-house-museum with k=5...
Neighbors result for alice-austen-house-museum: {"neighbors":["new-york-historical-society","society-of-illustrators","leslie-lohman-museum-of-art","museum-of-chinese-in-america","museum-of-jewish-heritage-a-living-memorial-to-the-holocaust"]}
new-york-historical-society found in top 5 neighbors.
--- End Test: Operational Principle ---
----- output end -----
Similarity Concept: Operational Principle - Rebuild and Query ... ok (944ms)
Similarity Concept: rebuildSimilarity with 'all' scope and exhibit neighbors ...
------- output -------

--- Test: rebuildSimilarity with 'all' scope and exhibit neighbors ---
Testing with exhibit: alice-austen-and-the-old-house
Calling rebuildSimilarity for 'all' scope...
rebuildSimilarity completed successfully for 'all' scope.
Calling neighbors for exhibit alice-austen-and-the-old-house with k=3...
Neighbors result for alice-austen-and-the-old-house: {"neighbors":["alice-austen-house-museum","audubon-s-birds-of-america","bill-brandt-henry-moore"]}
--- End Test: rebuildSimilarity with 'all' scope ---
----- output end -----
Similarity Concept: rebuildSimilarity with 'all' scope and exhibit neighbors ... ok (1s)
Similarity Concept: neighbors with k < 1 should return error ...
------- output -------

--- Test: neighbors with k < 1 should return error ---
Calling neighbors for alice-austen-house-museum with k=0 (invalid)...
Neighbors result for k=0: {"error":"k must be at least 1."}
--- End Test: neighbors with k < 1 ---
----- output end -----
Similarity Concept: neighbors with k < 1 should return error ... ok (528ms)
Similarity Concept: neighbors with invalid item ID should return error ...
------- output -------

--- Test: neighbors with invalid item ID should return error ---
Calling neighbors for invalid item non-existent-museum with k=1...
Neighbors result for invalid item: {"error":"Item with ID 'non-existent-museum' not found in the catalog."}
--- End Test: neighbors with invalid item ID ---
----- output end -----
Similarity Concept: neighbors with invalid item ID should return error ... ok (526ms)
Similarity Concept: rebuildSimilarity for specific scope only affects that scope ...
------- output -------

--- Test: rebuildSimilarity for specific scope only affects that scope ---
Calling rebuildSimilarity for 'museums' scope...
Museum alice-austen-house-museum has neighbors after 'museums' rebuild.
Exhibit alice-austen-and-the-old-house has NO neighbors yet.
Calling rebuildSimilarity for 'exhibits' scope...
Museum alice-austen-house-museum still has neighbors after 'exhibits' rebuild.
Exhibit alice-austen-and-the-old-house now has neighbors.
--- End Test: rebuildSimilarity scope isolation ---
----- output end -----
Similarity Concept: rebuildSimilarity for specific scope only affects that scope ... ok (1s)
Similarity Concept: rebuildSimilarity handles items with no tags or no common tags ...
------- output -------

--- Test: rebuildSimilarity handles items with no tags or no common tags ---
Could not find suitable museums for 'no common tags' test. Skipping specific neighbor check.
--- End Test: rebuildSimilarity handles no tags/no common tags ---
----- output end -----
Similarity Concept: rebuildSimilarity handles items with no tags or no common tags ... ok (7s)
Similarity Concept: rebuildSimilarity updates existing links atomically ...
------- output -------

--- Test: rebuildSimilarity updates existing links atomically ---
Initial rebuild for 'museums' scope...
Initial links for alice-austen-house-museum: 50
Second rebuild for 'museums' scope...
Links for alice-austen-house-museum after second rebuild: 50
Third rebuild for 'museums' scope...
Updated timestamp verified: 2025-10-19T18:20:03.903Z vs 2025-10-19T18:20:07.838Z
--- End Test: rebuildSimilarity updates existing links atomically ---
----- output end -----
Similarity Concept: rebuildSimilarity updates existing links atomically ... ok (5s)
Similarity Concept: neighbors returns up to k items, sorted by score ...
------- output -------

--- Test: neighbors returns up to k items, sorted by score ---
Specific high-similarity museum pair not found or suitable. Falling back to generic search.
Rebuilding similarity for alice-austen-house-museum in 'museums' scope...
Calling neighbors for alice-austen-house-museum with k=1...
Neighbors (k=1): {"neighbors":["new-york-historical-society"]}
Calling neighbors for alice-austen-house-museum with k=5...
Neighbors (k=5): {"neighbors":["new-york-historical-society","society-of-illustrators","leslie-lohman-museum-of-art","museum-of-chinese-in-america","museum-of-jewish-heritage-a-living-memorial-to-the-holocaust"]}
Sorting verified for k=5 neighbors.
Calling neighbors for alice-austen-house-museum with k=100 (more than available)...
Neighbors (k=100): {"neighbors":["new-york-historical-society","society-of-illustrators","leslie-lohman-museum-of-art","museum-of-chinese-in-america","museum-of-jewish-heritage-a-living-memorial-to-the-holocaust","museum-of-the-city-of-new-york","queens-museum","el-museo-del-barrio","flushing-town-hall","green-wood-cemetery","national-museum-of-the-american-indian-new-york","schomburg-center-for-research-in-black-culture","staten-island-museum","the-jewish-museum","the-metropolitan-museum-of-art","whitney-museum-of-american-art","brooklyn-museum","dyckman-farmhouse-museum","louis-armstrong-house-museum","queens-historical-society","tenement-museum","theodore-roosevelt-birthplace-national-historic-site","asia-society-and-museum","bartow-pell-mansion-museum","edgar-allan-poe-cottage","fraunces-tavern-museum","merchants-house-museum","museum-at-eldridge-street","museum-of-american-finance","national-september-11-memorial-and-museum","new-york-city-fire-museum","new-york-transit-museum","south-street-seaport-museum","the-frick-collection","the-studio-museum-in-harlem","wave-hill","weeksville-heritage-center","american-museum-of-natural-history","bronx-museum-of-art","brooklyn-childrens-museum","cooper-hewitt-smithsonian-design-museum","hispanic-society-museum-and-library","museum-of-modern-art","museum-of-the-moving-image","skyscraper-museum","snug-harbor-cultural-center-and-botanical-garden","the-morgan-library-and-museum","intrepid-sea-air-and-space-museum","moma-ps1","childrens-museum-of-manhattan"]}
--- End Test: neighbors returns up to k items, sorted by score ---
----- output end -----
Similarity Concept: neighbors returns up to k items, sorted by score ... ok (3s)
Similarity Concept: rebuildSimilarity with empty scope (no items matching) returns success without links ...
------- output -------

--- Test: rebuildSimilarity with empty scope ---
--- End Test: rebuildSimilarity with empty scope ---
----- output end -----
Similarity Concept: rebuildSimilarity with empty scope (no items matching) returns success without links ... ok (837ms)

ok | 9 passed | 0 failed (23s)
