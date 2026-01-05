package com.tpts.controller;

import com.tpts.dto.request.CompanyResponseRequest;
import com.tpts.dto.request.CreateRatingRequest;
import com.tpts.dto.request.UpdateRatingRequest;
import com.tpts.dto.response.ApiResponse;
import com.tpts.dto.response.RatingDTO;
import com.tpts.dto.response.RatingSummaryDTO;
import com.tpts.entity.User;
import com.tpts.service.RatingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Rating Controller
 * Handles ratings and reviews for deliveries
 *
 * Public Endpoints:
 * - GET /api/ratings/{id} - Get rating by ID
 * - GET /api/ratings/company/{id} - Get company public ratings
 * - GET /api/ratings/company/{id}/summary - Get company rating summary
 * - GET /api/ratings/agent/{id} - Get agent public ratings
 * - GET /api/ratings/agent/{id}/summary - Get agent rating summary
 *
 * Customer Endpoints:
 * - POST /api/ratings - Create rating
 * - PUT /api/ratings/{id} - Update rating (within 24h)
 * - GET /api/ratings/my-ratings - Get my ratings
 * - GET /api/ratings/parcel/{id} - Get rating by parcel
 *
 * Company Admin Endpoints:
 * - GET /api/ratings/company/all - Get all company ratings
 * - GET /api/ratings/company/unresponded - Get unresponded ratings
 * - POST /api/ratings/{id}/respond - Respond to rating
 * - POST /api/ratings/{id}/flag - Flag rating for review
 */
@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
@Slf4j
public class RatingController {

        private final RatingService ratingService;

        // ==========================================
        // Public Endpoints
        // ==========================================

        /**
         * Get rating by ID
         * GET /api/ratings/{id}
         */
        @GetMapping("/{id}")
        public ResponseEntity<ApiResponse<RatingDTO>> getRatingById(@PathVariable Long id) {
                log.info("Getting rating: {}", id);

                RatingDTO rating = ratingService.getRatingById(id);

                return ResponseEntity.ok(ApiResponse.success(rating, "Rating retrieved"));
        }

        /**
         * Get public ratings for company
         * GET /api/ratings/company/{companyId}
         */
        @GetMapping("/company/{companyId}")
        public ResponseEntity<ApiResponse<List<RatingDTO>>> getCompanyPublicRatings(
                        @PathVariable Long companyId) {

                log.info("Getting public ratings for company: {}", companyId);

                List<RatingDTO> ratings = ratingService.getCompanyPublicRatings(companyId);

                return ResponseEntity.ok(ApiResponse.success(ratings,
                                "Retrieved " + ratings.size() + " ratings"));
        }

        /**
         * Get company rating summary
         * GET /api/ratings/company/{companyId}/summary
         */
        @GetMapping("/company/{companyId}/summary")
        public ResponseEntity<ApiResponse<RatingSummaryDTO>> getCompanyRatingSummary(
                        @PathVariable Long companyId) {

                log.info("Getting rating summary for company: {}", companyId);

                RatingSummaryDTO summary = ratingService.getCompanyRatingSummary(companyId);

                return ResponseEntity.ok(ApiResponse.success(summary, "Rating summary retrieved"));
        }

        /**
         * Rate a company (for group shipments when parcel is delivered)
         * POST /api/ratings/company/{companyId}
         */
        @PostMapping("/company/{companyId}")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<Map<String, Object>>> rateCompany(
                        @PathVariable Long companyId,
                        @RequestBody Map<String, Object> request,
                        @AuthenticationPrincipal User currentUser) {

                Long parcelId = Long.valueOf(request.get("parcelId").toString());
                Integer rating = Integer.valueOf(request.get("rating").toString());
                String comment = request.get("comment") != null ? request.get("comment").toString() : "";

                log.info("Customer {} rating company {} with {} stars for parcel {}",
                                currentUser.getEmail(), companyId, rating, parcelId);

                ratingService.rateCompany(parcelId, companyId, rating, comment, currentUser);

                return ResponseEntity.ok(ApiResponse.success(
                                Map.of("success", true, "message", "Company rated successfully"),
                                "Thank you for rating the company!"));
        }

