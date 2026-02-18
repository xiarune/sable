import api from "./client";

/**
 * Likes API
 */
const likesApi = {
  // Like a post
  likePost: (postId) => api.post(`/likes/post/${postId}`),

  // Unlike a post
  unlikePost: (postId) => api.delete(`/likes/post/${postId}`),

  // Like a work
  likeWork: (workId) => api.post(`/likes/work/${workId}`, { type: "like" }),

  // Love a work
  loveWork: (workId) => api.post(`/likes/work/${workId}`, { type: "love" }),

  // Unlike/unlove a work
  unlikeWork: (workId) => api.delete(`/likes/work/${workId}`),

  // Get all work likes/loves for current user
  getWorkLikes: () => api.get("/likes/works"),

  // Like a comment
  likeComment: (commentId) => api.post(`/likes/comment/${commentId}`),

  // Unlike a comment
  unlikeComment: (commentId) => api.delete(`/likes/comment/${commentId}`),

  // Check if liked
  check: (workId, postId, commentId) => {
    const params = new URLSearchParams();
    if (workId) params.append("workId", workId);
    if (postId) params.append("postId", postId);
    if (commentId) params.append("commentId", commentId);
    return api.get(`/likes/check?${params}`);
  },

  // Get all liked post IDs for current user
  getLikedPosts: () => api.get("/likes/posts"),
};

export default likesApi;
