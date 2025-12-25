package com.tpts.entity;

/**
 * Payout Status Enum
 */
public enum PayoutStatus {
    REQUESTED,      // Payout requested by user
    PROCESSING,     // Being processed by admin
    COMPLETED,      // Payout completed (money transferred)
    REJECTED,       // Payout rejected
    CANCELLED,      // Cancelled by user
    FAILED          // Payout failed
}