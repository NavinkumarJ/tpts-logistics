package com.tpts.entity;

/**
 * Enum for Parcel Status
 * Tracks the lifecycle of a parcel from creation to delivery
 */
public enum ParcelStatus {
    PENDING,           // Order placed, awaiting confirmation
    CONFIRMED,         // Payment confirmed, ready for pickup
    ASSIGNED,          // Agent assigned for pickup
    PICKED_UP,         // Package picked up from sender
    IN_TRANSIT,        // Package in transit to destination
    OUT_FOR_DELIVERY,  // Out for final delivery
    DELIVERED,         // Successfully delivered
    CANCELLED,         // Order cancelled
    RETURNED           // Package returned to sender
}