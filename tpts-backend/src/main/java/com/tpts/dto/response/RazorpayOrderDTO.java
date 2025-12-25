package com.tpts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for Razorpay Order Creation Response
 * This is sent to frontend to initiate Razorpay checkout
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RazorpayOrderDTO {

    // Payment ID in our system
    private Long paymentId;

    // Razorpay order details
    private String razorpayOrderId;
    private String razorpayKeyId;  // Public key for frontend

    // Amount in paise (Razorpay expects amount in smallest currency unit)
    private Long amountInPaise;
    private BigDecimal amount;
    private String currency;

    // Prefill information for checkout
    private String customerName;
    private String customerEmail;
    private String customerPhone;

    // Order details
    private String description;
    private String trackingNumber;

    // For COD
    private Boolean isCod;
    // Add these fields to your existing RazorpayOrderDTO class

    /**
     * Base64 encoded QR code for UPI payments
     */
    private String qrCodeBase64;

    /**
     * UPI payment string for manual copy
     */
    private String upiPaymentString;

}