package com.tpts.controller;

import com.tpts.dto.request.AssignAgentRequest;
import com.tpts.dto.request.CreateParcelRequest;
import com.tpts.dto.request.UpdateParcelStatusRequest;
import com.tpts.dto.response.ApiResponse;
import com.tpts.dto.response.ParcelDTO;
import com.tpts.dto.response.ParcelTrackingDTO;
import com.tpts.entity.User;
import com.tpts.service.ParcelService;
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
 * Parcel Controller
 * Handles all parcel/shipment-related endpoints
 *
 * Public Endpoints (No auth):
 * - GET /api/parcels/track?trackingNumber=X&phoneLastFour=Y - Public tracking
 *
 * Customer Endpoints:
 * - POST /api/parcels - Create new parcel
 * - GET /api/parcels/my - Get my parcels
 * - GET /api/parcels/my/active - Get my active parcels
 * - GET /api/parcels/{id} - Get parcel by ID
 * - GET /api/parcels/tracking/{number} - Get parcel by tracking number
 * - POST /api/parcels/{id}/confirm - Confirm parcel (after payment)
 * - POST /api/parcels/{id}/cancel - Cancel parcel
 *
 * Company Endpoints:
 * - GET /api/parcels/company - Get all company parcels
 * - GET /api/parcels/company/pending - Get parcels needing assignment
 * - PATCH /api/parcels/{id}/assign - Assign agent to parcel
 *
 * Agent Endpoints:
 * - GET /api/parcels/agent/active - Get agent's active deliveries
 * - GET /api/parcels/agent/all - Get all agent's deliveries
 * - PATCH /api/parcels/{id}/status - Update parcel status
 */
@RestController
@RequestMapping("/api/parcels")
@RequiredArgsConstructor
@Slf4j
public class ParcelController {

        private final ParcelService parcelService;

        // ==========================================
        // Public Tracking (No Auth Required)
        // ==========================================

        /**
         * Public parcel tracking
         * GET /api/parcels/track?trackingNumber=TRK123&phoneLastFour=1234
         */
        @GetMapping("/track")
        public ResponseEntity<ApiResponse<ParcelTrackingDTO>> trackParcel(
                        @RequestParam String trackingNumber,
                        @RequestParam String phoneLastFour) {

                log.info("Public tracking request for: {}", trackingNumber);

                ParcelTrackingDTO tracking = parcelService.trackParcel(trackingNumber, phoneLastFour);

                return ResponseEntity.ok(ApiResponse.success(tracking, "Parcel tracking info retrieved"));
        }

        // ==========================================
        // Customer Endpoints
        // ==========================================

        /**
         * Create new parcel
         * POST /api/parcels
         */
        @PostMapping
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<ParcelDTO>> createParcel(
                        @Valid @RequestBody CreateParcelRequest request,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Creating parcel for customer: {}", currentUser.getEmail());

                ParcelDTO parcel = parcelService.createParcel(request, currentUser);

                return ResponseEntity
                                .status(HttpStatus.CREATED)
                                .body(ApiResponse.success(parcel, "Parcel created successfully. Tracking: "
                                                + parcel.getTrackingNumber()));
        }

        /**
         * Get customer's parcels
         * GET /api/parcels/my
         */
        @GetMapping("/my")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<List<ParcelDTO>>> getMyParcels(
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting parcels for customer: {}", currentUser.getEmail());

                List<ParcelDTO> parcels = parcelService.getCustomerParcels(currentUser);

                return ResponseEntity.ok(ApiResponse.success(parcels,
                                "Retrieved " + parcels.size() + " parcels"));
        }

        /**
         * Get customer's active parcels
         * GET /api/parcels/my/active
         */
        @GetMapping("/my/active")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<List<ParcelDTO>>> getMyActiveParcels(
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting active parcels for customer: {}", currentUser.getEmail());

                List<ParcelDTO> parcels = parcelService.getCustomerActiveParcels(currentUser);

                return ResponseEntity.ok(ApiResponse.success(parcels,
                                "Retrieved " + parcels.size() + " active parcels"));
        }

        /**
         * Get customer's parcel by tracking number (bypasses role-based access control
         * issues)
         * GET /api/parcels/my/{trackingNumber}
         */
        @GetMapping("/my/{trackingNumber}")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<ParcelDTO>> getMyParcelByTrackingNumber(
                        @PathVariable String trackingNumber,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting customer's parcel by tracking: {} for user: {}", trackingNumber,
                                currentUser.getEmail());

                ParcelDTO parcel = parcelService.getCustomerParcelByTrackingNumber(trackingNumber, currentUser);

