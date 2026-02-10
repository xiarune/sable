import api from "./client";

/**
 * Comments API
 */
const commentsApi = {
  // List comments for a work or post
  list: (workId, postId, page = 1, limit = 20) => {
    const params = new URLSearchParams({ page, limit });
    if (workId) params.append("workId", workId);
    if (postId) params.append("postId", postId);
    return api.get(`/comments?${params}`);
  },

  // Create a comment on a work or post
  create: (text, workId, postId, parentId) => {
    const body = { text };
    if (workId) body.workId = workId;
    if (postId) body.postId = postId;
    if (parentId) body.parentId = parentId;
    return api.post("/comments", body);
  },

  // Get replies to a comment
  replies: (commentId) => api.get(`/comments/${commentId}/replies`),

  // Delete a comment
  delete: (commentId) => api.delete(`/comments/${commentId}`),
};

export default commentsApi;
