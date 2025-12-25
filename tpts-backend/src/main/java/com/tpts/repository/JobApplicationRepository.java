package com.tpts.repository;

import com.tpts.entity.ApplicationStatus;
import com.tpts.entity.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for JobApplication entity
 */
@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    // ==========================================
    // Company Queries
    // ==========================================

    List<JobApplication> findByCompanyIdOrderByAppliedAtDesc(Long companyId);

    List<JobApplication> findByCompanyIdAndStatus(Long companyId, ApplicationStatus status);

    @Query("SELECT ja FROM JobApplication ja WHERE ja.company.id = :companyId " +
            "AND ja.status IN :statuses ORDER BY ja.appliedAt DESC")
    List<JobApplication> findByCompanyIdAndStatusIn(
            @Param("companyId") Long companyId,
            @Param("statuses") List<ApplicationStatus> statuses);

    // Pending applications for company
    @Query("SELECT ja FROM JobApplication ja WHERE ja.company.id = :companyId " +
            "AND ja.status = 'PENDING' ORDER BY ja.appliedAt ASC")
    List<JobApplication> findPendingApplications(@Param("companyId") Long companyId);

    // Active applications (not rejected/hired/withdrawn)
    @Query("SELECT ja FROM JobApplication ja WHERE ja.company.id = :companyId " +
            "AND ja.status NOT IN ('REJECTED', 'HIRED', 'WITHDRAWN') ORDER BY ja.appliedAt DESC")
    List<JobApplication> findActiveApplications(@Param("companyId") Long companyId);

    // Count by status
    long countByCompanyIdAndStatus(Long companyId, ApplicationStatus status);

    long countByCompanyId(Long companyId);

    // ==========================================
    // Public Queries (Jobs Page)
    // ==========================================

    // Find companies that are hiring (for public jobs page)
    @Query("SELECT DISTINCT ja.company.id FROM JobApplication ja WHERE ja.company.isHiring = true")
    List<Long> findHiringCompanyIds();

    // ==========================================
    // Applicant Queries (by email/phone)
    // ==========================================

    List<JobApplication> findByApplicantEmailOrderByAppliedAtDesc(String email);

    List<JobApplication> findByApplicantPhoneOrderByAppliedAtDesc(String phone);

    Optional<JobApplication> findByApplicantEmailAndCompanyId(String email, Long companyId);

    Optional<JobApplication> findByApplicantPhoneAndCompanyId(String phone, Long companyId);

    // Check if applicant already applied to this company
    boolean existsByApplicantEmailAndCompanyIdAndStatusNotIn(
            String email, Long companyId, List<ApplicationStatus> excludedStatuses);

    boolean existsByApplicantPhoneAndCompanyIdAndStatusNotIn(
            String phone, Long companyId, List<ApplicationStatus> excludedStatuses);

    // ==========================================
    // Search & Filter
    // ==========================================

    // Search by city
    @Query("SELECT ja FROM JobApplication ja WHERE ja.company.id = :companyId " +
            "AND ja.city = :city ORDER BY ja.appliedAt DESC")
    List<JobApplication> findByCompanyIdAndCity(
            @Param("companyId") Long companyId,
            @Param("city") String city);

    // Search by experience
    @Query("SELECT ja FROM JobApplication ja WHERE ja.company.id = :companyId " +
            "AND ja.experienceYears = :experience ORDER BY ja.appliedAt DESC")
    List<JobApplication> findByCompanyIdAndExperience(
            @Param("companyId") Long companyId,
            @Param("experience") String experience);

    // ==========================================
    // Interview Queries
    // ==========================================

    // Upcoming interviews
    @Query("SELECT ja FROM JobApplication ja WHERE ja.company.id = :companyId " +
            "AND ja.status = 'INTERVIEW_SCHEDULED' AND ja.interviewDate >= :now " +
            "ORDER BY ja.interviewDate ASC")
    List<JobApplication> findUpcomingInterviews(
            @Param("companyId") Long companyId,
            @Param("now") LocalDateTime now);

    // ==========================================
    // Statistics
    // ==========================================

    // Count applications by status for company
    @Query("SELECT ja.status, COUNT(ja) FROM JobApplication ja " +
            "WHERE ja.company.id = :companyId GROUP BY ja.status")
    List<Object[]> countByStatusForCompany(@Param("companyId") Long companyId);

    // Applications received today
    @Query("SELECT COUNT(ja) FROM JobApplication ja WHERE ja.company.id = :companyId " +
            "AND DATE(ja.appliedAt) = CURRENT_DATE")
    long countTodayApplications(@Param("companyId") Long companyId);

    // Hired this month
    @Query("SELECT COUNT(ja) FROM JobApplication ja WHERE ja.company.id = :companyId " +
            "AND ja.status = 'HIRED' AND MONTH(ja.hiredAt) = MONTH(CURRENT_DATE) " +
            "AND YEAR(ja.hiredAt) = YEAR(CURRENT_DATE)")
    long countHiredThisMonth(@Param("companyId") Long companyId);

    // ==========================================
    // Verification
    // ==========================================

    @Query("SELECT ja FROM JobApplication ja WHERE ja.id = :id AND ja.company.id = :companyId")
    Optional<JobApplication> findByIdAndCompanyId(@Param("id") Long id, @Param("companyId") Long companyId);

    // Count by status (for platform stats)
    long countByStatus(ApplicationStatus status);
}