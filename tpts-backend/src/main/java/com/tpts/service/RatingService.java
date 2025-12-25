package com.tpts.service;

import com.tpts.dto.request.CompanyResponseRequest;
import com.tpts.dto.request.CreateRatingRequest;
import com.tpts.dto.request.UpdateRatingRequest;
import com.tpts.dto.response.RatingDTO;
import com.tpts.dto.response.RatingSummaryDTO;
import com.tpts.entity.*;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for Rating operations
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RatingService {

    private final RatingRepository ratingRepository;
    private final ParcelRepository parcelRepository;
    private final CustomerRepository customerRepository;
    private final CompanyAdminRepository companyRepository;
    private final DeliveryAgentRepository agentRepository;

    // Edit window in hours
    private static final int EDIT_WINDOW_HOURS = 24;

    // ==========================================
    // Create Rating
    // ==========================================

    /**
     * Create a new rating for a delivered parcel
     */
    @Transactional
    public RatingDTO createRating(CreateRatingRequest request, User currentUser) {
        // Get customer
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        // Get parcel
        Parcel parcel = parcelRepository.findById(request.getParcelId())
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", request.getParcelId()));

        // Verify ownership
        if (!parcel.getCustomer().getId().equals(customer.getId())) {
            throw new ForbiddenException("You can only rate your own deliveries");
        }

        // Verify parcel is delivered
        if (parcel.getStatus() != ParcelStatus.DELIVERED) {
            throw new BadRequestException("You can only rate delivered parcels");
        }

        // Check if already rated
        if (ratingRepository.existsByParcelId(parcel.getId())) {
            throw new BadRequestException("You have already rated this delivery");
        }

        // Create rating
        Rating rating = Rating.builder()
                .parcel(parcel)
                .customer(customer)
                .company(parcel.getCompany())
                .agent(parcel.getAgent())
                .companyRating(request.getCompanyRating())
                .companyReview(request.getCompanyReview())
                .companyPackagingRating(request.getCompanyPackagingRating())
                .companyPricingRating(request.getCompanyPricingRating())
                .companyCommunicationRating(request.getCompanyCommunicationRating())
                .agentRating(request.getAgentRating())
                .agentReview(request.getAgentReview())
                .agentPunctualityRating(request.getAgentPunctualityRating())
                .agentBehaviorRating(request.getAgentBehaviorRating())
                .agentHandlingRating(request.getAgentHandlingRating())
                .overallRating(request.getOverallRating())
                .overallReview(request.getOverallReview())
                .wouldRecommend(request.getWouldRecommend())
                .positiveTags(request.getPositiveTags())
                .negativeTags(request.getNegativeTags())
                .suggestions(request.getSuggestions())
                .imageUrls(request.getImageUrls())
                .isPublic(request.getIsPublic())
                .isVerified(true) // Verified purchase
                .build();

        rating = ratingRepository.save(rating);

        // Update company average rating
        updateCompanyRating(parcel.getCompany().getId());

        // Update agent average rating if rated
        if (parcel.getAgent() != null && request.getAgentRating() != null) {
            updateAgentRating(parcel.getAgent().getId());
        }

        log.info("Rating created: ID={}, Parcel={}, Company Rating={}, Agent Rating={}",
                rating.getId(), parcel.getTrackingNumber(),
                request.getCompanyRating(), request.getAgentRating());

        return mapToDTO(rating);
    }

    // ==========================================
    // Update Rating
    // ==========================================

    /**
     * Update rating (within 24 hours)
     */
    @Transactional
    public RatingDTO updateRating(Long ratingId, UpdateRatingRequest request, User currentUser) {
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        Rating rating = ratingRepository.findByIdAndCustomerId(ratingId, customer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Rating", "id", ratingId));

        // Check edit window
        if (rating.getCreatedAt().plusHours(EDIT_WINDOW_HOURS).isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Rating can only be edited within " + EDIT_WINDOW_HOURS + " hours");
        }

        // Update fields
        if (request.getCompanyRating() != null)
            rating.setCompanyRating(request.getCompanyRating());
        if (request.getCompanyReview() != null)
            rating.setCompanyReview(request.getCompanyReview());
        if (request.getCompanyPackagingRating() != null)
            rating.setCompanyPackagingRating(request.getCompanyPackagingRating());
        if (request.getCompanyPricingRating() != null)
            rating.setCompanyPricingRating(request.getCompanyPricingRating());
        if (request.getCompanyCommunicationRating() != null)
            rating.setCompanyCommunicationRating(request.getCompanyCommunicationRating());

        if (request.getAgentRating() != null)
            rating.setAgentRating(request.getAgentRating());
        if (request.getAgentReview() != null)
            rating.setAgentReview(request.getAgentReview());
        if (request.getAgentPunctualityRating() != null)
            rating.setAgentPunctualityRating(request.getAgentPunctualityRating());
        if (request.getAgentBehaviorRating() != null)
            rating.setAgentBehaviorRating(request.getAgentBehaviorRating());
        if (request.getAgentHandlingRating() != null)
            rating.setAgentHandlingRating(request.getAgentHandlingRating());

        if (request.getOverallRating() != null)
            rating.setOverallRating(request.getOverallRating());
        if (request.getOverallReview() != null)
            rating.setOverallReview(request.getOverallReview());
        if (request.getWouldRecommend() != null)
            rating.setWouldRecommend(request.getWouldRecommend());

        if (request.getPositiveTags() != null)
            rating.setPositiveTags(request.getPositiveTags());
        if (request.getNegativeTags() != null)
            rating.setNegativeTags(request.getNegativeTags());
        if (request.getSuggestions() != null)
            rating.setSuggestions(request.getSuggestions());
        if (request.getImageUrls() != null)
            rating.setImageUrls(request.getImageUrls());
        if (request.getIsPublic() != null)
            rating.setIsPublic(request.getIsPublic());

        rating = ratingRepository.save(rating);

        // Update averages
        updateCompanyRating(rating.getCompany().getId());
        if (rating.getAgent() != null) {
            updateAgentRating(rating.getAgent().getId());
        }

        log.info("Rating updated: ID={}", ratingId);

        return mapToDTO(rating);
    }

    // ==========================================
    // Company Response
    // ==========================================

    /**
     * Company responds to a rating
     */
    @Transactional
    public RatingDTO respondToRating(Long ratingId, CompanyResponseRequest request, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        Rating rating = ratingRepository.findByIdAndCompanyId(ratingId, company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Rating", "id", ratingId));

        rating.setCompanyResponse(request.getResponse());
        rating.setCompanyRespondedAt(LocalDateTime.now());
        rating = ratingRepository.save(rating);

        log.info("Company responded to rating: ID={}", ratingId);

        return mapToDTO(rating);
    }

    // ==========================================
    // Query Methods
    // ==========================================

    /**
     * Get rating by ID
     */
    public RatingDTO getRatingById(Long ratingId) {
        Rating rating = ratingRepository.findById(ratingId)
                .orElseThrow(() -> new ResourceNotFoundException("Rating", "id", ratingId));
        return mapToDTO(rating);
    }

    /**
     * Get rating by parcel ID
     */
    public RatingDTO getRatingByParcelId(Long parcelId) {
        Rating rating = ratingRepository.findByParcelId(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Rating not found for parcel: " + parcelId));
        return mapToDTO(rating);
    }

    /**
     * Check if a parcel can be rated and return parcel info
     */
    public Map<String, Object> canRateParcel(Long parcelId, User currentUser) {
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        // Verify ownership
        if (!parcel.getCustomer().getId().equals(customer.getId())) {
            throw new ForbiddenException("You can only rate your own deliveries");
        }

        Map<String, Object> result = new HashMap<>();

        // Build parcel info with agent details
        Map<String, Object> parcelInfo = new HashMap<>();
        parcelInfo.put("id", parcel.getId());
        parcelInfo.put("trackingNumber", parcel.getTrackingNumber());
        parcelInfo.put("pickupCity", parcel.getPickupCity());
        parcelInfo.put("deliveryCity", parcel.getDeliveryCity());
        parcelInfo.put("companyName", parcel.getCompany().getCompanyName());
        parcelInfo.put("status", parcel.getStatus().name());

        // Include agent info if assigned
        if (parcel.getAgent() != null) {
            parcelInfo.put("agentId", parcel.getAgent().getId());
            parcelInfo.put("agentName", parcel.getAgent().getFullName());
        }

        result.put("parcel", parcelInfo);
        result.put("parcelId", parcelId);

        // Check if already rated
        boolean alreadyRated = ratingRepository.existsByParcelId(parcelId);
        result.put("alreadyRated", alreadyRated);

        // Check if can rate (delivered and not already rated)
        boolean canRate = parcel.getStatus() == ParcelStatus.DELIVERED && !alreadyRated;
        result.put("canRate", canRate);

        // Include existing rating if any
        if (alreadyRated) {
            try {
                RatingDTO existingRating = getRatingByParcelId(parcelId);
                result.put("existingRating", existingRating);
            } catch (Exception e) {
                // Ignore
            }
        }

        return result;
    }

    /**
     * Get customer's ratings
     */
    public List<RatingDTO> getCustomerRatings(User currentUser) {
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        return ratingRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId())
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get public ratings for company
     */
    public List<RatingDTO> getCompanyPublicRatings(Long companyId) {
        return ratingRepository.findPublicRatingsByCompany(companyId)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get public ratings for agent
     */
    public List<RatingDTO> getAgentPublicRatings(Long agentId) {
        return ratingRepository.findPublicRatingsByAgent(agentId)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get company's all ratings (for company admin)
     */
    public List<RatingDTO> getCompanyAllRatings(User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        return ratingRepository.findByCompanyIdOrderByCreatedAtDesc(company.getId())
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get unresponded ratings for company
     */
    public List<RatingDTO> getUnrespondedRatings(User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        return ratingRepository.findUnrespondedRatingsByCompany(company.getId())
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    // ==========================================
    // Rating Summary
    // ==========================================

    /**
     * Get company rating summary
     */
    public RatingSummaryDTO getCompanyRatingSummary(Long companyId) {
        CompanyAdmin company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        Double avgRating = ratingRepository.getAverageCompanyRating(companyId);
        Long totalRatings = ratingRepository.countByCompanyId(companyId);
        Double recommendPct = ratingRepository.getRecommendationPercentageByCompany(companyId);

        // Get distribution
        Map<Integer, Long> distribution = new HashMap<>();
        Map<Integer, Double> percentages = new HashMap<>();

        for (int i = 1; i <= 5; i++) {
            Long count = ratingRepository.countByCompanyIdAndCompanyRating(companyId, i);
            distribution.put(i, count);
            percentages.put(i, totalRatings > 0 ? (count * 100.0 / totalRatings) : 0.0);
        }

        return RatingSummaryDTO.builder()
                .entityId(companyId)
                .entityType("COMPANY")
                .entityName(company.getCompanyName())
                .averageRating(avgRating != null ? roundToOneDecimal(avgRating) : 0.0)
                .totalRatings(totalRatings)
                .recommendationPercentage(recommendPct != null ? roundToOneDecimal(recommendPct) : 0.0)
                .ratingDistribution(distribution)
                .ratingPercentages(percentages)
                .build();
    }

    /**
     * Get agent rating summary
     */
    public RatingSummaryDTO getAgentRatingSummary(Long agentId) {
        DeliveryAgent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));

        Double avgRating = ratingRepository.getAverageAgentRating(agentId);
        Long totalRatings = ratingRepository.countByAgentId(agentId);

        // Get distribution
        Map<Integer, Long> distribution = new HashMap<>();
        Map<Integer, Double> percentages = new HashMap<>();

        for (int i = 1; i <= 5; i++) {
            Long count = ratingRepository.countByAgentIdAndAgentRating(agentId, i);
            distribution.put(i, count);
            percentages.put(i, totalRatings > 0 ? (count * 100.0 / totalRatings) : 0.0);
        }

        return RatingSummaryDTO.builder()
                .entityId(agentId)
                .entityType("AGENT")
                .entityName(agent.getFullName())
                .averageRating(avgRating != null ? roundToOneDecimal(avgRating) : 0.0)
                .totalRatings(totalRatings)
                .ratingDistribution(distribution)
                .ratingPercentages(percentages)
                .build();
    }

    // ==========================================
    // Flag Rating (Moderation)
    // ==========================================

    /**
     * Flag a rating for review
     */
    @Transactional
    public RatingDTO flagRating(Long ratingId, String reason, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        Rating rating = ratingRepository.findByIdAndCompanyId(ratingId, company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Rating", "id", ratingId));

        rating.setIsFlagged(true);
        rating.setFlagReason(reason);
        rating = ratingRepository.save(rating);

        log.info("Rating flagged: ID={}, Reason={}", ratingId, reason);

        return mapToDTO(rating);
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    /**
     * Update company's average rating
     */
    private void updateCompanyRating(Long companyId) {
        Double avgRating = ratingRepository.getAverageOverallRatingByCompany(companyId);
        if (avgRating != null) {
            CompanyAdmin company = companyRepository.findById(companyId).orElse(null);
            if (company != null) {
                company.setRatingAvg(BigDecimal.valueOf(avgRating).setScale(1, RoundingMode.HALF_UP));
                companyRepository.save(company);
            }
        }
    }

    /**
     * Update agent's average rating
     */
    private void updateAgentRating(Long agentId) {
        Double avgRating = ratingRepository.getAverageAgentRating(agentId);
        if (avgRating != null) {
            DeliveryAgent agent = agentRepository.findById(agentId).orElse(null);
            if (agent != null) {
                agent.setRatingAvg(BigDecimal.valueOf(avgRating).setScale(1, RoundingMode.HALF_UP));
                agentRepository.save(agent);
            }
        }
    }

    private double roundToOneDecimal(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }

    private RatingDTO mapToDTO(Rating rating) {
        return RatingDTO.builder()
                .id(rating.getId())
                .parcelId(rating.getParcel().getId())
                .trackingNumber(rating.getParcel().getTrackingNumber())
                .customerId(rating.getCustomer().getId())
                .customerName(rating.getCustomer().getFullName())
                .companyId(rating.getCompany().getId())
                .companyName(rating.getCompany().getCompanyName())
                .agentId(rating.getAgent() != null ? rating.getAgent().getId() : null)
                .agentName(rating.getAgent() != null ? rating.getAgent().getFullName() : null)
                .companyRating(rating.getCompanyRating())
                .companyReview(rating.getCompanyReview())
                .companyPackagingRating(rating.getCompanyPackagingRating())
                .companyPricingRating(rating.getCompanyPricingRating())
                .companyCommunicationRating(rating.getCompanyCommunicationRating())
                .averageCompanyRating(rating.getAverageCompanyRating())
                .agentRating(rating.getAgentRating())
                .agentReview(rating.getAgentReview())
                .agentPunctualityRating(rating.getAgentPunctualityRating())
                .agentBehaviorRating(rating.getAgentBehaviorRating())
                .agentHandlingRating(rating.getAgentHandlingRating())
                .averageAgentRating(rating.getAverageAgentRating())
                .overallRating(rating.getOverallRating())
                .overallReview(rating.getOverallReview())
                .wouldRecommend(rating.getWouldRecommend())
                .positiveTags(rating.getPositiveTags())
                .negativeTags(rating.getNegativeTags())
                .suggestions(rating.getSuggestions())
                .imageUrls(rating.getImageUrls())
                .companyResponse(rating.getCompanyResponse())
                .companyRespondedAt(rating.getCompanyRespondedAt())
                .isPublic(rating.getIsPublic())
                .isVerified(rating.getIsVerified())
                .createdAt(rating.getCreatedAt())
                .updatedAt(rating.getUpdatedAt())
                .hasAgentRating(rating.hasAgentRating())
                .hasCompanyResponse(rating.hasCompanyResponse())
                .build();
    }
}