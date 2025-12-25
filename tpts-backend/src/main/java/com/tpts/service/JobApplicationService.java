package com.tpts.service;

import com.tpts.dto.request.ApplyJobRequest;
import com.tpts.dto.request.HireApplicantRequest;
import com.tpts.dto.request.ReviewApplicationRequest;
import com.tpts.dto.response.JobApplicationDTO;
import com.tpts.dto.response.JobListingDTO;
import com.tpts.entity.*;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.*;
import com.tpts.util.OtpUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Service for Job Application operations
 * Handles public job portal, applications, and hiring workflow
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JobApplicationService {

    private final JobApplicationRepository applicationRepository;
    private final CompanyAdminRepository companyRepository;
    private final DeliveryAgentRepository agentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final PasswordEncoder passwordEncoder;
    private final OtpUtil otpUtil;

    // ==========================================
    // Public Job Listings
    // ==========================================

    /**
     * Get all companies that are hiring (public)
     */
    public List<JobListingDTO> getPublicJobListings() {
        List<CompanyAdmin> hiringCompanies = companyRepository.findByIsHiringTrueAndIsApprovedTrue();

        return hiringCompanies.stream()
                .map(this::mapToJobListingDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get job listings by city
     */
    public List<JobListingDTO> getJobListingsByCity(String city) {
        List<CompanyAdmin> hiringCompanies = companyRepository.findByIsHiringTrueAndIsApprovedTrue();

        return hiringCompanies.stream()
                .filter(c -> c.getCity().equalsIgnoreCase(city) ||
                        (c.getServiceCities() != null
                                && c.getServiceCities().toLowerCase().contains(city.toLowerCase())))
                .map(this::mapToJobListingDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get single job listing details
     */
    public JobListingDTO getJobListingDetails(Long companyId) {
        CompanyAdmin company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        if (!company.getIsHiring() || !company.getIsApproved()) {
            throw new BadRequestException("This company is not currently hiring");
        }

        return mapToJobListingDTO(company);
    }

    // ==========================================
    // Submit Application (Public)
    // ==========================================

    /**
     * Submit job application (no auth required)
     */
    @Transactional
    public JobApplicationDTO submitApplication(ApplyJobRequest request) {
        // Verify company exists and is hiring
        CompanyAdmin company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", request.getCompanyId()));

        if (!company.getIsApproved()) {
            throw new BadRequestException("This company is not available");
        }

        if (!company.getIsHiring()) {
            throw new BadRequestException("This company is not currently hiring");
        }

        // Check if already applied (with non-terminated status)
        List<ApplicationStatus> excludedStatuses = Arrays.asList(
                ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN, ApplicationStatus.HIRED);

        boolean alreadyAppliedByEmail = applicationRepository.existsByApplicantEmailAndCompanyIdAndStatusNotIn(
                request.getApplicantEmail(), request.getCompanyId(), excludedStatuses);

        boolean alreadyAppliedByPhone = applicationRepository.existsByApplicantPhoneAndCompanyIdAndStatusNotIn(
                request.getApplicantPhone(), request.getCompanyId(), excludedStatuses);

        if (alreadyAppliedByEmail || alreadyAppliedByPhone) {
            throw new BadRequestException("You already have an active application with this company");
        }

        // Check if email/phone already registered as user
        if (userRepository.existsByEmail(request.getApplicantEmail())) {
            throw new BadRequestException("This email is already registered. Please login to apply.");
        }

        // Create application
        JobApplication application = JobApplication.builder()
                .company(company)
                .applicantName(request.getApplicantName())
                .applicantEmail(request.getApplicantEmail())
                .applicantPhone(request.getApplicantPhone())
                .dateOfBirth(request.getDateOfBirth())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .pincode(request.getPincode())
                .vehicleType(request.getVehicleType())
                .vehicleNumber(request.getVehicleNumber())
                .licenseNumber(request.getLicenseNumber())
                .licenseExpiry(request.getLicenseExpiry())
                .experienceYears(request.getExperienceYears())
                .previousEmployer(request.getPreviousEmployer())
                .servicePincodes(request.getServicePincodes())
                .preferredShifts(request.getPreferredShifts())
                .licenseDocumentUrl(request.getLicenseDocumentUrl())
                .aadhaarDocumentUrl(request.getAadhaarDocumentUrl())
                .rcDocumentUrl(request.getRcDocumentUrl())
                .vehiclePhotoUrl(request.getVehiclePhotoUrl())
                .photoUrl(request.getPhotoUrl())
                .additionalDocuments(request.getAdditionalDocuments())
                .coverLetter(request.getCoverLetter())
                .expectedSalary(request.getExpectedSalary())
                .availableFrom(request.getAvailableFrom())
                .weekendAvailability(request.getWeekendAvailability())
                .status(ApplicationStatus.PENDING)
                .build();

        application = applicationRepository.save(application);

        log.info("New job application submitted: {} ({}) applied to company {}",
                request.getApplicantName(), request.getApplicantEmail(), company.getCompanyName());

        // Send notification to company about new application
        notificationService.sendNewJobApplicationToCompany(
                company.getUser(),
                request.getApplicantName(),
                request.getVehicleType() != null ? request.getVehicleType().name() : "Not specified");

        // Send confirmation to applicant (direct email/SMS since they don't have User
        // account)
        notificationService.sendApplicationSubmittedDirect(
                request.getApplicantEmail(),
                request.getApplicantPhone(),
                request.getApplicantName(),
                company.getCompanyName());

        return mapToDTO(application);
    }

    // ==========================================
    // Company: Get Applications
    // ==========================================

    /**
     * Get all applications for company
     */
    public List<JobApplicationDTO> getCompanyApplications(User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        List<JobApplication> applications = applicationRepository
                .findByCompanyIdOrderByAppliedAtDesc(company.getId());

        return applications.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get applications by status
     */
    public List<JobApplicationDTO> getApplicationsByStatus(ApplicationStatus status, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        List<JobApplication> applications = applicationRepository
                .findByCompanyIdAndStatus(company.getId(), status);

        return applications.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get pending applications
     */
    public List<JobApplicationDTO> getPendingApplications(User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        List<JobApplication> applications = applicationRepository
                .findPendingApplications(company.getId());

        return applications.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get application by ID
     */
    public JobApplicationDTO getApplicationById(Long applicationId, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        JobApplication application = applicationRepository.findByIdAndCompanyId(applicationId, company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", applicationId));

        return mapToDTO(application);
    }

    // ==========================================
    // Company: Review Application
    // ==========================================

    /**
     * Review/update application status
     */
    @Transactional
    public JobApplicationDTO reviewApplication(Long applicationId, ReviewApplicationRequest request, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        JobApplication application = applicationRepository.findByIdAndCompanyId(applicationId, company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", applicationId));

        // Validate status transition
        validateStatusTransition(application.getStatus(), request.getStatus());

        // Validate required fields based on new status
        if (request.getStatus() == ApplicationStatus.REJECTED &&
                (request.getRejectionReason() == null || request.getRejectionReason().isBlank())) {
            throw new BadRequestException("Rejection reason is required");
        }

        if (request.getStatus() == ApplicationStatus.INTERVIEW_SCHEDULED && request.getInterviewDate() == null) {
            throw new BadRequestException("Interview date is required");
        }

        // Update application
        application.setStatus(request.getStatus());
        application.setReviewNotes(request.getReviewNotes());
        application.setReviewedBy(company.getContactPersonName());
        application.setReviewedAt(LocalDateTime.now());

        if (request.getStatus() == ApplicationStatus.REJECTED) {
            application.setRejectionReason(request.getRejectionReason());
        }

        if (request.getStatus() == ApplicationStatus.INTERVIEW_SCHEDULED) {
            application.setInterviewDate(request.getInterviewDate());
            application.setInterviewNotes(request.getInterviewNotes());
        }

        application = applicationRepository.save(application);

        log.info("Application {} status updated to {} by company {}",
                applicationId, request.getStatus(), company.getId());

        // Send notification to applicant about status change
        try {
            User applicantUser = userRepository.findByEmail(application.getApplicantEmail()).orElse(null);
            if (applicantUser != null) {
                // Applicant has a user account (after being hired)
                notificationService.sendApplicationStatusUpdate(
                        applicantUser,
                        application.getApplicantName(),
                        company.getCompanyName(),
                        request.getStatus().name(),
                        request.getReviewNotes());
            } else {
                // Applicant doesn't have account yet - send direct email/SMS
                if (request.getStatus() == ApplicationStatus.REJECTED) {
                    notificationService.sendApplicationRejectedDirect(
                            application.getApplicantEmail(),
                            application.getApplicantPhone(),
                            application.getApplicantName(),
                            company.getCompanyName(),
                            request.getRejectionReason());
                }
            }
        } catch (Exception e) {
            log.warn("Could not send status update notification: {}", e.getMessage());
        }

        return mapToDTO(application);
    }

    // ==========================================
    // Company: Hire Applicant
    // ==========================================

    /**
     * Hire applicant - creates agent account
     */
    @Transactional
    public JobApplicationDTO hireApplicant(Long applicationId, HireApplicantRequest request, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        JobApplication application = applicationRepository.findByIdAndCompanyId(applicationId, company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", applicationId));

        // Verify application can be hired
        if (!application.canBeHired()) {
            throw new BadRequestException("Application cannot be hired in current status: " + application.getStatus());
        }

        // Check if email already registered
        if (userRepository.existsByEmail(application.getApplicantEmail())) {
            throw new BadRequestException("This email is already registered as a user");
        }

        // Generate password if not provided
        String password = request.getInitialPassword();
        if (password == null || password.isBlank()) {
            password = otpUtil.generateTempPassword();
        }

        // Create User
        User user = User.builder()
                .email(application.getApplicantEmail())
                .password(passwordEncoder.encode(password))
                .phone(application.getApplicantPhone())
                .userType(UserType.DELIVERY_AGENT)
                .isVerified(true) // Auto-verified since hired
                .isActive(true)
                .build();

        user = userRepository.save(user);

        // Create Delivery Agent - copy all data including documents from application
        String servicePincodes = request.getServicePincodes() != null ? request.getServicePincodes()
                : application.getServicePincodes();

        DeliveryAgent agent = DeliveryAgent.builder()
                .user(user)
                .company(company)
                .fullName(application.getApplicantName())
                .vehicleType(application.getVehicleType())
                .vehicleNumber(application.getVehicleNumber())
                .licenseNumber(application.getLicenseNumber())
                .city(application.getCity())
                .servicePincodes(servicePincodes)
                // Copy document URLs from application
                .profilePhotoUrl(application.getPhotoUrl())
                .licenseDocumentUrl(application.getLicenseDocumentUrl())
                .aadhaarDocumentUrl(application.getAadhaarDocumentUrl())
                .rcDocumentUrl(application.getRcDocumentUrl())
                .vehiclePhotoUrl(application.getVehiclePhotoUrl())
                .additionalDocuments(application.getAdditionalDocuments())
                .isActive(request.getActivateImmediately())
                .isAvailable(false) // Agent needs to go online manually
                .ratingAvg(BigDecimal.ZERO)
                .totalDeliveries(0)
                .currentOrdersCount(0)
                .build();

        agent = agentRepository.save(agent);

        // Update application
        application.setStatus(ApplicationStatus.HIRED);
        application.setHiredAsAgentId(agent.getId());
        application.setHiredAt(LocalDateTime.now());
        application = applicationRepository.save(application);

        // Update company stats
        if (company.getOpenPositions() != null && company.getOpenPositions() > 0) {
            company.setOpenPositions(company.getOpenPositions() - 1);
            if (company.getOpenPositions() == 0) {
                company.setIsHiring(false);
            }
            companyRepository.save(company);
        }

        log.info("Hired applicant {} as agent {}. Email: {}, Temp password: {}",
                application.getApplicantName(), agent.getId(), application.getApplicantEmail(), password);

        // Send welcome email with credentials to new agent
        notificationService.sendAgentWelcomeWithCredentials(
                user,
                application.getApplicantName(),
                application.getApplicantEmail(),
                password,
                company.getCompanyName());

        return mapToDTO(application);
    }

    // ==========================================
    // Applicant: Track Application
    // ==========================================

    /**
     * Track application status by email (public)
     */
    public List<JobApplicationDTO> trackApplicationsByEmail(String email) {
        List<JobApplication> applications = applicationRepository
                .findByApplicantEmailOrderByAppliedAtDesc(email);

        if (applications.isEmpty()) {
            throw new ResourceNotFoundException("No applications found for this email");
        }

        return applications.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Track application status by phone (public)
     */
    public List<JobApplicationDTO> trackApplicationsByPhone(String phone) {
        List<JobApplication> applications = applicationRepository
                .findByApplicantPhoneOrderByAppliedAtDesc(phone);

        if (applications.isEmpty()) {
            throw new ResourceNotFoundException("No applications found for this phone number");
        }

        return applications.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    // ==========================================
    // Applicant: Withdraw Application
    // ==========================================

    /**
     * Withdraw application (by applicant - public)
     */
    @Transactional
    public JobApplicationDTO withdrawApplication(Long applicationId, String email) {
        JobApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", applicationId));

        // Verify ownership
        if (!application.getApplicantEmail().equalsIgnoreCase(email)) {
            throw new ForbiddenException("Access denied");
        }

        // Can only withdraw if not already hired/rejected
        if (application.getStatus() == ApplicationStatus.HIRED ||
                application.getStatus() == ApplicationStatus.REJECTED) {
            throw new BadRequestException("Cannot withdraw application in current status: " + application.getStatus());
        }

        application.setStatus(ApplicationStatus.WITHDRAWN);
        application = applicationRepository.save(application);

        log.info("Application {} withdrawn by applicant", applicationId);

        return mapToDTO(application);
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private void validateStatusTransition(ApplicationStatus current, ApplicationStatus newStatus) {
        // Define valid transitions
        boolean valid = switch (current) {
            case PENDING -> newStatus == ApplicationStatus.UNDER_REVIEW ||
                    newStatus == ApplicationStatus.SHORTLISTED ||
                    newStatus == ApplicationStatus.REJECTED;
            case UNDER_REVIEW -> newStatus == ApplicationStatus.SHORTLISTED ||
                    newStatus == ApplicationStatus.INTERVIEW_SCHEDULED ||
                    newStatus == ApplicationStatus.REJECTED;
            case SHORTLISTED -> newStatus == ApplicationStatus.INTERVIEW_SCHEDULED ||
                    newStatus == ApplicationStatus.APPROVED ||
                    newStatus == ApplicationStatus.REJECTED;
            case INTERVIEW_SCHEDULED -> newStatus == ApplicationStatus.APPROVED ||
                    newStatus == ApplicationStatus.REJECTED;
            case APPROVED -> newStatus == ApplicationStatus.HIRED ||
                    newStatus == ApplicationStatus.REJECTED;
            default -> false;
        };

        if (!valid) {
            throw new BadRequestException("Invalid status transition from " + current + " to " + newStatus);
        }
    }

    private JobListingDTO mapToJobListingDTO(CompanyAdmin company) {
        Long applicationCount = applicationRepository.countByCompanyId(company.getId());

        String salaryDisplay = formatSalaryRange(company.getSalaryRangeMin(), company.getSalaryRangeMax());

        return JobListingDTO.builder()
                .companyId(company.getId())
                .companyName(company.getCompanyName())
                .companyCity(company.getCity())
                .companyRating(company.getRatingAvg())
                .totalDeliveries(company.getTotalDeliveries())
                .openPositions(company.getOpenPositions())
                .salaryRangeMin(company.getSalaryRangeMin())
                .salaryRangeMax(company.getSalaryRangeMax())
                .salaryDisplay(salaryDisplay)
                .serviceCities(company.getServiceCities())
                .totalApplications(applicationCount)
                .isUrgent(company.getOpenPositions() != null && company.getOpenPositions() >= 5)
                .build();
    }

    private String formatSalaryRange(Integer min, Integer max) {
        NumberFormat formatter = NumberFormat
                .getCurrencyInstance(new Locale.Builder().setLanguage("en").setRegion("IN").build());
        formatter.setMaximumFractionDigits(0);

        if (min != null && max != null) {
            return formatter.format(min) + " - " + formatter.format(max) + "/month";
        } else if (min != null) {
            return "From " + formatter.format(min) + "/month";
        } else if (max != null) {
            return "Up to " + formatter.format(max) + "/month";
        }
        return "Competitive salary";
    }

    private JobApplicationDTO mapToDTO(JobApplication app) {
        return JobApplicationDTO.builder()
                .id(app.getId())
                .companyId(app.getCompany().getId())
                .companyName(app.getCompany().getCompanyName())
                .companyCity(app.getCompany().getCity())
                .applicantName(app.getApplicantName())
                .applicantEmail(app.getApplicantEmail())
                .applicantPhone(app.getApplicantPhone())
                .dateOfBirth(app.getDateOfBirth())
                .address(app.getAddress())
                .city(app.getCity())
                .state(app.getState())
                .pincode(app.getPincode())
                .vehicleType(app.getVehicleType())
                .vehicleNumber(app.getVehicleNumber())
                .licenseNumber(app.getLicenseNumber())
                .licenseExpiry(app.getLicenseExpiry())
                .experienceYears(app.getExperienceYears())
                .previousEmployer(app.getPreviousEmployer())
                .servicePincodes(app.getServicePincodes())
                .preferredShifts(app.getPreferredShifts())
                .licenseDocumentUrl(app.getLicenseDocumentUrl())
                .aadhaarDocumentUrl(app.getAadhaarDocumentUrl())
                .rcDocumentUrl(app.getRcDocumentUrl())
                .vehiclePhotoUrl(app.getVehiclePhotoUrl())
                .photoUrl(app.getPhotoUrl())
                .additionalDocuments(app.getAdditionalDocuments())
                .coverLetter(app.getCoverLetter())
                .expectedSalary(app.getExpectedSalary())
                .availableFrom(app.getAvailableFrom())
                .weekendAvailability(app.getWeekendAvailability())
                .status(app.getStatus())
                .interviewDate(app.getInterviewDate())
                .interviewNotes(app.getInterviewNotes())
                .reviewNotes(app.getReviewNotes())
                .rejectionReason(app.getRejectionReason())
                .reviewedBy(app.getReviewedBy())
                .reviewedAt(app.getReviewedAt())
                .hiredAsAgentId(app.getHiredAsAgentId())
                .hiredAt(app.getHiredAt())
                .appliedAt(app.getAppliedAt())
                .updatedAt(app.getUpdatedAt())
                .canBeReviewed(app.canBeReviewed())
                .canBeHired(app.canBeHired())
                .isActive(app.isActive())
                .build();
    }
}