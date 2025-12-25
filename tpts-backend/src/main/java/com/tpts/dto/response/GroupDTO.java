package com.tpts.dto.response;

import com.tpts.entity.GroupStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO for Group Shipment response
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupDTO {

    private Long id;
    private String groupCode;

    // Company info
    private Long companyId;
    private String companyName;
    private BigDecimal companyRating;

    // Route
    private String sourceCity;
    private String targetCity;
    private String sourcePincode;
    private String targetPincode;

    // Group configuration
    private Integer targetMembers;
    private Integer currentMembers;
    private Integer remainingSlots;
    private BigDecimal discountPercentage;
    private LocalDateTime deadline;
    private Long timeRemainingMinutes;

    // Agents (Two Agents Model)
    private Long pickupAgentId;
    private String pickupAgentName;
    private Long deliveryAgentId;
    private String deliveryAgentName;

    // Status
    private GroupStatus status;
    private Boolean canJoin;
    private Boolean isFull;
    private Boolean isExpired;

    // Timestamps
    private LocalDateTime pickupStartedAt;
    private LocalDateTime pickupCompletedAt;
    private LocalDateTime deliveryStartedAt;
    private LocalDateTime deliveryCompletedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}