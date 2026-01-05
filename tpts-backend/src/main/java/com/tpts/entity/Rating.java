package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Rating Entity
 * Handles ratings and reviews for deliveries
 * Customer can rate both company and agent after delivery
 */
@Entity
@Table(name = "ratings", indexes = {
        @Index(name = "idx_rating_parcel", columnList = "parcel_id"),
        @Index(name = "idx_rating_customer", columnList = "customer_id"),
        @Index(name = "idx_rating_company", columnList = "company_id"),
        @Index(name = "idx_rating_agent", columnList = "agent_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_rating_parcel", columnNames = "parcel_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ==========================================
    // Related Entities
    // ==========================================

    // One rating per parcel (unique constraint)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parcel_id", nullable = false, unique = true)
    private Parcel parcel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private CompanyAdmin company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id")
    private DeliveryAgent agent; // Delivery agent

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pickup_agent_id")
    private DeliveryAgent pickupAgent; // Pickup agent (for group shipments)

    // ==========================================
    // Company Rating
    // ==========================================

    @Column(name = "company_rating")
    private Integer companyRating; // 1-5 stars (nullable for agent-only ratings)

    @Column(name = "company_review", columnDefinition = "TEXT")
    private String companyReview;

    // Specific aspects of company service
    @Column(name = "company_packaging_rating")
    private Integer companyPackagingRating; // 1-5

    @Column(name = "company_pricing_rating")
    private Integer companyPricingRating; // 1-5

    @Column(name = "company_communication_rating")
    private Integer companyCommunicationRating; // 1-5

    // ==========================================
    // Agent Rating
    // ==========================================

    @Column(name = "agent_rating")
    private Integer agentRating; // 1-5 stars (optional if no agent)

    @Column(name = "agent_review", columnDefinition = "TEXT")
    private String agentReview;

    // Specific aspects of agent service
    @Column(name = "agent_punctuality_rating")
    private Integer agentPunctualityRating; // 1-5

    @Column(name = "agent_behavior_rating")
    private Integer agentBehaviorRating; // 1-5

    @Column(name = "agent_handling_rating")
    private Integer agentHandlingRating; // 1-5 (package handling)

    // Track which agent type has been rated (for two-agent model)
    @Column(name = "has_rated_pickup_agent")
    @Builder.Default
    private Boolean hasRatedPickupAgent = false;

    @Column(name = "pickup_agent_rating")
    private Integer pickupAgentRating; // 1-5 stars for pickup agent

    @Column(name = "pickup_agent_review", columnDefinition = "TEXT")
    private String pickupAgentReview;

    @Column(name = "has_rated_delivery_agent")
    @Builder.Default
    private Boolean hasRatedDeliveryAgent = false;

    @Column(name = "has_rated_company")
    @Builder.Default
    private Boolean hasRatedCompany = false;

    // ==========================================
    // Overall Experience
    // ==========================================

    @Column(name = "overall_rating")
    private Integer overallRating; // 1-5 stars (nullable for partial ratings)

    @Column(name = "overall_review", columnDefinition = "TEXT")
    private String overallReview;

    // Would recommend?
    @Column(name = "would_recommend")
    @Builder.Default
    private Boolean wouldRecommend = true;

    // ==========================================
    // Additional Feedback
    // ==========================================

    // Tags for quick feedback (JSON array)
    // e.g., ["Fast Delivery", "Good Packaging", "Polite Agent"]
    @Column(name = "positive_tags", columnDefinition = "TEXT")
    private String positiveTags;

    // e.g., ["Late Delivery", "Damaged Package", "Rude Agent"]
    @Column(name = "negative_tags", columnDefinition = "TEXT")
    private String negativeTags;

    // Suggestions for improvement
    @Column(name = "suggestions", columnDefinition = "TEXT")
    private String suggestions;

    // ==========================================
    // Media (Photos of delivery)
    // ==========================================

    // JSON array of image URLs
    @Column(name = "image_urls", columnDefinition = "TEXT")
    private String imageUrls;

    // ==========================================
    // Response from Company/Agent
    // ==========================================

    @Column(name = "company_response", columnDefinition = "TEXT")
    private String companyResponse;

    @Column(name = "company_responded_at")
    private LocalDateTime companyRespondedAt;

    // ==========================================
    // Visibility & Status
    // ==========================================

    @Column(name = "is_public")
    @Builder.Default
    private Boolean isPublic = true; // Show on public profile

    @Column(name = "is_verified")
    @Builder.Default
    private Boolean isVerified = true; // Verified purchase

    @Column(name = "is_flagged")
    @Builder.Default
    private Boolean isFlagged = false; // Flagged for review

    @Column(name = "flag_reason", length = 500)
    private String flagReason;

    // ==========================================
    // Timestamps
    // ==========================================

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    /**
     * Calculate average company rating from all aspects
     */
    public double getAverageCompanyRating() {
        int count = 1;
        int total = companyRating;

        if (companyPackagingRating != null) {
            total += companyPackagingRating;
            count++;
        }
        if (companyPricingRating != null) {
            total += companyPricingRating;
            count++;
        }
        if (companyCommunicationRating != null) {
            total += companyCommunicationRating;
            count++;
        }

        return (double) total / count;
    }

    /**
     * Calculate average agent rating from all aspects
     */
    public double getAverageAgentRating() {
        if (agentRating == null)
            return 0;

        int count = 1;
        int total = agentRating;

        if (agentPunctualityRating != null) {
            total += agentPunctualityRating;
            count++;
        }
        if (agentBehaviorRating != null) {
            total += agentBehaviorRating;
            count++;
        }
        if (agentHandlingRating != null) {
            total += agentHandlingRating;
            count++;
        }

        return (double) total / count;
    }

    public boolean hasAgentRating() {
        return agentRating != null && agent != null;
    }

    public boolean hasCompanyResponse() {
        return companyResponse != null && !companyResponse.isBlank();
    }
}