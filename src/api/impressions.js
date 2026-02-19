import api from "./client";

/**
 * Impressions API - Track user interactions for recommendation feedback
 */
const impressionsApi = {
  /**
   * Log a single impression
   * @param {Object} data - Impression data
   * @param {string} data.itemId - ID of the item
   * @param {string} data.itemType - Type: 'work', 'post', or 'user'
   * @param {string} data.surface - Where shown: 'for_you', 'trending', 'new', 'search', 'feed', 'discover', 'profile'
   * @param {number} [data.position] - Position in the list (0-indexed)
   * @param {string} [data.sessionId] - Session ID for logged-out tracking
   */
  log: (data) => api.post("/impressions", data),

  /**
   * Log multiple impressions at once
   * @param {Object} data - Batch impression data
   * @param {Array} data.impressions - Array of { itemId, itemType, position }
   * @param {string} data.surface - Where shown
   * @param {string} [data.sessionId] - Session ID for logged-out tracking
   */
  logBatch: (data) => api.post("/impressions/batch", data),

  /**
   * Log a click on an impression
   * @param {string} impressionId - ID of the impression
   */
  click: (impressionId) => api.post(`/impressions/${impressionId}/click`),

  /**
   * Log engagement on an impression
   * @param {string} impressionId - ID of the impression
   * @param {Object} engagement - Engagement data
   * @param {number} [engagement.dwellTimeMs] - Time spent on item
   * @param {boolean} [engagement.liked] - Whether user liked
   * @param {boolean} [engagement.bookmarked] - Whether user bookmarked
   * @param {boolean} [engagement.followed] - Whether user followed creator
   * @param {boolean} [engagement.hidden] - Whether user hid the item
   * @param {boolean} [engagement.reported] - Whether user reported
   */
  engage: (impressionId, engagement) =>
    api.post(`/impressions/${impressionId}/engage`, engagement),

  /**
   * Log a click by item (without impression ID)
   * @param {Object} data - Item data
   * @param {string} data.itemId - ID of the item
   * @param {string} data.itemType - Type: 'work', 'post', or 'user'
   * @param {string} [data.surface] - Where shown (defaults to 'profile')
   */
  clickByItem: (data) => api.post("/impressions/click-by-item", data),
};

/**
 * Helper to generate a session ID for logged-out tracking
 */
export function getOrCreateSessionId() {
  const KEY = "sable_session_id";
  let sessionId = sessionStorage.getItem(KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(KEY, sessionId);
  }
  return sessionId;
}

/**
 * Impression tracker utility for components
 */
export class ImpressionTracker {
  constructor(surface) {
    this.surface = surface;
    this.impressionIds = new Map(); // itemId -> impressionId
    this.startTimes = new Map(); // itemId -> timestamp
  }

  /**
   * Log impressions for a list of items
   * @param {Array} items - Array of items with _id and type
   */
  async logImpressions(items) {
    if (!items || items.length === 0) return;

    const impressions = items.map((item, index) => ({
      itemId: item._id,
      itemType: item.type || (item.authorId ? "work" : item.stats ? "user" : "post"),
      position: index,
    }));

    try {
      await impressionsApi.logBatch({
        impressions,
        surface: this.surface,
        sessionId: getOrCreateSessionId(),
      });
    } catch (err) {
      console.warn("Failed to log impressions:", err);
    }
  }

  /**
   * Log a click on an item
   * @param {string} itemId - ID of the item
   * @param {string} itemType - Type of item
   */
  async logClick(itemId, itemType) {
    this.startTimes.set(itemId, Date.now());

    try {
      const result = await impressionsApi.clickByItem({
        itemId,
        itemType,
        surface: this.surface,
      });
      if (result.impressionId) {
        this.impressionIds.set(itemId, result.impressionId);
      }
    } catch (err) {
      console.warn("Failed to log click:", err);
    }
  }

  /**
   * Log dwell time when leaving an item
   * @param {string} itemId - ID of the item
   */
  async logDwellTime(itemId) {
    const startTime = this.startTimes.get(itemId);
    const impressionId = this.impressionIds.get(itemId);

    if (startTime && impressionId) {
      const dwellTimeMs = Date.now() - startTime;
      try {
        await impressionsApi.engage(impressionId, { dwellTimeMs });
      } catch (err) {
        console.warn("Failed to log dwell time:", err);
      }
    }

    this.startTimes.delete(itemId);
  }

  /**
   * Log engagement (like, bookmark, follow)
   * @param {string} itemId - ID of the item
   * @param {Object} engagement - Engagement data
   */
  async logEngagement(itemId, engagement) {
    const impressionId = this.impressionIds.get(itemId);
    if (impressionId) {
      try {
        await impressionsApi.engage(impressionId, engagement);
      } catch (err) {
        console.warn("Failed to log engagement:", err);
      }
    }
  }
}

export default impressionsApi;
