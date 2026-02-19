/**
 * Scoring Service
 * Core scoring functions for the recommendation algorithm
 */

const Follow = require("../models/Follow");

/**
 * Calculate engagement quality score (age-normalized engagement)
 * @param {Object} item - Work or Post object
 * @param {string} type - 'work' or 'post'
 * @returns {number} Normalized engagement score
 */
function engagementQuality(item, type) {
  if (type === "work") {
    const publishedAt = item.publishedAt || item.createdAt || new Date();
    const ageHours = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
    const ageFactor = Math.max(1, ageHours / 24); // days old, minimum 1

    // Weight: bookmarks > loves > likes
    const rawScore =
      (item.likesCount || 0) * 1 +
      (item.lovesCount || 0) * 2 +
      (item.bookmarksCount || 0) * 3;

    // Normalize by age and apply log scale to prevent outliers from dominating
    const normalized = rawScore / ageFactor;
    return Math.log1p(normalized); // log(1 + x) to handle zeros smoothly
  }

  if (type === "post") {
    const createdAt = item.createdAt || new Date();
    const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    const ageFactor = Math.max(1, ageHours);

    // Weight: comments > shares > likes
    const rawScore =
      (item.likesCount || 0) * 1 +
      (item.sharesCount || 0) * 1.5 +
      (item.commentsCount || 0) * 2;

    const normalized = rawScore / ageFactor;
    return Math.log1p(normalized);
  }

  if (type === "user") {
    // For users, engagement quality is based on their works' aggregate engagement
    const stats = item.stats || {};
    const rawScore = (stats.followersCount || 0) * 2 + (stats.worksCount || 0) * 1;
    return Math.log1p(rawScore);
  }

  return 0;
}

/**
 * Calculate freshness score with exponential decay
 * @param {Date} publishedAt - Publication date
 * @param {number} halfLifeHours - Hours until score is halved (default: 72 for works)
 * @returns {number} Score between 0 and 1
 */
function freshnessScore(publishedAt, halfLifeHours = 72) {
  if (!publishedAt) return 0.5;

  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  // Exponential decay: score = e^(-ageHours / halfLifeHours)
  return Math.exp(-ageHours / halfLifeHours);
}

/**
 * Calculate interest match score based on user profile
 * @param {Object} item - Work object
 * @param {Object} userProfile - User's interests and affinities
 * @returns {number} Score between 0 and 1
 */
function interestMatch(item, userProfile) {
  if (!userProfile || !userProfile.interests) return 0;

  let score = 0;
  const interests = userProfile.interests;

  // Genre match (0 or 0.4)
  const userGenres = (interests.genres || []).map((g) => g.toLowerCase());
  if (item.genre && userGenres.includes(item.genre.toLowerCase())) {
    score += 0.4;
  }

  // Fandom match (0 or 0.4)
  const userFandoms = (interests.fandoms || []).map((f) => f.toLowerCase());
  if (item.fandom && userFandoms.includes(item.fandom.toLowerCase())) {
    score += 0.4;
  }

  // Tag overlap (0 to 0.2)
  const recData = userProfile.recommendationData || {};
  const userTags = (recData.tagAffinities || []).map((t) =>
    typeof t === "string" ? t.toLowerCase() : (t.tag || "").toLowerCase()
  );
  const itemTags = (item.tags || []).map((t) => t.toLowerCase());
  const tagOverlap = itemTags.filter((t) => userTags.includes(t)).length;
  score += Math.min(0.2, tagOverlap * 0.05);

  return score;
}

/**
 * Calculate social proximity score
 * @param {string} itemAuthorId - Author's user ID
 * @param {string} userId - Current user's ID
 * @param {Object} followCache - Optional cache of follow relationships
 * @returns {Promise<number>} Score between 0 and 1
 */
async function socialProximity(itemAuthorId, userId, followCache = null) {
  if (!userId || !itemAuthorId) return 0;
  if (itemAuthorId.toString() === userId.toString()) return 0;

  // Check cache first
  if (followCache) {
    const isFollowing = followCache.has(itemAuthorId.toString());
    return isFollowing ? 1.0 : 0;
  }

  // Direct follow check
  const isFollowing = await Follow.exists({
    followerId: userId,
    followeeId: itemAuthorId,
  });

  return isFollowing ? 1.0 : 0;
}

/**
 * Build a follow cache for batch social proximity calculations
 * @param {string} userId - User's ID
 * @returns {Promise<Set>} Set of followed user IDs
 */
async function buildFollowCache(userId) {
  if (!userId) return new Set();

  const follows = await Follow.find({ followerId: userId }).select("followeeId");
  return new Set(follows.map((f) => f.followeeId.toString()));
}

/**
 * Generate exploration boost (random novelty injection)
 * @param {number} maxBoost - Maximum boost value (default: 0.15)
 * @returns {number} Random boost between 0 and maxBoost
 */
