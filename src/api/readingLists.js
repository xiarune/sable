import api from "./client";

/**
 * Reading Lists API
 */
const readingListsApi = {
  /**
   * Get my reading lists
   */
  getMine: () => api.get("/reading-lists"),

  /**
   * Get a user's public reading lists
   */
  getByUser: (username) => api.get(`/reading-lists/user/${username}`),

  /**
   * Get a specific reading list with works
   */
  get: (id) => api.get(`/reading-lists/${id}`),

  /**
   * Create a new reading list
   */
  create: (data) => api.post("/reading-lists", data),

  /**
   * Update a reading list
   */
  update: (id, data) => api.put(`/reading-lists/${id}`, data),

  /**
   * Delete a reading list
   */
  delete: (id) => api.delete(`/reading-lists/${id}`),

  /**
   * Add a work to a reading list
   */
  addWork: (listId, workId, notes = "") =>
    api.post(`/reading-lists/${listId}/works`, { workId, notes }),

  /**
   * Remove a work from a reading list
   */
  removeWork: (listId, workId) =>
    api.delete(`/reading-lists/${listId}/works/${workId}`),
};

export default readingListsApi;
