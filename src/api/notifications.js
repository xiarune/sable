import api from "./client";

/**
 * Notifications API
 */
export const notificationsApi = {
  // Get notifications list
  list: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set("page", params.page);
    if (params.limit) queryParams.set("limit", params.limit);
    if (params.unreadOnly) queryParams.set("unreadOnly", "true");

    const query = queryParams.toString();
    return api.get(`/notifications${query ? `?${query}` : ""}`);
  },

  // Get unread count
  getCount: () => api.get("/notifications/count"),

  // Mark single notification as read
  markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),

  // Mark all notifications as read
  markAllAsRead: () => api.put("/notifications/read-all"),

  // Delete a notification
  delete: (notificationId) => api.delete(`/notifications/${notificationId}`),

  // Clear all notifications
  clearAll: () => api.delete("/notifications"),
};

export default notificationsApi;
