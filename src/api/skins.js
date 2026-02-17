import api from "./client";

/**
 * Skins API
 */
const skinsApi = {
  // List my skins
  list: (appliesTo) => {
    const params = new URLSearchParams();
    if (appliesTo) params.append("appliesTo", appliesTo);
    return api.get(`/skins?${params}`);
  },

  // Get a specific skin
  get: (skinId) => api.get(`/skins/${skinId}`),

  // Create a new skin
  create: (name, appliesTo, css, isPublic = false) =>
    api.post("/skins", { name, appliesTo, css, isPublic }),

  // Update a skin
  update: (skinId, { name, appliesTo, css, isPublic }) =>
    api.put(`/skins/${skinId}`, { name, appliesTo, css, isPublic }),

  // Delete a skin
  delete: (skinId) => api.delete(`/skins/${skinId}`),
};

export default skinsApi;
