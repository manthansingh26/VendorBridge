import api from "./axios";

export const getSummaryReport = () => api.get("/reports/summary");
export const getVendorPerformanceReport = () => api.get("/reports/vendor-performance");
export const getMonthlySpendingReport = () => api.get("/reports/monthly-spending");
export const getProcurementStatsReport = () => api.get("/reports/procurement-stats");
export const getActivityLogs = (params) => api.get("/activity-logs", { params });
export const getNotifications = () => api.get("/notifications");
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
