package com.tpts.dto.response;

import com.tpts.entity.AssignmentStatus;
import com.tpts.entity.ParcelStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO for Delivery Request response
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryRequestDTO {

    private Long id;

    // Parcel info
    private Long parcelId;
    private String trackingNumber;
    private ParcelStatus parcelStatus;

    // Pickup details
    private String pickupName;
    private String pickupPhone;
    private String pickupAddress;
    private String pickupCity;
    private String pickupPincode;

    // Delivery details
    private String deliveryName;
    private String deliveryPhone;
    private String deliveryAddress;
    private String deliveryCity;
    private String deliveryPincode;

    // Package info
    private String packageType;
    private BigDecimal weightKg;
    private Boolean isFragile;
    private String specialInstructions;

    // Distance & Earnings
    private BigDecimal distanceKm;
    private BigDecimal estimatedEarnings;

    // Company info
    private Long companyId;
    private String companyName;

    // Agent info
    private Long assignedAgentId;
    private String assignedAgentName;
    private String assignedAgentPhone;

    // Assignment details
    private AssignmentStatus assignmentStatus;
    private Integer priority;
    private Integer attemptCount;
    private String companyNotes;
    private String rejectionReason;

    // Timestamps
    private LocalDateTime assignedAt;
    private LocalDateTime agentResponseAt;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;

    // Helper flags
    private Boolean canRespond;
    private Boolean needsReassignment;
}