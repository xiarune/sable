import api from "./client";

/**
 * Uploads API
 */
export const uploadsApi = {
  // Upload image
  image: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.upload("/uploads/image", formData);
  },

  // Upload audio
  audio: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.upload("/uploads/audio", formData);
  },

  // List my uploads
  list: (type) => api.get(`/uploads${type ? `?type=${type}` : ""}`),

  // Delete upload
  delete: (id) => api.delete(`/uploads/${id}`),
};

export default uploadsApi;
