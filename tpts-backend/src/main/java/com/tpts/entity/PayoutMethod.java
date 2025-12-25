package com.tpts.entity;

/**
 * Payout Method Enum
 */
public enum PayoutMethod {
    BANK_TRANSFER,  // Direct bank transfer (NEFT/IMPS/RTGS)
    UPI,            // UPI transfer
    CHEQUE,         // Physical cheque
    CASH            // Cash payment
}