---
timestamp: 'Sun Oct 19 2025 14:55:54 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_145554.bcc3b7d6.md]]'
content_id: 90f4e3d4bb7a9172b5409871b536cbfa232a75b0c7d797a5b6c14418cc8b7b2d
---

# Make edits:

Check that the ID of item (museum or exhibit) are valid by ensuring they are in the file `new-york-museums.json` which is a database of all museums. This is an example of its format:

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
