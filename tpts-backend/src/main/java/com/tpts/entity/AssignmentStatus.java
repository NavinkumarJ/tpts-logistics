package com.tpts.entity;

/**
 * Enum for Delivery Request Assignment Status
 * Tracks the assignment workflow between company and agent
 */
public enum AssignmentStatus {
    PENDING,         // Company assigned, waiting for agent response
    ACCEPTED,        // Agent accepted the delivery
    REJECTED,        // Agent rejected the delivery
    REASSIGN_NEEDED, // Rejected, company needs to reassign
    CANCELLED,       // Cancelled by company
    COMPLETED        // Delivery completed
}