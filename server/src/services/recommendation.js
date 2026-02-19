/**
 * Recommendation Service
 * Candidate generation and ranking for personalized discovery
 */

const Work = require("../models/Work");
const Post = require("../models/Post");
const User = require("../models/User");
const Bookmark = require("../models/Bookmark");
const Follow = require("../models/Follow");
const {
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
} = require("./scoring");

/**
 * Apply policy gates to filter out unwanted content
 * @param {Array} candidates - Raw candidates
 * @param {Object} user - Current user (optional)
 * @returns {Array} Filtered candidates
 */
function applyPolicyGates(candidates, user = null) {
  if (!user) return candidates;

  const blockedUsers = new Set((user.blockedUsers || []).map((id) => id.toString()));
  const mutedUsers = new Set((user.mutedUsers || []).map((id) => id.toString()));
  const hiddenPosts = new Set((user.hiddenPosts || []).map((id) => id.toString()));

  return candidates.filter((item) => {
    const authorId = (item.authorId || "").toString();
    const itemId = item._id.toString();

    // Filter blocked users
    if (authorId && blockedUsers.has(authorId)) return false;

    // Filter muted users
    if (authorId && mutedUsers.has(authorId)) return false;

    // Filter hidden posts
    if (hiddenPosts.has(itemId)) return false;

    return true;
  });
}

/**
 * Get work candidates for logged-out users
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Candidate works
 */
async function getLoggedOutWorkCandidates(options = {}) {
  const { limit = 50, period = "week" } = options;

  // Calculate date threshold
  const dateThreshold = new Date();
  if (period === "day") dateThreshold.setDate(dateThreshold.getDate() - 1);
  else if (period === "week") dateThreshold.setDate(dateThreshold.getDate() - 7);
  else if (period === "month") dateThreshold.setMonth(dateThreshold.getMonth() - 1);

  const baseQuery = {
    privacy: "Public",
    status: "published",
  };

  // Get trending recent works (50%)
  const trendingWorks = await Work.find({
    ...baseQuery,
    publishedAt: { $gte: dateThreshold },
  })
    .sort({ views: -1, likesCount: -1 })
    .limit(Math.ceil(limit * 0.5))
    .select("-chapters")
    .lean();

  // Get newest quality works (30%)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const newestWorks = await Work.find({
    ...baseQuery,
    publishedAt: { $gte: thirtyDaysAgo },
    $or: [{ likesCount: { $gte: 1 } }, { bookmarksCount: { $gte: 1 } }],
  })
    .sort({ publishedAt: -1 })
    .limit(Math.ceil(limit * 0.3))
    .select("-chapters")
    .lean();

  // Get featured/editorial picks (20%)
  const featuredWorks = await Work.find({
    ...baseQuery,
    featured: true,
  })
    .sort({ featuredAt: -1 })
    .limit(Math.ceil(limit * 0.2))
    .select("-chapters")
    .lean();

  // Merge and deduplicate
  const seenIds = new Set();
  const candidates = [];

  for (const work of [...trendingWorks, ...newestWorks, ...featuredWorks]) {
    const id = work._id.toString();
    if (!seenIds.has(id)) {
      seenIds.add(id);
      candidates.push(work);
    }
  }

  return candidates;
}

/**
 * Get work candidates for logged-in users
 * @param {Object} user - Current user
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Candidate works
 */
