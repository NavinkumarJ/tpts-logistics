package com.tpts.service;

import com.tpts.dto.request.AgentResponseDTO;
import com.tpts.dto.request.CreateDeliveryRequestDTO;
import com.tpts.dto.request.ReassignAgentDTO;
import com.tpts.dto.response.DeliveryRequestDTO;
import com.tpts.entity.*;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for Delivery Request operations
 * Handles agent assignment workflow with accept/reject logic
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryRequestService {

    private final DeliveryRequestRepository deliveryRequestRepository;
    private final ParcelRepository parcelRepository;
    private final CompanyAdminRepository companyRepository;
    private final DeliveryAgentRepository agentRepository;
    private final NotificationService notificationService;

    // ==========================================
    // Create Delivery Request (Assign Agent)
    // ==========================================

    /**
     * Create a delivery request (assign agent to parcel)
     * Called by company admin
     */
    @Transactional
    public DeliveryRequestDTO createDeliveryRequest(CreateDeliveryRequestDTO request, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        // Get parcel
        Parcel parcel = parcelRepository.findById(request.getParcelId())
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", request.getParcelId()));

        // Verify company owns the parcel
        if (!parcel.getCompany().getId().equals(company.getId())) {
            throw new ForbiddenException("Access denied");
        }

        // Verify parcel is in valid state for assignment
        if (parcel.getStatus() != ParcelStatus.PENDING && parcel.getStatus() != ParcelStatus.CONFIRMED) {
            throw new BadRequestException("Parcel cannot be assigned in current status: " + parcel.getStatus());
        }

        // Check if there's already a pending/accepted request
        boolean hasActiveRequest = deliveryRequestRepository.existsByParcelIdAndAssignmentStatusIn(
                request.getParcelId(),
                Arrays.asList(AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED));

        if (hasActiveRequest) {
            throw new BadRequestException("Parcel already has an active delivery request");
        }

        // Get and verify agent
        DeliveryAgent agent = agentRepository.findByIdAndCompanyId(request.getAgentId(), company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", request.getAgentId()));

        // Check agent availability
        if (!agent.getIsActive()) {
            throw new BadRequestException("Agent account is not active");
        }
        if (!agent.getIsAvailable()) {
            throw new BadRequestException("Agent is not available for deliveries");
        }

        // Calculate estimated earnings if not provided
        BigDecimal estimatedEarnings = request.getEstimatedEarnings();
        if (estimatedEarnings == null && parcel.getDistanceKm() != null) {
            // Default: ₹10 per km
            estimatedEarnings = parcel.getDistanceKm().multiply(BigDecimal.TEN);
        }

        // Create delivery request
        DeliveryRequest deliveryRequest = DeliveryRequest.builder()
                .parcel(parcel)
                .company(company)
                .assignedAgent(agent)
                .assignmentStatus(AssignmentStatus.PENDING)
                .assignedAt(LocalDateTime.now())
                .priority(request.getPriority() != null ? request.getPriority() : 5)
                .estimatedEarnings(estimatedEarnings)
                .companyNotes(request.getCompanyNotes())
                .attemptCount(1)
                .build();

        deliveryRequest = deliveryRequestRepository.save(deliveryRequest);

        // Update parcel with agent (tentatively)
        parcel.setAgent(agent);
        parcelRepository.save(parcel);

        log.info("Created delivery request {} for parcel {} assigned to agent {}",
                deliveryRequest.getId(), parcel.getTrackingNumber(), agent.getId());

        // Send notification to agent about new assignment
        notificationService.sendNewAssignmentToAgent(
                agent.getUser(),
                parcel.getTrackingNumber(),
                parcel.getPickupAddress() + ", " + parcel.getPickupCity(),
                parcel.getDeliveryAddress() + ", " + parcel.getDeliveryCity());

        return mapToDTO(deliveryRequest);
    }

    // ==========================================
    // Agent Response (Accept/Reject)
    // ==========================================

    /**
     * Agent accepts or rejects a delivery request
     */
    @Transactional
    public DeliveryRequestDTO agentResponse(Long requestId, AgentResponseDTO response, User currentUser) {
        DeliveryAgent agent = agentRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));

        DeliveryRequest deliveryRequest = deliveryRequestRepository.findByIdAndAgentId(requestId, agent.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Delivery request not found or not assigned to you"));

        // Verify request is pending
        if (!deliveryRequest.canRespond()) {
            throw new BadRequestException("Cannot respond to this request. Current status: " +
                    deliveryRequest.getAssignmentStatus());
        }

        Parcel parcel = deliveryRequest.getParcel();

        if (response.getAccept()) {
            // Agent accepts
            deliveryRequest.setAssignmentStatus(AssignmentStatus.ACCEPTED);
            deliveryRequest.setAgentResponseAt(LocalDateTime.now());

            // Update parcel status
            parcel.setStatus(ParcelStatus.ASSIGNED);
            parcel.setAssignedAt(LocalDateTime.now());

            // Increment agent's current order count
            agent.setCurrentOrdersCount(agent.getCurrentOrdersCount() + 1);
            agentRepository.save(agent);

            log.info("Agent {} accepted delivery request {} for parcel {}",
                    agent.getId(), requestId, parcel.getTrackingNumber());

        } else {
            // Agent rejects
            if (response.getRejectionReason() == null || response.getRejectionReason().isBlank()) {
                throw new BadRequestException("Rejection reason is required");
            }

            deliveryRequest.setAssignmentStatus(AssignmentStatus.REJECTED);
            deliveryRequest.setAgentResponseAt(LocalDateTime.now());
            deliveryRequest.setRejectionReason(response.getRejectionReason());

            // Clear agent from parcel
            parcel.setAgent(null);

            // Mark as needing reassignment
            deliveryRequest.setAssignmentStatus(AssignmentStatus.REASSIGN_NEEDED);

            log.info("Agent {} rejected delivery request {} for parcel {}. Reason: {}",
                    agent.getId(), requestId, parcel.getTrackingNumber(), response.getRejectionReason());

            // Send notification to company about rejection
            notificationService.sendAgentRejectedAssignment(
                    deliveryRequest.getCompany().getUser(),
                    agent.getFullName(),
                    parcel.getTrackingNumber(),
                    response.getRejectionReason());
        }

        parcelRepository.save(parcel);
        deliveryRequest = deliveryRequestRepository.save(deliveryRequest);

        return mapToDTO(deliveryRequest);
    }

    // ==========================================
    // Reassign to Different Agent
    // ==========================================

    /**
     * Reassign a rejected/pending request to a new agent
     */
    @Transactional
    public DeliveryRequestDTO reassignAgent(Long requestId, ReassignAgentDTO request, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        DeliveryRequest deliveryRequest = deliveryRequestRepository.findByIdAndCompanyId(requestId, company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Delivery request not found"));

        // Can reassign if REASSIGN_NEEDED, REJECTED, or PENDING
        AssignmentStatus status = deliveryRequest.getAssignmentStatus();
        if (status != AssignmentStatus.REASSIGN_NEEDED &&
                status != AssignmentStatus.REJECTED &&
                status != AssignmentStatus.PENDING) {
            throw new BadRequestException("Cannot reassign request in current status: " + status);
        }

        // Get and verify new agent
        DeliveryAgent newAgent = agentRepository.findByIdAndCompanyId(request.getNewAgentId(), company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", request.getNewAgentId()));

        // Check new agent availability
        if (!newAgent.getIsActive() || !newAgent.getIsAvailable()) {
            throw new BadRequestException("Selected agent is not available");
        }

        // Update delivery request
        deliveryRequest.setAssignedAgent(newAgent);
        deliveryRequest.setAssignmentStatus(AssignmentStatus.PENDING);
        deliveryRequest.setAssignedAt(LocalDateTime.now());
        deliveryRequest.setAgentResponseAt(null);
        deliveryRequest.setRejectionReason(null);
        deliveryRequest.setAttemptCount(deliveryRequest.getAttemptCount() + 1);

        if (request.getEstimatedEarnings() != null) {
            deliveryRequest.setEstimatedEarnings(request.getEstimatedEarnings());
        }
        if (request.getCompanyNotes() != null) {
            deliveryRequest.setCompanyNotes(request.getCompanyNotes());
        }

        deliveryRequest = deliveryRequestRepository.save(deliveryRequest);

        // Update parcel with new agent
        Parcel parcel = deliveryRequest.getParcel();
        parcel.setAgent(newAgent);
        parcelRepository.save(parcel);

        log.info("Reassigned delivery request {} to new agent {}. Attempt #{}",
                requestId, newAgent.getId(), deliveryRequest.getAttemptCount());

        // Send notification to new agent
        notificationService.sendNewAssignmentToAgent(
                newAgent.getUser(),
                parcel.getTrackingNumber(),
                parcel.getPickupAddress() + ", " + parcel.getPickupCity(),
                parcel.getDeliveryAddress() + ", " + parcel.getDeliveryCity());

        return mapToDTO(deliveryRequest);
    }

    // ==========================================
    // Get Delivery Requests
    // ==========================================

    /**
     * Get delivery request by ID
     */
    public DeliveryRequestDTO getDeliveryRequestById(Long requestId, User currentUser) {
        DeliveryRequest deliveryRequest = deliveryRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery request", "id", requestId));

        // Verify access
        verifyAccess(deliveryRequest, currentUser);

        return mapToDTO(deliveryRequest);
    }

    /**
     * Get all delivery requests for company
     */
    public List<DeliveryRequestDTO> getCompanyDeliveryRequests(User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        List<DeliveryRequest> requests = deliveryRequestRepository
                .findByCompanyIdOrderByCreatedAtDesc(company.getId());

        return requests.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get delivery requests by status for company
     */
    public List<DeliveryRequestDTO> getCompanyRequestsByStatus(AssignmentStatus status, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        List<DeliveryRequest> requests = deliveryRequestRepository
                .findByCompanyIdAndAssignmentStatus(company.getId(), status);

        return requests.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get requests needing reassignment
     */
    public List<DeliveryRequestDTO> getRequestsNeedingReassignment(User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        List<DeliveryRequest> requests = deliveryRequestRepository
                .findRequestsNeedingReassignment(company.getId());

        return requests.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get pending requests for agent
     */
    public List<DeliveryRequestDTO> getAgentPendingRequests(User currentUser) {
        DeliveryAgent agent = agentRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));

        List<DeliveryRequest> requests = deliveryRequestRepository
                .findPendingRequestsForAgent(agent.getId());

        return requests.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Get all requests for agent
     */
    public List<DeliveryRequestDTO> getAgentAllRequests(User currentUser) {
        DeliveryAgent agent = agentRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));

        List<DeliveryRequest> requests = deliveryRequestRepository
                .findByAssignedAgentIdOrderByCreatedAtDesc(agent.getId());

        return requests.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    // ==========================================
    // Cancel Delivery Request
    // ==========================================

    /**
     * Cancel a delivery request
     */
    @Transactional
    public DeliveryRequestDTO cancelDeliveryRequest(Long requestId, User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        DeliveryRequest deliveryRequest = deliveryRequestRepository.findByIdAndCompanyId(requestId, company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Delivery request not found"));

        // Can only cancel if pending
        if (deliveryRequest.getAssignmentStatus() != AssignmentStatus.PENDING) {
            throw new BadRequestException("Can only cancel pending requests. Current status: " +
                    deliveryRequest.getAssignmentStatus());
        }

        deliveryRequest.setAssignmentStatus(AssignmentStatus.CANCELLED);

        // Clear agent from parcel
        Parcel parcel = deliveryRequest.getParcel();
        parcel.setAgent(null);
        parcelRepository.save(parcel);

        deliveryRequest = deliveryRequestRepository.save(deliveryRequest);

        log.info("Cancelled delivery request {} for parcel {}", requestId, parcel.getTrackingNumber());

        return mapToDTO(deliveryRequest);
    }

    // ==========================================
    // Mark as Completed
    // ==========================================

    /**
     * Mark delivery request as completed (called when parcel is delivered)
     */
    @Transactional
    public void markCompleted(Long parcelId) {
        deliveryRequestRepository.findByParcelId(parcelId).ifPresent(request -> {
            if (request.getAssignmentStatus() == AssignmentStatus.ACCEPTED) {
                request.setAssignmentStatus(AssignmentStatus.COMPLETED);
                request.setCompletedAt(LocalDateTime.now());
                deliveryRequestRepository.save(request);

                log.info("Marked delivery request {} as completed", request.getId());
            }
        });
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private void verifyAccess(DeliveryRequest request, User currentUser) {
        UserType userType = currentUser.getUserType();

        switch (userType) {
            case COMPANY_ADMIN -> {
                CompanyAdmin company = companyRepository.findByUser(currentUser)
                        .orElseThrow(() -> new ForbiddenException("Access denied"));
                if (!request.getCompany().getId().equals(company.getId())) {
                    throw new ForbiddenException("Access denied");
                }
            }
            case DELIVERY_AGENT -> {
                DeliveryAgent agent = agentRepository.findByUser(currentUser)
                        .orElseThrow(() -> new ForbiddenException("Access denied"));
                if (request.getAssignedAgent() == null ||
                        !request.getAssignedAgent().getId().equals(agent.getId())) {
                    throw new ForbiddenException("Access denied");
                }
            }
            case SUPER_ADMIN -> {
                // Super admin can access all
            }
            default -> throw new ForbiddenException("Access denied");
        }
    }

    private DeliveryRequestDTO mapToDTO(DeliveryRequest request) {
        Parcel parcel = request.getParcel();
        DeliveryAgent agent = request.getAssignedAgent();

        return DeliveryRequestDTO.builder()
                .id(request.getId())
                .parcelId(parcel.getId())
                .trackingNumber(parcel.getTrackingNumber())
                .parcelStatus(parcel.getStatus())
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
                .packageType(parcel.getPackageType() != null ? parcel.getPackageType().name() : null)
                .weightKg(parcel.getWeightKg())
                .isFragile(parcel.getIsFragile())
                .specialInstructions(parcel.getSpecialInstructions())
                .distanceKm(parcel.getDistanceKm())
                .estimatedEarnings(request.getEstimatedEarnings())
                .companyId(request.getCompany().getId())
                .companyName(request.getCompany().getCompanyName())
                .assignedAgentId(agent != null ? agent.getId() : null)
                .assignedAgentName(agent != null ? agent.getFullName() : null)
                .assignedAgentPhone(agent != null ? agent.getUser().getPhone() : null)
                .assignmentStatus(request.getAssignmentStatus())
                .priority(request.getPriority())
                .attemptCount(request.getAttemptCount())
                .companyNotes(request.getCompanyNotes())
                .rejectionReason(request.getRejectionReason())
                .assignedAt(request.getAssignedAt())
                .agentResponseAt(request.getAgentResponseAt())
                .completedAt(request.getCompletedAt())
                .createdAt(request.getCreatedAt())
                .canRespond(request.canRespond())
                .needsReassignment(request.needsReassignment())
                .build();
    }
}