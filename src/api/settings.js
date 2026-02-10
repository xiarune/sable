import api from "./client";

/**
 * Settings API - Account, Privacy, Notifications, Sessions
 */
const settingsApi = {
  // ============================================
  // ACCOUNT
  // ============================================

  /**
   * Change password
   */
  changePassword: (currentPassword, newPassword) =>
    api.put("/settings/account/password", { currentPassword, newPassword }),

  /**
   * Request email change (sends verification to new email)
   */
  changeEmail: (newEmail, password) =>
    api.put("/settings/account/email", { newEmail, password }),

  /**
   * Confirm email change with token
   */
  confirmEmailChange: (token) =>
    api.post(`/settings/account/email/confirm/${token}`),

  /**
   * Change username
   */
  changeUsername: (newUsername, password) =>
    api.put("/settings/account/username", { newUsername, password }),

  /**
   * Delete account
   */
  deleteAccount: (password, confirmation = "DELETE MY ACCOUNT") =>
    api.delete("/settings/account", {
      method: "DELETE",
      body: JSON.stringify({ password, confirmation }),
      headers: { "Content-Type": "application/json" },
    }),

  /**
   * Export all user data (GDPR)
   */
  exportData: () => api.get("/settings/account/export"),

  // ============================================
  // PRIVACY
  // ============================================

  /**
   * Get privacy settings
   */
  getPrivacy: () => api.get("/settings/privacy"),

  /**
   * Update privacy settings
   */
  updatePrivacy: (settings) => api.put("/settings/privacy", settings),

  // ============================================
  // MUTED WORDS
  // ============================================

  /**
   * Get muted words list
   */
  getMutedWords: () => api.get("/settings/muted-words"),

  /**
   * Add a muted word
   */
  addMutedWord: (word) => api.post("/settings/muted-words", { word }),

  /**
   * Remove a muted word
   */
  removeMutedWord: (word) => api.delete(`/settings/muted-words/${encodeURIComponent(word)}`),

  // ============================================
  // NOTIFICATIONS
  // ============================================

  /**
   * Get notification settings
   */
  getNotifications: () => api.get("/settings/notifications"),

  /**
   * Update notification settings
   */
  updateNotifications: (settings) => api.put("/settings/notifications", settings),

  // ============================================
  // SESSIONS
  // ============================================

  /**
   * Get all active sessions
   */
  getSessions: () => api.get("/settings/sessions"),

  /**
   * Terminate a specific session
   */
  deleteSession: (sessionId) => api.delete(`/settings/sessions/${sessionId}`),

  /**
   * Terminate all other sessions (logout everywhere else)
   */
  deleteAllOtherSessions: () => api.delete("/settings/sessions"),

  // ============================================
  // CONNECTED ACCOUNTS
  // ============================================

  /**
   * Get connected OAuth accounts
   */
  getConnectedAccounts: () => api.get("/settings/connected-accounts"),

  /**
   * Disconnect an OAuth provider
   */
  disconnectAccount: (provider) => api.delete(`/settings/connected-accounts/${provider}`),
};

export default settingsApi;
