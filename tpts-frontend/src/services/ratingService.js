import apiClient from "../utils/api";

/**
 * Rating Service
 * Handles all rating-related API calls
 */

// ==========================================
// Company Endpoints
// ==========================================

// Get all ratings for company
export const getCompanyRatings = async () => {
    const response = await apiClient.get("/ratings/company/all");
    return response.data.data;
};

// Get unresponded ratings
export const getUnrespondedRatings = async () => {
    const response = await apiClient.get("/ratings/company/unresponded");
    return response.data.data;
};

// Respond to rating
export const respondToRating = async (ratingId, data) => {
    const response = await apiClient.post(`/ratings/${ratingId}/respond`, data);
    return response.data.data;
};

// Flag rating for review
export const flagRating = async (ratingId, reason) => {
    const response = await apiClient.post(`/ratings/${ratingId}/flag`, { reason });
    return response.data.data;
};

// ==========================================
// Public Endpoints
// ==========================================

// Get company public ratings
export const getCompanyPublicRatings = async (companyId) => {
    const response = await apiClient.get(`/ratings/company/${companyId}`);
    return response.data.data;
};

// Get company rating summary
export const getCompanyRatingSummary = async (companyId) => {
    const response = await apiClient.get(`/ratings/company/${companyId}/summary`);
    return response.data.data;
};

// Get agent ratings
export const getAgentRatings = async (agentId) => {
    const response = await apiClient.get(`/ratings/agent/${agentId}`);
    return response.data.data;
};

// Get agent rating summary
export const getAgentRatingSummary = async (agentId) => {
    const response = await apiClient.get(`/ratings/agent/${agentId}/summary`);
    return response.data.data;
};

// ==========================================
// Customer Endpoints
// ==========================================

// Create rating
export const createRating = async (data) => {
    const response = await apiClient.post("/ratings", data);
    return response.data.data;
};

// Update rating
export const updateRating = async (ratingId, data) => {
    const response = await apiClient.put(`/ratings/${ratingId}`, data);
    return response.data.data;
};

// Get my ratings
export const getMyRatings = async () => {
    const response = await apiClient.get("/ratings/my-ratings");
    return response.data.data;
};

// Get rating by parcel
export const getRatingByParcel = async (parcelId) => {
    const response = await apiClient.get(`/ratings/parcel/${parcelId}`);
    return response.data.data;
};

// Check if parcel can be rated
export const canRateParcel = async (parcelId) => {
    const response = await apiClient.get(`/ratings/can-rate/${parcelId}`);
    return response.data.data;
};
