---
timestamp: 'Sun Oct 19 2025 13:59:05 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_135905.56c4693c.md]]'
content_id: f48c1aae41350352e2b8daeb41518e17f7c9f9b1c2e7745805ccaaf69250b3c5
---

# Edit:

The tests expect input-validation errors the implementation doesn’t produce. Make sure the tests are in line with the implementation and any errors it raises. Also, the case-sensitivity scenario has a logic bug. In the last block you register both "caseuser" and "CaseUser" with the same password. Then your “expect failure” call authenticates usernameLower with the correct password, which will succeed. If you want to test case-sensitivity, register only "caseuser", then attempt to authenticate "CaseUser" → expect failure.
