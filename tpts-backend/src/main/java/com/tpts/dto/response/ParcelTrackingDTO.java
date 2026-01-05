package com.tpts.dto.response;

import com.tpts.entity.ParcelStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for Public Parcel Tracking response
 * Limited information for public access (no login required)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParcelTrackingDTO {

    private String trackingNumber;
    private ParcelStatus status;
    private String statusDescription;

    // Route info
    private String pickupCity;
    private String deliveryCity;

    // Sender info
    private String pickupName;
    private String pickupPhone;
    private String pickupAddress;
    private String pickupPincode;

    // Receiver info
    private String deliveryName;
    private String deliveryPhone;
    private String deliveryAddress;
    private String deliveryPincode;

    // Company info
    private String companyName;
    private BigDecimal companyRating;
    private Integer companyTotalRatings;

    // Agent info (when assigned)
    private AgentPublicDTO agent;

    // Timestamps
    private LocalDateTime estimatedDelivery;
    private LocalDateTime createdAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime assignedAt;
    private LocalDateTime pickedUpAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime updatedAt;

    // Tracking timeline
    private List<TrackingEvent> timeline;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TrackingEvent {
        private ParcelStatus status;
        private String description;
        private String location;
        private LocalDateTime timestamp;
        private Boolean isCompleted;
    }
}