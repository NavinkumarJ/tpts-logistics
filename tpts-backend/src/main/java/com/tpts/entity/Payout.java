package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Payout Entity
 * Tracks withdrawal/payout requests
 */
@Entity
@Table(name = "payouts", indexes = {
        @Index(name = "idx_payout_user", columnList = "user_id"),
        @Index(name = "idx_payout_wallet", columnList = "wallet_id"),
        @Index(name = "idx_payout_status", columnList = "status"),
        @Index(name = "idx_payout_created", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payout {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Unique payout ID
    @Column(name = "payout_id", unique = true, nullable = false, length = 30)
    private String payoutId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    // Amount requested
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    // Status
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PayoutStatus status = PayoutStatus.REQUESTED;

    // Bank Details
    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "account_number", length = 50)
    private String accountNumber;

    @Column(name = "ifsc_code", length = 20)
    private String ifscCode;

    @Column(name = "account_holder_name", length = 100)
    private String accountHolderName;

    // UPI ID (alternative to bank)
    @Column(name = "upi_id", length = 100)
    private String upiId;

    // Payout method
    @Enumerated(EnumType.STRING)
    @Column(name = "payout_method")
    @Builder.Default
    private PayoutMethod payoutMethod = PayoutMethod.BANK_TRANSFER;

    // Processing details
    @Column(name = "processed_by")
    private Long processedBy; // Super Admin who processed

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "transaction_reference", length = 100)
    private String transactionReference; // UTR/Reference number

    // Rejection details
    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    // Notes
    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ==========================================
    // Helper Methods
    // ==========================================

    /**
     * Generate payout ID
     */
    public static String generatePayoutId() {
        return "PAY" + System.currentTimeMillis() + String.format("%04d", (int)(Math.random() * 10000));
    }

    /**
     * Mark as processing
     */
    public void markAsProcessing(Long adminId) {
        this.status = PayoutStatus.PROCESSING;
        this.processedBy = adminId;
    }

    /**
     * Mark as completed
     */
    public void markAsCompleted(String transactionRef) {
        this.status = PayoutStatus.COMPLETED;
        this.processedAt = LocalDateTime.now();
        this.transactionReference = transactionRef;
    }

    /**
     * Mark as rejected
     */
    public void markAsRejected(String reason, Long adminId) {
        this.status = PayoutStatus.REJECTED;
        this.rejectionReason = reason;
        this.processedBy = adminId;
        this.processedAt = LocalDateTime.now();
    }

    /**
     * Check if can be cancelled
     */
    public boolean canBeCancelled() {
        return this.status == PayoutStatus.REQUESTED;
    }

    /**
     * Get masked account number
     */
    public String getMaskedAccountNumber() {
        if (accountNumber == null || accountNumber.length() < 4) {
            return "****";
        }
        return "****" + accountNumber.substring(accountNumber.length() - 4);
    }
}