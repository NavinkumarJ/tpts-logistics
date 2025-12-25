package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Payment Entity
 * Handles payment transactions with Razorpay integration
 */
@Entity
@Table(name = "payments", indexes = {
        @Index(name = "idx_payment_parcel", columnList = "parcel_id"),
        @Index(name = "idx_payment_customer", columnList = "customer_id"),
        @Index(name = "idx_payment_company", columnList = "company_id"),
        @Index(name = "idx_payment_status", columnList = "status"),
        @Index(name = "idx_payment_razorpay_order", columnList = "razorpay_order_id"),
        @Index(name = "idx_payment_razorpay_payment", columnList = "razorpay_payment_id"),
        @Index(name = "idx_payment_razorpay_refund", columnList = "razorpay_refund_id")  // ✅ ADDED INDEX
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ==========================================
    // Related Entities
    // ==========================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parcel_id", nullable = false)
    private Parcel parcel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private CompanyAdmin company;

    // ==========================================
    // Payment Amount Details
    // ==========================================

    @Column(name = "base_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseAmount;

    @Column(name = "discount_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "tax_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "convenience_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal convenienceFee = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "paid_amount", precision = 10, scale = 2)
    private BigDecimal paidAmount;

    @Column(name = "currency", length = 3)
    @Builder.Default
    private String currency = "INR";

    // ==========================================
    // Payment Status & Method
    // ==========================================

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 20)
    private PaymentMethod paymentMethod;

    // ==========================================
    // Razorpay Integration
    // ==========================================

    @Column(name = "razorpay_order_id", length = 50)
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id", length = 50)
    private String razorpayPaymentId;

    @Column(name = "razorpay_signature", length = 100)
    private String razorpaySignature;

    @Column(name = "razorpay_refund_id", length = 50)  // ✅ ADDED THIS FIELD
    private String razorpayRefundId;

    // ==========================================
    // Payment Split Fields (Platform + Company + Agents)
    // ==========================================

    @Column(name = "platform_commission", precision = 10, scale = 2)
    private BigDecimal platformCommission;

    @Column(name = "company_earnings", precision = 10, scale = 2)
    private BigDecimal companyEarnings;

    @Column(name = "pickup_agent_earnings", precision = 10, scale = 2)
    private BigDecimal pickupAgentEarnings;

    @Column(name = "delivery_agent_earnings", precision = 10, scale = 2)
    private BigDecimal deliveryAgentEarnings;

    @Column(name = "is_group_buy")
    @Builder.Default
    private Boolean isGroupBuy = false;

    @Column(name = "split_completed")
    @Builder.Default
    private Boolean splitCompleted = false;

    @Column(name = "split_at")
    private LocalDateTime splitAt;

    // ==========================================
    // Refund Details
    // ==========================================

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_status", length = 20)
    private RefundStatus refundStatus;

    @Column(name = "refund_id", length = 50)
    private String refundId;

    @Column(name = "refund_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal refundAmount = BigDecimal.ZERO;  // ✅ ADDED DEFAULT

    @Column(name = "refund_reason", length = 500)
    private String refundReason;

    @Column(name = "refunded_at")
    private LocalDateTime refundedAt;

    // ==========================================
    // Transaction Details
    // ==========================================

    @Column(name = "transaction_id", length = 100)
    private String transactionId;

    @Column(name = "bank_reference", length = 100)
    private String bankReference;

    @Column(name = "payment_description", length = 500)
    private String paymentDescription;

    // ==========================================
    // Error Handling
    // ==========================================

    @Column(name = "error_code", length = 50)
    private String errorCode;

    @Column(name = "error_description", length = 500)
    private String errorDescription;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    // ==========================================
    // Timestamps
    // ==========================================

    @Column(name = "initiated_at")
    private LocalDateTime initiatedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (initiatedAt == null) {
            initiatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    public boolean isSuccessful() {
        return status == PaymentStatus.SUCCESS;
    }

    public boolean isPending() {
        return status == PaymentStatus.PENDING || status == PaymentStatus.PROCESSING;
    }

    public boolean canBeRefunded() {
        return status == PaymentStatus.SUCCESS &&
                (refundAmount == null || refundAmount.compareTo(totalAmount) < 0);
    }

    public BigDecimal getRemainingRefundableAmount() {
        if (refundAmount == null) {
            return totalAmount;
        }
        return totalAmount.subtract(refundAmount);
    }

    public void calculateTotalAmount() {
        this.totalAmount = baseAmount
                .subtract(discountAmount != null ? discountAmount : BigDecimal.ZERO)
                .add(taxAmount != null ? taxAmount : BigDecimal.ZERO)
                .add(convenienceFee != null ? convenienceFee : BigDecimal.ZERO);
    }

    // ✅ ADDED: Getter for amount (used by NotificationService)
    public BigDecimal getAmount() {
        return this.totalAmount;
    }

    // ✅ ADDED: Getter for refundedAmount (used by webhook)
    public BigDecimal getRefundedAmount() {
        return this.refundAmount != null ? this.refundAmount : BigDecimal.ZERO;
    }

    // ✅ ADDED: Setter for refundedAmount
    public void setRefundedAmount(BigDecimal amount) {
        this.refundAmount = amount;
    }
}
