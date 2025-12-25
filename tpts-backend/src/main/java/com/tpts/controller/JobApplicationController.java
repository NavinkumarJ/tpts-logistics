package com.tpts.controller;

import com.tpts.dto.request.ApplyJobRequest;
import com.tpts.dto.request.HireApplicantRequest;
import com.tpts.dto.request.ReviewApplicationRequest;
import com.tpts.dto.response.ApiResponse;
import com.tpts.dto.response.JobApplicationDTO;
import com.tpts.dto.response.JobListingDTO;
import com.tpts.entity.ApplicationStatus;
import com.tpts.entity.User;
import com.tpts.service.JobApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Job Application Controller
 * Handles public job portal and hiring workflow
 *
 * Public Endpoints (No auth):
 * - GET  /api/jobs                          - Get all job listings
 * - GET  /api/jobs/city/{city}              - Get jobs by city
 * - GET  /api/jobs/{companyId}              - Get job details
 * - POST /api/job-applications              - Submit application
 * - GET  /api/job-applications/track        - Track application by email/phone
 * - POST /api/job-applications/{id}/withdraw - Withdraw application
 *
 * Company Admin Endpoints:
 * - GET   /api/job-applications/company                  - Get all applications
 * - GET   /api/job-applications/company/status/{status}  - Get by status
 * - GET   /api/job-applications/company/pending          - Get pending
 * - GET   /api/job-applications/{id}                     - Get by ID
 * - PATCH /api/job-applications/{id}/review              - Review/update status
 * - POST  /api/job-applications/{id}/hire                - Hire applicant
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class JobApplicationController {

    private final JobApplicationService jobApplicationService;

    // ==========================================
    // Public Job Listings
    // ==========================================

    /**
     * Get all job listings (companies hiring)
     * GET /api/jobs
     */
    @GetMapping("/api/jobs")
    public ResponseEntity<ApiResponse<List<JobListingDTO>>> getJobListings() {
        log.info("Getting all public job listings");

        List<JobListingDTO> listings = jobApplicationService.getPublicJobListings();

        return ResponseEntity.ok(ApiResponse.success(listings,
                listings.size() + " companies are hiring"));
    }

    /**
     * Get job listings by city
     * GET /api/jobs/city/{city}
     */
    @GetMapping("/api/jobs/city/{city}")
    public ResponseEntity<ApiResponse<List<JobListingDTO>>> getJobListingsByCity(
            @PathVariable String city) {

        log.info("Getting job listings for city: {}", city);

        List<JobListingDTO> listings = jobApplicationService.getJobListingsByCity(city);

        return ResponseEntity.ok(ApiResponse.success(listings,
                listings.size() + " companies hiring in " + city));
    }

    /**
     * Get job listing details for a company
     * GET /api/jobs/{companyId}
     */
    @GetMapping("/api/jobs/{companyId}")
    public ResponseEntity<ApiResponse<JobListingDTO>> getJobDetails(
            @PathVariable Long companyId) {

        log.info("Getting job details for company: {}", companyId);

        JobListingDTO listing = jobApplicationService.getJobListingDetails(companyId);

        return ResponseEntity.ok(ApiResponse.success(listing, "Job details retrieved"));
    }

    // ==========================================
    // Public: Submit Application
    // ==========================================

    /**
     * Submit job application (no auth required)
     * POST /api/job-applications
     */
    @PostMapping("/api/job-applications")
    public ResponseEntity<ApiResponse<JobApplicationDTO>> submitApplication(
            @Valid @RequestBody ApplyJobRequest request) {

        log.info("New job application from {} for company {}",
                request.getApplicantEmail(), request.getCompanyId());

        JobApplicationDTO application = jobApplicationService.submitApplication(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(application,
                        "Application submitted successfully! We'll contact you soon."));
    }

    // ==========================================
    // Public: Track Application
    // ==========================================

    /**
     * Track application by email or phone
     * GET /api/job-applications/track?email=X or ?phone=Y
     */
    @GetMapping("/api/job-applications/track")
    public ResponseEntity<ApiResponse<List<JobApplicationDTO>>> trackApplication(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phone) {

        if (email == null && phone == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Please provide email or phone number"));
        }

        List<JobApplicationDTO> applications;

        if (email != null) {
            log.info("Tracking applications for email: {}", email);
            applications = jobApplicationService.trackApplicationsByEmail(email);
        } else {
            log.info("Tracking applications for phone: {}", phone);
            applications = jobApplicationService.trackApplicationsByPhone(phone);
        }

        return ResponseEntity.ok(ApiResponse.success(applications,
                "Found " + applications.size() + " application(s)"));
    }

    /**
     * Withdraw application (by applicant)
     * POST /api/job-applications/{id}/withdraw?email=X
     */
    @PostMapping("/api/job-applications/{id}/withdraw")
    public ResponseEntity<ApiResponse<JobApplicationDTO>> withdrawApplication(
            @PathVariable Long id,
            @RequestParam String email) {

        log.info("Withdrawing application {} by {}", id, email);

        JobApplicationDTO application = jobApplicationService.withdrawApplication(id, email);

        return ResponseEntity.ok(ApiResponse.success(application, "Application withdrawn"));
    }

    // ==========================================
    // Company Admin: Get Applications
    // ==========================================

    /**
     * Get all applications for company
     * GET /api/job-applications/company
     */
    @GetMapping("/api/job-applications/company")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<List<JobApplicationDTO>>> getCompanyApplications(
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting all applications for company");

        List<JobApplicationDTO> applications = jobApplicationService.getCompanyApplications(currentUser);

        return ResponseEntity.ok(ApiResponse.success(applications,
                "Retrieved " + applications.size() + " applications"));
    }

    /**
     * Get applications by status
     * GET /api/job-applications/company/status/{status}
     */
    @GetMapping("/api/job-applications/company/status/{status}")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<List<JobApplicationDTO>>> getApplicationsByStatus(
            @PathVariable ApplicationStatus status,
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting {} applications", status);

        List<JobApplicationDTO> applications = jobApplicationService.getApplicationsByStatus(status, currentUser);

        return ResponseEntity.ok(ApiResponse.success(applications,
                "Retrieved " + applications.size() + " " + status + " applications"));
    }

    /**
     * Get pending applications
     * GET /api/job-applications/company/pending
     */
    @GetMapping("/api/job-applications/company/pending")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<List<JobApplicationDTO>>> getPendingApplications(
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting pending applications");

        List<JobApplicationDTO> applications = jobApplicationService.getPendingApplications(currentUser);

        return ResponseEntity.ok(ApiResponse.success(applications,
                applications.size() + " applications awaiting review"));
    }

    /**
     * Get application by ID
     * GET /api/job-applications/{id}
     */
    @GetMapping("/api/job-applications/{id}")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<JobApplicationDTO>> getApplicationById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting application: {}", id);

        JobApplicationDTO application = jobApplicationService.getApplicationById(id, currentUser);

        return ResponseEntity.ok(ApiResponse.success(application, "Application retrieved"));
    }

    // ==========================================
    // Company Admin: Review & Hire
    // ==========================================

    /**
     * Review/update application status
     * PATCH /api/job-applications/{id}/review
     */
    @PatchMapping("/api/job-applications/{id}/review")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<JobApplicationDTO>> reviewApplication(
            @PathVariable Long id,
            @Valid @RequestBody ReviewApplicationRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Reviewing application {}: new status = {}", id, request.getStatus());

        JobApplicationDTO application = jobApplicationService.reviewApplication(id, request, currentUser);

        String message = switch (request.getStatus()) {
            case SHORTLISTED -> "Application shortlisted!";
            case INTERVIEW_SCHEDULED -> "Interview scheduled for " + request.getInterviewDate();
            case APPROVED -> "Application approved! Ready to hire.";
            case REJECTED -> "Application rejected.";
            default -> "Application updated to " + request.getStatus();
        };

        return ResponseEntity.ok(ApiResponse.success(application, message));
    }

    /**
     * Hire applicant (creates agent account)
     * POST /api/job-applications/{id}/hire
     */
    @PostMapping("/api/job-applications/{id}/hire")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<JobApplicationDTO>> hireApplicant(
            @PathVariable Long id,
            @RequestBody(required = false) HireApplicantRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Hiring applicant from application: {}", id);

        if (request == null) {
            request = new HireApplicantRequest();
        }

        JobApplicationDTO application = jobApplicationService.hireApplicant(id, request, currentUser);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(application,
                        "Applicant hired! Agent account created. ID: " + application.getHiredAsAgentId()));
    }
}