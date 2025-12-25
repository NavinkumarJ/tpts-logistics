package com.tpts.entity;

/**
 * Transaction Status Enum
 */
public enum TransactionStatus {
    PENDING,        // Transaction initiated
    COMPLETED,      // Transaction completed
    FAILED,         // Transaction failed
    REVERSED,       // Transaction reversed
    CANCELLED       // Transaction cancelled
}