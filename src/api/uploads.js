import api from "./client";

/**
 * Uploads API
 */
export const uploadsApi = {
  // Generic upload - type can be 'images', 'audio', 'covers'
  upload: async (file, type = "images") => {
    const formData = new FormData();
    formData.append("file", file);

    // Map type to endpoint
    const endpoint = type === "audio" ? "/uploads/audio" : "/uploads/image";
    const preset = type === "covers" ? "?preset=cover" : "";

    const response = await api.upload(`${endpoint}${preset}`, formData);
    return { url: response.upload.url, ...response.upload };
  },

  // Upload image
  image: async (file, preset) => {
    const formData = new FormData();
    formData.append("file", file);
    const queryStr = preset ? `?preset=${preset}` : "";
    const response = await api.upload(`/uploads/image${queryStr}`, formData);
    return { url: response.upload.url, ...response.upload };
  },

  // Upload audio
  audio: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.upload("/uploads/audio", formData);
    return { url: response.upload.url, ...response.upload };
  },

  // List my uploads
  list: (type) => api.get(`/uploads${type ? `?type=${type}` : ""}`),

  // Delete upload
  delete: (id) => api.delete(`/uploads/${id}`),
};

export default uploadsApi;
