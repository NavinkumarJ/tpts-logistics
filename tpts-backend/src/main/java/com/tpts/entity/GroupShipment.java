package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * GroupShipment Entity - Group buying for shipments
 * Company creates groups, customers join to save 20-40%
 * Two Agents Model: Pickup Agent + Delivery Agent
 */
@Entity
@Table(name = "group_shipments", indexes = {
        @Index(name = "idx_group_code", columnList = "group_code"),
        @Index(name = "idx_group_company", columnList = "company_id"),
        @Index(name = "idx_group_status", columnList = "status"),
        @Index(name = "idx_group_source_city", columnList = "source_city"),
        @Index(name = "idx_group_target_city", columnList = "target_city")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupShipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Unique group code (e.g., GRP123456)
    @Column(name = "group_code", unique = true, nullable = false, length = 10)
    private String groupCode;

    // Company that created this group
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private CompanyAdmin company;

    // ==========================================
    // Two Agents Model
    // ==========================================

    // Agent 1: Collects all packages from senders → Company office
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pickup_agent_id")
    private DeliveryAgent pickupAgent;

    // Agent 2: Delivers all packages from company office → Receivers
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_agent_id")
    private DeliveryAgent deliveryAgent;

    // ==========================================
    // Route Information
    // ==========================================

    @Column(name = "source_city", nullable = false, length = 100)
    private String sourceCity;

    @Column(name = "target_city", nullable = false, length = 100)
    private String targetCity;

    // Source pincode area (optional, for more specific grouping)
    @Column(name = "source_pincode", length = 10)
    private String sourcePincode;

    // Target pincode area (optional)
    @Column(name = "target_pincode", length = 10)
    private String targetPincode;

    // ==========================================
    // Warehouse Information (Two-Agent Model)
    // ==========================================

    @Column(name = "warehouse_address", columnDefinition = "TEXT")
    private String warehouseAddress;

    @Column(name = "warehouse_city", length = 100)
    private String warehouseCity;

    @Column(name = "warehouse_pincode", length = 10)
    private String warehousePincode;

    @Column(name = "warehouse_latitude", precision = 10, scale = 8)
    private BigDecimal warehouseLatitude;

    @Column(name = "warehouse_longitude", precision = 11, scale = 8)
    private BigDecimal warehouseLongitude;

    @Column(name = "warehouse_arrival_photo_url", length = 500)
    private String warehouseArrivalPhotoUrl;

    // Agent live location tracking
    @Column(name = "pickup_agent_latitude")
    private Double pickupAgentLatitude;

    @Column(name = "pickup_agent_longitude")
    private Double pickupAgentLongitude;

    @Column(name = "delivery_agent_latitude")
    private Double deliveryAgentLatitude;

    @Column(name = "delivery_agent_longitude")
    private Double deliveryAgentLongitude;

    // ==========================================
    // Group Configuration
    // ==========================================

    @Column(name = "target_members", nullable = false)
    private Integer targetMembers; // 10, 15, 20

    @Column(name = "current_members")
    @Builder.Default
    private Integer currentMembers = 0;

    @Column(name = "discount_percentage", precision = 5, scale = 2, nullable = false)
    private BigDecimal discountPercentage; // 20-40%

    // Effective discount after pro-rating (for partial groups)
    @Column(name = "effective_discount_percentage", precision = 5, scale = 2)
    private BigDecimal effectiveDiscountPercentage;

    // Fill percentage when deadline was reached
    @Column(name = "fill_percentage", precision = 5, scale = 2)
    private BigDecimal fillPercentage;

    // Group deadline
    @Column(nullable = false)
    private LocalDateTime deadline;

    // ==========================================
    // Status
    // ==========================================

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    @Builder.Default
    private GroupStatus status = GroupStatus.OPEN;

    // ==========================================
    // Timestamps
    // ==========================================

    @Column(name = "pickup_started_at")
    private LocalDateTime pickupStartedAt;

    @Column(name = "pickup_completed_at")
    private LocalDateTime pickupCompletedAt;

    @Column(name = "delivery_started_at")
    private LocalDateTime deliveryStartedAt;

    @Column(name = "delivery_completed_at")
    private LocalDateTime deliveryCompletedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    public boolean isFull() {
        return currentMembers >= targetMembers;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(deadline);
    }

    public boolean canJoin() {
        return status == GroupStatus.OPEN && !isFull() && !isExpired();
    }

    public int getRemainingSlots() {
        return Math.max(0, targetMembers - currentMembers);
    }
}