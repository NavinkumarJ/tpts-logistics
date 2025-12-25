package com.tpts.entity;

/**
 * Earning Status Enum
 */
public enum EarningStatus {
    PENDING,        // Order delivered, earning pending clearance
    CLEARED,        // Earning cleared to wallet (available for withdrawal)
    ON_HOLD,        // Earning on hold (dispute, etc.)
    CANCELLED       // Earning cancelled (order refunded)
}