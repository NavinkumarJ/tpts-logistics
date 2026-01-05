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
                .hasRatedDeliveryAgent(request.getAgentRating() != null) // Mark delivery agent as rated if rating
                                                                         // provided
                .hasRatedCompany(true) // Mark company as rated in final delivery rating
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
     * Get public ratings for agent (includes both delivery and pickup agent
     * ratings)
     */
    public List<RatingDTO> getAgentPublicRatings(Long agentId) {
        // Get delivery agent ratings
        List<Rating> deliveryRatings = ratingRepository.findPublicRatingsByAgent(agentId);

        // Get pickup agent ratings
        List<Rating> pickupRatings = ratingRepository.findPickupAgentRatings(agentId);

        // Combine and sort by createdAt descending
        List<Rating> allRatings = new java.util.ArrayList<>(deliveryRatings);
        allRatings.addAll(pickupRatings);
        allRatings.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));

        // Remove duplicates (same parcel might appear in both if agent was both pickup
        // and delivery)
        List<Rating> uniqueRatings = allRatings.stream()
                .collect(Collectors.toMap(
                        r -> r.getParcel().getId(),
                        r -> r,
                        (existing, duplicate) -> existing // keep first occurrence
                ))
                .values()
                .stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList());

        return uniqueRatings.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get company's all ratings (for company admin) - returns ALL ratings including
     * agent ratings for the company
     */
    public List<RatingDTO> getCompanyAllRatings(User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        // Get all ratings for this company (including agent-only ratings)
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
     * Get agent rating summary (includes both delivery and pickup agent ratings)
     * Handles the case where same agent is both pickup and delivery agent for same
     * parcel
     */
    public RatingSummaryDTO getAgentRatingSummary(Long agentId) {
        DeliveryAgent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));

        // Get all unique ratings for this agent (combines delivery and pickup, removes
        // duplicates)
        List<Rating> allRatings = getAgentPublicRatings(agentId).stream()
                .map(dto -> ratingRepository.findById(dto.getId()).orElse(null))
                .filter(r -> r != null)
                .collect(Collectors.toList());

        // Calculate combined statistics from unique ratings
        long totalRatings = allRatings.size();

        // Calculate combined average
        Double avgRating = null;
        if (totalRatings > 0) {
            double totalSum = 0;
            long validCount = 0;
            for (Rating r : allRatings) {
                // Use pickup agent rating if this agent is the pickup agent, else use delivery
                // rating
                Integer rating = null;
                if (r.getPickupAgent() != null && r.getPickupAgent().getId().equals(agentId)
                        && r.getPickupAgentRating() != null) {
                    rating = r.getPickupAgentRating();
                } else if (r.getAgent() != null && r.getAgent().getId().equals(agentId) && r.getAgentRating() != null) {
                    rating = r.getAgentRating();
                }
                if (rating != null) {
                    totalSum += rating;
                    validCount++;
                }
            }
            if (validCount > 0) {
                avgRating = totalSum / validCount;
            }
        }

        // Get distribution from unique ratings
        Map<Integer, Long> distribution = new HashMap<>();
        Map<Integer, Double> percentages = new HashMap<>();

        for (int i = 1; i <= 5; i++) {
            final int star = i;
            long countForStar = allRatings.stream().filter(r -> {
                Integer rating = null;
                if (r.getPickupAgent() != null && r.getPickupAgent().getId().equals(agentId)
                        && r.getPickupAgentRating() != null) {
                    rating = r.getPickupAgentRating();
                } else if (r.getAgent() != null && r.getAgent().getId().equals(agentId) && r.getAgentRating() != null) {
                    rating = r.getAgentRating();
                }
                return rating != null && rating == star;
            }).count();
            distribution.put(i, countForStar);
            percentages.put(i, totalRatings > 0 ? (countForStar * 100.0 / totalRatings) : 0.0);
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
    // Pickup Agent Rating (Group Shipment)
    // ==========================================

    /**
     * Rate pickup agent for group shipment (when parcel reaches warehouse)
     */
    @Transactional
    public void ratePickupAgent(Long parcelId, Long agentId, Integer rating, String comment, User currentUser) {
        // Get customer
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        // Get parcel
        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        // Verify ownership
        if (!parcel.getCustomer().getId().equals(customer.getId())) {
            throw new ForbiddenException("You can only rate your own deliveries");
        }

        // Verify parcel is at warehouse or beyond (group shipment)
        if (parcel.getStatus() != ParcelStatus.AT_WAREHOUSE &&
                parcel.getStatus() != ParcelStatus.OUT_FOR_DELIVERY &&
                parcel.getStatus() != ParcelStatus.DELIVERED) {
            throw new BadRequestException("You can only rate the pickup agent after parcel reaches warehouse");
        }

        // Get agent
        DeliveryAgent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));

        // Check if rating already exists for this parcel - update it instead of
        // creating new
        Rating existingRating = ratingRepository.findByParcelId(parcelId).orElse(null);

        if (existingRating != null) {
            // Update existing rating with pickup agent info
            if (existingRating.getHasRatedPickupAgent() != null && existingRating.getHasRatedPickupAgent()) {
                throw new BadRequestException("You have already rated the pickup agent for this parcel");
            }
            // Store pickup agent and rating in dedicated fields
            existingRating.setPickupAgent(agent);
            existingRating.setPickupAgentRating(rating);
            existingRating.setPickupAgentReview(comment);
            existingRating.setHasRatedPickupAgent(true);
            ratingRepository.save(existingRating);
        } else {
            // Create new rating for pickup agent
            Rating pickupRating = Rating.builder()
                    .parcel(parcel)
                    .customer(customer)
                    .company(parcel.getCompany())
                    .pickupAgent(agent)
                    .pickupAgentRating(rating)
                    .pickupAgentReview(comment)
                    // companyRating and overallRating left null - will be set when company is rated
                    .hasRatedPickupAgent(true) // Mark pickup agent as rated
                    .isPublic(true)
                    .isVerified(true)
                    .build();

            ratingRepository.save(pickupRating);
        }

        // Update agent's average rating using the proper method
        updateAgentRating(agent.getId());

        log.info("Pickup agent {} rated {} stars by customer {} for parcel {}",
                agent.getFullName(), rating, customer.getFullName(), parcel.getTrackingNumber());
    }

    /**
     * Rate delivery agent for group shipment (when parcel is delivered)
     */
    @Transactional
    public void rateDeliveryAgent(Long parcelId, Long agentId, Integer rating, String comment, User currentUser) {
        // Get customer
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        // Get parcel
        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        // Verify ownership
        if (!parcel.getCustomer().getId().equals(customer.getId())) {
            throw new ForbiddenException("You can only rate your own deliveries");
        }

        // Verify parcel is delivered
        if (parcel.getStatus() != ParcelStatus.DELIVERED) {
            throw new BadRequestException("You can only rate the delivery agent after parcel is delivered");
        }

        // Get agent
        DeliveryAgent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));

        // Check if rating already exists for this parcel - update it instead of
        // creating new
        Rating existingRating = ratingRepository.findByParcelId(parcelId).orElse(null);

        if (existingRating != null) {
            // Update existing rating with delivery agent info
            if (existingRating.getHasRatedDeliveryAgent() != null && existingRating.getHasRatedDeliveryAgent()) {
                throw new BadRequestException("You have already rated the delivery agent for this parcel");
            }
            existingRating.setAgent(agent);
            existingRating.setAgentRating(rating);
            existingRating.setAgentReview(comment);
            existingRating.setHasRatedDeliveryAgent(true);
            ratingRepository.save(existingRating);
        } else {
            // Create new rating for delivery agent
            Rating deliveryRating = Rating.builder()
                    .parcel(parcel)
                    .customer(customer)
                    .company(parcel.getCompany())
                    .agent(agent)
                    .agentRating(rating)
                    .agentReview(comment)
                    // companyRating and overallRating left null - will be set when company is rated
                    .hasRatedDeliveryAgent(true)
                    .isPublic(true)
                    .isVerified(true)
                    .build();

            ratingRepository.save(deliveryRating);
        }

        // Update agent's average rating using the proper method
        updateAgentRating(agent.getId());

        log.info("Delivery agent {} rated {} stars by customer {} for parcel {}",
                agent.getFullName(), rating, customer.getFullName(), parcel.getTrackingNumber());
    }

    /**
     * Rate company for group shipment (when parcel is delivered)
     */
    @Transactional
    public void rateCompany(Long parcelId, Long companyId, Integer rating, String comment, User currentUser) {
        // Get customer
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        // Get parcel
        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        // Verify ownership
        if (!parcel.getCustomer().getId().equals(customer.getId())) {
            throw new ForbiddenException("You can only rate your own deliveries");
        }

        // Verify parcel is delivered
        if (parcel.getStatus() != ParcelStatus.DELIVERED) {
            throw new BadRequestException("You can only rate the company after parcel is delivered");
        }

        // Verify company matches
        if (!parcel.getCompany().getId().equals(companyId)) {
            throw new BadRequestException("Company ID does not match parcel's company");
        }

        // Check if rating already exists for this parcel - update it instead of
        // creating new
        Rating existingRating = ratingRepository.findByParcelId(parcelId).orElse(null);

        if (existingRating != null) {
            // Update existing rating with company info
            if (existingRating.getHasRatedCompany() != null && existingRating.getHasRatedCompany()) {
                throw new BadRequestException("You have already rated the company for this parcel");
            }
            existingRating.setCompanyRating(rating);
            existingRating.setCompanyReview(comment);
            existingRating.setHasRatedCompany(true);
            ratingRepository.save(existingRating);
        } else {
            // Create new rating for company
            Rating companyRating = Rating.builder()
                    .parcel(parcel)
                    .customer(customer)
                    .company(parcel.getCompany())
                    .companyRating(rating)
                    .companyReview(comment)
                    .overallRating(rating) // Required field - use same rating
                    .hasRatedCompany(true)
                    .isPublic(true)
                    .isVerified(true)
                    .build();

            ratingRepository.save(companyRating);
        }

        // Update company's average rating using the proper method
        updateCompanyRating(companyId);

        log.info("Company {} rated {} stars by customer {} for parcel {}",
                parcel.getCompany().getCompanyName(), rating, customer.getFullName(), parcel.getTrackingNumber());
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    /**
     * Update company's average rating (using companyRating from
     * hasRatedCompany=true)
     */
    private void updateCompanyRating(Long companyId) {
        Double avgRating = ratingRepository.getAverageCompanyRating(companyId);
        CompanyAdmin company = companyRepository.findById(companyId).orElse(null);
        if (company != null && avgRating != null) {
            company.setRatingAvg(BigDecimal.valueOf(avgRating).setScale(1, RoundingMode.HALF_UP));
            companyRepository.save(company);
            log.info("Company {} rating updated to avg={}", company.getCompanyName(), avgRating);
        } else if (company != null) {
            log.warn("Could not update company {} rating - no valid ratings found", company.getCompanyName());
        }
    }

    /**
     * Update agent's average rating (includes both delivery and pickup agent
     * ratings)
     */
    private void updateAgentRating(Long agentId) {
        // Get delivery agent ratings
        Double deliveryAvg = ratingRepository.getAverageAgentRating(agentId);
        Long deliveryCount = ratingRepository.countByAgentId(agentId);

        // Get pickup agent ratings
        Double pickupAvg = ratingRepository.getAveragePickupAgentRating(agentId);
        Long pickupCount = ratingRepository.countPickupAgentRatings(agentId);

        // Calculate combined average
        long totalCount = (deliveryCount != null ? deliveryCount : 0) + (pickupCount != null ? pickupCount : 0);

        if (totalCount > 0) {
            double totalSum = 0;
            if (deliveryAvg != null && deliveryCount != null) {
                totalSum += deliveryAvg * deliveryCount;
            }
            if (pickupAvg != null && pickupCount != null) {
                totalSum += pickupAvg * pickupCount;
            }

            double combinedAvg = totalSum / totalCount;

            DeliveryAgent agent = agentRepository.findById(agentId).orElse(null);
            if (agent != null) {
                agent.setRatingAvg(BigDecimal.valueOf(combinedAvg).setScale(1, RoundingMode.HALF_UP));
                agentRepository.save(agent);
                log.info("Agent {} rating updated: avg={} (delivery={}, pickup={})",
                        agent.getFullName(), combinedAvg, deliveryAvg, pickupAvg);
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
                // Delivery agent info
                .agentId(rating.getAgent() != null ? rating.getAgent().getId() : null)
                .agentName(rating.getAgent() != null ? rating.getAgent().getFullName() : null)
                // Pickup agent info
                .pickupAgentId(rating.getPickupAgent() != null ? rating.getPickupAgent().getId() : null)
                .pickupAgentName(rating.getPickupAgent() != null ? rating.getPickupAgent().getFullName() : null)
                // Company ratings
                .companyRating(rating.getCompanyRating())
                .companyReview(rating.getCompanyReview())
                .companyPackagingRating(rating.getCompanyPackagingRating())
                .companyPricingRating(rating.getCompanyPricingRating())
                .companyCommunicationRating(rating.getCompanyCommunicationRating())
                .averageCompanyRating(rating.getCompanyRating() != null ? rating.getAverageCompanyRating() : null)
                // Delivery agent ratings
                .agentRating(rating.getAgentRating())
                .agentReview(rating.getAgentReview())
                .agentPunctualityRating(rating.getAgentPunctualityRating())
                .agentBehaviorRating(rating.getAgentBehaviorRating())
                .agentHandlingRating(rating.getAgentHandlingRating())
                .averageAgentRating(rating.getAgentRating() != null ? rating.getAverageAgentRating() : null)
                // Pickup agent ratings
                .pickupAgentRating(rating.getPickupAgentRating())
                .pickupAgentReview(rating.getPickupAgentReview())
                // Overall
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
                // Helper flags
                .hasAgentRating(rating.getAgentRating() != null || rating.getPickupAgentRating() != null)
                .hasCompanyResponse(rating.hasCompanyResponse())
                // Rating status flags
                .hasRatedPickupAgent(rating.getHasRatedPickupAgent() != null && rating.getHasRatedPickupAgent())
                .hasRatedDeliveryAgent(rating.getHasRatedDeliveryAgent() != null && rating.getHasRatedDeliveryAgent())
                .hasRatedCompany(rating.getHasRatedCompany() != null && rating.getHasRatedCompany())
                .build();
    }
}