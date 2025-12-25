package com.tpts.entity;

/**
 * Enum for Notification Types
 */
public enum NotificationType {
    // Order related
    ORDER_PLACED,
    ORDER_CONFIRMED,
    ORDER_CANCELLED,

    // Delivery related
    AGENT_ASSIGNED,
    PICKUP_STARTED,
    PACKAGE_PICKED_UP,
    OUT_FOR_DELIVERY,
    DELIVERED,
    DELIVERY_FAILED,

    // Group related
    GROUP_JOINED,
    GROUP_FILLED,
    GROUP_DEADLINE_REMINDER,
    GROUP_CANCELLED,

    // Payment related
    PAYMENT_SUCCESS,
    PAYMENT_FAILED,
    REFUND_INITIATED,
    REFUND_COMPLETED,

    // Agent related
    NEW_ASSIGNMENT,
    ASSIGNMENT_ACCEPTED,
    ASSIGNMENT_REJECTED,

    // Job application related
    APPLICATION_RECEIVED,
    APPLICATION_APPROVED,
    APPLICATION_REJECTED,
    INTERVIEW_SCHEDULED,
    HIRED,

    // Company related
    COMPANY_APPROVED,
    COMPANY_REJECTED,
    COMPANY_SUSPENDED,

    // Rating related
    NEW_RATING,
    RATING_RESPONSE,

    // System
    SYSTEM_ALERT,
    PROMOTIONAL,
    OTP
}