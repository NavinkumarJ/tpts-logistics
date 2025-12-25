package com.tpts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO for Rating Summary (for company/agent profiles)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RatingSummaryDTO {

    private Long entityId;
    private String entityType; // COMPANY or AGENT
    private String entityName;

    // Overall stats
    private Double averageRating;
    private Long totalRatings;
    private Double recommendationPercentage;

    // Rating distribution (1-5 stars -> count)
    private Map<Integer, Long> ratingDistribution;

    // Percentages by star
    private Map<Integer, Double> ratingPercentages;

    // Recent reviews count
    private Long reviewsWithText;

    // Specific aspect averages (for companies)
    private Double avgPackagingRating;
    private Double avgPricingRating;
    private Double avgCommunicationRating;

    // Specific aspect averages (for agents)
    private Double avgPunctualityRating;
    private Double avgBehaviorRating;
    private Double avgHandlingRating;
}