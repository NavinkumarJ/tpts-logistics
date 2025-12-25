package com.tpts.entity;

/**
 * Enum for Payment Status
 */
public enum PaymentStatus {
    PENDING,      // Payment initiated, awaiting completion
    PROCESSING,   // Payment being processed by gateway
    SUCCESS,      // Payment successful
    CAPTURED,     // ✅ ADD THIS - Razorpay payment captured via webhook
    FAILED,       // Payment failed
    CANCELLED,    // Payment cancelled by user
    REFUND_INITIATED, // Refund process started
    REFUNDED,     // Full refund completed
    PARTIALLY_REFUNDED // Partial refund completed
}
