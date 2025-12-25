package com.tpts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for Rating response
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RatingDTO {

    private Long id;

    // Related entities
    private Long parcelId;
    private String trackingNumber;
    private Long customerId;
    private String customerName;
    private Long companyId;
    private String companyName;
    private Long agentId;
    private String agentName;

    // Company ratings
    private Integer companyRating;
    private String companyReview;
    private Integer companyPackagingRating;
    private Integer companyPricingRating;
    private Integer companyCommunicationRating;
    private Double averageCompanyRating;

    // Agent ratings
    private Integer agentRating;
    private String agentReview;
    private Integer agentPunctualityRating;
    private Integer agentBehaviorRating;
    private Integer agentHandlingRating;
    private Double averageAgentRating;

    // Overall
    private Integer overallRating;
    private String overallReview;
    private Boolean wouldRecommend;

    // Tags
    private String positiveTags;
    private String negativeTags;
    private String suggestions;

    // Media
    private String imageUrls;

    // Company response
    private String companyResponse;
    private LocalDateTime companyRespondedAt;

    // Status
    private Boolean isPublic;
    private Boolean isVerified;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Helper flags
    private Boolean hasAgentRating;
    private Boolean hasCompanyResponse;
}