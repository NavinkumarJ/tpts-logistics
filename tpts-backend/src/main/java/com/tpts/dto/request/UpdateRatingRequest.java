package com.tpts.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for updating a rating (customer can edit within 24 hours)
 * PUT /api/ratings/{id}
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateRatingRequest {

    // Company Rating
    @Min(1) @Max(5)
    private Integer companyRating;

    @Size(max = 1000)
    private String companyReview;

    @Min(1) @Max(5)
    private Integer companyPackagingRating;

    @Min(1) @Max(5)
    private Integer companyPricingRating;

    @Min(1) @Max(5)
    private Integer companyCommunicationRating;

    // Agent Rating
    @Min(1) @Max(5)
    private Integer agentRating;

    @Size(max = 1000)
    private String agentReview;

    @Min(1) @Max(5)
    private Integer agentPunctualityRating;

    @Min(1) @Max(5)
    private Integer agentBehaviorRating;

    @Min(1) @Max(5)
    private Integer agentHandlingRating;

    // Overall
    @Min(1) @Max(5)
    private Integer overallRating;

    @Size(max = 2000)
    private String overallReview;

    private Boolean wouldRecommend;

    // Tags
    private String positiveTags;
    private String negativeTags;

    @Size(max = 500)
    private String suggestions;

    private String imageUrls;
    private Boolean isPublic;
}