import api from "./client";

/**
 * Works API
 */
export const worksApi = {
  // List public works (browse)
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/works${query ? `?${query}` : ""}`);
  },

  // List my works
  mine: () => api.get("/works/mine"),

  // Get single work by ID
  get: (id) => api.get(`/works/${id}`),

  // Update work
  update: (id, data) => api.put(`/works/${id}`, data),

  // Delete work
  delete: (id) => api.delete(`/works/${id}`),
};

export default worksApi;
