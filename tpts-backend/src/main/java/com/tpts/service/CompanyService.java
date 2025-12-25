package com.tpts.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tpts.dto.request.UpdateCompanyRequest;
import com.tpts.dto.request.UpdateHiringRequest;
import com.tpts.dto.response.CompanyDTO;
import com.tpts.dto.response.CompanyDashboardDTO;
import com.tpts.dto.response.CompanyPublicDTO;
import com.tpts.dto.response.ParcelDTO;
import com.tpts.dto.response.AgentDTO;
import com.tpts.dto.response.JobApplicationDTO;
import com.tpts.entity.*;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.CompanyAdminRepository;
import com.tpts.repository.DeliveryAgentRepository;
import com.tpts.repository.ParcelRepository;
import com.tpts.repository.EarningRepository;
import com.tpts.repository.JobApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for Company operations
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyService {

    private final CompanyAdminRepository companyRepository;
    private final DeliveryAgentRepository agentRepository;
    private final ParcelRepository parcelRepository;
    private final EarningRepository earningRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final ObjectMapper objectMapper;

    // ==========================================
    // Get Company Profile
    // ==========================================

    /**
     * Get company by ID
     */
    public CompanyDTO getCompanyById(Long companyId) {
        CompanyAdmin company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        return mapToDTO(company);
    }

    /**
     * Get company by User ID
     */
    public CompanyDTO getCompanyByUserId(Long userId) {
        CompanyAdmin company = companyRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "userId", userId));

        return mapToDTO(company);
    }

    /**
     * Get company by User
     */
    public CompanyDTO getCompanyByUser(User user) {
        CompanyAdmin company = companyRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        return mapToDTO(company);
    }

    // ==========================================
    // Update Company Profile
    // ==========================================

    /**
     * Update company profile
     */
    @Transactional
    public CompanyDTO updateCompany(Long companyId, UpdateCompanyRequest request, User currentUser) {
        CompanyAdmin company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        // Security check
        if (!company.getUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You can only update your own company profile");
        }

        // Update fields if provided
        if (request.getCompanyName() != null) {
            // Check if name is taken by another company
            companyRepository.findByCompanyName(request.getCompanyName())
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(companyId)) {
                            throw new DuplicateResourceException("Company", "companyName", request.getCompanyName());
                        }
                    });
            company.setCompanyName(request.getCompanyName());
        }
        if (request.getRegistrationNumber() != null) {
            company.setRegistrationNumber(request.getRegistrationNumber());
        }
        if (request.getGstNumber() != null) {
            company.setGstNumber(request.getGstNumber());
        }
        if (request.getAddress() != null) {
            company.setAddress(request.getAddress());
        }
        if (request.getCity() != null) {
            company.setCity(request.getCity());
        }
        if (request.getState() != null) {
            company.setState(request.getState());
        }
        if (request.getPincode() != null) {
            company.setPincode(request.getPincode());
        }
        if (request.getServiceCities() != null) {
            company.setServiceCities(convertListToJson(request.getServiceCities()));
        }
        if (request.getBaseRatePerKm() != null) {
            company.setBaseRatePerKm(request.getBaseRatePerKm());
        }
        if (request.getBaseRatePerKg() != null) {
            company.setBaseRatePerKg(request.getBaseRatePerKg());
        }
        if (request.getContactPersonName() != null) {
            company.setContactPersonName(request.getContactPersonName());
        }
        // Inside CompanyService.updateCompany() method - add these checks:

        if (request.getCompanyLogoUrl() != null) {
            company.setCompanyLogoUrl(request.getCompanyLogoUrl());
        }
        if (request.getRegistrationCertificateUrl() != null) {
            company.setRegistrationCertificateUrl(request.getRegistrationCertificateUrl());
        }
        if (request.getGstCertificateUrl() != null) {
            company.setGstCertificateUrl(request.getGstCertificateUrl());
        }
        if (request.getDocumentsUrl() != null) {
            company.setDocumentsUrl(request.getDocumentsUrl());
        }
        if (request.getAdditionalDocuments() != null) {
            company.setAdditionalDocuments(request.getAdditionalDocuments());
        }

        company = companyRepository.save(company);
        log.info("Company {} updated profile", companyId);

        return mapToDTO(company);
    }

    // ==========================================
    // Hiring Management
    // ==========================================

    /**
     * Update hiring settings
     */
    @Transactional
    public CompanyDTO updateHiringSettings(Long companyId, UpdateHiringRequest request, User currentUser) {
        CompanyAdmin company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        // Security check
        if (!company.getUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You can only update your own company");
        }

        // Validate salary range
        if (request.getSalaryRangeMin() != null && request.getSalaryRangeMax() != null) {
            if (request.getSalaryRangeMin() > request.getSalaryRangeMax()) {
                throw new BadRequestException("Minimum salary cannot be greater than maximum salary");
            }
        }

        // Update fields
        if (request.getIsHiring() != null) {
            company.setIsHiring(request.getIsHiring());
        }
        if (request.getOpenPositions() != null) {
            company.setOpenPositions(request.getOpenPositions());
        }
        if (request.getSalaryRangeMin() != null) {
            company.setSalaryRangeMin(request.getSalaryRangeMin());
        }
        if (request.getSalaryRangeMax() != null) {
            company.setSalaryRangeMax(request.getSalaryRangeMax());
        }

        company = companyRepository.save(company);
        log.info("Company {} updated hiring settings: isHiring={}", companyId, company.getIsHiring());

        return mapToDTO(company);
    }

    // ==========================================
    // Company Dashboard
    // ==========================================

    /**
     * Get company dashboard data
     */
    public CompanyDashboardDTO getCompanyDashboard(Long companyId, User currentUser) {
        CompanyAdmin company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        // Security check
        if (!company.getUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You can only access your own dashboard");
        }

        // Get actual parcel counts from database
        List<Parcel> allParcels = parcelRepository.findByCompanyId(companyId);

        long pendingParcels = allParcels.stream()
                .filter(p -> p.getStatus() == ParcelStatus.PENDING || p.getStatus() == ParcelStatus.CONFIRMED)
                .count();
        long activeParcels = allParcels.stream()
                .filter(p -> p.getStatus() == ParcelStatus.PICKED_UP ||
                        p.getStatus() == ParcelStatus.IN_TRANSIT ||
                        p.getStatus() == ParcelStatus.OUT_FOR_DELIVERY)
                .count();
        long completedParcels = allParcels.stream()
                .filter(p -> p.getStatus() == ParcelStatus.DELIVERED)
                .count();
        long cancelledParcels = allParcels.stream()
                .filter(p -> p.getStatus() == ParcelStatus.CANCELLED)
                .count();

        // Calculate revenue from earnings
        List<Earning> earnings = earningRepository.findByCompanyId(companyId);

        // Total order amount (what customers paid for ALL parcels) - from parcel
        // finalPrice
        BigDecimal totalOrderAmount = allParcels.stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS
                        || p.getPaymentStatus() == PaymentStatus.CAPTURED)
                .map(Parcel::getFinalPrice)
                .filter(fp -> fp != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Platform commission (10% to TPTS)
        BigDecimal totalPlatformCommission = earnings.stream()
                .map(Earning::getPlatformCommission)
                .filter(e -> e != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Agent earnings (20% to agents)
        BigDecimal totalAgentEarning = earnings.stream()
                .map(Earning::getAgentEarning)
                .filter(e -> e != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Company's net earning (70% of total after platform and agent commission)
        BigDecimal companyNetRevenue = earnings.stream()
                .map(Earning::getCompanyNetEarning)
                .filter(e -> e != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Today's revenue
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        BigDecimal todayRevenue = earnings.stream()
                .filter(e -> e.getCreatedAt() != null && e.getCreatedAt().isAfter(startOfToday))
                .map(Earning::getCompanyNetEarning)
                .filter(e -> e != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Get agent stats
        long totalAgents = agentRepository.findByCompanyId(companyId).size();
        long availableAgents = agentRepository.findAvailableAgentsByCompany(companyId).size();

        // Get pending job applications count
        long pendingApplications = jobApplicationRepository.countByCompanyIdAndStatus(companyId,
                ApplicationStatus.PENDING);

        // Today's deliveries
        long deliveredToday = allParcels.stream()
                .filter(p -> p.getStatus() == ParcelStatus.DELIVERED &&
                        p.getDeliveredAt() != null &&
                        p.getDeliveredAt().isAfter(startOfToday))
                .count();

        // Calculate average delivery time from pickup to delivery
        String avgDeliveryTime = "N/A";
        List<Parcel> deliveredParcels = allParcels.stream()
                .filter(p -> p.getStatus() == ParcelStatus.DELIVERED &&
                        p.getPickedUpAt() != null &&
                        p.getDeliveredAt() != null)
                .collect(Collectors.toList());

        if (!deliveredParcels.isEmpty()) {
            long totalMinutes = deliveredParcels.stream()
                    .mapToLong(p -> java.time.Duration.between(p.getPickedUpAt(), p.getDeliveredAt()).toMinutes())
                    .sum();
            long avgMinutes = totalMinutes / deliveredParcels.size();

            if (avgMinutes <= 0) {
                avgDeliveryTime = "< 1 min"; // Very quick delivery
            } else if (avgMinutes < 60) {
                avgDeliveryTime = avgMinutes + " min";
            } else {
                long hours = avgMinutes / 60;
                long mins = avgMinutes % 60;
                avgDeliveryTime = hours + "h " + mins + "m";
            }
        }

        // Calculate on-time delivery rate (delivered before or on estimatedDelivery)
        int onTimeDeliveryRate = 100; // Default to 100% if no deliveries
        if (!deliveredParcels.isEmpty()) {
            long onTimeCount = deliveredParcels.stream()
                    .filter(p -> p.getEstimatedDelivery() != null &&
                            !p.getDeliveredAt().isAfter(p.getEstimatedDelivery()))
                    .count();
            onTimeDeliveryRate = (int) ((onTimeCount * 100) / deliveredParcels.size());
        }

        // Build stats with real data from database
        CompanyDashboardDTO.DashboardStats stats = CompanyDashboardDTO.DashboardStats.builder()
                .totalOrders((int) allParcels.size())
                .activeOrders((int) activeParcels)
                .completedOrders((int) completedParcels)
                .pendingOrders((int) pendingParcels)
                .totalRevenue(companyNetRevenue) // Company's share (actual from DB)
                .totalOrderAmount(totalOrderAmount) // Full customer payment
                .platformCommission(totalPlatformCommission) // Platform's share (actual from DB)
                .agentEarning(totalAgentEarning) // Agent's share (actual from DB)
                .todayRevenue(todayRevenue)
                .ratingAvg(company.getRatingAvg())
                .avgDeliveryTime(avgDeliveryTime)
                .onTimeDeliveryRate(onTimeDeliveryRate)
                .build();

        CompanyDashboardDTO.OrderStats orderStats = CompanyDashboardDTO.OrderStats.builder()
                .pendingAssignment((int) pendingParcels)
                .inTransit((int) activeParcels)
                .deliveredToday((int) deliveredToday)
                .cancelledToday((int) cancelledParcels)
                .build();

        CompanyDashboardDTO.AgentStats agentStatsDTO = CompanyDashboardDTO.AgentStats.builder()
                .totalAgents((int) totalAgents)
                .activeAgents((int) totalAgents)
                .availableAgents((int) availableAgents)
                .pendingApplications((int) pendingApplications)
                .build();

        // Get top 2 recent completed parcels
        List<ParcelDTO> recentShipmentsList = allParcels.stream()
                .filter(p -> p.getStatus() == ParcelStatus.DELIVERED || p.getStatus() == ParcelStatus.IN_TRANSIT)
                .sorted((a, b) -> {
                    if (a.getDeliveredAt() != null && b.getDeliveredAt() != null) {
                        return b.getDeliveredAt().compareTo(a.getDeliveredAt());
                    }
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .limit(2)
                .map(this::mapParcelToDTO)
                .collect(Collectors.toList());

        // Get top 2 active agents sorted alphabetically
        List<AgentDTO> activeAgentsList = agentRepository.findByCompanyId(companyId).stream()
                .sorted((a, b) -> a.getFullName().compareToIgnoreCase(b.getFullName()))
                .limit(2)
                .map(this::mapAgentToDTO)
                .collect(Collectors.toList());

        // Get pending job applications
        List<JobApplicationDTO> pendingAppsList = jobApplicationRepository
                .findByCompanyIdAndStatus(companyId, ApplicationStatus.PENDING)
                .stream()
                .limit(2)
                .map(this::mapApplicationToDTO)
                .collect(Collectors.toList());

        return CompanyDashboardDTO.builder()
                .company(mapToDTO(company))
                .stats(stats)
                .orderStats(orderStats)
                .agentStats(agentStatsDTO)
                .recentShipments(recentShipmentsList)
                .activeAgents(activeAgentsList)
                .pendingApplications(pendingAppsList)
                .build();
    }

    // ==========================================
    // Public Company Listings
    // ==========================================

    /**
     * Get all approved companies (public)
     */
    public List<CompanyPublicDTO> getAllApprovedCompanies() {
        List<CompanyAdmin> companies = companyRepository.findByIsApprovedTrue();

        return companies.stream()
                .map(this::mapToPublicDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get hiring companies (for public jobs page)
     */
    public List<CompanyPublicDTO> getHiringCompanies() {
        List<CompanyAdmin> companies = companyRepository.findByIsHiringTrueAndIsApprovedTrue();

        return companies.stream()
                .map(this::mapToPublicDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get companies serving a specific city
     */
    public List<CompanyPublicDTO> getCompaniesByCity(String city) {
        List<CompanyAdmin> companies = companyRepository.findApprovedCompaniesByServiceCity(city);

        return companies.stream()
                .map(this::mapToPublicDTO)
                .collect(Collectors.toList());
    }

    /**
     * Compare company prices for a route
     */
    public List<CompanyPublicDTO> compareCompanyPrices(String fromCity, String toCity,
            BigDecimal weightKg, BigDecimal distanceKm) {
        List<CompanyAdmin> companies = companyRepository.findCompaniesForRoute(fromCity, toCity);

        // Use default distance if not provided
        BigDecimal distance = distanceKm != null ? distanceKm : new BigDecimal("50");

        return companies.stream()
                .map(company -> {
                    CompanyPublicDTO dto = mapToPublicDTO(company);

                    // Calculate estimated price
                    BigDecimal distancePrice = company.getBaseRatePerKm().multiply(distance);
                    BigDecimal weightPrice = company.getBaseRatePerKg().multiply(weightKg);
                    BigDecimal totalPrice = distancePrice.add(weightPrice);

                    dto.setEstimatedPrice(totalPrice.setScale(2, RoundingMode.HALF_UP));
                    dto.setEstimatedDays(calculateEstimatedDays(fromCity, toCity));

                    return dto;
                })
                .sorted(Comparator.comparing(CompanyPublicDTO::getEstimatedPrice))
                .collect(Collectors.toList());
    }

    // ==========================================
    // Verify Company Ownership
    // ==========================================

    /**
     * Verify that a company ID belongs to the current user
     */
    public void verifyCompanyOwnership(Long companyId, User currentUser) {
        CompanyAdmin company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        if (!company.getUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("Access denied");
        }
    }

    /**
     * Get Company entity by ID (internal use)
     */
    public CompanyAdmin getCompanyEntity(Long companyId) {
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));
    }

    /**
     * Get Company entity by User (internal use)
     */
    public CompanyAdmin getCompanyEntityByUser(User user) {
        return companyRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));
    }

    // ==========================================
    // Mapper Methods
    // ==========================================

    /**
     * Map CompanyAdmin entity to full DTO
     */
    public CompanyDTO mapToDTO(CompanyAdmin company) {
        // Get agent count for this company
        int totalAgents = agentRepository.findByCompanyId(company.getId()).size();

        return CompanyDTO.builder()
                .id(company.getId())
                .userId(company.getUser().getId())
                .email(company.getUser().getEmail())
                .phone(company.getUser().getPhone())
                .companyName(company.getCompanyName())
                .registrationNumber(company.getRegistrationNumber())
                .gstNumber(company.getGstNumber())
                .address(company.getAddress())
                .city(company.getCity())
                .state(company.getState())
                .pincode(company.getPincode())
                .serviceCities(convertJsonToList(company.getServiceCities()))
                .baseRatePerKm(company.getBaseRatePerKm())
                .baseRatePerKg(company.getBaseRatePerKg())
                .isApproved(company.getIsApproved())
                .isVerified(company.getUser().getIsVerified())
                .isHiring(company.getIsHiring())
                .openPositions(company.getOpenPositions())
                .salaryRangeMin(company.getSalaryRangeMin())
                .salaryRangeMax(company.getSalaryRangeMax())
                .commissionRate(company.getCommissionRate())
                .ratingAvg(company.getRatingAvg())
                .totalDeliveries(company.getTotalDeliveries())
                .totalAgents(totalAgents) // Include agent count
                .contactPersonName(company.getContactPersonName())
                // **NEW: Document URLs**
                .companyLogoUrl(company.getCompanyLogoUrl())
                .registrationCertificateUrl(company.getRegistrationCertificateUrl())
                .gstCertificateUrl(company.getGstCertificateUrl())
                .documentsUrl(company.getDocumentsUrl())
                .additionalDocuments(company.getAdditionalDocuments())
                .createdAt(company.getCreatedAt())
                .updatedAt(company.getUpdatedAt())
                .build();
    }

    /**
     * Map CompanyAdmin entity to public DTO (limited info)
     */
    public CompanyPublicDTO mapToPublicDTO(CompanyAdmin company) {
        return CompanyPublicDTO.builder()
                .id(company.getId())
                .companyName(company.getCompanyName())
                .city(company.getCity())
                .state(company.getState())
                .serviceCities(convertJsonToList(company.getServiceCities()))
                .baseRatePerKm(company.getBaseRatePerKm())
                .baseRatePerKg(company.getBaseRatePerKg())
                .ratingAvg(company.getRatingAvg())
                .totalDeliveries(company.getTotalDeliveries())
                .isHiring(company.getIsHiring())
                .openPositions(company.getOpenPositions())
                .salaryRangeMin(company.getSalaryRangeMin())
                .salaryRangeMax(company.getSalaryRangeMax())
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
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {
            });
        } catch (JsonProcessingException e) {
            log.warn("Failed to convert JSON to list", e);
            return new ArrayList<>();
        }
    }

    private Integer calculateEstimatedDays(String fromCity, String toCity) {
        // Simple logic: same city = 1 day, different city = 2-3 days
        if (fromCity.equalsIgnoreCase(toCity)) {
            return 1;
        }
        return 2;
    }

    // Helper method to map Parcel to ParcelDTO for dashboard
    private ParcelDTO mapParcelToDTO(Parcel parcel) {
        return ParcelDTO.builder()
                .id(parcel.getId())
                .trackingNumber(parcel.getTrackingNumber())
                .status(parcel.getStatus())
                .pickupCity(parcel.getPickupCity())
                .deliveryCity(parcel.getDeliveryCity())
                .weightKg(parcel.getWeightKg())
                .finalPrice(parcel.getFinalPrice())
                .createdAt(parcel.getCreatedAt())
                .deliveredAt(parcel.getDeliveredAt())
                .build();
    }

    // Helper method to map DeliveryAgent to AgentDTO for dashboard
    private AgentDTO mapAgentToDTO(DeliveryAgent agent) {
        return AgentDTO.builder()
                .id(agent.getId())
                .fullName(agent.getFullName())
                .vehicleType(agent.getVehicleType())
                .isAvailable(agent.getIsAvailable() != null ? agent.getIsAvailable() : true)
                .profilePhotoUrl(agent.getProfilePhotoUrl())
                .totalDeliveries(agent.getTotalDeliveries() != null ? agent.getTotalDeliveries() : 0)
                .ratingAvg(agent.getRatingAvg() != null ? agent.getRatingAvg() : BigDecimal.ZERO)
                .build();
    }

    // Helper method to map JobApplication to JobApplicationDTO for dashboard
    private JobApplicationDTO mapApplicationToDTO(JobApplication app) {
        return JobApplicationDTO.builder()
                .id(app.getId())
                .applicantName(app.getApplicantName())
                .applicantEmail(app.getApplicantEmail())
                .vehicleType(app.getVehicleType())
                .status(app.getStatus())
                .appliedAt(app.getAppliedAt())
                .build();
    }
}