async function getLoggedInWorkCandidates(user, options = {}) {
  const { limit = 100 } = options;
  const userId = user._id;
  const userInterests = user.interests || {};

  // Get user's bookmarked work IDs to exclude
  const bookmarkedWorks = await Bookmark.find({ userId, type: "work" }).select("workId");
  const bookmarkedIds = bookmarkedWorks.map((b) => b.workId).filter(Boolean);

  // Get authors the user follows
  const follows = await Follow.find({ followerId: userId }).select("followeeId");
  const followedAuthorIds = follows.map((f) => f.followeeId);

  // Base query for published, public works
  const baseQuery = {
    privacy: "Public",
    status: "published",
    authorId: { $ne: userId },
    _id: { $nin: bookmarkedIds },
  };

  const candidates = [];
  const seenIds = new Set();

  const addWorks = (works) => {
    for (const work of works) {
      const id = work._id.toString();
      if (!seenIds.has(id)) {
        seenIds.add(id);
        candidates.push(work);
      }
    }
  };

  // 1. Works matching user's selected genres
  const userGenres = userInterests.genres || [];
  if (userGenres.length > 0) {
    const genreRegexes = userGenres.map((g) => new RegExp(`^${escapeRegex(g)}$`, "i"));
    const genreWorks = await Work.find({
      ...baseQuery,
      genre: { $in: genreRegexes },
    })
      .sort({ publishedAt: -1 })
      .limit(Math.ceil(limit * 0.3))
      .select("-chapters")
      .lean();
    addWorks(genreWorks);
  }

  // 2. Works matching user's selected fandoms
  const userFandoms = userInterests.fandoms || [];
  if (userFandoms.length > 0) {
    const fandomRegexes = userFandoms.map((f) => new RegExp(`^${escapeRegex(f)}$`, "i"));
    const fandomWorks = await Work.find({
      ...baseQuery,
      fandom: { $in: fandomRegexes },
    })
      .sort({ publishedAt: -1 })
      .limit(Math.ceil(limit * 0.3))
      .select("-chapters")
      .lean();
    addWorks(fandomWorks);
  }

  // 3. Works from authors the user follows
  if (followedAuthorIds.length > 0) {
    const followedWorks = await Work.find({
      ...baseQuery,
      authorId: { $in: followedAuthorIds },
    })
      .sort({ publishedAt: -1 })
      .limit(Math.ceil(limit * 0.25))
      .select("-chapters")
      .lean();
    addWorks(followedWorks);
  }

  // 4. Works with similar tags to bookmarked works
  if (bookmarkedIds.length > 0) {
    const bookmarkedWorksData = await Work.find({
      _id: { $in: bookmarkedIds.slice(0, 10) },
    }).select("tags");

    const tagSet = new Set();
    bookmarkedWorksData.forEach((w) => {
      (w.tags || []).forEach((t) => tagSet.add(t));
    });

    if (tagSet.size > 0) {
      const tagArray = Array.from(tagSet).slice(0, 20);
      const similarWorks = await Work.find({
        ...baseQuery,
        tags: { $in: tagArray },
      })
        .sort({ publishedAt: -1 })
        .limit(Math.ceil(limit * 0.2))
        .select("-chapters")
        .lean();
      addWorks(similarWorks);
    }
  }

  // 5. Fill with trending if not enough candidates
  if (candidates.length < limit * 0.5) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - 7);

    const trendingWorks = await Work.find({
      ...baseQuery,
      publishedAt: { $gte: dateThreshold },
    })
      .sort({ views: -1 })
      .limit(Math.ceil(limit * 0.3))
      .select("-chapters")
      .lean();
    addWorks(trendingWorks);
  }

  return candidates;
}

/**
 * Get post candidates for logged-out users
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Candidate posts
 */
