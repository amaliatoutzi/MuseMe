/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Feel free to delete these example inclusions
  "/api/LikertSurvey/_getSurveyQuestions": "this is a public query",
  "/api/LikertSurvey/_getSurveyResponses": "responses are public",
  "/api/LikertSurvey/_getRespondentAnswers": "answers are visible",
  "/api/LikertSurvey/submitResponse": "allow anyone to submit response",
  "/api/LikertSurvey/updateResponse": "allow anyone to update their response",
  // Removed: authenticate/register are excluded to enable session orchestration via syncs
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",
  "/api/Following/_areFriends",
  "/api/Following/_getFollowees",
  "/api/Following/_getFollowers",
  "/api/Following/_getFollows",
  "/api/Following/_getUserIdByUsername",
  "/api/Following/_getUsernameByUserId",
  "/api/Following/follow",
  "/api/Following/unfollow",
  "/api/LikertSurvey/_getRespondentAnswers",
  "/api/LikertSurvey/_getSurveyQuestions",
  "/api/LikertSurvey/_getSurveyResponses",
  "/api/LikertSurvey/submitResponse",
  "/api/LikertSurvey/updateResponse",
  "/api/Profile/_getProfile",
  "/api/Profile/addName",
  "/api/Profile/addProfilePicture",
  "/api/Profile/editProfilePicture",
  "/api/Profile/isBlank",
  "/api/Profile/removeProfilePicture",
  "/api/Reviewing/_getReview",
  "/api/Reviewing/_getReviewsByItem",
  "/api/Reviewing/_getReviewsByUser",
  "/api/Reviewing/_isValidItem",
  "/api/Reviewing/clearReview",
  "/api/Reviewing/init",
  // Reviewing.upsertReview excluded to enforce required note & auth via syncs
  "/api/Reviewing/upsertReview",
  "/api/Saving/_listSaved",
  "/api/Saving/saveItem",
  "/api/Saving/unsaveItem",
  "/api/Similarity/neighbors",
  "/api/Similarity/rebuildSimilarity",
  "/api/UserPreferences/_getPreferencesForUser",
  "/api/UserPreferences/_getUsersByPreferenceTag",
  "/api/UserPreferences/addPreference",
  "/api/UserPreferences/removePreference",
  // Sessioning: handle via Requesting + syncs for auth/response orchestration
  "/api/Sessioning/create",
  "/api/Sessioning/delete",
  "/api/Sessioning/_getUser",
  // Exclude to orchestrate sessions in syncs
  "/api/UserAuthentication/authenticate",
  "/api/UserAuthentication/register",
  // (Removed login/registerAndLogin wrappers; concept handles sessions directly)
  "/api/Visit/_getEntriesByVisit",
  "/api/Visit/_getEntry",
  "/api/Visit/_getVisit",
  "/api/Visit/_getVisitsByUser",
  // Visit.addEntry excluded to enforce required note, photos, rating via syncs
  "/api/Visit/addEntry",
  "/api/Visit/createVisit",
  "/api/Visit/editEntry",
  "/api/Visit/removeEntry",
  // Legacy granular update endpoints are excluded to avoid bypassing combined validation
  "/api/Visit/updateEntryNote",
  "/api/Visit/updateEntryPhotos",
  "/api/Visit/updateEntryRating",
  // Removed enrichment endpoints (no longer supported; strict single addEntry)
];
