import apiClient from "../utils/api";

/**
 * Company Service
 * Handles all company-related API calls
 */

// ==========================================
// Company Profile
// ==========================================

export const getCurrentCompany = async () => {
  const response = await apiClient.get("/company/me");
  return response.data.data;
};

export const getCompanyDashboard = async () => {
  const response = await apiClient.get("/company/dashboard");
  return response.data.data;
};

export const updateCompanyProfile = async (data) => {
  const response = await apiClient.put("/company/profile", data);
  return response.data.data;
};

export const updateHiringSettings = async (data) => {
  const response = await apiClient.put("/company/hiring", data);
  return response.data.data;
};

export const updateCompanyLogo = async (formData) => {
  const response = await apiClient.post("/company/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data.data;
};

// ==========================================
// Group Shipments
// ==========================================

export const getCompanyGroups = async () => {
  const response = await apiClient.get("/groups/company");
  return response.data.data;
};

// ==========================================
// Parcels (Individual Shipments)
// ==========================================

export const getCompanyParcels = async () => {
  const response = await apiClient.get("/parcels/company");
  return response.data.data;
};

export const getPendingParcels = async () => {
  const response = await apiClient.get("/parcels/company/pending");
  return response.data.data;
};

export const assignAgentToParcel = async (parcelId, agentId) => {
  const response = await apiClient.patch(`/parcels/${parcelId}/assign`, { agentId });
  return response.data.data;
};

export const getCompanyGroupsByStatus = async (status) => {
  const response = await apiClient.get(`/groups/company/status/${status}`);
  return response.data.data;
};

export const createGroup = async (data) => {
  const response = await apiClient.post("/groups", data);
  return response.data.data;
};

export const getGroupById = async (groupId) => {
  const response = await apiClient.get(`/groups/${groupId}`);
  return response.data.data;
};

export const getGroupParcels = async (groupId) => {
  const response = await apiClient.get(`/groups/${groupId}/parcels`);
  return response.data.data;
};

export const assignPickupAgent = async (groupId, agentId) => {
  const response = await apiClient.patch(`/groups/${groupId}/assign-pickup`, { agentId });
  return response.data.data;
};

export const assignDeliveryAgent = async (groupId, agentId) => {
  const response = await apiClient.patch(`/groups/${groupId}/assign-delivery`, { agentId });
  return response.data.data;
};

export const completeGroupPickup = async (groupId) => {
  const response = await apiClient.patch(`/groups/${groupId}/pickup-complete`);
  return response.data.data;
};

export const completeGroupDelivery = async (groupId) => {
  const response = await apiClient.patch(`/groups/${groupId}/delivery-complete`);
  return response.data.data;
};

export const cancelGroup = async (groupId, reason) => {
  const response = await apiClient.post(`/groups/${groupId}/cancel`, null, { params: { reason } });
  return response.data.data;
};

// ==========================================
// Delivery Agents
// ==========================================

export const getCompanyAgents = async () => {
  const response = await apiClient.get("/agents");
  return response.data.data;
};

export const getAvailableAgents = async () => {
  const response = await apiClient.get("/agents/available");
  return response.data.data;
};

export const getAgentById = async (agentId) => {
  const response = await apiClient.get(`/agents/${agentId}`);
  return response.data.data;
};

export const createAgent = async (data) => {
  const response = await apiClient.post("/agents", data);
  return response.data.data;
};

export const updateAgent = async (agentId, data) => {
  const response = await apiClient.put(`/agents/${agentId}`, data);
  return response.data.data;
};

export const deleteAgent = async (agentId) => {
  const response = await apiClient.delete(`/agents/${agentId}`);
  return response.data;
};

export const setAgentActiveStatus = async (agentId, isActive) => {
  const response = await apiClient.patch(`/agents/${agentId}/active`, null, { params: { isActive } });
  return response.data.data;
};

// ==========================================
// Job Applications
// ==========================================

export const getCompanyApplications = async () => {
  const response = await apiClient.get("/job-applications/company");
  return response.data.data;
};

export const getApplicationsByStatus = async (status) => {
  const response = await apiClient.get(`/job-applications/company/status/${status}`);
  return response.data.data;
};

export const getPendingApplications = async () => {
  const response = await apiClient.get("/job-applications/company/pending");
  return response.data.data;
};

export const getApplicationById = async (applicationId) => {
  const response = await apiClient.get(`/job-applications/${applicationId}`);
  return response.data.data;
};

export const reviewApplication = async (applicationId, data) => {
  const response = await apiClient.patch(`/job-applications/${applicationId}/review`, data);
  return response.data.data;
};

export const hireApplicant = async (applicationId, data = {}) => {
  const response = await apiClient.post(`/job-applications/${applicationId}/hire`, data);
  return response.data.data;
};