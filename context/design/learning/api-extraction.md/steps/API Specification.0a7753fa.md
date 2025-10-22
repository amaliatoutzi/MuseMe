---
timestamp: 'Tue Oct 21 2025 12:06:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_120629.8f34776d.md]]'
content_id: 0a7753fa30d8f881ec08ddd80cbe6f7331499ca1dceffc4d3ff0b7ea18970479
---

# API Specification: Similarity Concept

**Purpose:** store item-to-item relatedness usable by ranking flows

***

## API Endpoints

### POST /api/Similarity/rebuildSimilarity

**Description:** Recomputes and updates item-to-item similarity links for a specified scope.

**Requirements:**

* None explicit.

**Effects:**

* (Re)computes `SimilarityLinks` for the specified scope (e.g., all museums or exhibits) using a content-based similarity algorithm.
* Sets `updatedAt := now` for all new links.

**Request Body:**

```json
{
  "scope?": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Similarity/neighbors

**Description:** Retrieves up to `k` most similar neighbor ItemIds for a given source item.

**Requirements:**

* `k` must be greater than or equal to 1.
* `item` must exist in the catalog.

**Effects:**

* Returns up to `k` items with the highest similarity score where the `from` item matches the provided `item`.

**Request Body:**

```json
{
  "item": "string",
  "k": "number"
}
```

**Success Response Body (Action):**

```json
{
  "neighbors": [
    "string"
  ]
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
