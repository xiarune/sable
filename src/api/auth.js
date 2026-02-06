import api from "./client";

/**
 * Auth API
 */
export const authApi = {
  // Register new user
  register: (data) => api.post("/auth/register", data),

  // Login
  login: (data) => api.post("/auth/login", data),

  // Logout
  logout: () => api.post("/auth/logout"),

  // Get current user
  me: () => api.get("/auth/me"),

  // Check username availability
  checkUsername: (username) => api.get(`/auth/username-available/${username}`),
};

export default authApi;
