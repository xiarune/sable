import api from "./client";

/**
 * Community API - Community pages and announcements
 */
const communityApi = {
  // Get my community page (creates default if none exists)
  getMine: () => api.get("/community"),

  // Get another user's community page by handle
  getByHandle: (handle) => api.get(`/community/${handle}`),

  // Update my community page
  update: (data) => api.put("/community", data),

  // Add an announcement
  addAnnouncement: (text, pinned = false) =>
    api.post("/community/announcements", { text, pinned }),

  // Delete an announcement by index
  deleteAnnouncement: (index) =>
    api.delete(`/community/announcements/${index}`),
};

export default communityApi;
