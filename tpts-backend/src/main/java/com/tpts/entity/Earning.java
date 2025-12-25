package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Earning Entity
 * Detailed record of earnings per delivery for Company and Agent
 */
@Entity
@Table(name = "earnings", indexes = {
        @Index(name = "idx_earning_parcel", columnList = "parcel_id"),
        @Index(name = "idx_earning_company", columnList = "company_id"),
        @Index(name = "idx_earning_agent", columnList = "agent_id"),
        @Index(name = "idx_earning_status", columnList = "status"),
        @Index(name = "idx_earning_created", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Earning {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parcel_id", nullable = false)
    private Parcel parcel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private CompanyAdmin company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id")
    private DeliveryAgent agent;

    // Original order amount (what customer paid)
    @Column(name = "order_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal orderAmount;

    // Platform commission rate (%)
    @Column(name = "platform_commission_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal platformCommissionRate = new BigDecimal("10.00");

    // Platform commission amount
    @Column(name = "platform_commission", nullable = false, precision = 12, scale = 2)
    private BigDecimal platformCommission;

    // Company earning (after platform fee)
    @Column(name = "company_earning", nullable = false, precision = 12, scale = 2)
    private BigDecimal companyEarning;

    // Agent commission rate (% of company earning)
    @Column(name = "agent_commission_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal agentCommissionRate = new BigDecimal("20.00");

    // Agent earning
    @Column(name = "agent_earning", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal agentEarning = BigDecimal.ZERO;

    // Company net earning (company earning - agent earning)
    @Column(name = "company_net_earning", precision = 12, scale = 2)
    private BigDecimal companyNetEarning;

    // Bonus for agent (if any)
    @Column(name = "agent_bonus", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal agentBonus = BigDecimal.ZERO;

    // Tip from customer (if any)
    @Column(name = "customer_tip", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal customerTip = BigDecimal.ZERO;

    // Status
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EarningStatus status = EarningStatus.PENDING;

    // When earning was cleared to wallet
    @Column(name = "cleared_at")
    private LocalDateTime clearedAt;

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
     * Calculate all earnings from order amount
     * Split: Platform 10%, Agent 20%, Company 70% of total
     */
    public void calculateEarnings() {
        // Platform commission (10% of total)
        this.platformCommission = this.orderAmount
                .multiply(this.platformCommissionRate)
                .divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);

        // Agent earning (20% of TOTAL, not of company's share)
        if (this.agent != null && this.agentCommissionRate != null) {
            this.agentEarning = this.orderAmount
                    .multiply(this.agentCommissionRate)
                    .divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
        }

        // Company earning = Total - Platform - Agent (remaining 70%)
        this.companyEarning = this.orderAmount.subtract(this.platformCommission);
        this.companyNetEarning = this.companyEarning.subtract(this.agentEarning);
    }

    /**
     * Get total agent earning (base + bonus + tip)
     */
    public BigDecimal getTotalAgentEarning() {
        return this.agentEarning
                .add(this.agentBonus != null ? this.agentBonus : BigDecimal.ZERO)
                .add(this.customerTip != null ? this.customerTip : BigDecimal.ZERO);
    }

    /**
     * Mark as cleared
     */
    public void markAsCleared() {
        this.status = EarningStatus.CLEARED;
        this.clearedAt = LocalDateTime.now();
    }
}