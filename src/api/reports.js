import api from "./client";

/**
 * Reports API
 */
const reportsApi = {
  /**
   * Submit a report
   */
  create: (targetType, targetId, reason, description = "") =>
    api.post("/reports", { targetType, targetId, reason, description }),

  /**
   * Get my submitted reports
   */
  getMine: () => api.get("/reports/mine"),
};

export default reportsApi;
