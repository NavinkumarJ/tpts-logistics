package com.tpts.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for creating a rating
 * POST /api/ratings
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateRatingRequest {

    @NotNull(message = "Parcel ID is required")
    private Long parcelId;

    // ==========================================
    // Company Rating (Required)
    // ==========================================

    @NotNull(message = "Company rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating cannot exceed 5")
    private Integer companyRating;

    @Size(max = 1000, message = "Review cannot exceed 1000 characters")
    private String companyReview;

    @Min(1) @Max(5)
    private Integer companyPackagingRating;

    @Min(1) @Max(5)
    private Integer companyPricingRating;

    @Min(1) @Max(5)
    private Integer companyCommunicationRating;

    // ==========================================
    // Agent Rating (Optional - only if agent assigned)
    // ==========================================

    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating cannot exceed 5")
    private Integer agentRating;

    @Size(max = 1000, message = "Review cannot exceed 1000 characters")
    private String agentReview;

    @Min(1) @Max(5)
    private Integer agentPunctualityRating;

    @Min(1) @Max(5)
    private Integer agentBehaviorRating;

    @Min(1) @Max(5)
    private Integer agentHandlingRating;

    // ==========================================
    // Overall Rating (Required)
    // ==========================================

    @NotNull(message = "Overall rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating cannot exceed 5")
    private Integer overallRating;

    @Size(max = 2000, message = "Review cannot exceed 2000 characters")
    private String overallReview;

    @Builder.Default
    private Boolean wouldRecommend = true;

    // ==========================================
    // Additional Feedback
    // ==========================================

    // JSON array of positive tags
    // e.g., ["Fast Delivery", "Good Packaging"]
    private String positiveTags;

    // JSON array of negative tags
    private String negativeTags;

    @Size(max = 500, message = "Suggestions cannot exceed 500 characters")
    private String suggestions;

    // JSON array of image URLs
    private String imageUrls;

    // Privacy
    @Builder.Default
    private Boolean isPublic = true;
}