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

  // Set username (for Google OAuth users who need to choose a username)
  setUsername: (username) => api.post("/auth/set-username", { username }),

  // Email verification
  verifyEmail: (token) => api.post("/auth/verify-email", { token }),
  resendVerification: () => api.post("/auth/resend-verification"),

  // Password reset
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  validateResetToken: (token) => api.post("/auth/validate-reset-token", { token }),
  resetPassword: (token, password) => api.post("/auth/reset-password", { token, password }),
};

export default authApi;
