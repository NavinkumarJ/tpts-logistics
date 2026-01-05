import apiClient from '../utils/api';

/**
 * Chat service for in-app messaging between customers and agents
 */

// ==========================================
// Parcel Chat (Regular Orders)
// ==========================================

/**
 * Get chat messages for a parcel
 */
export const getParcelMessages = async (parcelId) => {
    const response = await apiClient.get(`/chat/parcel/${parcelId}/messages`);
    return response.data.data;
};

/**
 * Send a message for a parcel
 */
export const sendParcelMessage = async (parcelId, message) => {
    const response = await apiClient.post(`/chat/parcel/${parcelId}/send`, { message });
    return response.data.data;
};

/**
 * Mark parcel messages as read
 */
export const markParcelMessagesAsRead = async (parcelId) => {
    const response = await apiClient.put(`/chat/parcel/${parcelId}/read`);
    return response.data;
};

/**
 * Get unread count for a parcel
 */
export const getParcelUnreadCount = async (parcelId) => {
    const response = await apiClient.get(`/chat/parcel/${parcelId}/unread`);
    return response.data.data.unreadCount;
};

// ==========================================
// Group Chat (Group Buy Orders)
// ==========================================

/**
 * Get chat messages for a group
 * @param {number} groupId - Group shipment ID
 * @param {number} [parcelId] - Optional parcel ID to filter messages for specific customer
 */
export const getGroupMessages = async (groupId, parcelId = null) => {
    const url = parcelId
        ? `/chat/group/${groupId}/messages?parcelId=${parcelId}`
        : `/chat/group/${groupId}/messages`;
    const response = await apiClient.get(url);
    return response.data.data;
};

/**
 * Send a message for a group (agent specifies receiverParcelId)
 */
export const sendGroupMessage = async (groupId, message, receiverParcelId = null) => {
    const url = receiverParcelId
        ? `/chat/group/${groupId}/send?receiverParcelId=${receiverParcelId}`
        : `/chat/group/${groupId}/send`;
    const response = await apiClient.post(url, { message });
    return response.data.data;
};

/**
 * Mark group messages as read
 */
export const markGroupMessagesAsRead = async (groupId) => {
    const response = await apiClient.put(`/chat/group/${groupId}/read`);
    return response.data;
};

/**
 * Get unread count for a group
 */
export const getGroupUnreadCount = async (groupId) => {
    const response = await apiClient.get(`/chat/group/${groupId}/unread`);
    return response.data.data.unreadCount;
};

// ==========================================
// General
// ==========================================

/**
 * Get total unread message count
 */
export const getTotalUnreadCount = async () => {
    const response = await apiClient.get('/chat/unread-count');
    return response.data.data.unreadCount;
};
