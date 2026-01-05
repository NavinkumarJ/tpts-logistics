package com.tpts.repository;

import com.tpts.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for Rating entity
 */
@Repository
public interface RatingRepository extends JpaRepository<Rating, Long> {

        // ==========================================
        // Find by Related Entities
        // ==========================================

        Optional<Rating> findByParcelId(Long parcelId);

        Long countByIsFlaggedTrue();

        boolean existsByParcelId(Long parcelId);

        boolean existsByParcelIdAndAgentId(Long parcelId, Long agentId);

        // Check if pickup agent has been rated for this parcel
        @Query("SELECT COUNT(r) > 0 FROM Rating r WHERE r.parcel.id = :parcelId AND r.hasRatedPickupAgent = true")
        boolean existsPickupAgentRatingByParcelId(@Param("parcelId") Long parcelId);

        // Check if delivery agent has been rated for this parcel
        @Query("SELECT COUNT(r) > 0 FROM Rating r WHERE r.parcel.id = :parcelId AND r.hasRatedDeliveryAgent = true")
        boolean existsDeliveryAgentRatingByParcelId(@Param("parcelId") Long parcelId);

        // Check if agent rating exists for a parcel (agentRating is not null)
        @Query("SELECT COUNT(r) > 0 FROM Rating r WHERE r.parcel.id = :parcelId AND r.agentRating IS NOT NULL")
        boolean existsAgentRatingByParcelId(@Param("parcelId") Long parcelId);

        // Check if customer has rated company for this parcel (companyRating is not
        // null)
        @Query("SELECT COUNT(r) > 0 FROM Rating r WHERE r.parcel.id = :parcelId AND r.companyRating IS NOT NULL")
        boolean existsCompanyRatingByParcelId(@Param("parcelId") Long parcelId);

        // Check if customer has explicitly rated the company (using flag)
        @Query("SELECT COUNT(r) > 0 FROM Rating r WHERE r.parcel.id = :parcelId AND r.hasRatedCompany = true")
        boolean existsCompanyRatedByParcelId(@Param("parcelId") Long parcelId);

        List<Rating> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

        List<Rating> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

        // Find ratings where customer has actually rated the company
        // (hasRatedCompany=true)
        @Query("SELECT r FROM Rating r WHERE r.company.id = :companyId " +
                        "AND r.hasRatedCompany = true ORDER BY r.createdAt DESC")
        List<Rating> findCompanyRatingsByCompanyId(@Param("companyId") Long companyId);

        List<Rating> findByAgentIdOrderByCreatedAtDesc(Long agentId);

        // ==========================================
        // Public Ratings (for display)
        // ==========================================

        @Query("SELECT r FROM Rating r WHERE r.company.id = :companyId " +
                        "AND r.isPublic = true AND r.isFlagged = false " +
                        "ORDER BY r.createdAt DESC")
        List<Rating> findPublicRatingsByCompany(@Param("companyId") Long companyId);

        @Query("SELECT r FROM Rating r WHERE r.agent.id = :agentId " +
                        "AND r.agentRating IS NOT NULL " +
                        "AND r.isPublic = true AND r.isFlagged = false " +
                        "ORDER BY r.createdAt DESC")
        List<Rating> findPublicRatingsByAgent(@Param("agentId") Long agentId);

        // ==========================================
        // Ratings by Star Count
        // ==========================================

        @Query("SELECT r FROM Rating r WHERE r.company.id = :companyId " +
                        "AND r.companyRating = :rating ORDER BY r.createdAt DESC")
        List<Rating> findByCompanyIdAndCompanyRating(
                        @Param("companyId") Long companyId,
                        @Param("rating") Integer rating);

        @Query("SELECT r FROM Rating r WHERE r.agent.id = :agentId " +
                        "AND r.agentRating = :rating ORDER BY r.createdAt DESC")
        List<Rating> findByAgentIdAndAgentRating(
                        @Param("agentId") Long agentId,
                        @Param("rating") Integer rating);

        // ==========================================
        // Company Rating Statistics
        // ==========================================

        @Query("SELECT AVG(r.companyRating) FROM Rating r WHERE r.company.id = :companyId " +
                        "AND r.companyRating IS NOT NULL AND r.hasRatedCompany = true")
        Double getAverageCompanyRating(@Param("companyId") Long companyId);

        @Query("SELECT AVG(r.overallRating) FROM Rating r WHERE r.company.id = :companyId")
        Double getAverageOverallRatingByCompany(@Param("companyId") Long companyId);

        @Query("SELECT COUNT(r) FROM Rating r WHERE r.company.id = :companyId " +
                        "AND r.hasRatedCompany = true")
        Long countByCompanyId(@Param("companyId") Long companyId);

        @Query("SELECT COUNT(r) FROM Rating r WHERE r.company.id = :companyId " +
                        "AND r.companyRating = :rating AND r.hasRatedCompany = true")
        Long countByCompanyIdAndCompanyRating(
                        @Param("companyId") Long companyId,
                        @Param("rating") Integer rating);

        // Rating distribution for company
        @Query("SELECT r.companyRating, COUNT(r) FROM Rating r " +
                        "WHERE r.company.id = :companyId GROUP BY r.companyRating")
        List<Object[]> getCompanyRatingDistribution(@Param("companyId") Long companyId);

        // ==========================================
        // Agent Rating Statistics
        // ==========================================

        @Query("SELECT AVG(r.agentRating) FROM Rating r WHERE r.agent.id = :agentId " +
                        "AND r.agentRating IS NOT NULL")
        Double getAverageAgentRating(@Param("agentId") Long agentId);

        @Query("SELECT COUNT(r) FROM Rating r WHERE r.agent.id = :agentId " +
                        "AND r.agentRating IS NOT NULL")
        Long countByAgentId(@Param("agentId") Long agentId);

