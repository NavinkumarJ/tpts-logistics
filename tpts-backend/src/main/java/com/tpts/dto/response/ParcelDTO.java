package com.tpts.dto.response;

import com.tpts.entity.PackageType;
import com.tpts.entity.ParcelStatus;
import com.tpts.entity.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO for Parcel response
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParcelDTO {

    private Long id;
    private String trackingNumber;

    // References
    private Long customerId;
    private String customerName;
    private Long companyId;
    private String companyName;
    private Long agentId;
    private String agentName;
    private Long groupShipmentId;

    // Pickup details
    private String pickupName;
    private String pickupPhone;
    private String pickupAddress;
    private String pickupCity;
    private String pickupState;
    private String pickupPincode;
    private BigDecimal pickupLatitude;
    private BigDecimal pickupLongitude;

    // Delivery details
    private String deliveryName;
    private String deliveryPhone;
    private String deliveryAddress;
    private String deliveryCity;
    private String deliveryState;
    private String deliveryPincode;
    private BigDecimal deliveryLatitude;
    private BigDecimal deliveryLongitude;

    // Package details
    private PackageType packageType;
    private BigDecimal weightKg;
    private String dimensions;
    private Boolean isFragile;
    private String specialInstructions;

    // Pricing
    private BigDecimal distanceKm;
    private BigDecimal basePrice;
    private BigDecimal discountAmount;
    private BigDecimal finalPrice;
    private BigDecimal taxAmount; // GST amount
    private BigDecimal totalAmount; // Total including GST

    // Status
    private ParcelStatus status;
    private PaymentStatus paymentStatus;
    private String paymentMethod; // Mode of payment (UPI, CARD, RAZORPAY, etc.)
    private String pickupOtp;
    private String deliveryOtp;

    // Proof of delivery
    private String pickupPhotoUrl;
    private String deliveryPhotoUrl;
    private String signatureUrl;
    private String deliveryNotes;

    // Timestamps
    private LocalDateTime estimatedDelivery;
    private LocalDateTime confirmedAt;
    private LocalDateTime assignedAt;
    private LocalDateTime pickedUpAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime cancelledAt;
    private String cancellationReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Rating status
    private Boolean hasRated;

    // Agent details for tracking
    private String agentPhone;
    private String agentVehicleType;
    private String agentVehicleNumber;
    private Double agentRating;
    private Integer agentTotalRatings;

    // Company rating
    private Double companyRating;
    private Integer companyTotalRatings;
}