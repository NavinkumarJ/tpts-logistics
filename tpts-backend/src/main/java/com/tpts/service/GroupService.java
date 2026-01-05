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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private final EarningRepository earningRepository;
    private final OtpUtil otpUtil;
    private final NotificationService notificationService;
    private final SmsService smsService;
    private final WalletService walletService;

    // Group earnings split rates (Platform 10%, Pickup Agent 10%, Delivery Agent
    // 10%, Company 70%)
    private static final BigDecimal PLATFORM_RATE = new BigDecimal("10.00");
    private static final BigDecimal PICKUP_AGENT_RATE = new BigDecimal("10.00");
    private static final BigDecimal DELIVERY_AGENT_RATE = new BigDecimal("10.00");
    private static final BigDecimal COMPANY_RATE = new BigDecimal("70.00");

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
                .warehouseAddress(request.getWarehouseAddress())
                .warehouseCity(request.getWarehouseCity())
                .warehousePincode(request.getWarehousePincode())
                .warehouseLatitude(request.getWarehouseLatitude())
                .warehouseLongitude(request.getWarehouseLongitude())
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
    // Customer Group Management
    // ==========================================

    /**
     * Get customer's group shipments with detailed info
     */
    public List<Map<String, Object>> getCustomerGroups(User currentUser) {
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        // Get all parcels for this customer that are part of a group
        List<Parcel> groupParcels = parcelRepository.findByCustomerIdAndGroupShipmentIdIsNotNull(customer.getId());

        return groupParcels.stream().map(parcel -> {
            Map<String, Object> result = new HashMap<>();
            GroupShipment group = groupRepository.findById(parcel.getGroupShipmentId()).orElse(null);
            if (group == null)
                return result;

            // Group basic info
            result.put("id", group.getId());
            result.put("groupCode", group.getGroupCode());
            result.put("status", group.getStatus().name());
            result.put("sourceCity", group.getSourceCity());
            result.put("targetCity", group.getTargetCity());
            result.put("currentMembers", group.getCurrentMembers());
            result.put("targetMembers", group.getTargetMembers());
            result.put("remainingSlots", group.getTargetMembers() - group.getCurrentMembers());
            result.put("discountPercentage", group.getDiscountPercentage());
            result.put("deadline", group.getDeadline());
            result.put("createdAt", group.getCreatedAt());

            // Company info
            if (group.getCompany() != null) {
                result.put("companyName", group.getCompany().getCompanyName());
                result.put("companyId", group.getCompany().getId());
            }

            // Customer's parcel info
            result.put("parcelId", parcel.getId());
            result.put("trackingNumber", parcel.getTrackingNumber());
            result.put("parcelStatus", parcel.getStatus().name());

            // Sender/Pickup details
            result.put("pickupName", parcel.getPickupName());
            result.put("pickupPhone", parcel.getPickupPhone());
            result.put("pickupAddress", parcel.getPickupAddress());
            result.put("pickupCity", parcel.getPickupCity());
            result.put("pickupPincode", parcel.getPickupPincode());

            // Receiver/Delivery details
            result.put("deliveryName", parcel.getDeliveryName());
            result.put("deliveryPhone", parcel.getDeliveryPhone());
            result.put("deliveryAddress", parcel.getDeliveryAddress());
            result.put("deliveryCity", parcel.getDeliveryCity());
            result.put("deliveryPincode", parcel.getDeliveryPincode());

            // Parcel details
            result.put("packageType", parcel.getPackageType());
            result.put("weightKg", parcel.getWeightKg());
            result.put("packageDescription", parcel.getSpecialInstructions());

            // Amount breakdown
            BigDecimal basePrice = parcel.getBasePrice() != null ? parcel.getBasePrice() : BigDecimal.ZERO;
            BigDecimal discount = parcel.getDiscountAmount() != null ? parcel.getDiscountAmount() : BigDecimal.ZERO;
            BigDecimal finalPrice = parcel.getFinalPrice() != null ? parcel.getFinalPrice() : basePrice;

            result.put("basePrice", basePrice);
            result.put("discountAmount", discount);
            result.put("finalPrice", finalPrice);

            // Calculate savings
            BigDecimal savings = basePrice.subtract(finalPrice);
            result.put("yourSavings", savings.compareTo(BigDecimal.ZERO) > 0 ? savings : BigDecimal.ZERO);

            // Balance payment info (for partial groups with pro-rated discount)
            result.put("balanceAmount", parcel.getBalanceAmount());
            result.put("balancePaid", parcel.getBalancePaid());
            result.put("balancePaymentMethod", parcel.getBalancePaymentMethod());
            result.put("balancePaidAt", parcel.getBalancePaidAt());
            result.put("originalDiscountPercentage", parcel.getOriginalDiscountPercentage());
            result.put("effectiveDiscountPercentage", parcel.getEffectiveDiscountPercentage());

            // Revenue split breakdown (for completed orders)
            if (group.getStatus() == GroupStatus.COMPLETED) {
                BigDecimal platformFee = finalPrice.multiply(PLATFORM_RATE).divide(new BigDecimal("100"), 2,
                        java.math.RoundingMode.HALF_UP);
                BigDecimal pickupAgentFee = finalPrice.multiply(PICKUP_AGENT_RATE).divide(new BigDecimal("100"), 2,
                        java.math.RoundingMode.HALF_UP);
                BigDecimal deliveryAgentFee = finalPrice.multiply(DELIVERY_AGENT_RATE).divide(new BigDecimal("100"), 2,
                        java.math.RoundingMode.HALF_UP);
                BigDecimal companyEarning = finalPrice.multiply(COMPANY_RATE).divide(new BigDecimal("100"), 2,
                        java.math.RoundingMode.HALF_UP);

                Map<String, Object> revenueSplit = new HashMap<>();
                revenueSplit.put("platformFee", platformFee);
                revenueSplit.put("platformRate", "10%");
                revenueSplit.put("pickupAgentFee", pickupAgentFee);
                revenueSplit.put("pickupAgentRate", "10%");
                revenueSplit.put("deliveryAgentFee", deliveryAgentFee);
                revenueSplit.put("deliveryAgentRate", "10%");
                revenueSplit.put("companyEarning", companyEarning);
                revenueSplit.put("companyRate", "70%");
                result.put("revenueSplit", revenueSplit);
            }

            // Agent info if assigned
            if (group.getPickupAgent() != null) {
                Map<String, Object> pickupAgentInfo = new HashMap<>();
                pickupAgentInfo.put("id", group.getPickupAgent().getId());
                pickupAgentInfo.put("name", group.getPickupAgent().getFullName());
                pickupAgentInfo.put("phone",
                        group.getPickupAgent().getUser() != null ? group.getPickupAgent().getUser().getPhone() : null);
                result.put("pickupAgent", pickupAgentInfo);
            }

            if (group.getDeliveryAgent() != null) {
                Map<String, Object> deliveryAgentInfo = new HashMap<>();
                deliveryAgentInfo.put("id", group.getDeliveryAgent().getId());
                deliveryAgentInfo.put("name", group.getDeliveryAgent().getFullName());
                deliveryAgentInfo.put("phone",
                        group.getDeliveryAgent().getUser() != null ? group.getDeliveryAgent().getUser().getPhone()
                                : null);
                result.put("deliveryAgent", deliveryAgentInfo);
            }

            // Warehouse info
            result.put("warehouseAddress", group.getWarehouseAddress());
            result.put("warehouseCity", group.getWarehouseCity());

            // Timestamps
            result.put("pickedUpAt", parcel.getPickedUpAt());
            result.put("deliveredAt", parcel.getDeliveredAt());

            return result;
        }).collect(Collectors.toList());
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

        // Generate OTPs if not already set
        if (parcel.getPickupOtp() == null || parcel.getPickupOtp().isEmpty()) {
            parcel.setPickupOtp(otpUtil.generateOtp());
        }
        if (parcel.getDeliveryOtp() == null || parcel.getDeliveryOtp().isEmpty()) {
            parcel.setDeliveryOtp(otpUtil.generateOtp());
        }

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
     * Parcel becomes regular order, customer must pay balance (difference between
     * discounted price paid and full price)
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

        // Calculate balance amount (customer paid discounted price, now needs to pay
        // the difference)
        BigDecimal paidAmount = parcel.getFinalPrice(); // What customer paid (discounted)
        BigDecimal fullPrice = parcel.getBasePrice(); // Full price without discount
        BigDecimal balanceDue = fullPrice.subtract(paidAmount); // Difference to be paid

        // Remove from group
        parcel.setGroupShipmentId(null);
        parcel.setDiscountAmount(BigDecimal.ZERO);
        parcel.setFinalPrice(fullPrice);

        // Set balance amount that customer needs to pay
        if (balanceDue.compareTo(BigDecimal.ZERO) > 0) {
            parcel.setBalanceAmount(balanceDue);
            parcel.setBalancePaid(false);
            log.info("Balance due for parcel {}: ₹{} (paid ₹{}, full price ₹{})",
                    parcel.getTrackingNumber(), balanceDue, paidAmount, fullPrice);
        }

        parcelRepository.save(parcel);

        // Capture group code before lambda (since group is reassigned later)
        final String groupCode = group.getGroupCode();

        // Reverse/Cancel any existing earning record for this parcel
        earningRepository.findByParcelId(parcelId).ifPresent(earning -> {
            if (earning.getStatus() != EarningStatus.CANCELLED) {
                earning.setStatus(EarningStatus.CANCELLED);
                earning.setNotes("Earning cancelled - customer left group " + groupCode);
                earningRepository.save(earning);
                log.info("Cancelled earning {} for parcel {} due to customer leaving group",
                        earning.getId(), parcel.getTrackingNumber());
            }
        });

        // Decrement member count
        group.setCurrentMembers(Math.max(0, group.getCurrentMembers() - 1));

        // If was full, reopen
        if (group.getStatus() == GroupStatus.FULL) {
            group.setStatus(GroupStatus.OPEN);
        }

        group = groupRepository.save(group);

        // Notify company that a customer left the group
        if (group.getCompany() != null) {
            String balanceInfo = balanceDue.compareTo(BigDecimal.ZERO) > 0
                    ? " Balance due: ₹" + balanceDue
                    : "";
            notificationService.sendNotification(
                    group.getCompany().getUser(),
                    "Customer Left Group",
                    "A customer left group " + group.getGroupCode() + " (" + group.getSourceCity() + " → "
                            + group.getTargetCity() + "). Current members: " + group.getCurrentMembers() + "/"
                            + group.getTargetMembers() + "." + balanceInfo,
                    "GROUP_MEMBER_LEFT",
                    group.getId());
        }

        log.info("Customer {} left group {} with parcel {}. Balance due: ₹{}",
                customer.getId(), group.getGroupCode(), parcel.getTrackingNumber(), balanceDue);

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

        // Update parcels - assign delivery agent and send SMS with OTP
        List<Parcel> parcels = parcelRepository.findByGroupShipmentId(groupId);
        String agentName = agent.getFullName();

        for (Parcel parcel : parcels) {
            parcel.setAgent(agent); // Switch to delivery agent
            parcel.setStatus(ParcelStatus.OUT_FOR_DELIVERY);
            parcelRepository.save(parcel);

            // Send SMS to receiver with delivery OTP
            try {
                String receiverPhone = parcel.getDeliveryPhone();
                String trackingNumber = parcel.getTrackingNumber();
                String receiverName = parcel.getDeliveryName();
                String deliveryOtp = parcel.getDeliveryOtp();
                smsService.sendDeliveryNotification(receiverPhone, trackingNumber, receiverName, deliveryOtp);
            } catch (Exception e) {
                log.warn("Failed to send delivery OTP SMS for parcel {}: {}", parcel.getTrackingNumber(),
                        e.getMessage());
            }

            // Send in-app notification to customer
            try {
                notificationService.sendDeliveryUpdate(
                        parcel.getCustomer().getUser(),
                        parcel.getTrackingNumber(),
                        ParcelStatus.OUT_FOR_DELIVERY);
            } catch (Exception e) {
                log.warn("Failed to send out for delivery notification for parcel {}: {}", parcel.getTrackingNumber(),
                        e.getMessage());
            }
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

        // Update all parcels to PICKED_UP and send SMS notifications
        List<Parcel> parcels = parcelRepository.findByGroupShipmentId(groupId);
        String agentName = group.getPickupAgent() != null ? group.getPickupAgent().getFullName() : "Agent";

        for (Parcel parcel : parcels) {
            parcel.setStatus(ParcelStatus.PICKED_UP);
            parcel.setPickedUpAt(LocalDateTime.now());
            parcelRepository.save(parcel);

            // Send SMS to sender (pickup person)
            try {
                String senderPhone = parcel.getPickupPhone();
                String trackingNumber = parcel.getTrackingNumber();
                String senderName = parcel.getPickupName();
                smsService.sendPickedUpToSender(senderPhone, trackingNumber, senderName, agentName);
            } catch (Exception e) {
                log.warn("Failed to send pickup SMS to sender for parcel {}: {}", parcel.getTrackingNumber(),
                        e.getMessage());
            }

            // Send SMS to receiver
            try {
                String receiverPhone = parcel.getDeliveryPhone();
                String trackingNumber = parcel.getTrackingNumber();
                String receiverName = parcel.getDeliveryName();
                smsService.sendPickedUpToReceiver(receiverPhone, trackingNumber, receiverName, agentName);
            } catch (Exception e) {
                log.warn("Failed to send pickup SMS to receiver for parcel {}: {}", parcel.getTrackingNumber(),
                        e.getMessage());
            }

            // Send in-app notification to customer
            try {
                notificationService.sendDeliveryUpdate(
                        parcel.getCustomer().getUser(),
                        parcel.getTrackingNumber(),
                        ParcelStatus.PICKED_UP);
            } catch (Exception e) {
                log.warn("Failed to send pickup notification for parcel {}: {}", parcel.getTrackingNumber(),
                        e.getMessage());
            }
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

        // Get agents
        DeliveryAgent pickupAgent = group.getPickupAgent();
        DeliveryAgent deliveryAgent = group.getDeliveryAgent();

        // Update all parcels to DELIVERED and calculate earnings
        List<Parcel> parcels = parcelRepository.findByGroupShipmentId(groupId);
        BigDecimal totalGroupAmount = BigDecimal.ZERO;

        for (Parcel parcel : parcels) {
            parcel.setStatus(ParcelStatus.DELIVERED);
            parcel.setDeliveredAt(LocalDateTime.now());
            parcelRepository.save(parcel);

            // Calculate and save earnings for this parcel with group split
            // Include balance payment amount if any (for partial groups with pro-rated
            // discount)
            BigDecimal baseOrderAmount = parcel.getFinalPrice() != null ? parcel.getFinalPrice()
                    : (parcel.getBasePrice() != null ? parcel.getBasePrice() : BigDecimal.ZERO);
            BigDecimal balanceAmount = parcel.getBalanceAmount() != null ? parcel.getBalanceAmount() : BigDecimal.ZERO;

            // Total order amount = finalPrice + balanceAmount (if paid)
            // This ensures full revenue is split among all roles
            BigDecimal orderAmount = baseOrderAmount.add(balanceAmount);

            log.info("Parcel {} revenue split calculation: basePrice={}, balanceAmount={}, totalOrderAmount={}",
                    parcel.getTrackingNumber(), baseOrderAmount, balanceAmount, orderAmount);

            totalGroupAmount = totalGroupAmount.add(orderAmount);

            // Create earning record for pickup agent (10%)
            if (pickupAgent != null) {
                BigDecimal pickupEarning = orderAmount.multiply(PICKUP_AGENT_RATE)
                        .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                Earning pickupAgentEarning = Earning.builder()
                        .parcel(parcel)
                        .company(group.getCompany())
                        .agent(pickupAgent)
                        .orderAmount(orderAmount)
                        .platformCommissionRate(PLATFORM_RATE)
                        .platformCommission(orderAmount.multiply(PLATFORM_RATE).divide(new BigDecimal("100"), 2,
                                RoundingMode.HALF_UP))
                        .agentCommissionRate(PICKUP_AGENT_RATE)
                        .agentEarning(pickupEarning)
                        .companyEarning(orderAmount.multiply(COMPANY_RATE).divide(new BigDecimal("100"), 2,
                                RoundingMode.HALF_UP))
                        .companyNetEarning(orderAmount.multiply(COMPANY_RATE).divide(new BigDecimal("100"), 2,
                                RoundingMode.HALF_UP))
                        .status(EarningStatus.PENDING)
                        .notes("Group pickup earnings - " + group.getGroupCode())
                        .build();
                earningRepository.save(pickupAgentEarning);

                // Add to pickup agent wallet
                walletService.addToPendingBalance(
                        pickupAgent.getUser(), pickupEarning,
                        "PARCEL", parcel.getId(),
                        "Pickup earning from group " + group.getGroupCode());
            }

            // Create earning record for delivery agent (10%)
            if (deliveryAgent != null) {
                BigDecimal deliveryEarning = orderAmount.multiply(DELIVERY_AGENT_RATE)
                        .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                Earning deliveryAgentEarning = Earning.builder()
                        .parcel(parcel)
                        .company(group.getCompany())
                        .agent(deliveryAgent)
                        .orderAmount(orderAmount)
                        .platformCommissionRate(PLATFORM_RATE)
                        .platformCommission(orderAmount.multiply(PLATFORM_RATE).divide(new BigDecimal("100"), 2,
                                RoundingMode.HALF_UP))
                        .agentCommissionRate(DELIVERY_AGENT_RATE)
                        .agentEarning(deliveryEarning)
                        .companyEarning(orderAmount.multiply(COMPANY_RATE).divide(new BigDecimal("100"), 2,
                                RoundingMode.HALF_UP))
                        .companyNetEarning(orderAmount.multiply(COMPANY_RATE).divide(new BigDecimal("100"), 2,
                                RoundingMode.HALF_UP))
                        .status(EarningStatus.PENDING)
                        .notes("Group delivery earnings - " + group.getGroupCode())
                        .build();
                earningRepository.save(deliveryAgentEarning);

                // Add to delivery agent wallet
                walletService.addToPendingBalance(
                        deliveryAgent.getUser(), deliveryEarning,
                        "PARCEL", parcel.getId(),
                        "Delivery earning from group " + group.getGroupCode());
            }

            // Add company earnings (70%) - done once per parcel
            BigDecimal companyEarning = orderAmount.multiply(COMPANY_RATE)
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            walletService.addToPendingBalance(
                    group.getCompany().getUser(), companyEarning,
                    "PARCEL", parcel.getId(),
                    "Company earning from group " + group.getGroupCode());

            // Add platform commission (10%) - done once per parcel
            BigDecimal platformCommission = orderAmount.multiply(PLATFORM_RATE)
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            walletService.addPlatformCommission(platformCommission, parcel.getId(),
                    "Platform commission from group " + group.getGroupCode());
        }

        // Save agent stats - increment totalDeliveries ONCE per group (not per parcel)
        // Handle case where same agent might be both pickup and delivery agent
        if (pickupAgent != null && deliveryAgent != null && pickupAgent.getId().equals(deliveryAgent.getId())) {
            // Same agent did both pickup and delivery - only increment once
            pickupAgent.setTotalDeliveries(pickupAgent.getTotalDeliveries() + 1);
            agentRepository.save(pickupAgent);
        } else {
            // Different agents - increment each
            if (pickupAgent != null) {
                pickupAgent.setTotalDeliveries(pickupAgent.getTotalDeliveries() + 1);
                agentRepository.save(pickupAgent);
            }
            if (deliveryAgent != null) {
                deliveryAgent.setTotalDeliveries(deliveryAgent.getTotalDeliveries() + 1);
                agentRepository.save(deliveryAgent);
            }
        }

        // Update company stats - one group = one delivery
        CompanyAdmin company = group.getCompany();
        company.setTotalDeliveries(company.getTotalDeliveries() + 1);
        companyRepository.save(company);

        log.info("Delivery completed for group {} - {} parcels delivered, total amount: {}",
                group.getGroupCode(), parcels.size(), totalGroupAmount);
        log.info(
                "Group earnings split - Company 70%: {}, Pickup Agent 10%: {}, Delivery Agent 10%: {}, Platform 10%: {}",
                totalGroupAmount.multiply(COMPANY_RATE).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP),
                totalGroupAmount.multiply(PICKUP_AGENT_RATE).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP),
                totalGroupAmount.multiply(DELIVERY_AGENT_RATE).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP),
                totalGroupAmount.multiply(PLATFORM_RATE).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP));

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

    /**
     * Reopen a closed group (by company)
     * Notifies all members that they can now cancel if they wish
     */
    @Transactional
    public GroupDTO reopenGroup(Long groupId, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        GroupShipment group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group", "id", groupId));

        // Verify company owns the group
        if (!group.getCompany().getId().equals(company.getId())) {
            throw new ForbiddenException("Access denied");
        }

        // Can only reopen if FULL (not past pickup)
        if (group.getStatus() != GroupStatus.FULL) {
            throw new BadRequestException("Can only reopen groups that are FULL. Current status: " + group.getStatus());
        }

        // Reopen the group
        group.setStatus(GroupStatus.OPEN);
        group = groupRepository.save(group);

        // Notify all members that they can now cancel if they want
        List<Parcel> parcels = parcelRepository.findByGroupShipmentId(groupId);
        for (Parcel parcel : parcels) {
            if (parcel.getCustomer() != null && parcel.getCustomer().getUser() != null) {
                notificationService.sendNotification(
                        parcel.getCustomer().getUser(),
                        "Group Reopened - You Can Cancel",
                        "Group " + group.getGroupCode() + " has been reopened by the company. " +
                                "You can now cancel your order and get a refund if you wish. " +
                                "If you don't cancel, your order will proceed once the group fills up again.",
                        "GROUP_REOPENED",
                        parcel.getId());
            }
        }

        log.info("Reopened group {} - {} members notified", group.getGroupCode(), parcels.size());

        return mapToDTO(group);
    }

    /**
     * Close group early and proceed (when more than 50% of target members joined)
     * Changes status to FULL so company can assign agents
     * Recalculates discount based on actual vs target members and updates balance
     * amounts
     */
    @Transactional
    public GroupDTO closeGroupEarly(Long groupId, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        GroupShipment group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group", "id", groupId));

        // Verify company owns the group
        if (!group.getCompany().getId().equals(company.getId())) {
            throw new ForbiddenException("Access denied");
        }

        // Can only close early if OPEN
        if (group.getStatus() != GroupStatus.OPEN) {
            throw new BadRequestException("Can only close groups that are OPEN. Current status: " + group.getStatus());
        }

        // Check if more than 50% of target members have joined
        int minMembers = (int) Math.ceil(group.getTargetMembers() / 2.0);
        if (group.getCurrentMembers() < minMembers) {
            throw new BadRequestException("Cannot close early. Need at least " + minMembers +
                    " members (50%+). Current: " + group.getCurrentMembers() + "/" + group.getTargetMembers());
        }

        // Calculate effective discount (pro-rated based on actual members)
        // If original discount was 25% for 5 members, and only 3 joined:
        // Effective discount = 25% * (3/5) = 15%
        BigDecimal fillPercentage = BigDecimal.valueOf(group.getCurrentMembers())
                .divide(BigDecimal.valueOf(group.getTargetMembers()), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));

        BigDecimal originalDiscount = group.getDiscountPercentage();
        BigDecimal effectiveDiscount = originalDiscount
                .multiply(fillPercentage)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        group.setFillPercentage(fillPercentage);
        group.setEffectiveDiscountPercentage(effectiveDiscount);

        log.info("Group {} closing early: {}/{} members, fill {}%, original discount {}%, effective discount {}%",
                group.getGroupCode(), group.getCurrentMembers(), group.getTargetMembers(),
                fillPercentage, originalDiscount, effectiveDiscount);

        // Update all parcels with new pricing and balance amounts
        List<Parcel> parcels = parcelRepository.findByGroupShipmentId(groupId);
        for (Parcel parcel : parcels) {
            BigDecimal basePrice = parcel.getBasePrice();
            BigDecimal originalPaid = parcel.getFinalPrice(); // What customer already paid (with original discount)

            // Calculate new discount amount with effective (reduced) discount
            BigDecimal newDiscountAmount = basePrice
                    .multiply(effectiveDiscount)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal newFinalPrice = basePrice.subtract(newDiscountAmount);

            // Calculate balance due (difference between new price and what was already
            // paid)
            BigDecimal balanceDue = newFinalPrice.subtract(originalPaid);

            // Update parcel
            parcel.setDiscountAmount(newDiscountAmount);
            parcel.setFinalPrice(newFinalPrice);

            if (balanceDue.compareTo(BigDecimal.ZERO) > 0) {
                parcel.setBalanceAmount(balanceDue);
                parcel.setBalancePaid(false);
                log.info("Parcel {} balance due: ₹{} (base ₹{}, paid ₹{}, new price ₹{}, effective discount {}%)",
                        parcel.getTrackingNumber(), balanceDue, basePrice, originalPaid, newFinalPrice,
                        effectiveDiscount);
            }

            parcelRepository.save(parcel);

            // Notify customer about balance amount
            if (balanceDue.compareTo(BigDecimal.ZERO) > 0 && parcel.getCustomer() != null
                    && parcel.getCustomer().getUser() != null) {
                notificationService.sendNotification(
                        parcel.getCustomer().getUser(),
                        "Group Closed Early - Balance Due ₹" + balanceDue,
                        "Group " + group.getGroupCode() + " closed with " + group.getCurrentMembers() + "/" +
                                group.getTargetMembers() + " members. Your discount has been adjusted from " +
                                originalDiscount + "% to " + effectiveDiscount + "%. Balance due: ₹" + balanceDue +
                                ". Please pay the balance to complete your order.",
                        "PAYMENT_REQUIRED",
                        parcel.getId());
            } else if (parcel.getCustomer() != null && parcel.getCustomer().getUser() != null) {
                notificationService.sendNotification(
                        parcel.getCustomer().getUser(),
                        "Group Closed - Proceeding with Delivery",
                        "Group " + group.getGroupCode() + " has been closed with " +
                                group.getCurrentMembers() + "/" + group.getTargetMembers() +
                                " members. Your order will now be processed for delivery.",
                        "GROUP_FILLED",
                        parcel.getId());
            }
        }

        // Close the group by setting status to FULL
        group.setStatus(GroupStatus.FULL);
        group = groupRepository.save(group);

        log.info("Closed group {} early with {}/{} members, effective discount {}% - {} members notified",
                group.getGroupCode(), group.getCurrentMembers(), group.getTargetMembers(),
                effectiveDiscount, parcels.size());

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
            case CUSTOMER -> {
                // Customer can access if they have a parcel in this group
                Customer customer = customerRepository.findByUser(currentUser)
                        .orElseThrow(() -> new ForbiddenException("Access denied"));
                boolean hasParcelInGroup = parcelRepository.findByGroupShipmentId(group.getId())
                        .stream()
                        .anyMatch(p -> p.getCustomer().getId().equals(customer.getId()));
                if (!hasParcelInGroup) {
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

        // Calculate total group value from all parcels
        List<Parcel> parcels = parcelRepository.findByGroupShipmentId(group.getId());
        BigDecimal totalValue = parcels.stream()
                .map(p -> p.getFinalPrice() != null ? p.getFinalPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Agent earnings: 10% each for pickup and delivery
        BigDecimal agentCommission = totalValue.multiply(new BigDecimal("0.10")).setScale(2, RoundingMode.HALF_UP);

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
                .warehouseAddress(group.getWarehouseAddress())
                .warehouseCity(group.getWarehouseCity())
                .warehousePincode(group.getWarehousePincode())
                .warehouseLatitude(group.getWarehouseLatitude())
                .warehouseLongitude(group.getWarehouseLongitude())
                .targetMembers(group.getTargetMembers())
                .currentMembers(group.getCurrentMembers())
                .remainingSlots(group.getRemainingSlots())
                .discountPercentage(group.getDiscountPercentage())
                .deadline(group.getDeadline())
                .timeRemainingMinutes(Math.max(0, timeRemaining))
                .pickupAgentId(group.getPickupAgent() != null ? group.getPickupAgent().getId() : null)
                .pickupAgentName(group.getPickupAgent() != null ? group.getPickupAgent().getFullName() : null)
                .pickupAgentPhone(group.getPickupAgent() != null && group.getPickupAgent().getUser() != null
                        ? group.getPickupAgent().getUser().getPhone()
                        : null)
                .pickupAgentLatitude(group.getPickupAgentLatitude())
                .pickupAgentLongitude(group.getPickupAgentLongitude())
                .deliveryAgentId(group.getDeliveryAgent() != null ? group.getDeliveryAgent().getId() : null)
                .deliveryAgentName(group.getDeliveryAgent() != null ? group.getDeliveryAgent().getFullName() : null)
                .deliveryAgentPhone(group.getDeliveryAgent() != null && group.getDeliveryAgent().getUser() != null
                        ? group.getDeliveryAgent().getUser().getPhone()
                        : null)
                .deliveryAgentLatitude(group.getDeliveryAgentLatitude())
                .deliveryAgentLongitude(group.getDeliveryAgentLongitude())
                .totalGroupValue(totalValue)
                .pickupAgentEarnings(agentCommission)
                .deliveryAgentEarnings(agentCommission)
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
                .companyId(group.getCompany().getId())
                .companyName(group.getCompany().getCompanyName())
                .companyRating(group.getCompany().getRatingAvg())
                .baseRatePerKm(group.getCompany().getBaseRatePerKm())
                .baseRatePerKg(group.getCompany().getBaseRatePerKg())
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
                .pickupLatitude(parcel.getPickupLatitude())
                .pickupLongitude(parcel.getPickupLongitude())
                .deliveryName(parcel.getDeliveryName())
                .deliveryPhone(parcel.getDeliveryPhone())
                .deliveryAddress(parcel.getDeliveryAddress())
                .deliveryCity(parcel.getDeliveryCity())
                .deliveryPincode(parcel.getDeliveryPincode())
                .deliveryLatitude(parcel.getDeliveryLatitude())
                .deliveryLongitude(parcel.getDeliveryLongitude())
                .packageType(parcel.getPackageType())
                .weightKg(parcel.getWeightKg())
                .basePrice(parcel.getBasePrice())
                .discountAmount(parcel.getDiscountAmount())
                .finalPrice(parcel.getFinalPrice())
                .status(parcel.getStatus())
                .paymentStatus(parcel.getPaymentStatus())
                .pickupOtp(parcel.getPickupOtp())
                .deliveryOtp(parcel.getDeliveryOtp())
                .pickupPhotoUrl(parcel.getPickupPhotoUrl())
                .deliveryPhotoUrl(parcel.getDeliveryPhotoUrl())
                .pickedUpAt(parcel.getPickedUpAt())
                .deliveredAt(parcel.getDeliveredAt())
                .groupShipmentId(parcel.getGroupShipmentId())
                .createdAt(parcel.getCreatedAt())
                .build();
    }
}