        @Query("SELECT COUNT(r) FROM Rating r WHERE r.agent.id = :agentId " +
                        "AND r.agentRating = :rating")
        Long countByAgentIdAndAgentRating(
                        @Param("agentId") Long agentId,
                        @Param("rating") Integer rating);

        // Rating distribution for agent
        @Query("SELECT r.agentRating, COUNT(r) FROM Rating r " +
                        "WHERE r.agent.id = :agentId AND r.agentRating IS NOT NULL " +
                        "GROUP BY r.agentRating")
        List<Object[]> getAgentRatingDistribution(@Param("agentId") Long agentId);

        // ==========================================
        // Pickup Agent Rating Statistics
        // ==========================================

        @Query("SELECT AVG(r.pickupAgentRating) FROM Rating r WHERE r.pickupAgent.id = :agentId " +
                        "AND r.pickupAgentRating IS NOT NULL")
        Double getAveragePickupAgentRating(@Param("agentId") Long agentId);

        @Query("SELECT COUNT(r) FROM Rating r WHERE r.pickupAgent.id = :agentId " +
                        "AND r.pickupAgentRating IS NOT NULL")
        Long countPickupAgentRatings(@Param("agentId") Long agentId);

        // Find all pickup agent ratings for an agent (public, non-flagged only)
        @Query("SELECT r FROM Rating r WHERE r.pickupAgent.id = :agentId " +
                        "AND r.pickupAgentRating IS NOT NULL " +
                        "AND r.isPublic = true AND r.isFlagged = false " +
                        "ORDER BY r.createdAt DESC")
        List<Rating> findPickupAgentRatings(@Param("agentId") Long agentId);

        // Count pickup agent ratings by star rating (for distribution)
        @Query("SELECT COUNT(r) FROM Rating r WHERE r.pickupAgent.id = :agentId " +
                        "AND r.pickupAgentRating = :rating")
        Long countByPickupAgentIdAndPickupAgentRating(
                        @Param("agentId") Long agentId,
                        @Param("rating") Integer rating);

        // Count UNIQUE ratings for an agent (where agent is either delivery OR pickup
        // agent)
        // This avoids double-counting when same agent is both pickup and delivery for
        // same parcel
        // Only counts public, non-flagged ratings to match the displayed ratings
        @Query("SELECT COUNT(DISTINCT r.id) FROM Rating r WHERE r.isPublic = true AND r.isFlagged = false AND (" +
                        "(r.agent.id = :agentId AND r.agentRating IS NOT NULL) OR " +
                        "(r.pickupAgent.id = :agentId AND r.pickupAgentRating IS NOT NULL))")
        Long countUniqueRatingsByAgentId(@Param("agentId") Long agentId);

        // ==========================================
        // Recommendation Stats
        // ==========================================

        @Query("SELECT COUNT(r) FROM Rating r WHERE r.company.id = :companyId " +
                        "AND r.wouldRecommend = true")
        Long countRecommendationsByCompany(@Param("companyId") Long companyId);

        @Query("SELECT (COUNT(r) * 100.0 / (SELECT COUNT(r2) FROM Rating r2 WHERE r2.company.id = :companyId)) " +
                        "FROM Rating r WHERE r.company.id = :companyId AND r.wouldRecommend = true")
        Double getRecommendationPercentageByCompany(@Param("companyId") Long companyId);

        // ==========================================
        // Recent Ratings
        // ==========================================

        @Query("SELECT r FROM Rating r WHERE r.company.id = :companyId " +
                        "ORDER BY r.createdAt DESC LIMIT :limit")
        List<Rating> findRecentRatingsByCompany(
                        @Param("companyId") Long companyId,
                        @Param("limit") int limit);

        @Query("SELECT r FROM Rating r WHERE r.agent.id = :agentId " +
                        "ORDER BY r.createdAt DESC LIMIT :limit")
        List<Rating> findRecentRatingsByAgent(
                        @Param("agentId") Long agentId,
                        @Param("limit") int limit);

        // ==========================================
        // Flagged Ratings (for moderation)
        // ==========================================

        List<Rating> findByIsFlaggedTrueOrderByCreatedAtDesc();

        @Query("SELECT r FROM Rating r WHERE r.company.id = :companyId " +
                        "AND r.isFlagged = true ORDER BY r.createdAt DESC")
        List<Rating> findFlaggedRatingsByCompany(@Param("companyId") Long companyId);

        // ==========================================
        // Ratings Without Response
        // ==========================================

        @Query("SELECT r FROM Rating r WHERE r.company.id = :companyId " +
                        "AND r.companyResponse IS NULL ORDER BY r.createdAt DESC")
        List<Rating> findUnrespondedRatingsByCompany(@Param("companyId") Long companyId);

        // ==========================================
        // Top Rated
        // ==========================================

        @Query("SELECT r FROM Rating r WHERE r.company.id = :companyId " +
                        "AND r.overallRating >= 4 AND r.isPublic = true " +
                        "ORDER BY r.overallRating DESC, r.createdAt DESC LIMIT :limit")
        List<Rating> findTopRatingsByCompany(
                        @Param("companyId") Long companyId,
                        @Param("limit") int limit);

        // ==========================================
        // Verification
        // ==========================================

        @Query("SELECT r FROM Rating r WHERE r.id = :id AND r.customer.id = :customerId")
        Optional<Rating> findByIdAndCustomerId(@Param("id") Long id, @Param("customerId") Long customerId);

        @Query("SELECT r FROM Rating r WHERE r.id = :id AND r.company.id = :companyId")
        Optional<Rating> findByIdAndCompanyId(@Param("id") Long id, @Param("companyId") Long companyId);
}