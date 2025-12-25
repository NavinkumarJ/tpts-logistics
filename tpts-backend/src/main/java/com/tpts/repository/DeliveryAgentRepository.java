package com.tpts.repository;

import com.tpts.entity.CompanyAdmin;
import com.tpts.entity.DeliveryAgent;
import com.tpts.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for DeliveryAgent entity
 */
@Repository
public interface DeliveryAgentRepository extends JpaRepository<DeliveryAgent, Long> {

    // Find by user
    Optional<DeliveryAgent> findByUser(User user);

    // Find by user id
    Optional<DeliveryAgent> findByUserId(Long userId);

    Long countByIsActiveTrue();
    Long countByIsActiveTrueAndIsAvailableTrue();

    // Find by company
    List<DeliveryAgent> findByCompany(CompanyAdmin company);

    // Find by company id
    List<DeliveryAgent> findByCompanyId(Long companyId);

    // Find by ID and company ID (security check)
    Optional<DeliveryAgent> findByIdAndCompanyId(Long id, Long companyId);

    // Find active agents by company
    List<DeliveryAgent> findByCompanyIdAndIsActiveTrue(Long companyId);

    // Find available agents for company (isActive=true AND isAvailable=true)
    @Query("SELECT a FROM DeliveryAgent a WHERE a.company.id = :companyId AND a.isActive = true AND a.isAvailable = true")
    List<DeliveryAgent> findAvailableAgentsByCompany(@Param("companyId") Long companyId);

    // Find available agents in city
    @Query("SELECT a FROM DeliveryAgent a WHERE a.company.id = :companyId AND a.isActive = true AND a.isAvailable = true AND a.city = :city")
    List<DeliveryAgent> findAvailableAgentsByCompanyAndCity(@Param("companyId") Long companyId, @Param("city") String city);

    // Find available agents with pincode priority
    @Query("SELECT a FROM DeliveryAgent a WHERE a.company.id = :companyId AND a.isActive = true AND a.isAvailable = true " +
            "AND (a.servicePincodes LIKE %:pincode% OR a.city = :city) ORDER BY CASE WHEN a.servicePincodes LIKE %:pincode% THEN 0 ELSE 1 END")
    List<DeliveryAgent> findAvailableAgentsByPriorityPincodeAndCity(
            @Param("companyId") Long companyId,
            @Param("pincode") String pincode,
            @Param("city") String city
    );

    // Check if agent exists for user
    boolean existsByUserId(Long userId);

    // Count agents by company
    long countByCompanyId(Long companyId);

    // Count active agents by company
    long countByCompanyIdAndIsActiveTrue(Long companyId);

    // Count available agents by company
    @Query("SELECT COUNT(a) FROM DeliveryAgent a WHERE a.company.id = :companyId AND a.isActive = true AND a.isAvailable = true")
    long countAvailableByCompanyId(@Param("companyId") Long companyId);

    // Update agent availability
    @Modifying
    @Query("UPDATE DeliveryAgent a SET a.isAvailable = :isAvailable WHERE a.id = :agentId")
    void updateAvailability(@Param("agentId") Long agentId, @Param("isAvailable") Boolean isAvailable);

    // Update agent active status (company sets)
    @Modifying
    @Query("UPDATE DeliveryAgent a SET a.isActive = :isActive WHERE a.id = :agentId")
    void updateActiveStatus(@Param("agentId") Long agentId, @Param("isActive") Boolean isActive);

    // Update agent location
    @Modifying
    @Query("UPDATE DeliveryAgent a SET a.currentLatitude = :lat, a.currentLongitude = :lng, a.locationUpdatedAt = :time WHERE a.id = :agentId")
    void updateLocation(@Param("agentId") Long agentId,
                        @Param("lat") BigDecimal latitude,
                        @Param("lng") BigDecimal longitude,
                        @Param("time") LocalDateTime time);

    // Update current orders count
    @Modifying
    @Query("UPDATE DeliveryAgent a SET a.currentOrdersCount = a.currentOrdersCount + :delta WHERE a.id = :agentId")
    void updateOrdersCount(@Param("agentId") Long agentId, @Param("delta") int delta);

    // Find agents by city
    List<DeliveryAgent> findByCity(String city);

    // Find top performing agents by company
    List<DeliveryAgent> findByCompanyIdOrderByRatingAvgDesc(Long companyId);
}