import apiClient from "../utils/api";

/**
 * Admin Service
 * Handles all super admin-related API calls
 */

// ==========================================
// Dashboard & Statistics
// ==========================================

export const getPlatformStats = async () => {
    const response = await apiClient.get("/super-admin/stats");
    return response.data.data;
};

export const getAdminProfile = async () => {
    const response = await apiClient.get("/super-admin/profile");
    return response.data.data;
};

export const getDashboard = async () => {
    const response = await apiClient.get("/super-admin/dashboard");
    return response.data.data;
};

// ==========================================
// Platform Settings
// ==========================================

export const getPlatformSettings = async () => {
    const response = await apiClient.get("/super-admin/settings");
    return response.data.data;
};

export const updatePlatformSettings = async (settings) => {
    const response = await apiClient.put("/super-admin/settings", settings);
    return response.data.data;
};

// ==========================================
// Company Management
// ==========================================

export const getPendingCompanies = async () => {
    const response = await apiClient.get("/super-admin/companies/pending");
    return response.data.data;
};

export const getApprovedCompanies = async () => {
    const response = await apiClient.get("/super-admin/companies/approved");
    return response.data.data;
};

export const getCompanyById = async (id) => {
    const response = await apiClient.get(`/super-admin/companies/${id}`);
    return response.data.data;
};

export const approveCompany = async (id, data = {}) => {
    const response = await apiClient.post(`/super-admin/companies/${id}/approve`, data);
    return response.data.data;
};

export const rejectCompany = async (id, data) => {
    const response = await apiClient.post(`/super-admin/companies/${id}/reject`, data);
    return response.data.data;
};

export const suspendCompany = async (id, reason) => {
    const response = await apiClient.post(`/super-admin/companies/${id}/suspend`, { reason });
    return response.data.data;
};

export const reactivateCompany = async (id) => {
    const response = await apiClient.post(`/super-admin/companies/${id}/reactivate`);
    return response.data.data;
};

export const updateCompanyCommission = async (id, commissionRate) => {
    const response = await apiClient.patch(`/super-admin/companies/${id}/commission`, { commissionRate });
    return response.data.data;
};

// ==========================================
// User Management
// ==========================================

export const getAllUsers = async (userType = null, isActive = null) => {
    const params = {};
    if (userType) params.userType = userType;
    if (isActive !== null) params.isActive = isActive;
    const response = await apiClient.get("/super-admin/users", { params });
    return response.data.data;
};

export const getUserById = async (id) => {
    const response = await apiClient.get(`/super-admin/users/${id}`);
    return response.data.data;
};

export const updateUserStatus = async (id, isActive, reason = null) => {
    const response = await apiClient.patch(`/super-admin/users/${id}/status`, { isActive, reason });
    return response.data.data;
};

export const deleteUser = async (id) => {
    const response = await apiClient.delete(`/super-admin/users/${id}`);
    return response.data;
};

// ==========================================
// Admin Management
// ==========================================

export const getAllAdmins = async () => {
    const response = await apiClient.get("/super-admin/admins");
    return response.data.data;
};

export const createSuperAdmin = async (data) => {
    const response = await apiClient.post("/super-admin/admins", data);
    return response.data.data;
};

// ==========================================
// Content Moderation
// ==========================================

export const getFlaggedRatings = async () => {
    const response = await apiClient.get("/super-admin/ratings/flagged");
    return response.data.data;
};

export const unflagRating = async (id) => {
    const response = await apiClient.post(`/super-admin/ratings/${id}/unflag`);
    return response.data;
};

export const removeRating = async (id) => {
    const response = await apiClient.post(`/super-admin/ratings/${id}/remove`);
    return response.data;
};

// ==========================================
// Notifications
// ==========================================

export const getAdminNotifications = async (limit = 50) => {
    const response = await apiClient.get("/super-admin/notifications", { params: { limit } });
    return response.data.data;
};

export const markNotificationRead = async (id) => {
    const response = await apiClient.post(`/super-admin/notifications/${id}/read`);
    return response.data;
};

// ==========================================
// Action Logs
// ==========================================

export const getAdminLogs = async (type = null, limit = 50, search = null) => {
    const params = { limit };
    if (type && type !== "all") params.type = type;
    if (search) params.search = search;
    const response = await apiClient.get("/super-admin/logs", { params });
    return response.data.data;
};
