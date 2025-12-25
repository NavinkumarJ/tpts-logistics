import apiClient from "../utils/api";

/**
 * Notification API Service
 * Handles all notification-related API calls
 */

// Get all my notifications
export const getMyNotifications = async () => {
    const response = await apiClient.get("/notifications");
    return response.data.data;
};

// Get in-app notifications
export const getInAppNotifications = async () => {
    const response = await apiClient.get("/notifications/in-app");
    return response.data.data;
};

// Get unread notifications
export const getUnreadNotifications = async () => {
    const response = await apiClient.get("/notifications/unread");
    return response.data.data;
};

// Get unread notification count
export const getUnreadCount = async () => {
    const response = await apiClient.get("/notifications/unread/count");
    const data = response.data.data;
    // Handle both {unreadCount: X} object format and direct number format
    return typeof data === 'object' ? data.unreadCount : data;
};

// Mark notification as read
export const markAsRead = async (id) => {
    const response = await apiClient.post(`/notifications/${id}/read`);
    return response.data.data;
};

// Mark all notifications as read
export const markAllAsRead = async () => {
    const response = await apiClient.post("/notifications/read-all");
    return response.data.data;
};