        /**
         * Get public ratings for agent
         * GET /api/ratings/agent/{agentId}
         */
        @GetMapping("/agent/{agentId}")
        public ResponseEntity<ApiResponse<List<RatingDTO>>> getAgentPublicRatings(
                        @PathVariable Long agentId) {

                log.info("Getting public ratings for agent: {}", agentId);

                List<RatingDTO> ratings = ratingService.getAgentPublicRatings(agentId);

                return ResponseEntity.ok(ApiResponse.success(ratings,
                                "Retrieved " + ratings.size() + " ratings"));
        }

        /**
         * Get agent rating summary
         * GET /api/ratings/agent/{agentId}/summary
         */
        @GetMapping("/agent/{agentId}/summary")
        public ResponseEntity<ApiResponse<RatingSummaryDTO>> getAgentRatingSummary(
                        @PathVariable Long agentId) {

                log.info("Getting rating summary for agent: {}", agentId);

                RatingSummaryDTO summary = ratingService.getAgentRatingSummary(agentId);

                return ResponseEntity.ok(ApiResponse.success(summary, "Rating summary retrieved"));
        }

        /**
         * Rate pickup agent (for group shipments when parcel reaches warehouse)
         * POST /api/ratings/agent/{agentId}/pickup
         */
        @PostMapping("/agent/{agentId}/pickup")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<Map<String, Object>>> ratePickupAgent(
                        @PathVariable Long agentId,
                        @RequestBody Map<String, Object> request,
                        @AuthenticationPrincipal User currentUser) {

                Long parcelId = Long.valueOf(request.get("parcelId").toString());
                Integer rating = Integer.valueOf(request.get("rating").toString());
                String comment = request.get("comment") != null ? request.get("comment").toString() : "";

                log.info("Customer {} rating pickup agent {} with {} stars for parcel {}",
                                currentUser.getEmail(), agentId, rating, parcelId);

                ratingService.ratePickupAgent(parcelId, agentId, rating, comment, currentUser);

                return ResponseEntity.ok(ApiResponse.success(
                                Map.of("success", true, "message", "Pickup agent rated successfully"),
                                "Thank you for rating the pickup agent!"));
        }

        /**
         * Rate delivery agent (for group shipments when parcel is delivered)
         * POST /api/ratings/agent/{agentId}/delivery
         */
        @PostMapping("/agent/{agentId}/delivery")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<Map<String, Object>>> rateDeliveryAgent(
                        @PathVariable Long agentId,
                        @RequestBody Map<String, Object> request,
                        @AuthenticationPrincipal User currentUser) {

                Long parcelId = Long.valueOf(request.get("parcelId").toString());
                Integer rating = Integer.valueOf(request.get("rating").toString());
                String comment = request.get("comment") != null ? request.get("comment").toString() : "";

                log.info("Customer {} rating delivery agent {} with {} stars for parcel {}",
                                currentUser.getEmail(), agentId, rating, parcelId);

                ratingService.rateDeliveryAgent(parcelId, agentId, rating, comment, currentUser);

                return ResponseEntity.ok(ApiResponse.success(
                                Map.of("success", true, "message", "Delivery agent rated successfully"),
                                "Thank you for rating the delivery agent!"));
        }

        // ==========================================
        // Customer Endpoints
        // ==========================================

        /**
         * Create a new rating
         * POST /api/ratings
         */
        @PostMapping
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<RatingDTO>> createRating(
                        @Valid @RequestBody CreateRatingRequest request,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Creating rating for parcel: {} by user: {}",
                                request.getParcelId(), currentUser.getEmail());

                RatingDTO rating = ratingService.createRating(request, currentUser);

