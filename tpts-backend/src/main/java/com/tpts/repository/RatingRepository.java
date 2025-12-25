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

    List<Rating> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<Rating> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    List<Rating> findByAgentIdOrderByCreatedAtDesc(Long agentId);

    // ==========================================
    // Public Ratings (for display)
    // ==========================================

    @Query("SELECT r FROM Rating r WHERE r.company.id = :companyId " +
            "AND r.isPublic = true AND r.isFlagged = false " +
            "ORDER BY r.createdAt DESC")
    List<Rating> findPublicRatingsByCompany(@Param("companyId") Long companyId);

    @Query("SELECT r FROM Rating r WHERE r.agent.id = :agentId " +
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

    @Query("SELECT AVG(r.companyRating) FROM Rating r WHERE r.company.id = :companyId")
    Double getAverageCompanyRating(@Param("companyId") Long companyId);

    @Query("SELECT AVG(r.overallRating) FROM Rating r WHERE r.company.id = :companyId")
    Double getAverageOverallRatingByCompany(@Param("companyId") Long companyId);

    @Query("SELECT COUNT(r) FROM Rating r WHERE r.company.id = :companyId")
    Long countByCompanyId(@Param("companyId") Long companyId);

    @Query("SELECT COUNT(r) FROM Rating r WHERE r.company.id = :companyId " +
            "AND r.companyRating = :rating")
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