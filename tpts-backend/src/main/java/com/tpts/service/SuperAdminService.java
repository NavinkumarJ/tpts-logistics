// src/main/java/com/tpts/service/SuperAdminService.java
package com.tpts.service;

import com.tpts.dto.request.*;
import com.tpts.dto.response.*;
import com.tpts.entity.*;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SuperAdminService {

    private final SuperAdminRepository superAdminRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final CompanyAdminRepository companyRepository;
    private final DeliveryAgentRepository agentRepository;
    private final ParcelRepository parcelRepository;
    private final GroupShipmentRepository groupRepository;
    private final PaymentRepository paymentRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final RatingRepository ratingRepository;
    private final PlatformSettingsRepository settingsRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminActionLogRepository actionLogRepository;
    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    // ==========================================
    // Dashboard & Statistics
    // ==========================================

    /**
     * Get platform statistics - ENHANCED VERSION
     */
    public PlatformStatsDTO getPlatformStats() {

        // Calculate financial metrics
        BigDecimal totalRevenue = calculateTotalRevenue();
        BigDecimal commissionEarned = calculateCommissionEarned();

        // Time-based revenue
        LocalDateTime startOfToday = LocalDateTime.now().truncatedTo(ChronoUnit.DAYS);
        LocalDateTime startOfWeek = LocalDateTime.now().minusWeeks(1);
        LocalDateTime startOfMonth = LocalDateTime.now().minusMonths(1);

        BigDecimal todayRevenue = calculateRevenueForPeriod(startOfToday, LocalDateTime.now());
        BigDecimal weeklyRevenue = calculateRevenueForPeriod(startOfWeek, LocalDateTime.now());
        BigDecimal monthlyRevenue = calculateRevenueForPeriod(startOfMonth, LocalDateTime.now());

        return PlatformStatsDTO.builder()
                // User counts
                .totalUsers(userRepository.count())
                .totalCustomers(customerRepository.count())
                .totalCompanies(companyRepository.count())
                .totalAgents(agentRepository.count())
                .totalSuperAdmins(superAdminRepository.count())
                .activeUsersToday(countActiveUsersToday())

                // Company stats
                .pendingCompanyApprovals(companyRepository.countByIsApprovedFalse())
                .approvedCompanies(companyRepository.countByIsApprovedTrue())
                .hiringCompanies(companyRepository.countByIsHiringTrueAndIsApprovedTrue())

                // Parcel stats
                .totalParcels(parcelRepository.count())
                .pendingParcels(parcelRepository.countByStatus(ParcelStatus.PENDING))
                .inTransitParcels(parcelRepository.countByStatus(ParcelStatus.IN_TRANSIT))
                .deliveredParcels(parcelRepository.countByStatus(ParcelStatus.DELIVERED))

                // Group stats
                .totalGroups(groupRepository.count())
                .openGroups(groupRepository.countByStatus(GroupStatus.OPEN))
                .activeGroupShipments(groupRepository.countByStatusIn(
                        Arrays.asList(GroupStatus.OPEN, GroupStatus.FULL)))
                .completedGroups(groupRepository.countByStatus(GroupStatus.COMPLETED))

                // Payment stats
                .successfulPayments(paymentRepository.countByStatus(PaymentStatus.SUCCESS))
                .pendingPayments(paymentRepository.countByStatus(PaymentStatus.PENDING))

                // Financial stats
                .totalRevenue(totalRevenue)
                .commissionEarned(commissionEarned)
                .todayRevenue(todayRevenue)
                .weeklyRevenue(weeklyRevenue)
                .monthlyRevenue(monthlyRevenue)

                // Job application stats
                .totalApplications(jobApplicationRepository.count())
                .pendingApplications(jobApplicationRepository.countByStatus(ApplicationStatus.PENDING))
                .hiredApplications(jobApplicationRepository.countByStatus(ApplicationStatus.HIRED))

                // Rating stats
                .totalRatings(ratingRepository.count())
                .flaggedRatings(ratingRepository.countByIsFlaggedTrue())

                // Agent stats
                .activeAgents(agentRepository.countByIsActiveTrue())
                .availableAgents(agentRepository.countByIsActiveTrueAndIsAvailableTrue())

                .build();
    }

    /**
     * Calculate total revenue from all successful payments
     */
    private BigDecimal calculateTotalRevenue() {
        return paymentRepository.findByStatus(PaymentStatus.SUCCESS).stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Calculate total commission earned by platform
     */
    // ✅ BETTER - Uses stored commission (more accurate)
    private BigDecimal calculateCommissionEarned() {
        return paymentRepository.findByStatus(PaymentStatus.SUCCESS).stream()
                .map(payment -> {
                    // ✅ FIRST: Try to use stored platform commission
                    if (payment.getPlatformCommission() != null) {
                        return payment.getPlatformCommission();
                    }

                    // ✅ FALLBACK: Calculate from commission rate
                    // (for old payments before split was implemented)
                    BigDecimal commissionRate = payment.getCompany() != null
                            ? payment.getCompany().getCommissionRate()
                            : BigDecimal.valueOf(5.0);

                    return payment.getTotalAmount()
                            .multiply(commissionRate)
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Calculate revenue for a specific time period
     */
    private BigDecimal calculateRevenueForPeriod(LocalDateTime start, LocalDateTime end) {
        return paymentRepository.findByStatusAndCreatedAtBetween(
                PaymentStatus.SUCCESS, start, end).stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Count users who logged in today
     */
    private Long countActiveUsersToday() {
        LocalDateTime startOfToday = LocalDateTime.now().truncatedTo(ChronoUnit.DAYS);
        return userRepository.countByLastLoginAfter(startOfToday);
    }

    // ==========================================
    // Company Approval Management
    // ==========================================

    public List<CompanyDTO> getPendingCompanies() {
        List<CompanyAdmin> companies = companyRepository.findByIsApprovedFalseOrderByCreatedAtDesc();
        return companies.stream().map(this::mapToCompanyDTO).collect(Collectors.toList());
    }

    public List<CompanyDTO> getApprovedCompanies() {
        List<CompanyAdmin> companies = companyRepository.findByIsApprovedTrue();
        return companies.stream().map(this::mapToCompanyDTO).collect(Collectors.toList());
    }

    public CompanyDTO getCompanyById(Long companyId) {
        CompanyAdmin company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));
        return mapToCompanyDTO(company);
    }

    @Transactional
    public CompanyDTO approveCompany(Long companyId, ApproveCompanyRequest request, User currentUser) {
        CompanyAdmin company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        if (company.getIsApproved()) {
            throw new BadRequestException("Company is already approved");
        }

        company.setIsApproved(true);
        company.setCommissionRate(request.getCommissionRate());
        company = companyRepository.save(company);

        recordAction(currentUser, "Approved company: " + company.getCompanyName());

        // Send approval email notification
        try {
            emailService.sendCompanyApprovalEmail(
                    company.getUser().getEmail(),
                    company.getCompanyName(),
                    company.getContactPersonName());
        } catch (Exception e) {
            log.warn("Failed to send company approval email: {}", e.getMessage());
        }

        log.info("Company approved: ID={}, Name={}, Commission={}%",
                companyId, company.getCompanyName(), request.getCommissionRate());

        return mapToCompanyDTO(company);
    }

    @Transactional
    public CompanyDTO rejectCompany(Long companyId, RejectCompanyRequest request, User currentUser) {
        CompanyAdmin company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        if (company.getIsApproved()) {
            throw new BadRequestException("Cannot reject an already approved company. Use suspend instead.");
        }

        company.setIsApproved(false);
        company.getUser().setIsActive(false);
        companyRepository.save(company);
        userRepository.save(company.getUser());

        recordAction(currentUser, "Rejected company: " + company.getCompanyName() + ". Reason: " + request.getReason());

        log.info("Company rejected: ID={}, Name={}, Reason={}",
                companyId, company.getCompanyName(), request.getReason());

        return mapToCompanyDTO(company);
    }

    @Transactional
    public CompanyDTO suspendCompany(Long companyId, String reason, User currentUser) {
        CompanyAdmin company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        company.getUser().setIsActive(false);
        userRepository.save(company.getUser());

        recordAction(currentUser, "Suspended company: " + company.getCompanyName() + ". Reason: " + reason);

        log.info("Company suspended: ID={}, Name={}", companyId, company.getCompanyName());

        return mapToCompanyDTO(company);
    }

    @Transactional
    public CompanyDTO reactivateCompany(Long companyId, User currentUser) {
        CompanyAdmin company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        company.getUser().setIsActive(true);
        userRepository.save(company.getUser());

        recordAction(currentUser, "Reactivated company: " + company.getCompanyName());

        log.info("Company reactivated: ID={}, Name={}", companyId, company.getCompanyName());

        return mapToCompanyDTO(company);
    }

    @Transactional
    public CompanyDTO updateCompanyCommission(Long companyId, BigDecimal commissionRate, User currentUser) {
        CompanyAdmin company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        BigDecimal oldRate = company.getCommissionRate();
        company.setCommissionRate(commissionRate);
        company = companyRepository.save(company);

        recordAction(currentUser, "Updated commission for " + company.getCompanyName() +
                " from " + oldRate + "% to " + commissionRate + "%");

        log.info("Commission updated: Company={}, Old={}%, New={}%",
                company.getCompanyName(), oldRate, commissionRate);

        return mapToCompanyDTO(company);
    }

    // ==========================================
    // User Management
    // ==========================================

    public List<UserListDTO> getAllUsers(UserType userType, Boolean isActive) {
        List<UserListDTO> users = new ArrayList<>();

        if (userType == null || userType == UserType.CUSTOMER) {
            customerRepository.findAll().stream()
                    .filter(c -> !Boolean.TRUE.equals(c.getUser().getIsDeleted())) // Exclude soft-deleted
                    .filter(c -> isActive == null || c.getUser().getIsActive().equals(isActive))
                    .map(this::mapCustomerToUserListDTO)
                    .forEach(users::add);
        }

        if (userType == null || userType == UserType.COMPANY_ADMIN) {
            companyRepository.findAll().stream()
                    .filter(c -> !Boolean.TRUE.equals(c.getUser().getIsDeleted())) // Exclude soft-deleted
                    .filter(c -> isActive == null || c.getUser().getIsActive().equals(isActive))
                    .map(this::mapCompanyToUserListDTO)
                    .forEach(users::add);
        }

        if (userType == null || userType == UserType.DELIVERY_AGENT) {
            agentRepository.findAll().stream()
                    .filter(a -> !Boolean.TRUE.equals(a.getUser().getIsDeleted())) // Exclude soft-deleted
                    .filter(a -> isActive == null || a.getUser().getIsActive().equals(isActive))
                    .map(this::mapAgentToUserListDTO)
                    .forEach(users::add);
        }

        return users;
    }

    public UserListDTO getUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        return switch (user.getUserType()) {
            case CUSTOMER -> customerRepository.findByUserId(userId)
                    .map(this::mapCustomerToUserListDTO)
                    .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));
            case COMPANY_ADMIN -> companyRepository.findByUserId(userId)
                    .map(this::mapCompanyToUserListDTO)
                    .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));
            case DELIVERY_AGENT -> agentRepository.findByUserId(userId)
                    .map(this::mapAgentToUserListDTO)
                    .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));
            case SUPER_ADMIN -> superAdminRepository.findByUserId(userId)
                    .map(this::mapSuperAdminToUserListDTO)
                    .orElseThrow(() -> new ResourceNotFoundException("Admin profile not found"));
        };
    }

    @Transactional
    public UserListDTO updateUserStatus(Long userId, UpdateUserStatusRequest request, User currentUser) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (user.getId().equals(currentUser.getId())) {
            throw new BadRequestException("You cannot suspend your own account");
        }

        if (user.getUserType() == UserType.SUPER_ADMIN) {
            SuperAdmin currentAdmin = superAdminRepository.findByUser(currentUser)
                    .orElseThrow(() -> new ForbiddenException("Access denied"));
            if (!"SUPER_ADMIN".equals(currentAdmin.getRole())) {
                throw new ForbiddenException("Only SUPER_ADMIN can modify other admin accounts");
            }
        }

        user.setIsActive(request.getIsActive());
        user = userRepository.save(user);

        String action = request.getIsActive() ? "Activated" : "Suspended";
        recordAction(currentUser, action + " user: " + user.getEmail() +
                (request.getReason() != null ? ". Reason: " + request.getReason() : ""));

        log.info("User {} {}: ID={}, Email={}", action.toLowerCase(), user.getUserType(), userId, user.getEmail());

        return getUserById(userId);
    }

    @Transactional
    public void deleteUser(Long userId, User currentUser) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (user.getId().equals(currentUser.getId())) {
            throw new BadRequestException("You cannot delete your own account");
        }

        // If deleting a company, cascade soft-delete all their agents
        if (user.getUserType() == UserType.COMPANY_ADMIN) {
            companyRepository.findByUser(user).ifPresent(company -> {
                List<DeliveryAgent> agents = agentRepository.findByCompanyId(company.getId());
                for (DeliveryAgent agent : agents) {
                    agent.setIsActive(false);
                    agent.setIsAvailable(false);
                    agent.getUser().setIsActive(false);
                    agent.getUser().setIsDeleted(true);
                    agentRepository.save(agent);
                    userRepository.save(agent.getUser());
                }
                log.info("Cascade deleted {} agents for company {}", agents.size(), company.getCompanyName());
            });
        }

        // Soft delete - mark as deleted and deactivate
        user.setIsDeleted(true);
        user.setIsActive(false);
        userRepository.save(user);

        recordAction(currentUser, "Deleted user: " + user.getEmail());

        log.info("User soft deleted: ID={}, Email={}", userId, user.getEmail());
    }

    // ==========================================
    // Super Admin Management
    // ==========================================

    @Transactional
    public SuperAdminDTO createSuperAdmin(CreateSuperAdminRequest request, User currentUser) {
        SuperAdmin creator = superAdminRepository.findByUser(currentUser)
                .orElseThrow(() -> new ForbiddenException("Access denied"));

        if (!"SUPER_ADMIN".equals(creator.getRole())) {
            throw new ForbiddenException("Only SUPER_ADMIN can create new admin accounts");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .userType(UserType.SUPER_ADMIN)
                .isVerified(true)
                .isActive(true)
                .build();
        user = userRepository.save(user);

        SuperAdmin admin = SuperAdmin.builder()
                .user(user)
                .fullName(request.getFullName())
                .department(request.getDepartment())
                .role(request.getRole())
                .permissions(request.getPermissions())
                .notes(request.getNotes())
                .build();
        admin = superAdminRepository.save(admin);

        recordAction(currentUser, "Created admin: " + request.getEmail() + " (" + request.getRole() + ")");

        log.info("Super admin created: ID={}, Email={}, Role={}", admin.getId(), request.getEmail(), request.getRole());

        return mapToSuperAdminDTO(admin);
    }

    public List<SuperAdminDTO> getAllSuperAdmins() {
        return superAdminRepository.findAll().stream()
                .map(this::mapToSuperAdminDTO)
                .collect(Collectors.toList());
    }

    public SuperAdminDTO getCurrentAdmin(User currentUser) {
        SuperAdmin admin = superAdminRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Admin profile not found"));
        return mapToSuperAdminDTO(admin);
    }

    // ==========================================
    // Flagged Content Management
    // ==========================================

    public List<RatingDTO> getFlaggedRatings() {
        return ratingRepository.findByIsFlaggedTrueOrderByCreatedAtDesc().stream()
                .map(this::mapToRatingDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void unflagRating(Long ratingId, User currentUser) {
        Rating rating = ratingRepository.findById(ratingId)
                .orElseThrow(() -> new ResourceNotFoundException("Rating", "id", ratingId));

        rating.setIsFlagged(false);
        rating.setFlagReason(null);
        ratingRepository.save(rating);

        recordAction(currentUser, "Unflagged rating: " + ratingId);
    }

    @Transactional
    public void removeRating(Long ratingId, User currentUser) {
        Rating rating = ratingRepository.findById(ratingId)
                .orElseThrow(() -> new ResourceNotFoundException("Rating", "id", ratingId));

        rating.setIsPublic(false);
        ratingRepository.save(rating);

        recordAction(currentUser, "Removed rating from public: " + ratingId);
    }

    // ==========================================
    // Platform Settings Management
    // ==========================================

    @Transactional
    public PlatformSettingsResponseDTO getPlatformSettings() {
        PlatformSettings settings = settingsRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> {
                    try {
                        PlatformSettings defaultSettings = PlatformSettings.builder().build();
                        return settingsRepository.save(defaultSettings);
                    } catch (Exception e) {
                        // Race condition: another thread may have created settings
                        // Try to fetch again
                        return settingsRepository.findFirstByOrderByIdAsc()
                                .orElseGet(() -> PlatformSettings.builder().build());
                    }
                });

        return mapToSettingsResponseDTO(settings);
    }

    @Transactional
    public PlatformSettingsResponseDTO updatePlatformSettings(
            PlatformSettingsResponseDTO dto, User currentUser) {

        PlatformSettings settings = settingsRepository.findFirstByOrderByIdAsc()
                .orElse(new PlatformSettings());

        // Update all fields
        settings.setDefaultCommissionRate(dto.getDefaultCommissionRate());
        settings.setMinCommissionRate(dto.getMinCommissionRate());
        settings.setMaxCommissionRate(dto.getMaxCommissionRate());
        settings.setGroupBuyCommissionRate(dto.getGroupBuyCommissionRate());
        settings.setMinGroupMembers(dto.getMinGroupMembers());
        settings.setMaxGroupMembers(dto.getMaxGroupMembers());
        settings.setDefaultGroupDeadlineHours(dto.getDefaultGroupDeadlineHours());
        settings.setMinGroupDeadlineHours(dto.getMinGroupDeadlineHours());
        settings.setMaxGroupDeadlineHours(dto.getMaxGroupDeadlineHours());
        settings.setGroupDiscountPercentage(dto.getGroupDiscountPercentage());
        settings.setMinDeliveryCharge(dto.getMinDeliveryCharge());
        settings.setMaxDeliveryCharge(dto.getMaxDeliveryCharge());
        settings.setMinWeightKg(dto.getMinWeightKg());
        settings.setMaxWeightKg(dto.getMaxWeightKg());
        settings.setAllowPublicTracking(dto.getAllowPublicTracking());
        settings.setAllowGroupShipments(dto.getAllowGroupShipments());
        settings.setAllowJobApplications(dto.getAllowJobApplications());
        settings.setMaintenanceMode(dto.getMaintenanceMode());
        settings.setSmsEnabled(dto.getSmsEnabled());
        settings.setEmailEnabled(dto.getEmailEnabled());
        settings.setPushNotificationsEnabled(dto.getPushNotificationsEnabled());

        if (dto.getRazorpayKeyId() != null && !dto.getRazorpayKeyId().isEmpty()) {
            settings.setRazorpayKeyId(dto.getRazorpayKeyId());
        }
        if (dto.getTwilioAccountSid() != null && !dto.getTwilioAccountSid().isEmpty()) {
            settings.setTwilioAccountSid(dto.getTwilioAccountSid());
        }
        if (dto.getSmtpHost() != null) {
            settings.setSmtpHost(dto.getSmtpHost());
        }
        if (dto.getSmtpPort() != null) {
            settings.setSmtpPort(dto.getSmtpPort());
        }

        settings.setUpdatedBy(currentUser.getId());
        settings = settingsRepository.save(settings);

        recordAction(currentUser, "Updated platform settings");
        log.info("Platform settings updated by: {}", currentUser.getEmail());

        return mapToSettingsResponseDTO(settings);
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private void recordAction(User user, String action) {
        recordAction(user, action, null, null, null);
    }

    private void recordAction(User user, String action, String actionType, Long targetId, String targetName) {
        // Save to SuperAdmin's lastAction
        superAdminRepository.findByUser(user).ifPresent(admin -> {
            admin.recordAction(action);
            superAdminRepository.save(admin);
        });

        // Save to AdminActionLog for audit trail
        AdminActionLog logEntry = AdminActionLog.builder()
                .user(user)
                .userEmail(user.getEmail())
                .actionType(actionType != null ? actionType : detectActionType(action))
                .action(action)
                .targetId(targetId)
                .targetType(targetName != null ? detectTargetType(action) : null)
                .targetName(targetName)
                .build();
        actionLogRepository.save(logEntry);
    }

    private String detectActionType(String action) {
        if (action.contains("company") || action.contains("Company"))
            return "COMPANY";
        if (action.contains("user") || action.contains("User"))
            return "USER";
        if (action.contains("rating") || action.contains("Rating"))
            return "MODERATION";
        if (action.contains("settings") || action.contains("Settings"))
            return "SETTINGS";
        if (action.contains("admin") || action.contains("Admin"))
            return "ADMIN";
        return "SYSTEM";
    }

    private String detectTargetType(String action) {
        if (action.contains("company") || action.contains("Company"))
            return "COMPANY";
        if (action.contains("user") || action.contains("User"))
            return "USER";
        if (action.contains("rating") || action.contains("Rating"))
            return "RATING";
        return "OTHER";
    }

    // ==========================================
    // Admin Notifications
    // ==========================================

    public List<NotificationDTO> getAdminNotifications(int limit) {
        // Get recent platform-wide notifications (IN_APP channel for admins)
        return notificationRepository.findRecentByUserId(null, limit).stream()
                .map(this::mapToNotificationDTO)
                .collect(Collectors.toList());
    }

    public List<NotificationDTO> getAllNotifications() {
        return notificationRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(100)
                .map(this::mapToNotificationDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markNotificationRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            notification.markAsRead();
            notificationRepository.save(notification);
        });
    }

    private NotificationDTO mapToNotificationDTO(Notification notification) {
        return NotificationDTO.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType() != null ? notification.getType() : NotificationType.SYSTEM_ALERT)
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .referenceId(notification.getReferenceId())
                .referenceType(notification.getReferenceType())
                .build();
    }

    // ==========================================
    // Admin Action Logs
    // ==========================================

    public List<AdminActionLogDTO> getActionLogs(String actionType, int limit) {
        List<AdminActionLog> logs;
        if (actionType != null && !actionType.isEmpty() && !actionType.equals("all")) {
            logs = actionLogRepository.findByActionTypeOrderByCreatedAtDesc(actionType);
        } else {
            logs = actionLogRepository.findRecentLogs(limit);
        }
        return logs.stream().map(this::mapToActionLogDTO).collect(Collectors.toList());
    }

    public List<AdminActionLogDTO> searchActionLogs(String search) {
        return actionLogRepository.searchByAction(search).stream()
                .map(this::mapToActionLogDTO)
                .collect(Collectors.toList());
    }

    private AdminActionLogDTO mapToActionLogDTO(AdminActionLog log) {
        return AdminActionLogDTO.builder()
                .id(log.getId())
                .userEmail(log.getUserEmail())
                .actionType(log.getActionType())
                .action(log.getAction())
                .targetId(log.getTargetId())
                .targetName(log.getTargetName())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private CompanyDTO mapToCompanyDTO(CompanyAdmin company) {
        // Calculate total revenue from successful payments for this company
        BigDecimal totalRevenue = paymentRepository.findByCompanyIdAndStatus(company.getId(), PaymentStatus.SUCCESS)
                .stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CompanyDTO.builder()
                .id(company.getId())
                .userId(company.getUser().getId())
                .email(company.getUser().getEmail())
                .phone(company.getUser().getPhone())
                .companyName(company.getCompanyName())
                .registrationNumber(company.getRegistrationNumber())
                .gstNumber(company.getGstNumber())
                .contactPersonName(company.getContactPersonName())
                .address(company.getAddress())
                .city(company.getCity())
                .state(company.getState())
                .pincode(company.getPincode())
                .serviceCities(parseServiceCities(company.getServiceCities()))
                .baseRatePerKm(company.getBaseRatePerKm())
                .baseRatePerKg(company.getBaseRatePerKg())
                .isApproved(company.getIsApproved())
                .isVerified(company.getUser().getIsVerified())
                .isHiring(company.getIsHiring())
                .openPositions(company.getOpenPositions())
                .commissionRate(company.getCommissionRate())
                .ratingAvg(company.getRatingAvg())
                .totalDeliveries(company.getTotalDeliveries())
                .totalRevenue(totalRevenue)
                // Document URLs
                .companyLogoUrl(company.getCompanyLogoUrl())
                .registrationCertificateUrl(company.getRegistrationCertificateUrl())
                .gstCertificateUrl(company.getGstCertificateUrl())
                .createdAt(company.getCreatedAt())
                .build();
    }

    private List<String> parseServiceCities(String serviceCitiesJson) {
        if (serviceCitiesJson == null || serviceCitiesJson.isBlank()) {
            return List.of();
        }
        try {
            if (serviceCitiesJson.startsWith("[")) {
                String cleaned = serviceCitiesJson.replaceAll("[\\[\\]\"]", "");
                return Arrays.asList(cleaned.split(",")).stream()
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
            } else {
                return Arrays.asList(serviceCitiesJson.split(",")).stream()
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.warn("Failed to parse service cities: {}", serviceCitiesJson);
            return List.of();
        }
    }

    private UserListDTO mapCustomerToUserListDTO(Customer customer) {
        return UserListDTO.builder()
                .id(customer.getId())
                .userId(customer.getUser().getId())
                .email(customer.getUser().getEmail())
                .phone(customer.getUser().getPhone())
                .fullName(customer.getFullName())
                .userType(UserType.CUSTOMER)
                .isActive(customer.getUser().getIsActive())
                .isVerified(customer.getUser().getIsVerified())
                .createdAt(customer.getCreatedAt())
                .build();
    }

    private UserListDTO mapCompanyToUserListDTO(CompanyAdmin company) {
        return UserListDTO.builder()
                .id(company.getId())
                .userId(company.getUser().getId())
                .email(company.getUser().getEmail())
                .phone(company.getUser().getPhone())
                .fullName(company.getContactPersonName())
                .userType(UserType.COMPANY_ADMIN)
                .companyName(company.getCompanyName())
                .city(company.getCity())
                .isActive(company.getUser().getIsActive())
                .isVerified(company.getUser().getIsVerified())
                .totalOrders(company.getTotalDeliveries())
                .rating(company.getRatingAvg() != null ? company.getRatingAvg().doubleValue() : null)
                .createdAt(company.getCreatedAt())
                .build();
    }

    private UserListDTO mapAgentToUserListDTO(DeliveryAgent agent) {
        return UserListDTO.builder()
                .id(agent.getId())
                .userId(agent.getUser().getId())
                .email(agent.getUser().getEmail())
                .phone(agent.getUser().getPhone())
                .fullName(agent.getFullName())
                .userType(UserType.DELIVERY_AGENT)
                .city(agent.getCity())
                .companyId(agent.getCompany().getId())
                .companyName(agent.getCompany().getCompanyName())
                .isActive(agent.getUser().getIsActive())
                .isVerified(agent.getUser().getIsVerified())
                .totalOrders(agent.getTotalDeliveries())
                .rating(agent.getRatingAvg() != null ? agent.getRatingAvg().doubleValue() : null)
                .createdAt(agent.getCreatedAt())
                .build();
    }

    private UserListDTO mapSuperAdminToUserListDTO(SuperAdmin admin) {
        return UserListDTO.builder()
                .id(admin.getId())
                .userId(admin.getUser().getId())
                .email(admin.getUser().getEmail())
                .phone(admin.getUser().getPhone())
                .fullName(admin.getFullName())
                .userType(UserType.SUPER_ADMIN)
                .isActive(admin.getUser().getIsActive())
                .isVerified(admin.getUser().getIsVerified())
                .createdAt(admin.getCreatedAt())
                .lastLoginAt(admin.getLastLoginAt())
                .build();
    }

    private SuperAdminDTO mapToSuperAdminDTO(SuperAdmin admin) {
        return SuperAdminDTO.builder()
                .id(admin.getId())
                .userId(admin.getUser().getId())
                .email(admin.getUser().getEmail())
                .phone(admin.getUser().getPhone())
                .fullName(admin.getFullName())
                .department(admin.getDepartment())
                .role(admin.getRole())
                .permissions(admin.getPermissions())
                .twoFactorEnabled(admin.getTwoFactorEnabled())
                .lastLoginAt(admin.getLastLoginAt())
                .lastAction(admin.getLastAction())
                .lastActionAt(admin.getLastActionAt())
                .isActive(admin.getUser().getIsActive())
                .createdAt(admin.getCreatedAt())
                .updatedAt(admin.getUpdatedAt())
                .build();
    }

    private RatingDTO mapToRatingDTO(Rating rating) {
        return RatingDTO.builder()
                .id(rating.getId())
                .parcelId(rating.getParcel().getId())
                .trackingNumber(rating.getParcel().getTrackingNumber())
                .customerId(rating.getCustomer().getId())
                .customerName(rating.getCustomer().getFullName())
                .companyId(rating.getCompany().getId())
                .companyName(rating.getCompany().getCompanyName())
                .companyRating(rating.getCompanyRating())
                .companyReview(rating.getCompanyReview())
                .agentRating(rating.getAgentRating())
                .agentReview(rating.getAgentReview())
                .overallRating(rating.getOverallRating())
                .overallReview(rating.getOverallReview())
                .isPublic(rating.getIsPublic())
                .createdAt(rating.getCreatedAt())
                .build();
    }

    private PlatformSettingsResponseDTO mapToSettingsResponseDTO(PlatformSettings settings) {
        return PlatformSettingsResponseDTO.builder()
                .defaultCommissionRate(settings.getDefaultCommissionRate())
                .minCommissionRate(settings.getMinCommissionRate())
                .maxCommissionRate(settings.getMaxCommissionRate())
                .groupBuyCommissionRate(settings.getGroupBuyCommissionRate())
                .minGroupMembers(settings.getMinGroupMembers())
                .maxGroupMembers(settings.getMaxGroupMembers())
                .defaultGroupDeadlineHours(settings.getDefaultGroupDeadlineHours())
                .minGroupDeadlineHours(settings.getMinGroupDeadlineHours())
                .maxGroupDeadlineHours(settings.getMaxGroupDeadlineHours())
                .groupDiscountPercentage(settings.getGroupDiscountPercentage())
                .minDeliveryCharge(settings.getMinDeliveryCharge())
                .maxDeliveryCharge(settings.getMaxDeliveryCharge())
                .minWeightKg(settings.getMinWeightKg())
                .maxWeightKg(settings.getMaxWeightKg())
                .allowPublicTracking(settings.getAllowPublicTracking())
                .allowGroupShipments(settings.getAllowGroupShipments())
                .allowJobApplications(settings.getAllowJobApplications())
                .maintenanceMode(settings.getMaintenanceMode())
                .smsEnabled(settings.getSmsEnabled())
                .emailEnabled(settings.getEmailEnabled())
                .pushNotificationsEnabled(settings.getPushNotificationsEnabled())
                .razorpayKeyId(maskKey(settings.getRazorpayKeyId()))
                .twilioAccountSid(maskKey(settings.getTwilioAccountSid()))
                .smtpHost(settings.getSmtpHost())
                .smtpPort(settings.getSmtpPort())
                .updatedAt(settings.getUpdatedAt())
                .updatedBy(settings.getUpdatedBy())
                .build();
    }

    private String maskKey(String key) {
        if (key == null || key.isEmpty()) {
            return "";
        }
        if (key.length() <= 4) {
            return "****";
        }
        return "****" + key.substring(key.length() - 4);
    }
}
