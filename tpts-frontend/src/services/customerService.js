import apiClient from "../utils/api";

/**
 * Customer API Service
 * Handles all customer-related API calls
 */

// Get current customer profile (includes customerId)
export const getCurrentCustomer = async () => {
  const response = await apiClient.get("/customers/me");
  return response.data.data;
};

// Get customer dashboard
export const getCustomerDashboard = async (customerId) => {
  const response = await apiClient.get(`/customers/${customerId}/dashboard`);
  return response.data.data;
};

// Update customer profile
export const updateCustomer = async (customerId, data) => {
  const response = await apiClient.put(`/customers/${customerId}`, data);
  return response.data.data;
};

// Upload profile image
export const uploadProfileImage = async (customerId, imageFile) => {
  const formData = new FormData();
  formData.append("image", imageFile);

  // Don't set Content-Type for FormData - browser will set it with the correct boundary
  const response = await apiClient.post(
    `/customers/${customerId}/upload-image`,
    formData
  );
  return response.data.data.profileImageUrl;
};

// Remove profile image
export const removeProfileImage = async (customerId) => {
  const response = await apiClient.delete(`/customers/${customerId}/profile-image`);
  return response.data;
};

// Change password
export const changePassword = async (customerId, data) => {
  const response = await apiClient.put(`/customers/${customerId}/change-password`, data);
  return response.data;
};

// ==========================================
// Address APIs
// ==========================================

export const getAddresses = async (customerId) => {
  const response = await apiClient.get(`/customers/${customerId}/addresses`);
  return response.data.data;
};

export const createAddress = async (customerId, data) => {
  const response = await apiClient.post(`/customers/${customerId}/addresses`, data);
  return response.data.data;
};

export const updateAddress = async (customerId, addressId, data) => {
  const response = await apiClient.put(
    `/customers/${customerId}/addresses/${addressId}`,
    data
  );
  return response.data.data;
};

export const deleteAddress = async (customerId, addressId) => {
  const response = await apiClient.delete(`/customers/${customerId}/addresses/${addressId}`);
  return response.data;
};

export const setDefaultAddress = async (customerId, addressId) => {
  const response = await apiClient.patch(
    `/customers/${customerId}/addresses/${addressId}/default`
  );
  return response.data.data;
};

export const getDefaultAddress = async (customerId) => {
  const response = await apiClient.get(`/customers/${customerId}/addresses/default`);
  return response.data.data;
};

// Delete customer account
export const deleteAccount = async (customerId, password) => {
  const response = await apiClient.delete(`/customers/${customerId}/account?password=${encodeURIComponent(password)}`);
  return response.data;
};
