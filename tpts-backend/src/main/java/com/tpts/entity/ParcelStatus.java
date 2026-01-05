package com.tpts.entity;

/**
 * Enum for Parcel Status
 * Tracks the lifecycle of a parcel from creation to delivery
 */
public enum ParcelStatus {
    PENDING, // Order placed, awaiting confirmation
    CONFIRMED, // Payment confirmed, ready for pickup
    ASSIGNED, // Agent assigned for pickup
    PICKED_UP, // Package picked up from sender
    IN_TRANSIT, // Package in transit to destination (regular orders)
    IN_TRANSIT_TO_WAREHOUSE, // Group Buy: Agent 1 bringing to warehouse
    AT_WAREHOUSE, // Group Buy: Parcel at sorting facility
    OUT_FOR_DELIVERY, // Out for final delivery (Agent 2 for group buy)
    DELIVERED, // Successfully delivered
    CANCELLED, // Order cancelled
    RETURNED // Package returned to sender
}