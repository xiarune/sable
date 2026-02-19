import { api } from "./client";

// ============================================
// AUTH
// ============================================

export async function login(username, password) {
  return api.post("/admin/auth/login", { username, password });
}

export async function logout() {
  return api.post("/admin/auth/logout", {});
}

export async function me() {
  return api.get("/admin/auth/me");
}

// ============================================
// ANALYTICS
// ============================================

export async function getOverview() {
  return api.get("/admin/analytics/overview");
}

export async function getUserGrowth(days = 30) {
  return api.get(`/admin/analytics/users?days=${days}`);
}

// ============================================
// REPORTS
// ============================================

export async function getReports({ status, targetType, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (targetType) params.set("targetType", targetType);
  params.set("page", page);
  params.set("limit", limit);
  return api.get(`/admin/reports?${params}`);
}

export async function getReport(id) {
  return api.get(`/admin/reports/${id}`);
}

export async function updateReport(id, data) {
  return api.put(`/admin/reports/${id}`, data);
}

export async function deleteReportedContent(id) {
  return api.delete(`/admin/reports/${id}/content`);
}

// ============================================
// USERS
// ============================================

export async function getUsers({ search, isBanned, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (isBanned !== undefined) params.set("isBanned", isBanned);
  params.set("page", page);
  params.set("limit", limit);
  return api.get(`/admin/users?${params}`);
}

export async function getUser(id) {
  return api.get(`/admin/users/${id}`);
}

export async function banUser(id, { ban, reason, expiresAt }) {
  return api.put(`/admin/users/${id}/ban`, { ban, reason, expiresAt });
}

export async function issueWarning(id, { reason, severity, relatedReportId }) {
  return api.post(`/admin/users/${id}/warning`, { reason, severity, relatedReportId });
}

export async function resetUserPassword(id) {
  return api.put(`/admin/users/${id}/reset-password`, {});
}

// ============================================
// CONTACTS / SUPPORT
// ============================================

export async function getContacts({ status, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", page);
  params.set("limit", limit);
  return api.get(`/admin/contacts?${params}`);
}

export async function getContact(id) {
  return api.get(`/admin/contacts/${id}`);
}

export async function updateContact(id, data) {
  return api.put(`/admin/contacts/${id}`, data);
}

// ============================================
// SYSTEM
// ============================================

export async function sendSystemNotification({ title, body, recipientIds }) {
  return api.post("/admin/system/notification", { title, body, recipientIds });
}

// ============================================
// TAXONOMIES
// ============================================

export async function getGenres() {
  return api.get("/admin/taxonomies/genres");
}

export async function updateGenre(id, data) {
  return api.put(`/admin/taxonomies/genres/${id}`, data);
}

export async function deleteGenre(id) {
  return api.delete(`/admin/taxonomies/genres/${id}`);
}

export async function getFandoms() {
  return api.get("/admin/taxonomies/fandoms");
}

export async function updateFandom(id, data) {
  return api.put(`/admin/taxonomies/fandoms/${id}`, data);
}

export async function deleteFandom(id) {
  return api.delete(`/admin/taxonomies/fandoms/${id}`);
}

export async function getTags({ search, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", page);
  params.set("limit", limit);
  return api.get(`/admin/taxonomies/tags?${params}`);
}

export async function deleteTag(id) {
  return api.delete(`/admin/taxonomies/tags/${id}`);
}

// ============================================
// ADMIN MANAGEMENT
// ============================================

export async function getAdmins() {
  return api.get("/admin/admins");
}

export async function createAdmin({ username, email, password, displayName }) {
  return api.post("/admin/admins", { username, email, password, displayName });
}

export default {
  // Auth
  login,
  logout,
  me,
  // Analytics
  getOverview,
  getUserGrowth,
  // Reports
  getReports,
  getReport,
  updateReport,
  deleteReportedContent,
  // Users
  getUsers,
  getUser,
  banUser,
  issueWarning,
  resetUserPassword,
  // Contacts
  getContacts,
  getContact,
  updateContact,
  // System
  sendSystemNotification,
  // Taxonomies
  getGenres,
  updateGenre,
  deleteGenre,
  getFandoms,
  updateFandom,
  deleteFandom,
  getTags,
  deleteTag,
  // Admin management
  getAdmins,
  createAdmin,
};
