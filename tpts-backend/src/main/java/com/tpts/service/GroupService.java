package com.tpts.service;

import com.tpts.dto.request.AssignGroupAgentRequest;
import com.tpts.dto.request.CreateGroupRequest;
import com.tpts.dto.request.JoinGroupRequest;
import com.tpts.dto.response.GroupDTO;
import com.tpts.dto.response.GroupPublicDTO;
import com.tpts.dto.response.ParcelDTO;
import com.tpts.entity.*;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.*;
import com.tpts.util.OtpUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for Group Shipment operations
 * Implements Two Agents Model: Pickup Agent + Delivery Agent
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GroupService {

    private final GroupShipmentRepository groupRepository;
    private final ParcelRepository parcelRepository;
    private final CompanyAdminRepository companyRepository;
    private final DeliveryAgentRepository agentRepository;
    private final CustomerRepository customerRepository;
    private final OtpUtil otpUtil;

    // ==========================================
    // Create Group (Company Admin)
    // ==========================================

    /**
     * Create a new group shipment
     */
    @Transactional
    public GroupDTO createGroup(CreateGroupRequest request, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        // Validate company is approved
        if (!company.getIsApproved()) {
            throw new BadRequestException("Company is not approved for operations");
        }

        // Generate unique group code
        String groupCode = generateUniqueGroupCode();

        // Calculate deadline
        LocalDateTime deadline = LocalDateTime.now().plusHours(request.getDeadlineHours());

        // Create group
        GroupShipment group = GroupShipment.builder()
                .groupCode(groupCode)
                .company(company)
                .sourceCity(request.getSourceCity())
                .targetCity(request.getTargetCity())
                .sourcePincode(request.getSourcePincode())
                .targetPincode(request.getTargetPincode())
                .targetMembers(request.getTargetMembers())
                .currentMembers(0)
                .discountPercentage(request.getDiscountPercentage())
                .deadline(deadline)
                .status(GroupStatus.OPEN)
                .build();

        group = groupRepository.save(group);

        log.info("Created group {} by company {}: {} → {} ({}% discount, {} members, deadline {})",
                groupCode, company.getId(), request.getSourceCity(), request.getTargetCity(),
                request.getDiscountPercentage(), request.getTargetMembers(), deadline);

        return mapToDTO(group);
    }

    // ==========================================
    // Get Group
    // ==========================================

    /**
     * Get group by ID
     */
    public GroupDTO getGroupById(Long groupId) {
        GroupShipment group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group", "id", groupId));
        return mapToDTO(group);
    }

    /**
     * Get group by code
     */
    public GroupDTO getGroupByCode(String groupCode) {
        GroupShipment group = groupRepository.findByGroupCode(groupCode)
                .orElseThrow(() -> new ResourceNotFoundException("Group", "code", groupCode));
        return mapToDTO(group);
    }

    // ==========================================
    // Public Group Listings
    // ==========================================

    /**
     * Get all open groups (public)
     */
    public List<GroupPublicDTO> getOpenGroups() {
        List<GroupShipment> groups = groupRepository.findAllOpenGroups(LocalDateTime.now());
        return groups.stream().map(this::mapToPublicDTO).collect(Collectors.toList());
    }

    /**
     * Get open groups by source city
     */
    public List<GroupPublicDTO> getOpenGroupsBySourceCity(String city) {
        List<GroupShipment> groups = groupRepository.findOpenGroupsBySourceCity(city, LocalDateTime.now());
        return groups.stream().map(this::mapToPublicDTO).collect(Collectors.toList());
    }

    /**
     * Get open groups by target city
     */
    public List<GroupPublicDTO> getOpenGroupsByTargetCity(String city) {
        List<GroupShipment> groups = groupRepository.findOpenGroupsByTargetCity(city, LocalDateTime.now());
        return groups.stream().map(this::mapToPublicDTO).collect(Collectors.toList());
    }

    /**
     * Get open groups by route
     */
    public List<GroupPublicDTO> getOpenGroupsByRoute(String sourceCity, String targetCity) {
        List<GroupShipment> groups = groupRepository.findOpenGroupsByRoute(sourceCity, targetCity, LocalDateTime.now());
        return groups.stream().map(this::mapToPublicDTO).collect(Collectors.toList());
    }

    // ==========================================
    // Company Group Management
    // ==========================================

    /**
     * Get all groups for company
     */
    public List<GroupDTO> getCompanyGroups(User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        List<GroupShipment> groups = groupRepository.findByCompanyIdOrderByCreatedAtDesc(company.getId());
        return groups.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get company groups by status
     */
    public List<GroupDTO> getCompanyGroupsByStatus(GroupStatus status, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        List<GroupShipment> groups = groupRepository.findByCompanyIdAndStatus(company.getId(), status);
        return groups.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    // ==========================================
    // Join Group (Customer)
    // ==========================================

    /**
     * Customer joins a group with their parcel
     */
    @Transactional
    public GroupDTO joinGroup(Long groupId, JoinGroupRequest request, User currentUser) {
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        GroupShipment group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group", "id", groupId));

        // Validate group can be joined
        if (!group.canJoin()) {
            if (group.isFull()) {
                throw new BadRequestException("Group is already full");
            }
            if (group.isExpired()) {
                throw new BadRequestException("Group deadline has passed");
            }
            throw new BadRequestException("Group is not open for joining");
        }

        // Get and validate parcel
        Parcel parcel = parcelRepository.findById(request.getParcelId())
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", request.getParcelId()));

        // Verify customer owns the parcel
        if (!parcel.getCustomer().getId().equals(customer.getId())) {
            throw new ForbiddenException("You don't own this parcel");
        }

        // Verify parcel is pending or confirmed
        if (parcel.getStatus() != ParcelStatus.PENDING && parcel.getStatus() != ParcelStatus.CONFIRMED) {
            throw new BadRequestException("Parcel cannot be added to group in current status: " + parcel.getStatus());
        }

        // Verify parcel is not already in a group
        if (parcel.getGroupShipmentId() != null) {
            throw new BadRequestException("Parcel is already part of a group");
        }

        // Verify route matches
        if (!parcel.getPickupCity().equalsIgnoreCase(group.getSourceCity()) ||
                !parcel.getDeliveryCity().equalsIgnoreCase(group.getTargetCity())) {
            throw new BadRequestException("Parcel route doesn't match group route. Group: " +
                    group.getSourceCity() + " → " + group.getTargetCity() +
                    ", Parcel: " + parcel.getPickupCity() + " → " + parcel.getDeliveryCity());
        }

        // Verify parcel company matches group company
        if (!parcel.getCompany().getId().equals(group.getCompany().getId())) {
            throw new BadRequestException("Parcel company doesn't match group company");
        }

        // Add parcel to group
        parcel.setGroupShipmentId(group.getId());

        // Apply discount
        BigDecimal discountMultiplier = BigDecimal.ONE.subtract(
                group.getDiscountPercentage().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
        BigDecimal discountedPrice = parcel.getBasePrice().multiply(discountMultiplier).setScale(2,
                RoundingMode.HALF_UP);
        BigDecimal discountAmount = parcel.getBasePrice().subtract(discountedPrice);

        parcel.setDiscountAmount(discountAmount);
        parcel.setFinalPrice(discountedPrice);

        parcelRepository.save(parcel);

        // Increment group member count
        group.setCurrentMembers(group.getCurrentMembers() + 1);

        // Check if group is now full
        if (group.isFull()) {
            group.setStatus(GroupStatus.FULL);
            log.info("Group {} is now full with {} members", group.getGroupCode(), group.getCurrentMembers());
        }

        group = groupRepository.save(group);

        log.info("Customer {} joined group {} with parcel {}. Saved ₹{}",
                customer.getId(), group.getGroupCode(), parcel.getTrackingNumber(), discountAmount);

        return mapToDTO(group);
    }

    /**
     * Customer leaves a group (removes their parcel)
     */
    @Transactional
    public GroupDTO leaveGroup(Long groupId, Long parcelId, User currentUser) {
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        GroupShipment group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group", "id", groupId));

        // Can only leave if group is still OPEN
        if (group.getStatus() != GroupStatus.OPEN) {
            throw new BadRequestException("Cannot leave group after it has started processing");
        }

        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        // Verify ownership
        if (!parcel.getCustomer().getId().equals(customer.getId())) {
            throw new ForbiddenException("You don't own this parcel");
        }

        // Verify parcel is in this group
        if (parcel.getGroupShipmentId() == null || !parcel.getGroupShipmentId().equals(groupId)) {
            throw new BadRequestException("Parcel is not part of this group");
        }

        // Remove from group
        parcel.setGroupShipmentId(null);
        parcel.setDiscountAmount(BigDecimal.ZERO);
        parcel.setFinalPrice(parcel.getBasePrice());
        parcelRepository.save(parcel);

        // Decrement member count
        group.setCurrentMembers(Math.max(0, group.getCurrentMembers() - 1));

        // If was full, reopen
        if (group.getStatus() == GroupStatus.FULL) {
            group.setStatus(GroupStatus.OPEN);
        }

        group = groupRepository.save(group);

        log.info("Customer {} left group {} with parcel {}",
                customer.getId(), group.getGroupCode(), parcel.getTrackingNumber());

        return mapToDTO(group);
    }

    // ==========================================
    // Assign Agents (Company Admin)
    // ==========================================

    /**
     * Assign pickup agent to group (Agent 1)
     */
    @Transactional
    public GroupDTO assignPickupAgent(Long groupId, AssignGroupAgentRequest request, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        GroupShipment group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group", "id", groupId));

        // Verify company owns the group
        if (!group.getCompany().getId().equals(company.getId())) {
            throw new ForbiddenException("Access denied");
        }

        // Verify group is ready for pickup agent assignment
        if (group.getStatus() != GroupStatus.FULL && group.getStatus() != GroupStatus.OPEN) {
            throw new BadRequestException("Cannot assign pickup agent in current status: " + group.getStatus());
        }

        // Get and verify agent
        DeliveryAgent agent = agentRepository.findByIdAndCompanyId(request.getAgentId(), company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", request.getAgentId()));

        // Check agent availability
        if (!agent.getIsActive() || !agent.getIsAvailable()) {
            throw new BadRequestException("Agent is not available for assignment");
        }

        // Assign pickup agent
        group.setPickupAgent(agent);

        // If group is full, start pickup phase
        if (group.getStatus() == GroupStatus.FULL) {
            group.setStatus(GroupStatus.PICKUP_IN_PROGRESS);
            group.setPickupStartedAt(LocalDateTime.now());
        }

        group = groupRepository.save(group);

        // Update parcels in group to ASSIGNED status
        List<Parcel> parcels = parcelRepository.findByGroupShipmentId(groupId);
        for (Parcel parcel : parcels) {
            if (parcel.getStatus() == ParcelStatus.PENDING || parcel.getStatus() == ParcelStatus.CONFIRMED) {
                parcel.setAgent(agent);
                parcel.setStatus(ParcelStatus.ASSIGNED);
                parcel.setAssignedAt(LocalDateTime.now());
                parcelRepository.save(parcel);
            }
        }

        log.info("Assigned pickup agent {} to group {} ({} parcels)",
                agent.getId(), group.getGroupCode(), parcels.size());

        return mapToDTO(group);
    }

    /**
     * Assign delivery agent to group (Agent 2)
     */
    @Transactional
    public GroupDTO assignDeliveryAgent(Long groupId, AssignGroupAgentRequest request, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        GroupShipment group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group", "id", groupId));

        // Verify company owns the group
        if (!group.getCompany().getId().equals(company.getId())) {
            throw new ForbiddenException("Access denied");
        }

        // Verify group is ready for delivery agent assignment
        if (group.getStatus() != GroupStatus.PICKUP_COMPLETE) {
            throw new BadRequestException(
                    "Cannot assign delivery agent. Pickup must be completed first. Current status: "
                            + group.getStatus());
        }

        // Get and verify agent
        DeliveryAgent agent = agentRepository.findByIdAndCompanyId(request.getAgentId(), company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", request.getAgentId()));

        // Check agent availability
        if (!agent.getIsActive() || !agent.getIsAvailable()) {
            throw new BadRequestException("Agent is not available for assignment");
        }

        // Assign delivery agent
        group.setDeliveryAgent(agent);
        group.setStatus(GroupStatus.DELIVERY_IN_PROGRESS);
        group.setDeliveryStartedAt(LocalDateTime.now());

        group = groupRepository.save(group);

        // Update parcels - assign delivery agent
        List<Parcel> parcels = parcelRepository.findByGroupShipmentId(groupId);
        for (Parcel parcel : parcels) {
            parcel.setAgent(agent); // Switch to delivery agent
            parcel.setStatus(ParcelStatus.OUT_FOR_DELIVERY);
            parcelRepository.save(parcel);
        }

        log.info("Assigned delivery agent {} to group {} ({} parcels)",
                agent.getId(), group.getGroupCode(), parcels.size());

        return mapToDTO(group);
    }

    // ==========================================
    // Complete Pickup/Delivery
    // ==========================================

    /**
     * Mark pickup as complete (all packages collected)
     */
    @Transactional
    public GroupDTO completePickup(Long groupId, User currentUser) {
        // Can be called by company admin or pickup agent
        GroupShipment group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group", "id", groupId));

        // Verify access
        verifyGroupAccess(group, currentUser);

        // Verify status
        if (group.getStatus() != GroupStatus.PICKUP_IN_PROGRESS) {
            throw new BadRequestException("Cannot complete pickup. Current status: " + group.getStatus());
        }

        // Update group
        group.setStatus(GroupStatus.PICKUP_COMPLETE);
        group.setPickupCompletedAt(LocalDateTime.now());
        group = groupRepository.save(group);

        // Update all parcels to PICKED_UP
        List<Parcel> parcels = parcelRepository.findByGroupShipmentId(groupId);
        for (Parcel parcel : parcels) {
            parcel.setStatus(ParcelStatus.PICKED_UP);
            parcel.setPickedUpAt(LocalDateTime.now());
            parcelRepository.save(parcel);
        }

        log.info("Pickup completed for group {} ({} parcels)", group.getGroupCode(), parcels.size());

        return mapToDTO(group);
    }

    /**
     * Mark delivery as complete (all packages delivered)
     */
    @Transactional
    public GroupDTO completeDelivery(Long groupId, User currentUser) {
        GroupShipment group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group", "id", groupId));

        // Verify access
        verifyGroupAccess(group, currentUser);

        // Verify status
        if (group.getStatus() != GroupStatus.DELIVERY_IN_PROGRESS) {
            throw new BadRequestException("Cannot complete delivery. Current status: " + group.getStatus());
        }

        // Update group
        group.setStatus(GroupStatus.COMPLETED);
        group.setDeliveryCompletedAt(LocalDateTime.now());
        group = groupRepository.save(group);

        // Update all parcels to DELIVERED
        List<Parcel> parcels = parcelRepository.findByGroupShipmentId(groupId);
        for (Parcel parcel : parcels) {
            parcel.setStatus(ParcelStatus.DELIVERED);
            parcel.setDeliveredAt(LocalDateTime.now());
            parcelRepository.save(parcel);
        }

        // Update company stats
        CompanyAdmin company = group.getCompany();
        company.setTotalDeliveries(company.getTotalDeliveries() + parcels.size());
        companyRepository.save(company);

        log.info("Delivery completed for group {} ({} parcels delivered)", group.getGroupCode(), parcels.size());

        return mapToDTO(group);
    }

    // ==========================================
    // Get Group Parcels
    // ==========================================

    /**
     * Get all parcels in a group
     */
    public List<ParcelDTO> getGroupParcels(Long groupId, User currentUser) {
        GroupShipment group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group", "id", groupId));

        // Verify access (company, agent, or super admin)
        verifyGroupAccess(group, currentUser);

        List<Parcel> parcels = parcelRepository.findByGroupShipmentId(groupId);

        return parcels.stream().map(this::mapParcelToDTO).collect(Collectors.toList());
    }

    // ==========================================
    // Cancel Group
    // ==========================================

    /**
     * Cancel a group (by company)
     */
    @Transactional
    public GroupDTO cancelGroup(Long groupId, String reason, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        GroupShipment group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group", "id", groupId));

        // Verify company owns the group
        if (!group.getCompany().getId().equals(company.getId())) {
            throw new ForbiddenException("Access denied");
        }

        // Can only cancel if not yet in delivery
        if (group.getStatus() == GroupStatus.DELIVERY_IN_PROGRESS ||
                group.getStatus() == GroupStatus.COMPLETED) {
            throw new BadRequestException("Cannot cancel group after delivery has started");
        }

        // Update group
        group.setStatus(GroupStatus.CANCELLED);
        group.setCancelledAt(LocalDateTime.now());
        group.setCancellationReason(reason != null ? reason : "Cancelled by company");
        group = groupRepository.save(group);

        // Remove parcels from group and reset pricing
        List<Parcel> parcels = parcelRepository.findByGroupShipmentId(groupId);
        for (Parcel parcel : parcels) {
            parcel.setGroupShipmentId(null);
            parcel.setDiscountAmount(BigDecimal.ZERO);
            parcel.setFinalPrice(parcel.getBasePrice());
            parcel.setAgent(null);
            if (parcel.getStatus() == ParcelStatus.ASSIGNED) {
                parcel.setStatus(ParcelStatus.CONFIRMED);
            }
            parcelRepository.save(parcel);
        }

        log.info("Cancelled group {} ({} parcels removed)", group.getGroupCode(), parcels.size());

        return mapToDTO(group);
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private String generateUniqueGroupCode() {
        String groupCode;
        int attempts = 0;
        do {
            groupCode = otpUtil.generateGroupCode();
            attempts++;
            if (attempts > 10) {
                throw new RuntimeException("Failed to generate unique group code");
            }
        } while (groupRepository.existsByGroupCode(groupCode));
        return groupCode;
    }

    private void verifyGroupAccess(GroupShipment group, User currentUser) {
        UserType userType = currentUser.getUserType();

        switch (userType) {
            case COMPANY_ADMIN -> {
                CompanyAdmin company = companyRepository.findByUser(currentUser)
                        .orElseThrow(() -> new ForbiddenException("Access denied"));
                if (!group.getCompany().getId().equals(company.getId())) {
                    throw new ForbiddenException("Access denied");
                }
            }
            case DELIVERY_AGENT -> {
                DeliveryAgent agent = agentRepository.findByUser(currentUser)
                        .orElseThrow(() -> new ForbiddenException("Access denied"));
                boolean isPickupAgent = group.getPickupAgent() != null &&
                        group.getPickupAgent().getId().equals(agent.getId());
                boolean isDeliveryAgent = group.getDeliveryAgent() != null &&
                        group.getDeliveryAgent().getId().equals(agent.getId());
                if (!isPickupAgent && !isDeliveryAgent) {
                    throw new ForbiddenException("Access denied");
                }
            }
            case SUPER_ADMIN -> {
                // Super admin can access all
            }
            default -> throw new ForbiddenException("Access denied");
        }
    }

    // ==========================================
    // Mapper Methods
    // ==========================================

    public GroupDTO mapToDTO(GroupShipment group) {
        long timeRemaining = Duration.between(LocalDateTime.now(), group.getDeadline()).toMinutes();

        return GroupDTO.builder()
                .id(group.getId())
                .groupCode(group.getGroupCode())
                .companyId(group.getCompany().getId())
                .companyName(group.getCompany().getCompanyName())
                .companyRating(group.getCompany().getRatingAvg())
                .sourceCity(group.getSourceCity())
                .targetCity(group.getTargetCity())
                .sourcePincode(group.getSourcePincode())
                .targetPincode(group.getTargetPincode())
                .targetMembers(group.getTargetMembers())
                .currentMembers(group.getCurrentMembers())
                .remainingSlots(group.getRemainingSlots())
                .discountPercentage(group.getDiscountPercentage())
                .deadline(group.getDeadline())
                .timeRemainingMinutes(Math.max(0, timeRemaining))
                .pickupAgentId(group.getPickupAgent() != null ? group.getPickupAgent().getId() : null)
                .pickupAgentName(group.getPickupAgent() != null ? group.getPickupAgent().getFullName() : null)
                .deliveryAgentId(group.getDeliveryAgent() != null ? group.getDeliveryAgent().getId() : null)
                .deliveryAgentName(group.getDeliveryAgent() != null ? group.getDeliveryAgent().getFullName() : null)
                .status(group.getStatus())
                .canJoin(group.canJoin())
                .isFull(group.isFull())
                .isExpired(group.isExpired())
                .pickupStartedAt(group.getPickupStartedAt())
                .pickupCompletedAt(group.getPickupCompletedAt())
                .deliveryStartedAt(group.getDeliveryStartedAt())
                .deliveryCompletedAt(group.getDeliveryCompletedAt())
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .build();
    }

    public GroupPublicDTO mapToPublicDTO(GroupShipment group) {
        long timeRemaining = Duration.between(LocalDateTime.now(), group.getDeadline()).toMinutes();
        String timeFormatted = formatTimeRemaining(timeRemaining);

        // Calculate example savings (based on average parcel of ₹500)
        BigDecimal exampleSavings = new BigDecimal("500")
                .multiply(group.getDiscountPercentage())
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);

        return GroupPublicDTO.builder()
                .id(group.getId())
                .groupCode(group.getGroupCode())
                .companyName(group.getCompany().getCompanyName())
                .companyRating(group.getCompany().getRatingAvg())
                .sourceCity(group.getSourceCity())
                .targetCity(group.getTargetCity())
                .targetMembers(group.getTargetMembers())
                .currentMembers(group.getCurrentMembers())
                .remainingSlots(group.getRemainingSlots())
                .discountPercentage(group.getDiscountPercentage())
                .deadline(group.getDeadline())
                .timeRemainingMinutes(Math.max(0, timeRemaining))
                .timeRemainingFormatted(timeFormatted)
                .estimatedSavings(exampleSavings)
                .build();
    }

    private String formatTimeRemaining(long minutes) {
        if (minutes <= 0) {
            return "Expired";
        }
        long hours = minutes / 60;
        long mins = minutes % 60;
        if (hours > 24) {
            long days = hours / 24;
            hours = hours % 24;
            return days + "d " + hours + "h";
        }
        return hours + "h " + mins + "m";
    }

    private ParcelDTO mapParcelToDTO(Parcel parcel) {
        return ParcelDTO.builder()
                .id(parcel.getId())
                .trackingNumber(parcel.getTrackingNumber())
                .customerId(parcel.getCustomer().getId())
                .customerName(parcel.getCustomer().getFullName())
                .pickupName(parcel.getPickupName())
                .pickupPhone(parcel.getPickupPhone())
                .pickupAddress(parcel.getPickupAddress())
                .pickupCity(parcel.getPickupCity())
                .pickupPincode(parcel.getPickupPincode())
                .deliveryName(parcel.getDeliveryName())
                .deliveryPhone(parcel.getDeliveryPhone())
                .deliveryAddress(parcel.getDeliveryAddress())
                .deliveryCity(parcel.getDeliveryCity())
                .deliveryPincode(parcel.getDeliveryPincode())
                .packageType(parcel.getPackageType())
                .weightKg(parcel.getWeightKg())
                .basePrice(parcel.getBasePrice())
                .discountAmount(parcel.getDiscountAmount())
                .finalPrice(parcel.getFinalPrice())
                .status(parcel.getStatus())
                .paymentStatus(parcel.getPaymentStatus())
                .pickupOtp(parcel.getPickupOtp())
                .deliveryOtp(parcel.getDeliveryOtp())
                .groupShipmentId(parcel.getGroupShipmentId())
                .createdAt(parcel.getCreatedAt())
                .build();
    }
}