// src/main/java/com/tpts/repository/CompanyAdminRepository.java
package com.tpts.repository;

import com.tpts.entity.CompanyAdmin;
import com.tpts.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyAdminRepository extends JpaRepository<CompanyAdmin, Long> {

    // Find by user
    Optional<CompanyAdmin> findByUser(User user);

    // Find by user id
    Optional<CompanyAdmin> findByUserId(Long userId);

    // Find by company name
    Optional<CompanyAdmin> findByCompanyName(String companyName);

    // Find by approval status
    List<CompanyAdmin> findByIsApproved(Boolean isApproved);

    // Find approved companies
    List<CompanyAdmin> findByIsApprovedTrue();

    // ADD THIS - Find pending companies
    List<CompanyAdmin> findByIsApprovedFalseOrderByCreatedAtDesc();

    // Find hiring companies (for public jobs page)
    List<CompanyAdmin> findByIsHiringAndIsApproved(Boolean isHiring, Boolean isApproved);

    // Find hiring companies that are approved (shorthand)
    List<CompanyAdmin> findByIsHiringTrueAndIsApprovedTrue();

    // Check if company exists for user
    boolean existsByUserId(Long userId);

    // Check if company name exists
    boolean existsByCompanyName(String companyName);

    // Find companies by city (service area)
    @Query("SELECT c FROM CompanyAdmin c WHERE c.isApproved = true AND c.serviceCities LIKE %:city%")
    List<CompanyAdmin> findApprovedCompaniesByServiceCity(@Param("city") String city);

    // Find companies for price comparison
    @Query("SELECT c FROM CompanyAdmin c WHERE c.isApproved = true AND " +
            "(c.serviceCities LIKE %:fromCity% AND c.serviceCities LIKE %:toCity%)")
    List<CompanyAdmin> findCompaniesForRoute(@Param("fromCity") String fromCity, @Param("toCity") String toCity);

    // ADD THESE - Count methods
    long countByIsApproved(Boolean isApproved);
    long countByIsApprovedFalse(); // ADD THIS
    long countByIsApprovedTrue();  // ADD THIS

    // Count hiring companies
    long countByIsHiringTrueAndIsApprovedTrue();

    // Find top rated companies
    List<CompanyAdmin> findByIsApprovedTrueOrderByRatingAvgDesc();
}
