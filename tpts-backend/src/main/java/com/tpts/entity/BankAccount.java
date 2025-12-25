package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Bank Account Entity
 * Stores bank account details for payouts
 */
@Entity
@Table(name = "bank_accounts", indexes = {
        @Index(name = "idx_bank_user", columnList = "user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Bank Details
    @Column(name = "bank_name", nullable = false, length = 100)
    private String bankName;

    @Column(name = "branch_name", length = 100)
    private String branchName;

    @Column(name = "account_number", nullable = false, length = 50)
    private String accountNumber;

    @Column(name = "ifsc_code", nullable = false, length = 20)
    private String ifscCode;

    @Column(name = "account_holder_name", nullable = false, length = 100)
    private String accountHolderName;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type")
    @Builder.Default
    private AccountType accountType = AccountType.SAVINGS;

    // UPI ID (alternative)
    @Column(name = "upi_id", length = 100)
    private String upiId;

    // Verification
    @Column(name = "is_verified")
    @Builder.Default
    private Boolean isVerified = false;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    // Is this the primary/default account
    @Column(name = "is_primary")
    @Builder.Default
    private Boolean isPrimary = false;

    // Is active
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    // Label (e.g., "Salary Account", "Business Account")
    @Column(length = 50)
    private String label;

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
     * Get masked account number
     */
    public String getMaskedAccountNumber() {
        if (accountNumber == null || accountNumber.length() < 4) {
            return "****";
        }
        return "****" + accountNumber.substring(accountNumber.length() - 4);
    }

    /**
     * Get display name
     */
    public String getDisplayName() {
        if (label != null && !label.isEmpty()) {
            return label;
        }
        return bankName + " - " + getMaskedAccountNumber();
    }

    /**
     * Mark as verified
     */
    public void markAsVerified() {
        this.isVerified = true;
        this.verifiedAt = LocalDateTime.now();
    }
}