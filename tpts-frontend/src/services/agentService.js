import apiClient from "../utils/api";

/**
 * Agent Service
 * Handles all delivery agent-related API calls
 */

// ==========================================
// Agent Profile & Dashboard
// ==========================================

export const getCurrentAgent = async () => {
  const response = await apiClient.get("/agents/me");
  return response.data.data;
};

export const getAgentDashboard = async () => {
  const response = await apiClient.get("/agents/dashboard");
  return response.data.data;
};

export const updateAgentProfile = async (data) => {
  const response = await apiClient.put("/agents/profile", data);
  return response.data.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await apiClient.put("/agents/change-password", { currentPassword, newPassword });
  return response.data;
};

// ==========================================
// Availability & Location
// ==========================================

export const updateAvailability = async (isAvailable) => {
  const response = await apiClient.patch("/agents/availability", { isAvailable });
  return response.data.data;
};

export const updateLocation = async (latitude, longitude) => {
  const response = await apiClient.patch("/agents/location", { latitude, longitude });
  return response.data.data;
};

// ==========================================
// Deliveries (from ParcelController)
// ==========================================

export const getActiveDeliveries = async () => {
  const response = await apiClient.get("/parcels/agent/active");
  return response.data.data;
};

export const getAllDeliveries = async () => {
  const response = await apiClient.get("/parcels/agent/all");
  return response.data.data;
};

export const updateParcelStatus = async (parcelId, data) => {
  const response = await apiClient.patch(`/parcels/${parcelId}/status`, data);
  return response.data.data;
};

export const respondToDeliveryRequest = async (requestId, accept, rejectReason = null) => {
  const response = await apiClient.patch(`/delivery-requests/${requestId}/agent-response`, {
    accept,
    rejectReason
  });
  return response.data.data;
};

export const getParcelDetail = async (parcelId) => {
  const response = await apiClient.get(`/parcels/${parcelId}`);
  return response.data.data;
};

export const verifyDeliveryOtp = async (parcelId, otp) => {
  const response = await apiClient.post(`/parcels/${parcelId}/verify-delivery`, { otp });
  return response.data.data;
};

// ==========================================
// Earnings (Direct calculation from delivered parcels)
// ==========================================

export const getAgentWallet = async () => {
  // Keep for backward compatibility, but may return null
  try {
    const response = await apiClient.get("/wallet");
    return response.data.data;
  } catch {
    return null;
  }
};

export const getAgentEarnings = async (limit = 20) => {
  // Use new direct earnings endpoint
  const response = await apiClient.get("/agent-earnings/recent", { params: { limit } });
  return response.data.data;
};

export const getAgentEarningsSummary = async () => {
  // Use new direct earnings summary endpoint
  const response = await apiClient.get("/agent-earnings/summary");
  return response.data.data;
};

export const getAgentTransactions = async (limit = 20) => {
  try {
    const response = await apiClient.get("/wallet/transactions", { params: { limit } });
    return response.data.data;
  } catch {
    return [];
  }
};

// ==========================================
// Ratings
// ==========================================

export const getAgentRatings = async (agentId) => {
  const response = await apiClient.get(`/ratings/agent/${agentId}`);
  return response.data.data;
};

export const getAgentRatingSummary = async (agentId) => {
  const response = await apiClient.get(`/ratings/agent/${agentId}/summary`);
  return response.data.data;
};

// ==========================================
// Notifications
// ==========================================

export const getAgentNotifications = async () => {
  const response = await apiClient.get("/notifications");
  return response.data.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await apiClient.post(`/notifications/${notificationId}/read`);
  return response.data.data;
};

export const markAllNotificationsRead = async () => {
  const response = await apiClient.post("/notifications/read-all");
  return response.data.data;
};

// ==========================================
// Profile Image
// ==========================================

export const uploadProfileImage = async (agentId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post(`/agents/${agentId}/profile-image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.data.profilePhotoUrl;
};

export const removeProfileImage = async (agentId) => {
  const response = await apiClient.delete(`/agents/${agentId}/profile-image`);
  return response.data;
};