                return ResponseEntity
                                .status(HttpStatus.CREATED)
                                .body(ApiResponse.success(rating, "Thank you for your feedback!"));
        }

        /**
         * Update a rating (within 24 hours)
         * PUT /api/ratings/{id}
         */
        @PutMapping("/{id}")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<RatingDTO>> updateRating(
                        @PathVariable Long id,
                        @Valid @RequestBody UpdateRatingRequest request,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Updating rating: {}", id);

                RatingDTO rating = ratingService.updateRating(id, request, currentUser);

                return ResponseEntity.ok(ApiResponse.success(rating, "Rating updated"));
        }

        /**
         * Get my ratings
         * GET /api/ratings/my-ratings
         */
        @GetMapping("/my-ratings")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<List<RatingDTO>>> getMyRatings(
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting ratings for customer: {}", currentUser.getEmail());

                List<RatingDTO> ratings = ratingService.getCustomerRatings(currentUser);

                return ResponseEntity.ok(ApiResponse.success(ratings,
                                "Retrieved " + ratings.size() + " ratings"));
        }

        /**
         * Get rating by parcel ID
         * GET /api/ratings/parcel/{parcelId}
         */
        @GetMapping("/parcel/{parcelId}")
        @PreAuthorize("hasAnyRole('CUSTOMER', 'COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<RatingDTO>> getRatingByParcelId(
                        @PathVariable Long parcelId) {

                log.info("Getting rating for parcel: {}", parcelId);

                RatingDTO rating = ratingService.getRatingByParcelId(parcelId);

                return ResponseEntity.ok(ApiResponse.success(rating, "Rating retrieved"));
        }

        // ==========================================
        // Company Admin Endpoints
        // ==========================================

        /**
         * Get all ratings for company (including private)
         * GET /api/ratings/company/all
         */
        @GetMapping("/company/all")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<List<RatingDTO>>> getCompanyAllRatings(
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting all ratings for company admin: {}", currentUser.getEmail());

                List<RatingDTO> ratings = ratingService.getCompanyAllRatings(currentUser);

                return ResponseEntity.ok(ApiResponse.success(ratings,
                                "Retrieved " + ratings.size() + " ratings"));
        }

        /**
         * Get unresponded ratings
         * GET /api/ratings/company/unresponded
         */
        @GetMapping("/company/unresponded")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<List<RatingDTO>>> getUnrespondedRatings(
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting unresponded ratings for company");

                List<RatingDTO> ratings = ratingService.getUnrespondedRatings(currentUser);

                return ResponseEntity.ok(ApiResponse.success(ratings,
                                ratings.size() + " ratings awaiting response"));
        }

        /**
         * Respond to a rating
         * POST /api/ratings/{id}/respond
         */
        @PostMapping("/{id}/respond")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<RatingDTO>> respondToRating(
                        @PathVariable Long id,
                        @Valid @RequestBody CompanyResponseRequest request,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Company responding to rating: {}", id);

                RatingDTO rating = ratingService.respondToRating(id, request, currentUser);

                return ResponseEntity.ok(ApiResponse.success(rating, "Response added to rating"));
        }

        /**
         * Flag a rating for review
         * POST /api/ratings/{id}/flag
         */
        @PostMapping("/{id}/flag")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<RatingDTO>> flagRating(
                        @PathVariable Long id,
                        @RequestBody Map<String, String> request,
                        @AuthenticationPrincipal User currentUser) {

                String reason = request.getOrDefault("reason", "Flagged for review");

                log.info("Flagging rating: {}, reason: {}", id, reason);

                RatingDTO rating = ratingService.flagRating(id, reason, currentUser);

                return ResponseEntity.ok(ApiResponse.success(rating, "Rating flagged for review"));
        }

        // ==========================================
        // Check if Parcel Can Be Rated
        // ==========================================

        /**
         * Check if a parcel can be rated
         * GET /api/ratings/can-rate/{parcelId}
         */
        @GetMapping("/can-rate/{parcelId}")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<Map<String, Object>>> canRateParcel(
                        @PathVariable Long parcelId,
                        @AuthenticationPrincipal User currentUser) {

                // Get parcel info and check rating status
                Map<String, Object> result = ratingService.canRateParcel(parcelId, currentUser);

                boolean canRate = (boolean) result.getOrDefault("canRate", false);
                return ResponseEntity.ok(ApiResponse.success(result,
                                canRate ? "Can be rated" : "Cannot rate this parcel"));
        }
}