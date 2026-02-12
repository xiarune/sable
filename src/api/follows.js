import api from "./client";

/**
 * Follows API - Following users
 */
const followsApi = {
  // Follow a user
  follow: (userId) => api.post(`/follows/${userId}`),

  // Unfollow a user
  unfollow: (userId) => api.delete(`/follows/${userId}`),

  // Get my followers
  getFollowers: () => api.get("/follows/followers"),

  // Get who I'm following
  getFollowing: () => api.get("/follows/following"),

  // Check if I'm following a specific user
  checkFollowing: (userId) => api.get(`/follows/check/${userId}`),

  // Get a user's followers by username (public)
  getUserFollowers: (username) => api.get(`/follows/user/${username}/followers`),

  // Get who a user is following by username (public)
  getUserFollowing: (username) => api.get(`/follows/user/${username}/following`),
};

export default followsApi;
