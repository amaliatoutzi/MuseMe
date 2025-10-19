# Following

## Output of running tests:

FollowingConcept: Operational Principle - Mutual Follows Grant Friendship ...
------- output -------
--- Test: Operational Principle ---
Action: Alice (user:Alice) follows Bob (user:Bob)
Query: Alice's follow of Bob found: {"_id":"0199fdc9-6979-7b56-bbd6-293fbb93ff92","follower":"user:Alice","followee":"user:Bob","createdAt":"2025-10-19T18:44:19.449Z"}
Query: Alice and Bob are friends? false
Action: Bob (user:Bob) follows Alice (user:Alice)
Query: Bob's follow of Alice found: {"_id":"0199fdc9-69ef-7b88-af8a-15e303333a5f","follower":"user:Bob","followee":"user:Alice","createdAt":"2025-10-19T18:44:19.567Z"}
Query: Alice and Bob are friends? true
--- Operational Principle Test Complete ---
----- output end -----
FollowingConcept: Operational Principle - Mutual Follows Grant Friendship ... ok (1s)
FollowingConcept: Basic Follow/Unfollow and Querying ...
------- output -------
--- Test: Basic Follow/Unfollow ---
Action: Alice (user:Alice) follows Charlie (user:Charlie)
Query: Alice follows Charlie? Yes ({"_id":"0199fdc9-6d11-7a7b-a181-3e920c025cf4","follower":"user:Alice","followee":"user:Charlie","createdAt":"2025-10-19T18:44:20.369Z"})
Query: Alice's followees: ["user:Charlie"]
Query: Charlie's followers: ["user:Alice"]
Action: Alice (user:Alice) unfollows Charlie (user:Charlie)
Query: Alice follows Charlie? No
Query: Alice's followees: []
Query: Charlie's followers: []
--- Basic Follow/Unfollow Test Complete ---
----- output end -----
FollowingConcept: Basic Follow/Unfollow and Querying ... ok (880ms)
FollowingConcept: Follow Precondition Violations ...
------- output -------
--- Test: Follow Precondition Violations ---
Action: Alice (user:Alice) tries to follow herself
Result: {"error":"A user cannot follow themselves."}
Action: Alice (user:Alice) follows Bob (user:Bob)
Result: {}
Action: Alice (user:Alice) tries to follow Bob (user:Bob) again
Result: {"error":"User user:Alice is already following user user:Bob."}
--- Follow Precondition Violations Test Complete ---
----- output end -----
FollowingConcept: Follow Precondition Violations ... ok (861ms)
FollowingConcept: Unfollow Precondition Violations ...
------- output -------
--- Test: Unfollow Precondition Violations ---
Action: Alice (user:Alice) tries to unfollow Bob (user:Bob) (not following)
Result: {"error":"User user:Alice is not following user user:Bob."}
(Setup: Alice follows Charlie)
Action: Bob (user:Bob) tries to unfollow Charlie (user:Charlie) (not following)
Result: {"error":"User user:Bob is not following user user:Charlie."}
--- Unfollow Precondition Violations Test Complete ---
----- output end -----
FollowingConcept: Unfollow Precondition Violations ... ok (809ms)
FollowingConcept: Asymmetric Follow and Friendship Status ...
------- output -------
--- Test: Asymmetric Follow ---
Action: David (user:David) follows Charlie (user:Charlie)
(David follows Charlie)
Query: David and Charlie are friends? false
Query: David's followees: ["user:Charlie"]
Query: Charlie's followers: ["user:David"]
Action: Charlie (user:Charlie) follows David (user:David)
(Charlie follows David)
Query: David and Charlie are friends? true
--- Asymmetric Follow Test Complete ---
----- output end -----
FollowingConcept: Asymmetric Follow and Friendship Status ... ok (992ms)
FollowingConcept: Multiple Follows and Complex Scenarios ...
------- output -------
--- Test: Multiple Follows and Complex Scenarios ---
Action: Alice follows Bob, Charlie, David
Query: Alice's followees: ["user:Bob","user:Charlie","user:David"]
Action: Bob follows Alice, Charlie
Query: Bob's followees: ["user:Alice","user:Charlie"]
Query: Alice & Bob friends? true
Query: Alice & Charlie friends? false
Query: Charlie's followers: ["user:Alice","user:Bob"]
Action: Alice unfollows David
Query: Alice's followees: ["user:Bob","user:Charlie"]
Query: David's followers: []
--- Multiple Follows and Complex Scenarios Test Complete ---
----- output end -----
FollowingConcept: Multiple Follows and Complex Scenarios ... ok (1s)

ok | 6 passed | 0 failed (6s)
