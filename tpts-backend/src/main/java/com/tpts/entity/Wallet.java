package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Wallet Entity
 * Tracks balance for Platform, Companies, and Agents
 */
@Entity
@Table(name = "wallets", indexes = {
        @Index(name = "idx_wallet_user", columnList = "user_id"),
        @Index(name = "idx_wallet_type", columnList = "wallet_type")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "wallet_type", nullable = false)
    private WalletType walletType;

    // Current available balance (can be withdrawn)
    @Column(name = "available_balance", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal availableBalance = BigDecimal.ZERO;

    // Pending balance (from recent orders, not yet cleared)
    @Column(name = "pending_balance", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal pendingBalance = BigDecimal.ZERO;

    // Total earnings (lifetime)
    @Column(name = "total_earnings", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalEarnings = BigDecimal.ZERO;

    // Total withdrawn (lifetime)
    @Column(name = "total_withdrawn", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalWithdrawn = BigDecimal.ZERO;

    // Currency (default INR)
    @Column(length = 3)
    @Builder.Default
    private String currency = "INR";

    // Is wallet active
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

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
     * Add to pending balance (when order is placed)
     */
    public void addPendingAmount(BigDecimal amount) {
        this.pendingBalance = this.pendingBalance.add(amount);
    }

    /**
     * Move pending to available (when order is delivered)
     */
    public void clearPendingToAvailable(BigDecimal amount) {
        if (this.pendingBalance.compareTo(amount) >= 0) {
            this.pendingBalance = this.pendingBalance.subtract(amount);
            this.availableBalance = this.availableBalance.add(amount);
            this.totalEarnings = this.totalEarnings.add(amount);
        }
    }

    /**
     * Withdraw from available balance
     */
    public boolean withdraw(BigDecimal amount) {
        if (this.availableBalance.compareTo(amount) >= 0) {
            this.availableBalance = this.availableBalance.subtract(amount);
            this.totalWithdrawn = this.totalWithdrawn.add(amount);
            return true;
        }
        return false;
    }

    /**
     * Get total balance (available + pending)
     */
    public BigDecimal getTotalBalance() {
        return this.availableBalance.add(this.pendingBalance);
    }

    /**
     * Check if can withdraw amount
     */
    public boolean canWithdraw(BigDecimal amount) {
        return this.isActive && this.availableBalance.compareTo(amount) >= 0;
    }
}