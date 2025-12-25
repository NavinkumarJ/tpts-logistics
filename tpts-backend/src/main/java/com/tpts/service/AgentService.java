package com.tpts.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tpts.dto.request.CreateAgentRequest;
import com.tpts.dto.request.UpdateAgentRequest;
import com.tpts.dto.request.UpdateLocationRequest;
import com.tpts.dto.request.ChangePasswordRequest;
import com.tpts.dto.response.AgentDTO;
import com.tpts.dto.response.AgentDashboardDTO;
import com.tpts.dto.response.AgentPublicDTO;
import com.tpts.entity.CompanyAdmin;
import com.tpts.entity.DeliveryAgent;
import com.tpts.entity.User;
import com.tpts.entity.UserType;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.DeliveryAgentRepository;
import com.tpts.repository.EarningRepository;
import com.tpts.repository.ParcelRepository;
import com.tpts.repository.RatingRepository;
import com.tpts.repository.UserRepository;
import com.tpts.util.OtpUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for Delivery Agent operations
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AgentService {

    private final DeliveryAgentRepository agentRepository;
    private final UserRepository userRepository;
    private final CompanyService companyService;
    private final NotificationService notificationService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final OtpUtil otpUtil;
    private final EarningRepository earningRepository;
    private final ParcelRepository parcelRepository;
    private final RatingRepository ratingRepository;

    // ==========================================
    // Get Agent Profile
    // ==========================================

    /**
     * Get agent by ID
     */
    public AgentDTO getAgentById(Long agentId) {
        DeliveryAgent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));

        return mapToDTO(agent);
    }

    /**
     * Get agent by User
     */
    public AgentDTO getAgentByUser(User user) {
        DeliveryAgent agent = agentRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));

        return mapToDTO(agent);
    }

    /**
     * Get agent entity by User (internal use)
     */
    public DeliveryAgent getAgentEntityByUser(User user) {
        return agentRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));
    }

    // ==========================================
    // Create Agent (by Company Admin)
    // ==========================================

    /**
     * Create a new delivery agent (called by Company Admin)
     */
    @Transactional
    public AgentDTO createAgent(CreateAgentRequest request, User companyUser) {
        // Get company
        CompanyAdmin company = companyService.getCompanyEntityByUser(companyUser);

        // Check if email or phone already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new DuplicateResourceException("User", "phone", request.getPhone());
        }

        // Generate password if not provided
        String rawPassword = request.getPassword() != null ? request.getPassword() : otpUtil.generateTempPassword();

        // Create User account for agent
        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(rawPassword))
                .phone(request.getPhone())
                .userType(UserType.DELIVERY_AGENT)
                .isVerified(true)
                .isActive(true)
                .build();

        user = userRepository.save(user);

        DeliveryAgent agent = DeliveryAgent.builder()
                .user(user)
                .company(company)
                .fullName(request.getFullName())
                .vehicleType(request.getVehicleType())
                .vehicleNumber(request.getVehicleNumber())
                .licenseNumber(request.getLicenseNumber())
                .city(request.getCity())
                .servicePincodes(convertListToJson(request.getServicePincodes()))
                // **NEW: Document URLs from Cloudinary**
                .profilePhotoUrl(request.getProfilePhotoUrl())
                .licenseDocumentUrl(request.getLicenseDocumentUrl())
                .aadhaarDocumentUrl(request.getAadhaarDocumentUrl())
                .rcDocumentUrl(request.getRcDocumentUrl())
                .vehiclePhotoUrl(request.getVehiclePhotoUrl())
                .additionalDocuments(request.getAdditionalDocuments())
                .isActive(true)
                .isAvailable(false)
                .build();

        agent = agentRepository.save(agent);

        log.info("Created agent {} for company {}", agent.getId(), company.getId());
        log.info("Agent credentials - Email: {}, Temp Password: {}", request.getEmail(), rawPassword);

        // Send welcome email/SMS with credentials
        notificationService.sendAgentWelcomeWithCredentials(
                user, agent.getFullName(), request.getEmail(), rawPassword, company.getCompanyName());

        return mapToDTO(agent);
    }

    // ==========================================
    // Update Agent Profile
    // ==========================================

    /**
     * Update agent profile (by agent themselves)
     */
    @Transactional
    public AgentDTO updateAgentProfile(UpdateAgentRequest request, User currentUser) {
        DeliveryAgent agent = agentRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));

        updateAgentFields(agent, request);
        agent = agentRepository.save(agent);

        log.info("Agent {} updated their profile", agent.getId());
        return mapToDTO(agent);
    }

    /**
     * Change password for agent
     */
    @Transactional
    public void changePassword(ChangePasswordRequest request, User currentUser) {
        log.info("Changing password for agent: {}", currentUser.getEmail());

        // Verify current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), currentUser.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        // Validate new password is different
        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new BadRequestException("New password must be different from current password");
        }

        // Update password
        currentUser.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(currentUser);

        log.info("Password changed successfully for agent: {}", currentUser.getEmail());

        // Send confirmation notification
        try {
            notificationService.sendPasswordChangeConfirmation(currentUser);
        } catch (Exception e) {
            log.warn("Failed to send password change confirmation: {}", e.getMessage());
        }
    }

    /**
     * Update agent by company admin
     */
    @Transactional
    public AgentDTO updateAgentByCompany(Long agentId, UpdateAgentRequest request, User companyUser) {
        CompanyAdmin company = companyService.getCompanyEntityByUser(companyUser);

        DeliveryAgent agent = agentRepository.findByIdAndCompanyId(agentId, company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));

        updateAgentFields(agent, request);
        agent = agentRepository.save(agent);

        log.info("Company {} updated agent {}", company.getId(), agentId);
        return mapToDTO(agent);
    }

    private void updateAgentFields(DeliveryAgent agent, UpdateAgentRequest request) {
        if (request.getFullName() != null) {
            agent.setFullName(request.getFullName());
        }
        if (request.getVehicleType() != null) {
            agent.setVehicleType(request.getVehicleType());
        }
        if (request.getVehicleNumber() != null) {
            agent.setVehicleNumber(request.getVehicleNumber());
        }
        if (request.getLicenseNumber() != null) {
            agent.setLicenseNumber(request.getLicenseNumber());
        }
        if (request.getCity() != null) {
            agent.setCity(request.getCity());
        }
        if (request.getServicePincodes() != null) {
            agent.setServicePincodes(convertListToJson(request.getServicePincodes()));
        }

        // **NEW: Update document URLs**
        if (request.getProfilePhotoUrl() != null) {
            agent.setProfilePhotoUrl(request.getProfilePhotoUrl());
        }
        if (request.getLicenseDocumentUrl() != null) {
            agent.setLicenseDocumentUrl(request.getLicenseDocumentUrl());
        }
        if (request.getAadhaarDocumentUrl() != null) {
            agent.setAadhaarDocumentUrl(request.getAadhaarDocumentUrl());
        }
        if (request.getRcDocumentUrl() != null) {
            agent.setRcDocumentUrl(request.getRcDocumentUrl());
        }
        if (request.getVehiclePhotoUrl() != null) {
            agent.setVehiclePhotoUrl(request.getVehiclePhotoUrl());
        }
        if (request.getAdditionalDocuments() != null) {
            agent.setAdditionalDocuments(request.getAdditionalDocuments());
        }
    }

    // ==========================================
    // Availability Management
    // ==========================================

    /**
     * Update agent availability (by agent)
     */
    @Transactional
    public AgentDTO updateAvailability(Boolean isAvailable, User currentUser) {
        DeliveryAgent agent = agentRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));

        // Check if agent is active (set by company)
        if (!agent.getIsActive()) {
            throw new BadRequestException("Your account is not active. Please contact your company.");
        }

        agent.setIsAvailable(isAvailable);
        agent = agentRepository.save(agent);

        log.info("Agent {} set availability to {}", agent.getId(), isAvailable);
        return mapToDTO(agent);
    }

    /**
     * Update agent active status (by company)
     */
    @Transactional
    public AgentDTO updateActiveStatus(Long agentId, Boolean isActive, User companyUser) {
        CompanyAdmin company = companyService.getCompanyEntityByUser(companyUser);

        DeliveryAgent agent = agentRepository.findByIdAndCompanyId(agentId, company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));

        agent.setIsActive(isActive);

        // If deactivating, also set unavailable
        if (!isActive) {
            agent.setIsAvailable(false);
        }

        agent = agentRepository.save(agent);

        log.info("Company {} set agent {} active status to {}", company.getId(), agentId, isActive);
        return mapToDTO(agent);
    }

    // ==========================================
    // Location Updates
    // ==========================================

    /**
     * Update agent's current location
     */
    @Transactional
    public AgentDTO updateLocation(UpdateLocationRequest request, User currentUser) {
        DeliveryAgent agent = agentRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));

        agent.setCurrentLatitude(request.getLatitude());
        agent.setCurrentLongitude(request.getLongitude());
        agent.setLocationUpdatedAt(LocalDateTime.now());

        agent = agentRepository.save(agent);

        log.debug("Agent {} updated location to ({}, {})",
                agent.getId(), request.getLatitude(), request.getLongitude());
        return mapToDTO(agent);
    }

    // ==========================================
    // Agent Dashboard
    // ==========================================

    /**
     * Get agent dashboard
     */
    public AgentDashboardDTO getAgentDashboard(User currentUser) {
        DeliveryAgent agent = agentRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));

        Long agentId = agent.getId();

        // Calculate date ranges
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfToday = now.toLocalDate().atStartOfDay();
        LocalDateTime startOfWeek = now.minusDays(7).toLocalDate().atStartOfDay();
        LocalDateTime startOfMonth = now.withDayOfMonth(1).toLocalDate().atStartOfDay();

        // Fetch today's stats from database
        long completedToday = parcelRepository.countDeliveredTodayByAgent(agentId, startOfToday);
        long activeDeliveries = parcelRepository.findActiveDeliveriesForAgent(agentId).size();

        // Fetch earnings from database
        BigDecimal todayEarnings = earningRepository.sumAgentEarningsToday(agentId);
        if (todayEarnings == null)
            todayEarnings = BigDecimal.ZERO;

        BigDecimal weeklyEarnings = earningRepository.sumAgentEarningsInPeriod(agentId, startOfWeek, now);
        if (weeklyEarnings == null)
            weeklyEarnings = BigDecimal.ZERO;

        BigDecimal monthlyEarnings = earningRepository.sumAgentEarningsInPeriod(agentId, startOfMonth, now);
        if (monthlyEarnings == null)
            monthlyEarnings = BigDecimal.ZERO;

        BigDecimal totalEarnings = earningRepository.sumAgentEarnings(agentId);
        if (totalEarnings == null)
            totalEarnings = BigDecimal.ZERO;

        // Fetch total ratings count for this agent
        Long totalRatingsCount = ratingRepository.countByAgentId(agentId);

        // Build dashboard stats
        AgentDashboardDTO.DashboardStats stats = AgentDashboardDTO.DashboardStats.builder()
                .totalDeliveries(agent.getTotalDeliveries())
                .pendingDeliveries((int) activeDeliveries)
                .completedDeliveries(agent.getTotalDeliveries())
                .ratingAvg(agent.getRatingAvg())
                .totalRatings(totalRatingsCount != null ? totalRatingsCount.intValue() : 0)
                .build();

        AgentDashboardDTO.TodayStats todayStats = AgentDashboardDTO.TodayStats.builder()
                .deliveriesToday((int) completedToday + (int) activeDeliveries)
                .pendingToday((int) activeDeliveries)
                .completedToday((int) completedToday)
                .distanceTodayKm(BigDecimal.ZERO)
                .build();

        AgentDashboardDTO.EarningsStats earnings = AgentDashboardDTO.EarningsStats.builder()
                .todayEarnings(todayEarnings)
                .weeklyEarnings(weeklyEarnings)
                .monthlyEarnings(monthlyEarnings)
                .totalEarnings(totalEarnings)
                .pendingPayout(BigDecimal.ZERO)
                .build();

        return AgentDashboardDTO.builder()
                .agent(mapToDTO(agent))
                .stats(stats)
                .todayStats(todayStats)
                .earnings(earnings)
                .build();
    }

    // ==========================================
    // Company Admin - Get Agents
    // ==========================================

    /**
     * Get all agents for a company
     */
    public List<AgentDTO> getAgentsByCompany(User companyUser) {
        CompanyAdmin company = companyService.getCompanyEntityByUser(companyUser);

        List<DeliveryAgent> agents = agentRepository.findByCompanyId(company.getId());

        return agents.stream()
                .filter(a -> !Boolean.TRUE.equals(a.getUser().getIsDeleted())) // Exclude soft-deleted
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get available agents for a company (for assignment)
     */
    public List<AgentDTO> getAvailableAgents(User companyUser) {
        CompanyAdmin company = companyService.getCompanyEntityByUser(companyUser);

        List<DeliveryAgent> agents = agentRepository.findAvailableAgentsByCompany(company.getId());

        return agents.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get available agents with pincode/city priority
     */
    public List<AgentDTO> getAvailableAgentsWithPriority(String pincode, String city, User companyUser) {
        CompanyAdmin company = companyService.getCompanyEntityByUser(companyUser);

        List<DeliveryAgent> agents = agentRepository.findAvailableAgentsByPriorityPincodeAndCity(
                company.getId(), pincode, city);

        return agents.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get agent by ID for company
     */
    public AgentDTO getAgentByIdForCompany(Long agentId, User companyUser) {
        CompanyAdmin company = companyService.getCompanyEntityByUser(companyUser);

        DeliveryAgent agent = agentRepository.findByIdAndCompanyId(agentId, company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));

        return mapToDTO(agent);
    }

    // ==========================================
    // Profile Photo Management
    // ==========================================

    /**
     * Update agent's profile photo URL
     */
    @Transactional
    public void updateProfilePhotoUrl(Long agentId, String imageUrl, User currentUser) {
        DeliveryAgent agent = agentRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));

        // Verify the agent is updating their own profile
        if (!agent.getId().equals(agentId)) {
            throw new ForbiddenException("You can only update your own profile image");
        }

        agent.setProfilePhotoUrl(imageUrl);
        agentRepository.save(agent);

        log.info("Agent {} updated profile photo", agentId);
    }

    // ==========================================
    // Delete Agent
    // ==========================================

    /**
     * Delete/Deactivate agent (by company)
     */
    @Transactional
    public void deleteAgent(Long agentId, User companyUser) {
        CompanyAdmin company = companyService.getCompanyEntityByUser(companyUser);

        DeliveryAgent agent = agentRepository.findByIdAndCompanyId(agentId, company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));

        // Soft delete - mark as deleted and deactivate
        agent.setIsActive(false);
        agent.setIsAvailable(false);
        agent.getUser().setIsActive(false);
        agent.getUser().setIsDeleted(true); // Soft delete - hide from UI

        agentRepository.save(agent);
        userRepository.save(agent.getUser());

        log.info("Company {} soft deleted agent {}", company.getId(), agentId);
    }

    // ==========================================
    // Mapper Methods
    // ==========================================

    /**
     * Map DeliveryAgent entity to full DTO
     */
    public AgentDTO mapToDTO(DeliveryAgent agent) {
        // Get total ratings count for this agent
        Long ratingsCount = ratingRepository.countByAgentId(agent.getId());

        return AgentDTO.builder()
                .id(agent.getId())
                .userId(agent.getUser().getId())
                .companyId(agent.getCompany().getId())
                .companyName(agent.getCompany().getCompanyName())
                .email(agent.getUser().getEmail())
                .phone(agent.getUser().getPhone())
                .fullName(agent.getFullName())
                .vehicleType(agent.getVehicleType())
                .vehicleNumber(agent.getVehicleNumber())
                .licenseNumber(agent.getLicenseNumber())
                .city(agent.getCity())
                .servicePincodes(convertJsonToList(agent.getServicePincodes()))
                .isActive(agent.getIsActive())
                .isAvailable(agent.getIsAvailable())
                .isVerified(agent.getUser().getIsVerified())
                .currentLatitude(agent.getCurrentLatitude())
                .currentLongitude(agent.getCurrentLongitude())
                .locationUpdatedAt(agent.getLocationUpdatedAt())
                .ratingAvg(agent.getRatingAvg())
                .totalDeliveries(agent.getTotalDeliveries())
                .currentOrdersCount(agent.getCurrentOrdersCount())
                .totalRatings(ratingsCount != null ? ratingsCount : 0L) // Fetch from ratings repository
                // **NEW: Document URLs**
                .profilePhotoUrl(agent.getProfilePhotoUrl())
                .licenseDocumentUrl(agent.getLicenseDocumentUrl())
                .aadhaarDocumentUrl(agent.getAadhaarDocumentUrl())
                .rcDocumentUrl(agent.getRcDocumentUrl())
                .vehiclePhotoUrl(agent.getVehiclePhotoUrl())
                .additionalDocuments(agent.getAdditionalDocuments())
                .createdAt(agent.getCreatedAt())
                .updatedAt(agent.getUpdatedAt())
                .build();
    }

    /**
     * Map DeliveryAgent entity to public DTO
     */
    public AgentPublicDTO mapToPublicDTO(DeliveryAgent agent) {
        return AgentPublicDTO.builder()
                .id(agent.getId())
                .fullName(agent.getFullName())
                .phone(agent.getUser().getPhone())
                .vehicleType(agent.getVehicleType())
                .vehicleNumber(agent.getVehicleNumber())
                .ratingAvg(agent.getRatingAvg())
                .totalDeliveries(agent.getTotalDeliveries())
                .currentLatitude(agent.getCurrentLatitude())
                .currentLongitude(agent.getCurrentLongitude())
                .build();
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private String convertListToJson(List<String> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            log.warn("Failed to convert list to JSON", e);
            return null;
        }
    }

    private List<String> convertJsonToList(String json) {
        if (json == null || json.isEmpty()) {
            return new ArrayList<>();
        }

        // Check if it's a JSON array (starts with '[')
        String trimmed = json.trim();
        if (trimmed.startsWith("[")) {
            try {
                return objectMapper.readValue(json, new TypeReference<List<String>>() {
                });
            } catch (JsonProcessingException e) {
                log.warn("Failed to convert JSON to list: {}", e.getMessage());
                return new ArrayList<>();
            }
        }

        // Otherwise, treat as comma-separated string
        List<String> result = new ArrayList<>();
        for (String item : json.split(",")) {
            String trimmedItem = item.trim();
            if (!trimmedItem.isEmpty()) {
                result.add(trimmedItem);
            }
        }
        return result;
    }
}