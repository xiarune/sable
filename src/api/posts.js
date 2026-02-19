import api from "./client";

/**
 * Posts API - Community posts
 */
const postsApi = {
  // Get posts feed (chronological, legacy)
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page);
    if (params.limit) query.set("limit", params.limit);
    if (params.type) query.set("type", params.type);
    if (params.author) query.set("author", params.author);
    const qs = query.toString();
    return api.get(`/posts${qs ? `?${qs}` : ""}`);
  },

  // Get ranked/personalized feed
  feed: (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.set("limit", params.limit);
    if (params.mode) query.set("mode", params.mode); // 'ranked' or 'chronological'
    const qs = query.toString();
    return api.get(`/posts/feed${qs ? `?${qs}` : ""}`);
  },

  // Get my posts
  getMine: () => api.get("/posts/mine"),

  // Get single post
  get: (postId) => api.get(`/posts/${postId}`),

  // Create a new post
  create: (data) => api.post("/posts", data),

  // Update a post
  update: (postId, data) => api.put(`/posts/${postId}`, data),

  // Delete a post
  delete: (postId) => api.delete(`/posts/${postId}`),
};

export default postsApi;
