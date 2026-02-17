import api from "./client";

/**
 * Follows API - Following users
 */
const followsApi = {
  // Follow a user (or send follow request for private accounts)
  follow: (userId) => api.post(`/follows/${userId}`),

  // Unfollow a user (or cancel pending follow request)
  unfollow: (userId) => api.delete(`/follows/${userId}`),

  // Get my followers
  getFollowers: () => api.get("/follows/followers"),

  // Get who I'm following
  getFollowing: () => api.get("/follows/following"),

  // Check follow status with a user (returns: "following", "pending", or "none")
  checkFollowing: (userId) => api.get(`/follows/check/${userId}`),

  // Get a user's followers by username (public)
  getUserFollowers: (username) => api.get(`/follows/user/${username}/followers`),

  // Get who a user is following by username (public)
  getUserFollowing: (username) => api.get(`/follows/user/${username}/following`),

  // Get pending follow requests TO me
  getRequests: () => api.get("/follows/requests"),

  // Get follow requests I've sent
  getSentRequests: () => api.get("/follows/requests/sent"),

  // Accept a follow request
  acceptRequest: (requestId) => api.put(`/follows/requests/${requestId}/accept`),

  // Decline a follow request
  declineRequest: (requestId) => api.put(`/follows/requests/${requestId}/decline`),
};

export default followsApi;