function explorationBoost(maxBoost = 0.15) {
  return Math.random() * maxBoost;
}

/**
 * Calculate new item boost for cold start
 * @param {Object} item - Work or Post object
 * @returns {number} Boost value (0 or 0.2)
 */
function newItemBoost(item) {
  const publishedAt = item.publishedAt || item.createdAt;
  if (!publishedAt) return 0;

  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  const views = item.views || 0;

  // Boost items less than 48 hours old with fewer than 50 views
  if (ageHours < 48 && views < 50) {
    return 0.2;
  }

  return 0;
}

/**
 * Calculate interest overlap between user and creator
 * @param {Object} creator - Creator user object
 * @param {Object} userProfile - Current user profile
 * @returns {number} Overlap score between 0 and 1
 */
function interestOverlap(creator, userProfile) {
  if (!userProfile || !userProfile.interests) return 0;
  if (!creator || !creator.interests) return 0;

  let score = 0;
  const userInterests = userProfile.interests;
  const creatorInterests = creator.interests;

  // Genre overlap
  const userGenres = new Set((userInterests.genres || []).map((g) => g.toLowerCase()));
  const creatorGenres = (creatorInterests.genres || []).map((g) => g.toLowerCase());
  const genreOverlap = creatorGenres.filter((g) => userGenres.has(g)).length;
  score += Math.min(0.5, genreOverlap * 0.15);

  // Fandom overlap
  const userFandoms = new Set((userInterests.fandoms || []).map((f) => f.toLowerCase()));
  const creatorFandoms = (creatorInterests.fandoms || []).map((f) => f.toLowerCase());
  const fandomOverlap = creatorFandoms.filter((f) => userFandoms.has(f)).length;
  score += Math.min(0.5, fandomOverlap * 0.15);

  return score;
}

/**
 * Apply diversity re-ranking to prevent author/genre clustering
 * @param {Array} candidates - Scored candidates
 * @param {Object} options - Configuration options
 * @returns {Array} Re-ranked candidates
 */
function diversityRerank(candidates, options = {}) {
  const { maxPerAuthor = 2, maxPerGenre = 5, limit = 50 } = options;

  const authorCounts = {};
  const genreCounts = {};
  const result = [];

  for (const item of candidates) {
    if (result.length >= limit) break;

    const authorId = (item.authorId || item._id || "").toString();
    const genre = (item.genre || "unknown").toLowerCase();

    // Check author cap
    if ((authorCounts[authorId] || 0) >= maxPerAuthor) continue;

    // Check genre cap
    if ((genreCounts[genre] || 0) >= maxPerGenre) continue;

    // Accept this item
    authorCounts[authorId] = (authorCounts[authorId] || 0) + 1;
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    result.push(item);
  }

  return result;
}

/**
 * Scoring weights for different modes and surfaces
 */
const SCORING_WEIGHTS = {
  // Logged-out weights
  logged_out: {
    works: {
      engagement_quality: 0.5,
      freshness: 0.35,
      exploration: 0.15,
    },
    posts: {
      engagement_quality: 0.55,
      freshness: 0.4,
      exploration: 0.05,
    },
  },
  // Logged-in weights
  logged_in: {
    works: {
      interest_match: 0.3,
      engagement_quality: 0.25,
      freshness: 0.2,
      social_proximity: 0.15,
      exploration: 0.1,
    },
    posts: {
      interest_match: 0.25,
      engagement_quality: 0.25,
      freshness: 0.3,
      social_proximity: 0.15,
      exploration: 0.05,
    },
    people: {
      interest_overlap: 0.3,
      engagement_quality: 0.25,
      freshness: 0.1,
      social_proximity: 0.25,
      exploration: 0.1,
    },
  },
  // Cold start (new user) - higher exploration weight
  cold_start: {
    works: {
      engagement_quality: 0.35,
      freshness: 0.25,
      exploration: 0.25,
      interest_match: 0.15,
    },
    posts: {
      engagement_quality: 0.4,
      freshness: 0.35,
      exploration: 0.15,
      interest_match: 0.1,
    },
    people: {
      engagement_quality: 0.35,
      freshness: 0.15,
      exploration: 0.25,
      interest_overlap: 0.25,
    },
  },
};

/**
 * Freshness half-lives by content type (in hours)
 */
const FRESHNESS_HALF_LIVES = {
  works: 168, // 1 week
  posts: 24, // 1 day
  people: 336, // 2 weeks
};

module.exports = {
  engagementQuality,
  freshnessScore,
  interestMatch,
  socialProximity,
  buildFollowCache,
  explorationBoost,
  newItemBoost,
  interestOverlap,
  diversityRerank,
  SCORING_WEIGHTS,
  FRESHNESS_HALF_LIVES,
};
