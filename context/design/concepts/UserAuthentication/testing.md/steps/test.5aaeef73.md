---
timestamp: 'Sun Oct 19 2025 13:45:02 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_134502.7bd87c7b.md]]'
content_id: 5aaeef73884c5b0147b8d2377ebffcbb24ea99f671fe317f38b66d526598ceb2
---

# test: userAuthentication

Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Some more details about the test cases you should include:

* Operational principle. A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example.
* Interesting scenarios. Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors.
* Number required. For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios.
* No state setup. Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state.
