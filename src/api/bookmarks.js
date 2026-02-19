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

  // Bookmark an audio track
  bookmarkAudio: (audioId, workId, title, authorUsername) =>
    api.post(`/bookmarks/audio/${audioId}`, { workId, title, authorUsername }),

  // Remove audio bookmark
  unbookmarkAudio: (audioId) => api.delete(`/bookmarks/audio/${audioId}`),

  // Check if bookmarked
  check: (workId, postId, audioId) => {
    const params = new URLSearchParams();
    if (workId) params.append("workId", workId);
    if (postId) params.append("postId", postId);
    if (audioId) params.append("audioId", audioId);
    return api.get(`/bookmarks/check?${params}`);
  },

  // Toggle reading list visibility for a bookmark
  toggleReadingList: (bookmarkId, showInReadingList) =>
    api.put(`/bookmarks/${bookmarkId}/reading-list`, { showInReadingList }),

  // Get my reading list (bookmarks marked for reading list)
  getReadingList: () => api.get("/bookmarks/reading-list"),

  // Get a user's public reading list
  getUserReadingList: (username) => api.get(`/bookmarks/reading-list/user/${username}`),
};

export default bookmarksApi;
