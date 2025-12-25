import apiClient from "../utils/api";

/**
 * Parcel API Service
 * Handles all parcel/shipment-related API calls
 */

// Create a new parcel
export const createParcel = async (data) => {
  const response = await apiClient.post("/parcels", data);
  return response.data.data;
};

// Get current customer's parcels
export const getMyParcels = async () => {
  const response = await apiClient.get("/parcels/my");
  return response.data.data;
};

// Get current customer's active parcels
export const getMyActiveParcels = async () => {
  const response = await apiClient.get("/parcels/my/active");
  return response.data.data;
};

// Get parcel by ID
export const getParcelById = async (id) => {
  const response = await apiClient.get(`/parcels/${id}`);
  return response.data.data;
};

// Get parcel by tracking number (authenticated)
export const getParcelByTracking = async (trackingNumber) => {
  const response = await apiClient.get(`/parcels/tracking/${trackingNumber}`);
  return response.data.data;
};

// Confirm parcel (after payment)
export const confirmParcel = async (id) => {
  const response = await apiClient.post(`/parcels/${id}/confirm`);
  return response.data.data;
};

// Cancel parcel
export const cancelParcel = async (id, reason) => {
  const response = await apiClient.post(`/parcels/${id}/cancel`, null, {
    params: { reason }
  });
  return response.data.data;
};

// ==========================================
// Company & Pricing APIs
// ==========================================

// Get all approved companies
export const getCompanies = async () => {
  const response = await apiClient.get("/companies");
  return response.data.data;
};

// Compare company prices for a route
export const compareCompanyPrices = async (fromCity, toCity, weightKg, distanceKm) => {
  const response = await apiClient.get("/companies/compare", {
    params: { from: fromCity, to: toCity, weight: weightKg, distance: distanceKm }
  });
  return response.data.data;
};

// Get companies by service city
export const getCompaniesByCity = async (city) => {
  const response = await apiClient.get(`/companies/city/${city}`);
  return response.data.data;
};

// ==========================================
// Group Buy APIs
// ==========================================

// Get open groups (public)
export const getOpenGroups = async () => {
  const response = await apiClient.get("/groups/open");
  return response.data.data;
};

// Get open groups by source city
export const getOpenGroupsBySource = async (city) => {
  const response = await apiClient.get(`/groups/open/source/${city}`);
  return response.data.data;
};

// Get open groups by target city
export const getOpenGroupsByTarget = async (city) => {
  const response = await apiClient.get(`/groups/open/target/${city}`);
  return response.data.data;
};

// Get open groups by route
export const getOpenGroupsByRoute = async (fromCity, toCity) => {
  const response = await apiClient.get("/groups/open/route", {
    params: { from: fromCity, to: toCity }
  });
  return response.data.data;
};

// Get group by code
export const getGroupByCode = async (groupCode) => {
  const response = await apiClient.get(`/groups/code/${groupCode}`);
  return response.data.data;
};

// Join a group
export const joinGroup = async (groupId, parcelData) => {
  const response = await apiClient.post(`/groups/${groupId}/join`, parcelData);
  return response.data.data;
};

// Leave a group
export const leaveGroup = async (groupId, parcelId) => {
  const response = await apiClient.post(`/groups/${groupId}/leave`, null, {
    params: { parcelId }
  });
  return response.data.data;
};

// Get customer's group shipments
export const getMyGroupShipments = async () => {
  const response = await apiClient.get("/groups/my");
  return response.data.data;
};
