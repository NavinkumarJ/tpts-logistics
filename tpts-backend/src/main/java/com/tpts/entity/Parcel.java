package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Parcel Entity - Core entity for shipments
 * Contains pickup, delivery, pricing, and tracking information
 */
@Entity
@Table(name = "parcels", indexes = {
        @Index(name = "idx_parcel_tracking", columnList = "tracking_number"),
        @Index(name = "idx_parcel_customer", columnList = "customer_id"),
        @Index(name = "idx_parcel_company", columnList = "company_id"),
        @Index(name = "idx_parcel_agent", columnList = "agent_id"),
        @Index(name = "idx_parcel_status", columnList = "status"),
        @Index(name = "idx_parcel_delivery_phone", columnList = "delivery_phone")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Parcel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_number", unique = true, nullable = false, length = 20)
    private String trackingNumber;

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private CompanyAdmin company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id")
    private DeliveryAgent agent;

    @Column(name = "group_shipment_id")
    private Long groupShipmentId;

    // ==========================================
    // Pickup (Sender) Details
    // ==========================================
    @Column(name = "pickup_name", nullable = false, length = 100)
    private String pickupName;

    @Column(name = "pickup_phone", nullable = false, length = 15)
    private String pickupPhone;

    @Column(name = "pickup_address", nullable = false, columnDefinition = "TEXT")
    private String pickupAddress;

    @Column(name = "pickup_city", nullable = false, length = 100)
    private String pickupCity;

    @Column(name = "pickup_state", length = 100)
    private String pickupState;

    @Column(name = "pickup_pincode", nullable = false, length = 10)
    private String pickupPincode;

    @Column(name = "pickup_latitude", precision = 10, scale = 8)
    private BigDecimal pickupLatitude;

    @Column(name = "pickup_longitude", precision = 11, scale = 8)
    private BigDecimal pickupLongitude;

    // ==========================================
    // Delivery (Receiver) Details
    // ==========================================
    @Column(name = "delivery_name", nullable = false, length = 100)
    private String deliveryName;

    @Column(name = "delivery_phone", nullable = false, length = 15)
    private String deliveryPhone;

    @Column(name = "delivery_address", nullable = false, columnDefinition = "TEXT")
    private String deliveryAddress;

    @Column(name = "delivery_city", nullable = false, length = 100)
    private String deliveryCity;

    @Column(name = "delivery_state", length = 100)
    private String deliveryState;

    @Column(name = "delivery_pincode", nullable = false, length = 10)
    private String deliveryPincode;

    @Column(name = "delivery_latitude", precision = 10, scale = 8)
    private BigDecimal deliveryLatitude;

    @Column(name = "delivery_longitude", precision = 11, scale = 8)
    private BigDecimal deliveryLongitude;

    // ==========================================
    // Package Details
    // ==========================================
    @Enumerated(EnumType.STRING)
    @Column(name = "package_type", length = 20)
    @Builder.Default
    private PackageType packageType = PackageType.SMALL;

    @Column(name = "weight_kg", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal weightKg = BigDecimal.ONE;

    @Column(length = 50)
    private String dimensions;

    @Column(name = "is_fragile")
    @Builder.Default
    private Boolean isFragile = false;

    @Column(name = "special_instructions", columnDefinition = "TEXT")
    private String specialInstructions;

    // ==========================================
    // Pricing
    // ==========================================
    @Column(name = "distance_km", precision = 10, scale = 2)
    private BigDecimal distanceKm;

    @Column(name = "base_price", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal basePrice = BigDecimal.ZERO;

    @Column(name = "discount_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "final_price", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal finalPrice = BigDecimal.ZERO;

    // ==========================================
    // Status & Tracking
    // ==========================================
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ParcelStatus status = ParcelStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", length = 20)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    // OTP for pickup and delivery verification
    @Column(name = "pickup_otp", length = 6)
    private String pickupOtp;

    @Column(name = "delivery_otp", length = 6)
    private String deliveryOtp;

    // Proof of delivery
    @Column(name = "pickup_photo_url", length = 500)
    private String pickupPhotoUrl;

    @Column(name = "delivery_photo_url", length = 500)
    private String deliveryPhotoUrl;

    @Column(name = "signature_url", length = 500)
    private String signatureUrl;

    @Column(name = "delivery_notes", columnDefinition = "TEXT")
    private String deliveryNotes;

    // ==========================================
    // Timestamps
    // ==========================================
    @Column(name = "estimated_delivery")
    private LocalDateTime estimatedDelivery;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "picked_up_at")
    private LocalDateTime pickedUpAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

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
}
