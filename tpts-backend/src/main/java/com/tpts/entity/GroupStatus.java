package com.tpts.entity;

/**
 * Enum for Group Shipment Status
 * Tracks the lifecycle of a group shipment
 */
public enum GroupStatus {
    OPEN,
    PARTIAL,// Group is open for customers to join
    FULL,                  // Target members reached, ready for pickup
    PICKUP_IN_PROGRESS,    // Pickup agent collecting packages
    PICKUP_COMPLETE,       // All packages collected at company office
    DELIVERY_IN_PROGRESS,  // Delivery agent delivering packages
    COMPLETED,             // All packages delivered
    CANCELLED,             // Group cancelled (deadline passed with insufficient members)
    EXPIRED                // Deadline passed without enough members
}