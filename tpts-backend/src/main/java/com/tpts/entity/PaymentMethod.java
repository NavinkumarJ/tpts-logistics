package com.tpts.entity;

/**
 * Enum for Payment Methods
 */
public enum PaymentMethod {
    UPI,          // UPI payment (Google Pay, PhonePe, Paytm, etc.)
    CARD,         // Credit/Debit Card
    NETBANKING,   // Net Banking
    WALLET,       // Digital Wallets
    COD           // Cash on Delivery
}