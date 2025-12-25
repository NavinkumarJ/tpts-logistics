package com.tpts.service;

import com.tpts.dto.request.AssignAgentRequest;
import com.tpts.dto.request.CreateParcelRequest;
import com.tpts.dto.request.UpdateParcelStatusRequest;
import com.tpts.dto.response.AgentPublicDTO;
import com.tpts.dto.response.ParcelDTO;
import com.tpts.dto.response.ParcelTrackingDTO;
import com.tpts.entity.*;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.CompanyAdminRepository;
import com.tpts.repository.CustomerRepository;
import com.tpts.repository.DeliveryAgentRepository;
import com.tpts.repository.ParcelRepository;
import com.tpts.repository.PaymentRepository;
import com.tpts.repository.RatingRepository;
import com.tpts.util.OtpUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for Parcel operations
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ParcelService {

    private final ParcelRepository parcelRepository;
    private final CustomerRepository customerRepository;
    private final CompanyAdminRepository companyRepository;
    private final DeliveryAgentRepository agentRepository;
    private final NotificationService notificationService;
    private final SmsService smsService;
    private final RatingRepository ratingRepository;
    private final PaymentRepository paymentRepository;
    private final OtpUtil otpUtil;
    private final WalletService walletService;

    // ==========================================
    // Create Parcel
    // ==========================================

    /**
     * Create a new parcel/shipment
     */
    @Transactional
    public ParcelDTO createParcel(CreateParcelRequest request, User currentUser) {
        // Get customer
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        // Get company
        CompanyAdmin company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", request.getCompanyId()));

        // Check if company is approved
        if (!company.getIsApproved()) {
            throw new BadRequestException("Selected company is not approved for operations");
        }

        // Generate unique tracking number
        String trackingNumber = generateUniqueTrackingNumber();

        // Generate OTPs for pickup and delivery
        String pickupOtp = otpUtil.generateOtp();
        String deliveryOtp = otpUtil.generateOtp();

        // Calculate pricing
        BigDecimal distanceKm = request.getDistanceKm() != null ? request.getDistanceKm() : new BigDecimal("10");
        BigDecimal weightKg = request.getWeightKg() != null ? request.getWeightKg() : BigDecimal.ONE;

        BigDecimal basePrice = calculatePrice(company, distanceKm, weightKg);
        BigDecimal discountAmount = BigDecimal.ZERO; // Will be set if group shipment
        BigDecimal priceAfterDiscount = basePrice.subtract(discountAmount);
        // Add 18% GST to get final price (matching Razorpay charge)
        BigDecimal gstAmount = priceAfterDiscount.multiply(new BigDecimal("0.18"));
        BigDecimal finalPrice = priceAfterDiscount.add(gstAmount);

        // Calculate estimated delivery
        LocalDateTime estimatedDelivery = calculateEstimatedDelivery(
                request.getPickupCity(), request.getDeliveryCity());

        // Create parcel
        Parcel parcel = Parcel.builder()
                .trackingNumber(trackingNumber)
                .customer(customer)
                .company(company)
                .groupShipmentId(request.getGroupShipmentId())
                // Pickup details
                .pickupName(request.getPickupName())
                .pickupPhone(request.getPickupPhone())
                .pickupAddress(request.getPickupAddress())
                .pickupCity(request.getPickupCity())
                .pickupState(request.getPickupState())
                .pickupPincode(request.getPickupPincode())
                .pickupLatitude(request.getPickupLatitude())
                .pickupLongitude(request.getPickupLongitude())
                // Delivery details
                .deliveryName(request.getDeliveryName())
                .deliveryPhone(request.getDeliveryPhone())
                .deliveryAddress(request.getDeliveryAddress())
                .deliveryCity(request.getDeliveryCity())
                .deliveryState(request.getDeliveryState())
                .deliveryPincode(request.getDeliveryPincode())
                .deliveryLatitude(request.getDeliveryLatitude())
                .deliveryLongitude(request.getDeliveryLongitude())
                // Package details
                .packageType(request.getPackageType() != null ? request.getPackageType() : PackageType.SMALL)
                .weightKg(weightKg)
                .dimensions(request.getDimensions())
                .isFragile(request.getIsFragile() != null ? request.getIsFragile() : false)
                .specialInstructions(request.getSpecialInstructions())
                // Pricing
                .distanceKm(distanceKm)
                .basePrice(basePrice)
                .discountAmount(discountAmount)
                .finalPrice(finalPrice)
                // Status
                .status(ParcelStatus.PENDING)
                .pickupOtp(pickupOtp)
                .deliveryOtp(deliveryOtp)
                .estimatedDelivery(estimatedDelivery)
                .build();

        parcel = parcelRepository.save(parcel);

        log.info("Created parcel {} for customer {} (PENDING - awaiting payment)", trackingNumber, customer.getId());

        // NOTE: Notifications are sent in confirmParcel() after payment is complete

        log.info("Pickup OTP for {}: {}", trackingNumber, pickupOtp);
        log.info("Delivery OTP for {}: {}", trackingNumber, deliveryOtp);

        return mapToDTO(parcel);
    }

    // ==========================================
    // Get Parcel
    // ==========================================

    /**
     * Get customer's parcel by tracking number
     * Directly queries by customer without using verifyParcelAccess
     */
    public ParcelDTO getCustomerParcelByTrackingNumber(String trackingNumber, User currentUser) {
        // Get customer by user ID (not by user reference which can have issues)
        Customer customer = customerRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        log.info("Looking up parcel {} for customer {}", trackingNumber, customer.getId());

        // Find parcel by tracking number
        Parcel parcel = parcelRepository.findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "trackingNumber", trackingNumber));

        // Verify customer owns this parcel
        if (!parcel.getCustomer().getId().equals(customer.getId())) {
            log.warn("Customer {} tried to access parcel {} owned by customer {}",
                    customer.getId(), trackingNumber, parcel.getCustomer().getId());
            throw new ForbiddenException("This parcel doesn't belong to your account");
        }

        log.info("Access granted for customer {} to parcel {}", customer.getId(), trackingNumber);
        return mapToDTO(parcel);
    }

    /**
     * Get parcel by ID
     */
    public ParcelDTO getParcelById(Long parcelId, User currentUser) {
        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        // Security check based on user type
        verifyParcelAccess(parcel, currentUser);

        return mapToDTO(parcel);
    }

    /**
     * Get public tracking (no auth required)
     * Used by WebSocket and public tracking page
     */
    public ParcelTrackingDTO getPublicTracking(String trackingNumber, String deliveryPhone) {
        Parcel parcel = parcelRepository.findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "trackingNumber", trackingNumber));

        // Optional: Verify delivery phone for security (if provided)
        if (deliveryPhone != null && !deliveryPhone.isEmpty()) {
            String last4 = deliveryPhone.length() >= 4 ? deliveryPhone.substring(deliveryPhone.length() - 4)
                    : deliveryPhone;

            String parcelLast4 = parcel.getDeliveryPhone().length() >= 4
                    ? parcel.getDeliveryPhone().substring(parcel.getDeliveryPhone().length() - 4)
                    : parcel.getDeliveryPhone();

            if (!last4.equals(parcelLast4)) {
                throw new BadRequestException("Invalid delivery phone number");
            }
        }

        return mapToTrackingDTO(parcel);
    }

    /**
     * Get parcel by tracking number (authenticated)
     */
    public ParcelDTO getParcelByTrackingNumber(String trackingNumber, User currentUser) {
        Parcel parcel = parcelRepository.findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "trackingNumber", trackingNumber));

        verifyParcelAccess(parcel, currentUser);

        return mapToDTO(parcel);
    }

    // ==========================================
    // Public Tracking
    // ==========================================

    /**
     * Public tracking - No authentication required
     * Uses tracking number + last 4 digits of receiver's phone
     */
    public ParcelTrackingDTO trackParcel(String trackingNumber, String phoneLastFour) {
        // Validate phone last four digits
        if (phoneLastFour == null || phoneLastFour.length() != 4 || !phoneLastFour.matches("\\d{4}")) {
            throw new BadRequestException("Please provide valid last 4 digits of receiver's phone number");
        }

        Parcel parcel = parcelRepository.findByTrackingNumberAndPhoneLastFour(trackingNumber, phoneLastFour)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Parcel not found. Please check tracking number and phone digits."));

        return mapToTrackingDTO(parcel);
    }

    // ==========================================
    // Customer Parcels
    // ==========================================

    /**
     * Get all parcels for current customer
     */
    public List<ParcelDTO> getCustomerParcels(User currentUser) {
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        List<Parcel> parcels = parcelRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId());

        return parcels.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get active parcels for customer
     */
    public List<ParcelDTO> getCustomerActiveParcels(User currentUser) {
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        List<ParcelStatus> activeStatuses = Arrays.asList(
                ParcelStatus.PENDING, ParcelStatus.CONFIRMED, ParcelStatus.ASSIGNED,
                ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT, ParcelStatus.OUT_FOR_DELIVERY);

        List<Parcel> parcels = parcelRepository.findByCustomerIdAndStatusIn(customer.getId(), activeStatuses);

        return parcels.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    // ==========================================
    // Company Parcels
    // ==========================================

    /**
     * Get all parcels for company
     */
    public List<ParcelDTO> getCompanyParcels(User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        List<Parcel> parcels = parcelRepository.findByCompanyIdOrderByCreatedAtDesc(company.getId());

        return parcels.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get parcels needing assignment
     */
    public List<ParcelDTO> getParcelsNeedingAssignment(User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        List<Parcel> parcels = parcelRepository.findParcelsNeedingAssignment(company.getId());

        return parcels.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    // ==========================================
    // Agent Parcels
    // ==========================================

    /**
     * Get active deliveries for agent
     */
    public List<ParcelDTO> getAgentActiveDeliveries(User currentUser) {
        DeliveryAgent agent = agentRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));

        List<Parcel> parcels = parcelRepository.findActiveDeliveriesForAgent(agent.getId());

        return parcels.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get all deliveries for agent
     */
    public List<ParcelDTO> getAgentAllDeliveries(User currentUser) {
        DeliveryAgent agent = agentRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));

        List<Parcel> parcels = parcelRepository.findByAgentIdOrderByCreatedAtDesc(agent.getId());

        return parcels.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    // ==========================================
    // Assign Agent
    // ==========================================

    /**
     * Assign agent to parcel (by company)
     */
    @Transactional
    public ParcelDTO assignAgent(Long parcelId, AssignAgentRequest request, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        // Verify parcel belongs to company
        if (!parcel.getCompany().getId().equals(company.getId())) {
            throw new ForbiddenException("Access denied");
        }

        // Verify status allows assignment
        if (parcel.getStatus() != ParcelStatus.CONFIRMED && parcel.getStatus() != ParcelStatus.PENDING) {
            throw new BadRequestException("Parcel cannot be assigned in current status: " + parcel.getStatus());
        }

        // Get and verify agent
        DeliveryAgent agent = agentRepository.findByIdAndCompanyId(request.getAgentId(), company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", request.getAgentId()));

        // Check agent availability
        if (!agent.getIsActive() || !agent.getIsAvailable()) {
            throw new BadRequestException("Agent is not available for assignment");
        }

        // Assign agent
        parcel.setAgent(agent);
        parcel.setStatus(ParcelStatus.ASSIGNED);
        parcel.setAssignedAt(LocalDateTime.now());

        parcel = parcelRepository.save(parcel);

        // Update agent's current orders count
        agent.setCurrentOrdersCount(agent.getCurrentOrdersCount() + 1);
        agentRepository.save(agent);

        log.info("Assigned agent {} to parcel {}", agent.getId(), parcel.getTrackingNumber());

        // Send notification to agent about new assignment
        notificationService.sendNewAssignmentToAgent(
                agent.getUser(),
                parcel.getTrackingNumber(),
                parcel.getPickupAddress() + ", " + parcel.getPickupCity(),
                parcel.getDeliveryAddress() + ", " + parcel.getDeliveryCity());

        // Notify customer that agent is assigned
        notificationService.sendAgentAssignedToCustomer(
                parcel.getCustomer().getUser(),
                parcel.getTrackingNumber(),
                agent.getFullName(),
                agent.getUser().getPhone());

        return mapToDTO(parcel);
    }

    // ==========================================
    // Update Status
    // ==========================================

    /**
     * Update parcel status (by agent or company)
     */
    @Transactional
    public ParcelDTO updateStatus(Long parcelId, UpdateParcelStatusRequest request, User currentUser) {
        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        verifyParcelAccess(parcel, currentUser);

        ParcelStatus newStatus = request.getStatus();
        ParcelStatus currentStatus = parcel.getStatus();

        // Validate status transition
        validateStatusTransition(currentStatus, newStatus);

        // Handle specific status updates
        switch (newStatus) {
            case CONFIRMED:
                parcel.setConfirmedAt(LocalDateTime.now());
                break;

            case PICKED_UP:
                // Verify pickup OTP
                if (request.getOtp() == null || !request.getOtp().equals(parcel.getPickupOtp())) {
                    throw new BadRequestException("Invalid pickup OTP");
                }
                parcel.setPickedUpAt(LocalDateTime.now());
                if (request.getPhotoUrl() != null) {
                    parcel.setPickupPhotoUrl(request.getPhotoUrl());
                }
                break;

            case DELIVERED:
                // Verify delivery OTP
                if (request.getOtp() == null || !request.getOtp().equals(parcel.getDeliveryOtp())) {
                    throw new BadRequestException("Invalid delivery OTP");
                }
                parcel.setDeliveredAt(LocalDateTime.now());
                if (request.getPhotoUrl() != null) {
                    parcel.setDeliveryPhotoUrl(request.getPhotoUrl());
                }
                if (request.getSignatureUrl() != null) {
                    parcel.setSignatureUrl(request.getSignatureUrl());
                }
                if (request.getNotes() != null) {
                    parcel.setDeliveryNotes(request.getNotes());
                }
                // Update agent stats
                if (parcel.getAgent() != null) {
                    DeliveryAgent agent = parcel.getAgent();
                    agent.setTotalDeliveries(agent.getTotalDeliveries() + 1);
                    agent.setCurrentOrdersCount(Math.max(0, agent.getCurrentOrdersCount() - 1));
                    agentRepository.save(agent);
                }
                // Update company stats
                CompanyAdmin company = parcel.getCompany();
                company.setTotalDeliveries(company.getTotalDeliveries() + 1);
                companyRepository.save(company);

                // Process earnings - creates Earning record and updates wallets
                walletService.processDeliveryEarnings(parcel);
                break;

            case CANCELLED:
                if (request.getCancellationReason() == null || request.getCancellationReason().isEmpty()) {
                    throw new BadRequestException("Cancellation reason is required");
                }
                parcel.setCancelledAt(LocalDateTime.now());
                parcel.setCancellationReason(request.getCancellationReason());
                // Release agent if assigned
                if (parcel.getAgent() != null) {
                    DeliveryAgent agent = parcel.getAgent();
                    agent.setCurrentOrdersCount(Math.max(0, agent.getCurrentOrdersCount() - 1));
                    agentRepository.save(agent);
                }
                break;

            default:
                break;
        }

        parcel.setStatus(newStatus);
        parcel = parcelRepository.save(parcel);

        log.info("Updated parcel {} status to {}", parcel.getTrackingNumber(), newStatus);

        // Send status notification to customer (sender)
        notificationService.sendDeliveryUpdate(
                parcel.getCustomer().getUser(),
                parcel.getTrackingNumber(),
                newStatus);

        // Send SMS to receiver for relevant statuses
        try {
            String receiverPhone = parcel.getDeliveryPhone();
            String receiverName = parcel.getDeliveryName();
            String trackingNumber = parcel.getTrackingNumber();
            String agentName = parcel.getAgent() != null ? parcel.getAgent().getFullName() : "Agent";

            switch (newStatus) {
                case PICKED_UP:
                    // Notify receiver that package is picked up
                    smsService.sendPickedUpToReceiver(receiverPhone, trackingNumber, receiverName, agentName);
                    break;
                case IN_TRANSIT:
                    // Notify receiver that package is in transit
                    smsService.sendInTransitToReceiver(receiverPhone, trackingNumber, receiverName);
                    break;
                case OUT_FOR_DELIVERY:
                    // Notify receiver with delivery OTP
                    smsService.sendDeliveryNotification(receiverPhone, trackingNumber, receiverName,
                            parcel.getDeliveryOtp());
                    break;
                default:
                    break;
            }
        } catch (Exception e) {
            // Log but don't fail the status update if SMS fails
            log.warn("Failed to send SMS to receiver for parcel {}: {}", parcel.getTrackingNumber(), e.getMessage());
        }

        return mapToDTO(parcel);
    }

    /**
     * Confirm parcel (after payment)
     */
    @Transactional
    public ParcelDTO confirmParcel(Long parcelId, User currentUser) {
        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        // Verify customer owns this parcel
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        if (!parcel.getCustomer().getId().equals(customer.getId())) {
            throw new ForbiddenException("Access denied");
        }

        if (parcel.getStatus() != ParcelStatus.PENDING) {
            throw new BadRequestException("Parcel is not in pending status");
        }

        parcel.setStatus(ParcelStatus.CONFIRMED);
        parcel.setConfirmedAt(LocalDateTime.now());
        parcel = parcelRepository.save(parcel);

        log.info("Confirmed parcel {} after payment", parcel.getTrackingNumber());

        // Send SMS to sender with tracking number and OTP info
        notificationService.sendOrderConfirmation(
                currentUser,
                parcel.getTrackingNumber(),
                parcel.getDeliveryAddress() + ", " + parcel.getDeliveryCity());

        // Send notification to company about new shipment
        notificationService.sendNewShipmentToCompany(
                parcel.getCompany().getUser(),
                parcel.getTrackingNumber(),
                parcel.getPickupCity(),
                parcel.getDeliveryCity());

        return mapToDTO(parcel);
    }

    // ==========================================
    // Cancel Parcel
    // ==========================================

    /**
     * Cancel parcel (by customer)
     */
    @Transactional
    public ParcelDTO cancelParcel(Long parcelId, String reason, User currentUser) {
        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        if (!parcel.getCustomer().getId().equals(customer.getId())) {
            throw new ForbiddenException("Access denied");
        }

        // Can only cancel if not yet picked up
        if (parcel.getStatus() == ParcelStatus.PICKED_UP ||
                parcel.getStatus() == ParcelStatus.IN_TRANSIT ||
                parcel.getStatus() == ParcelStatus.OUT_FOR_DELIVERY ||
                parcel.getStatus() == ParcelStatus.DELIVERED) {
            throw new BadRequestException("Cannot cancel parcel after pickup");
        }

        parcel.setStatus(ParcelStatus.CANCELLED);
        parcel.setCancelledAt(LocalDateTime.now());
        parcel.setCancellationReason(reason != null ? reason : "Cancelled by customer");

        // Release agent if assigned
        if (parcel.getAgent() != null) {
            DeliveryAgent agent = parcel.getAgent();
            agent.setCurrentOrdersCount(Math.max(0, agent.getCurrentOrdersCount() - 1));
            agentRepository.save(agent);
        }

        parcel = parcelRepository.save(parcel);

        log.info("Cancelled parcel {}", parcel.getTrackingNumber());

        return mapToDTO(parcel);
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private String generateUniqueTrackingNumber() {
        String trackingNumber;
        int attempts = 0;
        do {
            trackingNumber = otpUtil.generateTrackingNumber();
            attempts++;
            if (attempts > 10) {
                throw new RuntimeException("Failed to generate unique tracking number");
            }
        } while (parcelRepository.existsByTrackingNumber(trackingNumber));
        return trackingNumber;
    }

    private BigDecimal calculatePrice(CompanyAdmin company, BigDecimal distanceKm, BigDecimal weightKg) {
        BigDecimal distancePrice = company.getBaseRatePerKm().multiply(distanceKm);
        BigDecimal weightPrice = company.getBaseRatePerKg().multiply(weightKg);
        return distancePrice.add(weightPrice).setScale(2, RoundingMode.HALF_UP);
    }

    private LocalDateTime calculateEstimatedDelivery(String pickupCity, String deliveryCity) {
        // Same city: 1 day, Different city: 2-3 days
        int days = pickupCity.equalsIgnoreCase(deliveryCity) ? 1 : 2;
        return LocalDateTime.now().plusDays(days);
    }

    private void verifyParcelAccess(Parcel parcel, User currentUser) {
        UserType userType = currentUser.getUserType();
        log.info("Verifying parcel access: parcelId={}, trackingNumber={}, userType={}, userId={}",
                parcel.getId(), parcel.getTrackingNumber(), userType, currentUser.getId());

        switch (userType) {
            case CUSTOMER -> {
                Customer customer = customerRepository.findByUserId(currentUser.getId())
                        .orElseThrow(() -> {
                            log.warn("Customer profile not found for user: {}", currentUser.getId());
                            return new ForbiddenException("Access denied - no customer profile");
                        });
                log.info("Checking customer access: parcel.customerId={}, requestingCustomerId={}",
                        parcel.getCustomer().getId(), customer.getId());
                if (!parcel.getCustomer().getId().equals(customer.getId())) {
                    log.warn("Customer {} tried to access parcel {} owned by customer {}",
                            customer.getId(), parcel.getTrackingNumber(), parcel.getCustomer().getId());
                    throw new ForbiddenException("Access denied - parcel belongs to another customer");
                }
                log.info("Access GRANTED for customer {} to parcel {}", customer.getId(), parcel.getTrackingNumber());
            }
            case COMPANY_ADMIN -> {
                CompanyAdmin company = companyRepository.findByUser(currentUser)
                        .orElseThrow(() -> new ForbiddenException("Access denied"));
                if (!parcel.getCompany().getId().equals(company.getId())) {
                    throw new ForbiddenException("Access denied");
                }
            }
            case DELIVERY_AGENT -> {
                DeliveryAgent agent = agentRepository.findByUser(currentUser)
                        .orElseThrow(() -> new ForbiddenException("Access denied"));
                if (parcel.getAgent() == null || !parcel.getAgent().getId().equals(agent.getId())) {
                    throw new ForbiddenException("Access denied");
                }
            }
            case SUPER_ADMIN -> {
                // Super admin can access all parcels
            }
            default -> throw new ForbiddenException("Access denied");
        }
    }

    private void validateStatusTransition(ParcelStatus from, ParcelStatus to) {
        // Define valid transitions
        boolean valid = false;

        switch (from) {
            case PENDING:
                valid = (to == ParcelStatus.CONFIRMED || to == ParcelStatus.CANCELLED);
                break;
            case CONFIRMED:
                valid = (to == ParcelStatus.ASSIGNED || to == ParcelStatus.CANCELLED);
                break;
            case ASSIGNED:
                valid = (to == ParcelStatus.PICKED_UP || to == ParcelStatus.CANCELLED);
                break;
            case PICKED_UP:
                valid = (to == ParcelStatus.IN_TRANSIT || to == ParcelStatus.OUT_FOR_DELIVERY);
                break;
            case IN_TRANSIT:
                valid = (to == ParcelStatus.OUT_FOR_DELIVERY);
                break;
            case OUT_FOR_DELIVERY:
                valid = (to == ParcelStatus.DELIVERED || to == ParcelStatus.RETURNED);
                break;
            case DELIVERED:
            case CANCELLED:
            case RETURNED:
                valid = false; // Terminal states
                break;
        }

        if (!valid) {
            throw new BadRequestException("Invalid status transition from " + from + " to " + to);
        }
    }

    // ==========================================
    // Mapper Methods
    // ==========================================

    public ParcelDTO mapToDTO(Parcel parcel) {
        return ParcelDTO.builder()
                .id(parcel.getId())
                .trackingNumber(parcel.getTrackingNumber())
                .customerId(parcel.getCustomer().getId())
                .customerName(parcel.getCustomer().getFullName())
                .companyId(parcel.getCompany().getId())
                .companyName(parcel.getCompany().getCompanyName())
                .agentId(parcel.getAgent() != null ? parcel.getAgent().getId() : null)
                .agentName(parcel.getAgent() != null ? parcel.getAgent().getFullName() : null)
                .groupShipmentId(parcel.getGroupShipmentId())
                // Pickup
                .pickupName(parcel.getPickupName())
                .pickupPhone(parcel.getPickupPhone())
                .pickupAddress(parcel.getPickupAddress())
                .pickupCity(parcel.getPickupCity())
                .pickupState(parcel.getPickupState())
                .pickupPincode(parcel.getPickupPincode())
                .pickupLatitude(parcel.getPickupLatitude())
                .pickupLongitude(parcel.getPickupLongitude())
                // Delivery
                .deliveryName(parcel.getDeliveryName())
                .deliveryPhone(parcel.getDeliveryPhone())
                .deliveryAddress(parcel.getDeliveryAddress())
                .deliveryCity(parcel.getDeliveryCity())
                .deliveryState(parcel.getDeliveryState())
                .deliveryPincode(parcel.getDeliveryPincode())
                .deliveryLatitude(parcel.getDeliveryLatitude())
                .deliveryLongitude(parcel.getDeliveryLongitude())
                // Package
                .packageType(parcel.getPackageType())
                .weightKg(parcel.getWeightKg())
                .dimensions(parcel.getDimensions())
                .isFragile(parcel.getIsFragile())
                .specialInstructions(parcel.getSpecialInstructions())
                // Pricing
                .distanceKm(parcel.getDistanceKm())
                .basePrice(parcel.getBasePrice())
                .discountAmount(parcel.getDiscountAmount())
                .finalPrice(parcel.getFinalPrice())
                // Calculate tax and total (18% GST)
                .taxAmount(parcel.getFinalPrice() != null
                        ? parcel.getFinalPrice().multiply(new BigDecimal("0.18")).setScale(2,
                                java.math.RoundingMode.HALF_UP)
                        : BigDecimal.ZERO)
                .totalAmount(parcel.getFinalPrice() != null
                        ? parcel.getFinalPrice().multiply(new BigDecimal("1.18")).setScale(2,
                                java.math.RoundingMode.HALF_UP)
                        : BigDecimal.ZERO)
                // Status
                .status(parcel.getStatus())
                .paymentStatus(parcel.getPaymentStatus())
                // Get payment method from Payment entity
                .paymentMethod(paymentRepository.findByParcelId(parcel.getId())
                        .map(p -> p.getPaymentMethod() != null ? p.getPaymentMethod().name() : "RAZORPAY")
                        .orElse(null))
                .pickupOtp(parcel.getPickupOtp())
                .deliveryOtp(parcel.getDeliveryOtp())
                .pickupPhotoUrl(parcel.getPickupPhotoUrl())
                .deliveryPhotoUrl(parcel.getDeliveryPhotoUrl())
                .signatureUrl(parcel.getSignatureUrl())
                .deliveryNotes(parcel.getDeliveryNotes())
                // Timestamps
                .estimatedDelivery(parcel.getEstimatedDelivery())
                .confirmedAt(parcel.getConfirmedAt())
                .assignedAt(parcel.getAssignedAt())
                .pickedUpAt(parcel.getPickedUpAt())
                .deliveredAt(parcel.getDeliveredAt())
                .cancelledAt(parcel.getCancelledAt())
                .cancellationReason(parcel.getCancellationReason())
                .createdAt(parcel.getCreatedAt())
                .updatedAt(parcel.getUpdatedAt())
                // Rating status
                .hasRated(ratingRepository.existsByParcelId(parcel.getId()))
                // Agent details for tracking
                .agentPhone(parcel.getAgent() != null ? parcel.getAgent().getUser().getPhone() : null)
                .agentVehicleType(parcel.getAgent() != null && parcel.getAgent().getVehicleType() != null
                        ? parcel.getAgent().getVehicleType().name()
                        : null)
                .agentVehicleNumber(parcel.getAgent() != null ? parcel.getAgent().getVehicleNumber() : null)
                // Agent rating - fetch from rating repository
                .agentRating(
                        parcel.getAgent() != null ? ratingRepository.getAverageAgentRating(parcel.getAgent().getId())
                                : null)
                .agentTotalRatings(
                        parcel.getAgent() != null && ratingRepository.countByAgentId(parcel.getAgent().getId()) != null
                                ? ratingRepository.countByAgentId(parcel.getAgent().getId()).intValue()
                                : 0)
                // Company rating - fetch from rating repository
                .companyRating(ratingRepository.getAverageCompanyRating(parcel.getCompany().getId()))
                .companyTotalRatings(ratingRepository.countByCompanyId(parcel.getCompany().getId()) != null
                        ? ratingRepository.countByCompanyId(parcel.getCompany().getId()).intValue()
                        : 0)
                .build();
    }

    public ParcelTrackingDTO mapToTrackingDTO(Parcel parcel) {
        // Build timeline
        List<ParcelTrackingDTO.TrackingEvent> timeline = buildTimeline(parcel);

        // Agent info (if assigned)
        AgentPublicDTO agentDTO = null;
        if (parcel.getAgent() != null) {
            DeliveryAgent agent = parcel.getAgent();
            agentDTO = AgentPublicDTO.builder()
                    .id(agent.getId())
                    .fullName(agent.getFullName())
                    .phone(agent.getUser().getPhone())
                    .vehicleType(agent.getVehicleType())
                    .vehicleNumber(agent.getVehicleNumber())
                    .ratingAvg(agent.getRatingAvg())
                    .currentLatitude(agent.getCurrentLatitude())
                    .currentLongitude(agent.getCurrentLongitude())
                    .build();
        }

        return ParcelTrackingDTO.builder()
                .trackingNumber(parcel.getTrackingNumber())
                .status(parcel.getStatus())
                .statusDescription(getStatusDescription(parcel.getStatus()))
                .pickupCity(parcel.getPickupCity())
                .deliveryCity(parcel.getDeliveryCity())
                .deliveryName(parcel.getDeliveryName())
                .companyName(parcel.getCompany().getCompanyName())
                .agent(agentDTO)
                .estimatedDelivery(parcel.getEstimatedDelivery())
                .createdAt(parcel.getCreatedAt())
                .pickedUpAt(parcel.getPickedUpAt())
                .deliveredAt(parcel.getDeliveredAt())
                .timeline(timeline)
                .build();
    }

    private List<ParcelTrackingDTO.TrackingEvent> buildTimeline(Parcel parcel) {
        List<ParcelTrackingDTO.TrackingEvent> timeline = new ArrayList<>();
        ParcelStatus currentStatus = parcel.getStatus();

        // Order Placed
        timeline.add(ParcelTrackingDTO.TrackingEvent.builder()
                .status(ParcelStatus.PENDING)
                .description("Order placed")
                .location(parcel.getPickupCity())
                .timestamp(parcel.getCreatedAt())
                .isCompleted(true)
                .build());

        // Confirmed
        timeline.add(ParcelTrackingDTO.TrackingEvent.builder()
                .status(ParcelStatus.CONFIRMED)
                .description("Order confirmed")
                .location(parcel.getPickupCity())
                .timestamp(parcel.getConfirmedAt())
                .isCompleted(parcel.getConfirmedAt() != null)
                .build());

        // Assigned
        timeline.add(ParcelTrackingDTO.TrackingEvent.builder()
                .status(ParcelStatus.ASSIGNED)
                .description("Agent assigned for pickup")
                .location(parcel.getPickupCity())
                .timestamp(parcel.getAssignedAt())
                .isCompleted(parcel.getAssignedAt() != null)
                .build());

        // Picked Up
        timeline.add(ParcelTrackingDTO.TrackingEvent.builder()
                .status(ParcelStatus.PICKED_UP)
                .description("Package picked up")
                .location(parcel.getPickupCity())
                .timestamp(parcel.getPickedUpAt())
                .isCompleted(parcel.getPickedUpAt() != null)
                .build());

        // In Transit
        boolean inTransitCompleted = currentStatus == ParcelStatus.IN_TRANSIT ||
                currentStatus == ParcelStatus.OUT_FOR_DELIVERY ||
                currentStatus == ParcelStatus.DELIVERED;
        timeline.add(ParcelTrackingDTO.TrackingEvent.builder()
                .status(ParcelStatus.IN_TRANSIT)
                .description("In transit")
                .location(null)
                .timestamp(inTransitCompleted ? parcel.getPickedUpAt() : null)
                .isCompleted(inTransitCompleted)
                .build());

        // Out for Delivery
        boolean outForDeliveryCompleted = currentStatus == ParcelStatus.OUT_FOR_DELIVERY ||
                currentStatus == ParcelStatus.DELIVERED;
        timeline.add(ParcelTrackingDTO.TrackingEvent.builder()
                .status(ParcelStatus.OUT_FOR_DELIVERY)
                .description("Out for delivery")
                .location(parcel.getDeliveryCity())
                .timestamp(null)
                .isCompleted(outForDeliveryCompleted)
                .build());

        // Delivered
        timeline.add(ParcelTrackingDTO.TrackingEvent.builder()
                .status(ParcelStatus.DELIVERED)
                .description("Delivered")
                .location(parcel.getDeliveryCity())
                .timestamp(parcel.getDeliveredAt())
                .isCompleted(parcel.getDeliveredAt() != null)
                .build());

        return timeline;
    }

    private String getStatusDescription(ParcelStatus status) {
        switch (status) {
            case PENDING:
                return "Order placed, awaiting confirmation";
            case CONFIRMED:
                return "Payment confirmed, ready for pickup";
            case ASSIGNED:
                return "Agent assigned, pickup scheduled";
            case PICKED_UP:
                return "Package picked up from sender";
            case IN_TRANSIT:
                return "Package in transit";
            case OUT_FOR_DELIVERY:
                return "Out for delivery";
            case DELIVERED:
                return "Successfully delivered";
            case CANCELLED:
                return "Order cancelled";
            case RETURNED:
                return "Package returned to sender";
            default:
                return status.name();
        }
    }
}