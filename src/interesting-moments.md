# Interesting Moments

- **Confirming preset tags belonged outside UserPreferences** — Running the confirmation workflow for UserPreferences (confirm.md) made it clear the concept should not manage preset tag state. Removing the extra collection simplified the concept and aligned it with the rubric’s independence requirement.
  * [updated implementation](../context/design/concepts/UserPreferences/testing.md/steps/response.b66749f6.md)
  * [suggestion](../context/design/concepts/UserPreferences/confirm.md/steps/response.cf8ce21d.md).

- **Query return contract enforced by Following confirm** — The Following confirm.md highlighted that my queries were returning single documents and booleans instead of arrays of named dictionaries, prompting a sweep across concepts to normalize query shapes. This was interesting since the background had clear instructions to only return arrays of dictionaries in queries.
  * [suggestion about query returns](../context/design/concepts/Following/confirm.md/steps/response.90d546c8.md)
- **Neighbors sort tie-break in Similarity** — Inspecting the Similarity confirm.md and looking at failed testcases surfaced that I was only sorting neighbors by score. adding a secondary sort on the neighbor ID stabilized deterministic outputs.
  * [sorting concern](../context/design/concepts/Similarity/confirm.md/steps/response.c9a9deba.md)
- **Test prompts unpredictably bundled implementations** — Multiple runs of the Visit testing prompt sometimes yielded only tests and other times returned the entire concept implementation alongside the tests, forcing manual pruning before committing. This was surprising as the prompt was not changed to make such an instruction.
  * [tests snapshot](../context/design/concepts/Visit/testing.md/steps/file.3cc91aec.md)
  * [mixed-output snapshot](../context/design/concepts/Visit/testing.md/steps/file.85071dd5.md)
- **Assumed helpers and phantom museums in Saving tests** — The generated Saving tests imported a nonexistent `toID` helper and exercised IDs like `american-folk-art-museum`, which weren’t present in my catalog, so I rewrote those by hand.
  * [toID method and phantom museums](../context/design/concepts/Saving/testing.md/steps/response.4c7cea59.md)
- **Hallucinated Google data in museum catalog** — Early attempts to build the New York museum catalog invented ratings, review counts, and Google URLs that couldn’t be verified, so I stripped those fields and kept only data I could confirm. This was interesting as I had specifically instructed multiple times in the promopt to only use links that can be verified. I thnk the cause behind this was that the dates Context was listing were from 2024, so perhaps it was out of date. Still, the numbers did not add up as it listed for example 800 reviews when now there are 200.
  * [hallucinated dataset](../context/design/database/new-york-museums.md/steps/response.30bbeef1.md)
  * [sanitized revision](../context/design/database/new-york-museums.md/steps/response.3ad43cac.md)
- **Simpler museum catalog wiring** — Context recommended resolving an absolute path and running an async loader before validating IDs, but importing the JSON once and populating sets inline kept my concepts lighter. I found this interesting as it came up with a really complex way to implement this, whereas I thought the solution was more straightforward.
  * [loader suggestion](../context/design/concepts/Reviewing/testing.md/steps/response.731a4777.md)
  * [lean import](../src/concepts/Similarity/SimilarityConcept.ts)
