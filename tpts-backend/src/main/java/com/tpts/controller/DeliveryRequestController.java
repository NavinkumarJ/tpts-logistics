package com.tpts.controller;

import com.tpts.dto.request.AgentResponseDTO;
import com.tpts.dto.request.CreateDeliveryRequestDTO;
import com.tpts.dto.request.ReassignAgentDTO;
import com.tpts.dto.response.ApiResponse;
import com.tpts.dto.response.DeliveryRequestDTO;
import com.tpts.entity.AssignmentStatus;
import com.tpts.entity.User;
import com.tpts.service.DeliveryRequestService;
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
 * Delivery Request Controller
 * Handles agent assignment workflow with accept/reject logic
 *
 * Company Admin Endpoints:
 * - POST   /api/delivery-requests                    - Create/assign delivery request
 * - GET    /api/delivery-requests/company            - Get all company requests
 * - GET    /api/delivery-requests/company/status/{s} - Get by status
 * - GET    /api/delivery-requests/company/reassign   - Get requests needing reassignment
 * - GET    /api/delivery-requests/{id}               - Get by ID
 * - PATCH  /api/delivery-requests/{id}/reassign      - Reassign to new agent
 * - DELETE /api/delivery-requests/{id}               - Cancel request
 *
 * Agent Endpoints:
 * - GET    /api/delivery-requests/agent/pending      - Get pending requests
 * - GET    /api/delivery-requests/agent/all          - Get all requests
 * - PATCH  /api/delivery-requests/{id}/respond       - Accept or reject
 */
@RestController
@RequestMapping("/api/delivery-requests")
@RequiredArgsConstructor
@Slf4j
public class DeliveryRequestController {

    private final DeliveryRequestService deliveryRequestService;

    // ==========================================
    // Company Admin Endpoints
    // ==========================================

    /**
     * Create delivery request (assign agent to parcel)
     * POST /api/delivery-requests
     */
    @PostMapping
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<DeliveryRequestDTO>> createDeliveryRequest(
            @Valid @RequestBody CreateDeliveryRequestDTO request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Creating delivery request for parcel {} assigned to agent {}",
                request.getParcelId(), request.getAgentId());

        DeliveryRequestDTO deliveryRequest = deliveryRequestService.createDeliveryRequest(request, currentUser);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(deliveryRequest,
                        "Delivery request created. Waiting for agent response."));
    }

    /**
     * Get all company delivery requests
     * GET /api/delivery-requests/company
     */
    @GetMapping("/company")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<List<DeliveryRequestDTO>>> getCompanyDeliveryRequests(
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting all delivery requests for company");

        List<DeliveryRequestDTO> requests = deliveryRequestService.getCompanyDeliveryRequests(currentUser);

        return ResponseEntity.ok(ApiResponse.success(requests,
                "Retrieved " + requests.size() + " delivery requests"));
    }

    /**
     * Get company requests by status
     * GET /api/delivery-requests/company/status/{status}
     */
    @GetMapping("/company/status/{status}")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<List<DeliveryRequestDTO>>> getCompanyRequestsByStatus(
            @PathVariable AssignmentStatus status,
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting {} delivery requests", status);

        List<DeliveryRequestDTO> requests = deliveryRequestService.getCompanyRequestsByStatus(status, currentUser);

        return ResponseEntity.ok(ApiResponse.success(requests,
                "Retrieved " + requests.size() + " " + status + " requests"));
    }

    /**
     * Get requests needing reassignment
     * GET /api/delivery-requests/company/reassign
     */
    @GetMapping("/company/reassign")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<List<DeliveryRequestDTO>>> getRequestsNeedingReassignment(
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting delivery requests needing reassignment");

        List<DeliveryRequestDTO> requests = deliveryRequestService.getRequestsNeedingReassignment(currentUser);

        return ResponseEntity.ok(ApiResponse.success(requests,
                "Retrieved " + requests.size() + " requests needing reassignment"));
    }

    /**
     * Get delivery request by ID
     * GET /api/delivery-requests/{id}
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<DeliveryRequestDTO>> getDeliveryRequestById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting delivery request: {}", id);

        DeliveryRequestDTO request = deliveryRequestService.getDeliveryRequestById(id, currentUser);

        return ResponseEntity.ok(ApiResponse.success(request, "Delivery request retrieved"));
    }

    /**
     * Reassign to new agent
     * PATCH /api/delivery-requests/{id}/reassign
     */
    @PatchMapping("/{id}/reassign")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<DeliveryRequestDTO>> reassignAgent(
            @PathVariable Long id,
            @Valid @RequestBody ReassignAgentDTO request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Reassigning delivery request {} to agent {}", id, request.getNewAgentId());

        DeliveryRequestDTO deliveryRequest = deliveryRequestService.reassignAgent(id, request, currentUser);

        return ResponseEntity.ok(ApiResponse.success(deliveryRequest,
                "Reassigned to new agent. Attempt #" + deliveryRequest.getAttemptCount()));
    }

    /**
     * Cancel delivery request
     * DELETE /api/delivery-requests/{id}
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<DeliveryRequestDTO>> cancelDeliveryRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        log.info("Cancelling delivery request: {}", id);

        DeliveryRequestDTO request = deliveryRequestService.cancelDeliveryRequest(id, currentUser);

        return ResponseEntity.ok(ApiResponse.success(request, "Delivery request cancelled"));
    }

    // ==========================================
    // Agent Endpoints
    // ==========================================

    /**
     * Get pending requests for agent
     * GET /api/delivery-requests/agent/pending
     */
    @GetMapping("/agent/pending")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<List<DeliveryRequestDTO>>> getAgentPendingRequests(
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting pending requests for agent");

        List<DeliveryRequestDTO> requests = deliveryRequestService.getAgentPendingRequests(currentUser);

        return ResponseEntity.ok(ApiResponse.success(requests,
                requests.size() + " pending request(s) waiting for your response"));
    }

    /**
     * Get all requests for agent
     * GET /api/delivery-requests/agent/all
     */
    @GetMapping("/agent/all")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<List<DeliveryRequestDTO>>> getAgentAllRequests(
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting all requests for agent");

        List<DeliveryRequestDTO> requests = deliveryRequestService.getAgentAllRequests(currentUser);

        return ResponseEntity.ok(ApiResponse.success(requests,
                "Retrieved " + requests.size() + " delivery requests"));
    }

    /**
     * Agent accepts or rejects delivery request
     * PATCH /api/delivery-requests/{id}/respond
     */
    @PatchMapping("/{id}/respond")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<DeliveryRequestDTO>> agentResponse(
            @PathVariable Long id,
            @Valid @RequestBody AgentResponseDTO response,
            @AuthenticationPrincipal User currentUser) {

        log.info("Agent responding to delivery request {}: {}", id, response.getAccept() ? "ACCEPT" : "REJECT");

        DeliveryRequestDTO request = deliveryRequestService.agentResponse(id, response, currentUser);

        String message = response.getAccept()
                ? "Delivery accepted! Please proceed to pickup."
                : "Delivery rejected. Company will be notified.";

        return ResponseEntity.ok(ApiResponse.success(request, message));
    }
}