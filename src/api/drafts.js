import api from "./client";

/**
 * Drafts API
 */
export const draftsApi = {
  // List all my drafts
  list: () => api.get("/drafts"),

  // Get single draft by ID
  get: (id) => api.get(`/drafts/${id}`),

  // Create new draft
  create: (data = {}) => api.post("/drafts", data),

  // Update draft
  update: (id, data) => api.put(`/drafts/${id}`, data),

  // Delete draft
  delete: (id) => api.delete(`/drafts/${id}`),

  // Publish draft to work
  publish: (id) => api.post(`/drafts/${id}/publish`),
};

export default draftsApi;