                return ResponseEntity.ok(ApiResponse.success(parcel, "Parcel retrieved"));
        }

        /**
         * Get parcel by ID
         * GET /api/parcels/{id}
         */
        @GetMapping("/{id}")
        @PreAuthorize("hasAnyRole('CUSTOMER', 'COMPANY_ADMIN', 'DELIVERY_AGENT', 'SUPER_ADMIN')")
        public ResponseEntity<ApiResponse<ParcelDTO>> getParcelById(
                        @PathVariable Long id,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting parcel {} for user: {}", id, currentUser.getEmail());

                ParcelDTO parcel = parcelService.getParcelById(id, currentUser);

                return ResponseEntity.ok(ApiResponse.success(parcel, "Parcel retrieved"));
        }

        /**
         * Get parcel by tracking number (authenticated)
         * GET /api/parcels/tracking/{trackingNumber}
         */
        @GetMapping("/tracking/{trackingNumber}")
        @PreAuthorize("hasAnyRole('CUSTOMER', 'COMPANY_ADMIN', 'DELIVERY_AGENT', 'SUPER_ADMIN')")
        public ResponseEntity<ApiResponse<ParcelDTO>> getParcelByTrackingNumber(
                        @PathVariable String trackingNumber,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting parcel by tracking: {} for user: {}", trackingNumber, currentUser.getEmail());

                ParcelDTO parcel = parcelService.getParcelByTrackingNumber(trackingNumber, currentUser);

                return ResponseEntity.ok(ApiResponse.success(parcel, "Parcel retrieved"));
        }

        /**
         * Confirm parcel (after payment)
         * POST /api/parcels/{id}/confirm
         */
        @PostMapping("/{id}/")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<ParcelDTO>> confirmParcel(
                        @PathVariable Long id,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Confirming parcel {} for customer: {}", id, currentUser.getEmail());

                ParcelDTO parcel = parcelService.confirmParcel(id, currentUser);

                return ResponseEntity.ok(ApiResponse.success(parcel, "Parcel confirmed"));
        }

        /**
         * Cancel parcel
         * POST /api/parcels/{id}/cancel
         */
        @PostMapping("/{id}/cancel")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<ParcelDTO>> cancelParcel(
                        @PathVariable Long id,
                        @RequestParam(required = false) String reason,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Cancelling parcel {} for customer: {}", id, currentUser.getEmail());

                ParcelDTO parcel = parcelService.cancelParcel(id, reason, currentUser);

                return ResponseEntity.ok(ApiResponse.success(parcel, "Parcel cancelled"));
        }

        // ==========================================
        // Company Endpoints
        // ==========================================

        /**
         * Get all company parcels
         * GET /api/parcels/company
         */
        @GetMapping("/company")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<List<ParcelDTO>>> getCompanyParcels(
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting parcels for company: {}", currentUser.getEmail());

                List<ParcelDTO> parcels = parcelService.getCompanyParcels(currentUser);

                return ResponseEntity.ok(ApiResponse.success(parcels,
                                "Retrieved " + parcels.size() + " parcels"));
        }

        /**
         * Get parcels needing assignment
         * GET /api/parcels/company/pending
         */
        @GetMapping("/company/pending")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<List<ParcelDTO>>> getParcelsNeedingAssignment(
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting pending parcels for company: {}", currentUser.getEmail());

                List<ParcelDTO> parcels = parcelService.getParcelsNeedingAssignment(currentUser);

                return ResponseEntity.ok(ApiResponse.success(parcels,
                                parcels.size() + " parcels need agent assignment"));
        }

        /**
         * Assign agent to parcel
         * PATCH /api/parcels/{id}/assign
         */
        @PatchMapping("/{id}/assign")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<ParcelDTO>> assignAgent(
                        @PathVariable Long id,
                        @Valid @RequestBody AssignAgentRequest request,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Assigning agent {} to parcel {} by company: {}",
                                request.getAgentId(), id, currentUser.getEmail());

                ParcelDTO parcel = parcelService.assignAgent(id, request, currentUser);

                return ResponseEntity.ok(ApiResponse.success(parcel, "Agent assigned successfully"));
        }

        // ==========================================
        // Agent Endpoints
        // ==========================================

        /**
         * Get agent's active deliveries
         * GET /api/parcels/agent/active
         */
        @GetMapping("/agent/active")
        @PreAuthorize("hasRole('DELIVERY_AGENT')")
        public ResponseEntity<ApiResponse<List<ParcelDTO>>> getAgentActiveDeliveries(
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting active deliveries for agent: {}", currentUser.getEmail());

                List<ParcelDTO> parcels = parcelService.getAgentActiveDeliveries(currentUser);

                return ResponseEntity.ok(ApiResponse.success(parcels,
                                "Retrieved " + parcels.size() + " active deliveries"));
        }

        /**
         * Get all agent's deliveries
         * GET /api/parcels/agent/all
         */
        @GetMapping("/agent/all")
        @PreAuthorize("hasRole('DELIVERY_AGENT')")
        public ResponseEntity<ApiResponse<List<ParcelDTO>>> getAgentAllDeliveries(
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting all deliveries for agent: {}", currentUser.getEmail());

                List<ParcelDTO> parcels = parcelService.getAgentAllDeliveries(currentUser);

                return ResponseEntity.ok(ApiResponse.success(parcels,
                                "Retrieved " + parcels.size() + " deliveries"));
        }

        /**
         * Update parcel status (pickup, in-transit, delivered)
         * PATCH /api/parcels/{id}/status
         */
        @PatchMapping("/{id}/status")
        @PreAuthorize("hasAnyRole('DELIVERY_AGENT', 'COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<ParcelDTO>> updateParcelStatus(
                        @PathVariable Long id,
                        @Valid @RequestBody UpdateParcelStatusRequest request,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Updating parcel {} status to {} by: {}",
                                id, request.getStatus(), currentUser.getEmail());

                ParcelDTO parcel = parcelService.updateStatus(id, request, currentUser);

                return ResponseEntity.ok(ApiResponse.success(parcel,
                                "Status updated to " + parcel.getStatus()));
        }
}