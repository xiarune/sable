import api from "./client";

/**
 * Users API - Profile, Preferences, Content Filters, Blocking
 */
const usersApi = {
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
};

export default usersApi;
