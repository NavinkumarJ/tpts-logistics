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

    // Warehouse (Two-Agent Model)
    private String warehouseAddress;
    private String warehouseCity;
    private String warehousePincode;
    private BigDecimal warehouseLatitude;
    private BigDecimal warehouseLongitude;

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
    private String pickupAgentPhone;
    private Double pickupAgentLatitude;
    private Double pickupAgentLongitude;
    private Long deliveryAgentId;
    private String deliveryAgentName;
    private String deliveryAgentPhone;
    private Double deliveryAgentLatitude;
    private Double deliveryAgentLongitude;

    // Financials
    private BigDecimal totalGroupValue; // Sum of all parcel values
    private BigDecimal pickupAgentEarnings; // 10% of total for pickup agent
    private BigDecimal deliveryAgentEarnings; // 10% of total for delivery agent

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