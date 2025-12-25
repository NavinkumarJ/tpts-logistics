package com.tpts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO for Public Group Shipment listing
 * Limited info for customers browsing available groups
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupPublicDTO {

    private Long id;
    private String groupCode;

    // Company info
    private String companyName;
    private BigDecimal companyRating;

    // Route
    private String sourceCity;
    private String targetCity;

    // Group info
    private Integer targetMembers;
    private Integer currentMembers;
    private Integer remainingSlots;
    private BigDecimal discountPercentage;

    // Time remaining
    private LocalDateTime deadline;
    private Long timeRemainingMinutes;
    private String timeRemainingFormatted; // e.g., "2h 34m"

    // Pricing info
    private BigDecimal estimatedSavings; // Example savings amount
}