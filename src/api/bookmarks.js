import api from "./client";

/**
 * Bookmarks API
 */
const bookmarksApi = {
  // List my bookmarks
  list: (type, page = 1, limit = 20) => {
    const params = new URLSearchParams({ page, limit });
    if (type) params.append("type", type);
    return api.get(`/bookmarks?${params}`);
  },

  // Bookmark a work
  bookmarkWork: (workId) => api.post(`/bookmarks/work/${workId}`),

  // Remove work bookmark
  unbookmarkWork: (workId) => api.delete(`/bookmarks/work/${workId}`),

  // Bookmark a post
  bookmarkPost: (postId) => api.post(`/bookmarks/post/${postId}`),

  // Remove post bookmark
  unbookmarkPost: (postId) => api.delete(`/bookmarks/post/${postId}`),

  // Check if bookmarked
  check: (workId, postId) => {
    const params = new URLSearchParams();
    if (workId) params.append("workId", workId);
    if (postId) params.append("postId", postId);
    return api.get(`/bookmarks/check?${params}`);
  },
};

export default bookmarksApi;
