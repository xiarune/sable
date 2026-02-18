import api from "./client";

/**
 * Users API - Profile, Preferences, Content Filters, Blocking
 */
const usersApi = {
  // ============================================
  // DISCOVERY
  // ============================================

  /**
   * Get discoverable users (for community page suggestions)
   */
  getDiscoverable: (limit = 10) => api.get(`/users?limit=${limit}`),

  // ============================================
  // PROFILE
  // ============================================

  /**
   * Get a user's public profile
   */
  getProfile: (username) => api.get(`/users/${username}`),

  /**
   * Update my profile
   */
  updateProfile: (data) => api.put("/users/profile", data),

  // ============================================
  // PREFERENCES
  // ============================================

  /**
   * Update preferences (theme, visibility, view/audio prefs, DM settings)
   */
  updatePreferences: (data) => api.put("/users/preferences", data),

  // ============================================
  // CONTENT FILTERS
  // ============================================

  /**
   * Update content filters
   */
  updateContentFilters: (filters) => api.put("/users/content-filters", filters),

  // ============================================
  // BLOCKING
  // ============================================

  /**
   * Get blocked users list
   */
  getBlockedUsers: () => api.get("/users/blocked"),

  /**
   * Block a user
   */
  blockUser: (userId) => api.post(`/users/block/${userId}`),

  /**
   * Unblock a user
   */
  unblockUser: (userId) => api.delete(`/users/block/${userId}`),

  // ============================================
  // MUTING
  // ============================================

  /**
   * Get muted users list
   */
  getMutedUsers: () => api.get("/users/muted"),

  /**
   * Mute a user
   */
  muteUser: (userId) => api.post(`/users/mute/${userId}`),

  /**
   * Unmute a user
   */
  unmuteUser: (userId) => api.delete(`/users/mute/${userId}`),

  // ============================================
  // HIDDEN POSTS
  // ============================================

  /**
   * Get hidden post IDs
   */
  getHiddenPosts: () => api.get("/users/hidden-posts"),

  /**
   * Hide a post
   */
  hidePost: (postId) => api.post(`/users/hide-post/${postId}`),

  /**
   * Unhide a post
   */
  unhidePost: (postId) => api.delete(`/users/hide-post/${postId}`),
};

export default usersApi;
