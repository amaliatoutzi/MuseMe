---
timestamp: 'Sat Oct 18 2025 17:22:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_172214.a72975ce.md]]'
content_id: b2293df54c4d19e2acfe98ca126d1784acddc8a7de0b6ade3e10d9e443220020
---

# Make edits:

Check that the ID of museum or exhibit are valid by ensuring they are in the file `new-york-museums.json` which is a database of all museums. This is an example of its format:

```plaintext
[
  {
    "id": "alice-austen-house-museum",
    "name": "Alice Austen House Museum",
    "address": "2 Hylan Boulevard",
    "zip": "10305",
    "borough": "Staten Island",
    "location": {
      "lat": 40.5975,
      "lon": -74.0732
    },
    "website": "https://aliceausten.org/",
    "tags": [
      "Photography",
      "History",
      "American",
      "Art"
    ],
    "exhibits": [
      {
        "id": "alice-austen-and-the-old-house",
        "name": "Alice Austen and The Old House",
        "type": "Permanent"
      },
      {
        "id": "the-story-of-the-house",
        "name": "The Story of the House",
        "type": "Permanent"
      }
    ]
  },
]
```
