package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Transaction Entity
 * Tracks all money movements in the system
 */
@Entity
@Table(name = "transactions", indexes = {
        @Index(name = "idx_transaction_wallet", columnList = "wallet_id"),
        @Index(name = "idx_transaction_type", columnList = "transaction_type"),
        @Index(name = "idx_transaction_reference", columnList = "reference_type, reference_id"),
        @Index(name = "idx_transaction_created", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Unique transaction ID
    @Column(name = "transaction_id", unique = true, nullable = false, length = 30)
    private String transactionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    private TransactionType transactionType;

    // Amount (always positive, type determines credit/debit)
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    // Balance after this transaction
    @Column(name = "balance_after", precision = 12, scale = 2)
    private BigDecimal balanceAfter;

    // Description
    @Column(length = 500)
    private String description;

    // Reference to related entity (Parcel, Payment, Payout, etc.)
    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id")
    private Long referenceId;

    // For transfers: the other wallet involved
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_wallet_id")
    private Wallet relatedWallet;

    // Status
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TransactionStatus status = TransactionStatus.COMPLETED;

    // Metadata (JSON for additional info)
    @Column(columnDefinition = "TEXT")
    private String metadata;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // ==========================================
    // Helper Methods
    // ==========================================

    /**
     * Check if this is a credit transaction
     */
    public boolean isCredit() {
        return transactionType == TransactionType.EARNING ||
                transactionType == TransactionType.COMMISSION ||
                transactionType == TransactionType.REFUND ||
                transactionType == TransactionType.BONUS ||
                transactionType == TransactionType.ADJUSTMENT_CREDIT;
    }

    /**
     * Check if this is a debit transaction
     */
    public boolean isDebit() {
        return transactionType == TransactionType.PAYOUT ||
                transactionType == TransactionType.WITHDRAWAL ||
                transactionType == TransactionType.PLATFORM_FEE ||
                transactionType == TransactionType.ADJUSTMENT_DEBIT;
    }

    /**
     * Generate transaction ID
     */
    public static String generateTransactionId() {
        return "TXN" + System.currentTimeMillis() + String.format("%04d", (int)(Math.random() * 10000));
    }
}