async function getLoggedOutPostCandidates(options = {}) {
  const { limit = 50 } = options;

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  // Get recent engaging posts
  const posts = await Post.find({
    createdAt: { $gte: oneDayAgo },
  })
    .populate("authorId", "username displayName avatarUrl")
    .sort({ likesCount: -1, commentsCount: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return posts;
}

/**
 * Get post candidates for logged-in users
 * @param {Object} user - Current user
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Candidate posts
 */
async function getLoggedInPostCandidates(user, options = {}) {
  const { limit = 100 } = options;
  const userId = user._id;

  // Get authors the user follows
  const follows = await Follow.find({ followerId: userId }).select("followeeId");
  const followedAuthorIds = follows.map((f) => f.followeeId);

  const candidates = [];
  const seenIds = new Set();

  const addPosts = (posts) => {
    for (const post of posts) {
      const id = post._id.toString();
      if (!seenIds.has(id)) {
        seenIds.add(id);
        candidates.push(post);
      }
    }
  };

  // 1. Posts from followed users (priority)
  if (followedAuthorIds.length > 0) {
    const followedPosts = await Post.find({
      authorId: { $in: followedAuthorIds },
    })
      .populate("authorId", "username displayName avatarUrl")
      .sort({ createdAt: -1 })
      .limit(Math.ceil(limit * 0.5))
      .lean();
    addPosts(followedPosts);
  }

  // 2. Recent engaging posts
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const engagingPosts = await Post.find({
    authorId: { $ne: userId },
    createdAt: { $gte: threeDaysAgo },
  })
    .populate("authorId", "username displayName avatarUrl")
    .sort({ likesCount: -1, commentsCount: -1 })
    .limit(Math.ceil(limit * 0.3))
    .lean();
  addPosts(engagingPosts);

  // 3. Recent posts for discovery
  const recentPosts = await Post.find({
    authorId: { $ne: userId },
  })
    .populate("authorId", "username displayName avatarUrl")
    .sort({ createdAt: -1 })
    .limit(Math.ceil(limit * 0.2))
    .lean();
  addPosts(recentPosts);

  return candidates;
}

/**
 * Get people candidates for discovery
 * @param {Object} user - Current user (optional)
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Candidate users
 */
async function getPeopleCandidates(user, options = {}) {
  const { limit = 50 } = options;

  const baseQuery = {
    "preferences.visibility": { $ne: "invisible" },
    "stats.worksCount": { $gte: 1 }, // Only recommend creators with works
  };

  // Exclude current user
  if (user) {
    baseQuery._id = { $ne: user._id };

    // Exclude already followed users
    const follows = await Follow.find({ followerId: user._id }).select("followeeId");
    const followedIds = follows.map((f) => f.followeeId);
    if (followedIds.length > 0) {
      baseQuery._id = { $ne: user._id, $nin: followedIds };
    }
  }

  const candidates = await User.find(baseQuery)
    .sort({ "stats.followersCount": -1, createdAt: -1 })
    .limit(limit)
    .select("username displayName avatarUrl bio stats interests presence")
    .lean();

  return candidates;
}

/**
 * Score and rank candidates
 * @param {Array} candidates - Raw candidates
 * @param {string} mode - 'logged_out', 'logged_in', or 'cold_start'
 * @param {string} surface - 'works', 'posts', or 'people'
 * @param {Object} user - Current user (optional)
 * @returns {Promise<Array>} Scored and ranked candidates
 */
async function scoreAndRank(candidates, mode, surface, user = null) {
  const weights = SCORING_WEIGHTS[mode]?.[surface] || SCORING_WEIGHTS.logged_out.works;
  const halfLife = FRESHNESS_HALF_LIVES[surface] || 72;

  // Build follow cache for batch processing
  const followCache = user ? await buildFollowCache(user._id) : null;

  // Score each candidate
  const scoredCandidates = await Promise.all(
    candidates.map(async (item) => {
      let score = 0;

      // Engagement quality
      if (weights.engagement_quality) {
        const eqScore = engagementQuality(item, surface === "people" ? "user" : surface.slice(0, -1));
        score += weights.engagement_quality * eqScore;
      }

      // Freshness
      if (weights.freshness) {
        const publishedAt = item.publishedAt || item.createdAt || item.presence?.lastActiveAt;
        const fScore = freshnessScore(publishedAt, halfLife);
        score += weights.freshness * fScore;
      }

      // Interest match (only for logged-in users with works/posts)
      if (weights.interest_match && user && surface !== "people") {
        const imScore = interestMatch(item, user);
        score += weights.interest_match * imScore;
      }

      // Interest overlap (for people recommendations)
      if (weights.interest_overlap && user && surface === "people") {
        const ioScore = interestOverlap(item, user);
        score += weights.interest_overlap * ioScore;
      }

      // Social proximity
      if (weights.social_proximity && user) {
        const authorId = surface === "people" ? item._id : item.authorId;
        const spScore = await socialProximity(authorId, user._id, followCache);
        score += weights.social_proximity * spScore;
      }

      // Exploration boost
      if (weights.exploration) {
        score += weights.exploration * explorationBoost();
      }

      // New item boost (for works/posts only)
      if (surface !== "people") {
        score += newItemBoost(item);
      }

      return { item, score };
    })
  );

  // Sort by score descending
  scoredCandidates.sort((a, b) => b.score - a.score);

  // Extract items
  return scoredCandidates.map((sc) => sc.item);
}

/**
 * Main recommendation function for works
 * @param {Object} user - Current user (optional)
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Recommended works with metadata
 */
async function getWorkRecommendations(user, options = {}) {
  const { limit = 20, period = "week" } = options;

  let candidates;
  let mode;

  if (!user) {
    // Logged-out mode
    candidates = await getLoggedOutWorkCandidates({ limit: limit * 3, period });
    mode = "logged_out";
  } else {
    // Check if cold start (new user with few interactions)
    const hasInterests =
      user.interests?.genres?.length > 0 || user.interests?.fandoms?.length > 0;
    const follows = await Follow.countDocuments({ followerId: user._id });

    if (!hasInterests && follows < 3) {
      mode = "cold_start";
    } else {
      mode = "logged_in";
    }

    candidates = await getLoggedInWorkCandidates(user, { limit: limit * 3 });
  }

  // Apply policy gates
  candidates = applyPolicyGates(candidates, user);

  // Score and rank
  const ranked = await scoreAndRank(candidates, mode, "works", user);

  // Apply diversity re-ranking
  const diverseResults = diversityRerank(ranked, {
    maxPerAuthor: 2,
    maxPerGenre: 5,
    limit,
  });

  return {
    works: diverseResults,
    mode,
    personalized: mode !== "logged_out",
  };
}

/**
 * Main recommendation function for posts
 * @param {Object} user - Current user (optional)
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Recommended posts with metadata
 */
async function getPostRecommendations(user, options = {}) {
  const { limit = 20 } = options;

  let candidates;
  let mode;

  if (!user) {
    candidates = await getLoggedOutPostCandidates({ limit: limit * 3 });
    mode = "logged_out";
  } else {
    const follows = await Follow.countDocuments({ followerId: user._id });
    mode = follows < 3 ? "cold_start" : "logged_in";
    candidates = await getLoggedInPostCandidates(user, { limit: limit * 3 });
  }

  // Apply policy gates
  candidates = applyPolicyGates(candidates, user);

  // Score and rank
  const ranked = await scoreAndRank(candidates, mode, "posts", user);

  // Apply diversity re-ranking
  const diverseResults = diversityRerank(ranked, {
    maxPerAuthor: 3, // Allow more posts per author
    maxPerGenre: 10, // Posts don't have genres, so this is less relevant
    limit,
  });

  return {
    posts: diverseResults,
    mode,
    personalized: mode !== "logged_out",
  };
}

/**
 * Main recommendation function for people
 * @param {Object} user - Current user
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Recommended users with metadata
 */
async function getPeopleRecommendations(user, options = {}) {
  const { limit = 20 } = options;

  if (!user) {
    // For logged-out, just return popular creators
    const users = await User.find({
      "preferences.visibility": { $ne: "invisible" },
      "stats.worksCount": { $gte: 1 },
    })
      .sort({ "stats.followersCount": -1 })
      .limit(limit)
      .select("username displayName avatarUrl bio stats interests")
      .lean();

    return {
      users,
      mode: "logged_out",
      personalized: false,
    };
  }

  // Get candidates
  const candidates = await getPeopleCandidates(user, { limit: limit * 3 });

  // Determine mode
  const hasInterests =
    user.interests?.genres?.length > 0 || user.interests?.fandoms?.length > 0;
  const follows = await Follow.countDocuments({ followerId: user._id });
  const mode = !hasInterests && follows < 3 ? "cold_start" : "logged_in";

  // Score and rank
  const ranked = await scoreAndRank(candidates, mode, "people", user);

  return {
    users: ranked.slice(0, limit),
    mode,
    personalized: true,
  };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  applyPolicyGates,
  getLoggedOutWorkCandidates,
  getLoggedInWorkCandidates,
  getLoggedOutPostCandidates,
  getLoggedInPostCandidates,
  getPeopleCandidates,
  scoreAndRank,
  getWorkRecommendations,
  getPostRecommendations,
  getPeopleRecommendations,
};
