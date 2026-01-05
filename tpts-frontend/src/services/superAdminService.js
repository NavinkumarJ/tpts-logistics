import apiClient from "../utils/api";

// Dashboard
export const getSuperAdminDashboard = async () => {
  const response = await apiClient.get("/super-admin/dashboard");
  return response.data.data;
};

// Companies
export const getPendingCompanies = async () => {
  const response = await apiClient.get("/super-admin/companies/pending");
  return response.data.data;
};

export const approveCompany = async (companyId) => {
  const response = await apiClient.post(`/super-admin/companies/${companyId}/approve`);
  return response.data.data;
};

export const rejectCompany = async (companyId, reason) => {
  const response = await apiClient.post(`/super-admin/companies/${companyId}/reject`, { reason });
  return response.data;
};

export const getAllCompanies = async () => {
  const response = await apiClient.get("/super-admin/companies");
  return response.data.data;
};

// Users
export const getAllUsers = async () => {
  const response = await apiClient.get("/super-admin/users");
  return response.data.data;
};

export const toggleUserStatus = async (userId, isActive) => {
  const response = await apiClient.patch(`/super-admin/users/${userId}/status`, { isActive });
  return response.data.data;
};

// Agents
export const getAllAgents = async () => {
  const response = await apiClient.get("/super-admin/agents");
  return response.data.data;
};

export const verifyAgent = async (agentId, verified) => {
  const response = await apiClient.patch(`/super-admin/agents/${agentId}/verify`, { verified });
  return response.data.data;
};

// Parcels
export const getAllParcels = async (params) => {
  const response = await apiClient.get("/super-admin/parcels", { params });
  return response.data.data;
};

// Analytics
export const getSystemAnalytics = async (period = "month") => {
  const response = await apiClient.get(`/super-admin/analytics?period=${period}`);
  return response.data.data;
};

// Revenue
export const getRevenueStats = async () => {
  const response = await apiClient.get("/super-admin/revenue");
  return response.data.data;
};

// Messaging
export const sendBulkEmail = async (data) => {
  const response = await apiClient.post("/super-admin/messaging/send", data);
  return response.data.data;
};

export const getEmailHistory = async (type = null, limit = 50) => {
  const params = { limit };
  if (type) params.type = type;
  const response = await apiClient.get("/super-admin/messaging/history", { params });
  return response.data.data;
};

export const searchCompanies = async (query = "") => {
  const response = await apiClient.get(`/super-admin/search/companies?q=${query}`);
  return response.data.data;
};

export const searchCustomers = async (query = "") => {
  const response = await apiClient.get(`/super-admin/search/customers?q=${query}`);
  return response.data.data;
};

// Cancellation Analytics
export const getCancellationStats = async () => {
  const response = await apiClient.get("/super-admin/stats/cancellations");
  return response.data.data;
};
