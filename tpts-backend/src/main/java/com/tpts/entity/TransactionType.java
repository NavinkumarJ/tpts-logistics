package com.tpts.entity;

/**
 * Transaction Type Enum
 */
public enum TransactionType {
    // Credits (Money In)
    EARNING,            // Agent earns from delivery
    COMMISSION,         // Company earns from delivery (after platform fee)
    PLATFORM_COMMISSION,// Platform earns commission
    REFUND,             // Refund credited back
    BONUS,              // Bonus/incentive added
    ADJUSTMENT_CREDIT,  // Manual credit adjustment

    // Debits (Money Out)
    PAYOUT,             // Payout to bank account
    WITHDRAWAL,         // Withdrawal request
    PLATFORM_FEE,       // Platform fee deducted
    ADJUSTMENT_DEBIT,   // Manual debit adjustment

    // Transfers
    TRANSFER_IN,        // Transfer received from another wallet
    TRANSFER_OUT        // Transfer sent to another wallet
}