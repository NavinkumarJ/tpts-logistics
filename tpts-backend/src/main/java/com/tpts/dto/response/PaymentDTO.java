package com.tpts.dto.response;

import com.tpts.entity.PaymentMethod;
import com.tpts.entity.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO for Payment response
 * ENHANCED: Added UPI QR Code support
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentDTO {

    private Long id;

    // Related entities
    private Long parcelId;
    private String trackingNumber;
    private Long customerId;
    private String customerName;
    private Long companyId;
    private String companyName;

    // Amount details
    private BigDecimal baseAmount;
    private BigDecimal discountAmount;
    private BigDecimal taxAmount;
    private BigDecimal convenienceFee;
    private BigDecimal totalAmount;
    private String currency;

    // Formatted amounts for display
    private String totalAmountFormatted;

    // Status & Method
    private PaymentStatus status;
    private PaymentMethod paymentMethod;

    // Razorpay details (limited for security)
    private String razorpayOrderId;
    private String razorpayPaymentId;

    // ============================================
    // NEW: UPI QR Code Support
    // ============================================
    /**
     * Base64 encoded QR code image for UPI payments
     * Frontend can display this directly:
     * <img src="data:image/png;base64,{qrCodeBase64}" />
     */
    private String qrCodeBase64;

    /**
     * UPI payment string (for manual copy-paste)
     * Format: upi://pay?pa=merchant@upi&pn=MerchantName&am=100.00&tr=TRK123&tn=Payment
     */
    private String upiPaymentString;

    // Refund details
    private String refundId;
    private BigDecimal refundAmount;
    private String refundReason;
    private LocalDateTime refundedAt;

    // Transaction details
    private String transactionId;
    private String paymentDescription;

    // Error info (only if failed)
    private String errorCode;
    private String errorDescription;

    // Timestamps
    private LocalDateTime initiatedAt;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;

    // Helper flags
    private Boolean isSuccessful;
    private Boolean isPending;
    private Boolean canBeRefunded;
    private BigDecimal remainingRefundableAmount;
}