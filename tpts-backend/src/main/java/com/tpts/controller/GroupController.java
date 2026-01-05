package com.tpts.controller;

import com.tpts.dto.request.AssignGroupAgentRequest;
import com.tpts.dto.request.CreateGroupRequest;
import com.tpts.dto.request.JoinGroupRequest;
import com.tpts.dto.response.ApiResponse;
import com.tpts.dto.response.GroupDTO;
import com.tpts.dto.response.GroupPublicDTO;
import com.tpts.dto.response.ParcelDTO;
import com.tpts.entity.GroupStatus;
import com.tpts.entity.User;
import com.tpts.service.GroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Group Shipment Controller
 * Handles all group shipment (group buy) related endpoints
 *
 * Public Endpoints (No auth):
 * - GET /api/groups/open - Get all open groups
 * - GET /api/groups/open/source/{city} - Get open groups by source city
 * - GET /api/groups/open/target/{city} - Get open groups by target city
 * - GET /api/groups/open/route - Get open groups by route
 * - GET /api/groups/code/{code} - Get group by code
 *
 * Customer Endpoints:
 * - POST /api/groups/{id}/join - Join group with parcel
 * - POST /api/groups/{id}/leave - Leave group
 *
 * Company Admin Endpoints:
 * - POST /api/groups - Create group
 * - GET /api/groups/company - Get company groups
 * - GET /api/groups/company/status/{s} - Get groups by status
 * - GET /api/groups/{id} - Get group by ID
 * - GET /api/groups/{id}/parcels - Get group parcels
 * - PATCH /api/groups/{id}/assign-pickup - Assign pickup agent
 * - PATCH /api/groups/{id}/assign-delivery - Assign delivery agent
 * - PATCH /api/groups/{id}/pickup-complete - Mark pickup complete
 * - PATCH /api/groups/{id}/delivery-complete - Mark delivery complete
 * - POST /api/groups/{id}/cancel - Cancel group
 */
@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
@Slf4j
public class GroupController {

        private final GroupService groupService;

        // ==========================================
        // Public Endpoints (No Auth Required)
        // ==========================================

        /**
         * Get all open groups
         * GET /api/groups/open
         */
        @GetMapping("/open")
        public ResponseEntity<ApiResponse<List<GroupPublicDTO>>> getOpenGroups() {
                log.info("Getting all open groups");

                List<GroupPublicDTO> groups = groupService.getOpenGroups();

                return ResponseEntity.ok(ApiResponse.success(groups,
                                "Retrieved " + groups.size() + " open groups"));
        }

        /**
         * Get open groups by source city
         * GET /api/groups/open/source/{city}
         */
        @GetMapping("/open/source/{city}")
        public ResponseEntity<ApiResponse<List<GroupPublicDTO>>> getOpenGroupsBySourceCity(
                        @PathVariable String city) {

                log.info("Getting open groups from source city: {}", city);

                List<GroupPublicDTO> groups = groupService.getOpenGroupsBySourceCity(city);

                return ResponseEntity.ok(ApiResponse.success(groups,
                                "Retrieved " + groups.size() + " groups from " + city));
        }

        /**
         * Get open groups by target city
         * GET /api/groups/open/target/{city}
         */
        @GetMapping("/open/target/{city}")
        public ResponseEntity<ApiResponse<List<GroupPublicDTO>>> getOpenGroupsByTargetCity(
                        @PathVariable String city) {

                log.info("Getting open groups to target city: {}", city);

                List<GroupPublicDTO> groups = groupService.getOpenGroupsByTargetCity(city);

                return ResponseEntity.ok(ApiResponse.success(groups,
                                "Retrieved " + groups.size() + " groups to " + city));
        }

        /**
         * Get open groups by route
         * GET /api/groups/open/route?from=Chennai&to=Bangalore
         */
        @GetMapping("/open/route")
        public ResponseEntity<ApiResponse<List<GroupPublicDTO>>> getOpenGroupsByRoute(
                        @RequestParam String from,
                        @RequestParam String to) {

                log.info("Getting open groups for route: {} → {}", from, to);

                List<GroupPublicDTO> groups = groupService.getOpenGroupsByRoute(from, to);

                return ResponseEntity.ok(ApiResponse.success(groups,
                                "Retrieved " + groups.size() + " groups for " + from + " → " + to));
        }

        /**
         * Get group by code (public)
         * GET /api/groups/code/{groupCode}
         */
        @GetMapping("/code/{groupCode}")
        public ResponseEntity<ApiResponse<GroupDTO>> getGroupByCode(
                        @PathVariable String groupCode) {

                log.info("Getting group by code: {}", groupCode);

                GroupDTO group = groupService.getGroupByCode(groupCode);

                return ResponseEntity.ok(ApiResponse.success(group, "Group retrieved"));
        }

        // ==========================================
        // Customer Endpoints
        // ==========================================

        /**
         * Get customer's group shipments
         * GET /api/groups/my
         */
        @GetMapping("/my")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyGroups(
                        @AuthenticationPrincipal User currentUser) {
                log.info("Customer {} fetching their group shipments", currentUser.getEmail());
                List<Map<String, Object>> groups = groupService.getCustomerGroups(currentUser);
                return ResponseEntity.ok(ApiResponse.success(groups, "Group shipments retrieved"));
        }

        /**
         * Join a group with parcel
         * POST /api/groups/{id}/join
         */
        @PostMapping("/{id}/join")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<GroupDTO>> joinGroup(
                        @PathVariable Long id,
                        @Valid @RequestBody JoinGroupRequest request,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Customer {} joining group {} with parcel {}",
                                currentUser.getEmail(), id, request.getParcelId());

                GroupDTO group = groupService.joinGroup(id, request, currentUser);

                return ResponseEntity.ok(ApiResponse.success(group,
                                "Successfully joined group. Discount of " + group.getDiscountPercentage()
                                                + "% applied!"));
        }

        /**
         * Leave a group
         * POST /api/groups/{id}/leave?parcelId=X
         */
        @PostMapping("/{id}/leave")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<GroupDTO>> leaveGroup(
                        @PathVariable Long id,
                        @RequestParam Long parcelId,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Customer {} leaving group {} with parcel {}",
                                currentUser.getEmail(), id, parcelId);

                GroupDTO group = groupService.leaveGroup(id, parcelId, currentUser);

                return ResponseEntity.ok(ApiResponse.success(group, "Successfully left the group"));
        }

        // ==========================================
        // Company Admin Endpoints
        // ==========================================

        /**
         * Create a new group shipment
         * POST /api/groups
         */
        @PostMapping
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<GroupDTO>> createGroup(
                        @Valid @RequestBody CreateGroupRequest request,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Creating group for company: {} → {}", request.getSourceCity(), request.getTargetCity());

                GroupDTO group = groupService.createGroup(request, currentUser);

                return ResponseEntity
                                .status(HttpStatus.CREATED)
                                .body(ApiResponse.success(group,
                                                "Group created successfully. Code: " + group.getGroupCode()));
        }

        /**
         * Get all company groups
         * GET /api/groups/company
         */
        @GetMapping("/company")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<List<GroupDTO>>> getCompanyGroups(
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting groups for company: {}", currentUser.getEmail());

                List<GroupDTO> groups = groupService.getCompanyGroups(currentUser);

                return ResponseEntity.ok(ApiResponse.success(groups,
                                "Retrieved " + groups.size() + " groups"));
        }

        /**
         * Get company groups by status
         * GET /api/groups/company/status/{status}
         */
        @GetMapping("/company/status/{status}")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<List<GroupDTO>>> getCompanyGroupsByStatus(
                        @PathVariable GroupStatus status,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting {} groups for company", status);

                List<GroupDTO> groups = groupService.getCompanyGroupsByStatus(status, currentUser);

                return ResponseEntity.ok(ApiResponse.success(groups,
                                "Retrieved " + groups.size() + " " + status + " groups"));
        }

        /**
         * Get group by ID
         * GET /api/groups/{id}
         */
        @GetMapping("/{id}")
        @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT', 'SUPER_ADMIN', 'CUSTOMER')")
        public ResponseEntity<ApiResponse<GroupDTO>> getGroupById(
                        @PathVariable Long id) {

                log.info("Getting group by ID: {}", id);

                GroupDTO group = groupService.getGroupById(id);

                return ResponseEntity.ok(ApiResponse.success(group, "Group retrieved"));
        }

        /**
         * Get parcels in a group
         * GET /api/groups/{id}/parcels
         */
        @GetMapping("/{id}/parcels")
        @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT', 'SUPER_ADMIN', 'CUSTOMER')")
        public ResponseEntity<ApiResponse<List<ParcelDTO>>> getGroupParcels(
                        @PathVariable Long id,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting parcels for group: {}", id);

                List<ParcelDTO> parcels = groupService.getGroupParcels(id, currentUser);

                return ResponseEntity.ok(ApiResponse.success(parcels,
                                "Retrieved " + parcels.size() + " parcels"));
        }

        /**
         * Assign pickup agent (Agent 1)
         * PATCH /api/groups/{id}/assign-pickup
         */
        @PatchMapping("/{id}/assign-pickup")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<GroupDTO>> assignPickupAgent(
                        @PathVariable Long id,
                        @Valid @RequestBody AssignGroupAgentRequest request,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Assigning pickup agent {} to group {}", request.getAgentId(), id);

                GroupDTO group = groupService.assignPickupAgent(id, request, currentUser);

                return ResponseEntity.ok(ApiResponse.success(group,
                                "Pickup agent assigned. Status: " + group.getStatus()));
        }

        /**
         * Assign delivery agent (Agent 2)
         * PATCH /api/groups/{id}/assign-delivery
         */
        @PatchMapping("/{id}/assign-delivery")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<GroupDTO>> assignDeliveryAgent(
                        @PathVariable Long id,
                        @Valid @RequestBody AssignGroupAgentRequest request,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Assigning delivery agent {} to group {}", request.getAgentId(), id);

                GroupDTO group = groupService.assignDeliveryAgent(id, request, currentUser);

                return ResponseEntity.ok(ApiResponse.success(group,
                                "Delivery agent assigned. Status: " + group.getStatus()));
        }

        /**
         * Mark pickup as complete
         * PATCH /api/groups/{id}/pickup-complete
         */
        @PatchMapping("/{id}/pickup-complete")
        @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT')")
        public ResponseEntity<ApiResponse<GroupDTO>> completePickup(
                        @PathVariable Long id,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Completing pickup for group: {}", id);

                GroupDTO group = groupService.completePickup(id, currentUser);

                return ResponseEntity.ok(ApiResponse.success(group,
                                "Pickup completed. All packages collected at company office."));
        }

        /**
         * Mark delivery as complete
         * PATCH /api/groups/{id}/delivery-complete
         */
        @PatchMapping("/{id}/delivery-complete")
        @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT')")
        public ResponseEntity<ApiResponse<GroupDTO>> completeDelivery(
                        @PathVariable Long id,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Completing delivery for group: {}", id);

                GroupDTO group = groupService.completeDelivery(id, currentUser);

                return ResponseEntity.ok(ApiResponse.success(group,
                                "Delivery completed. All packages delivered!"));
        }

        /**
         * Cancel group
         * POST /api/groups/{id}/cancel
         */
        @PostMapping("/{id}/cancel")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<GroupDTO>> cancelGroup(
                        @PathVariable Long id,
                        @RequestParam(required = false) String reason,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Cancelling group: {}", id);

                GroupDTO group = groupService.cancelGroup(id, reason, currentUser);

                return ResponseEntity.ok(ApiResponse.success(group, "Group cancelled"));
        }

        /**
         * Reopen a FULL group (allows members to cancel)
         * POST /api/groups/{id}/reopen
         */
        @PostMapping("/{id}/reopen")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<GroupDTO>> reopenGroup(
                        @PathVariable Long id,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Reopening group: {}", id);

                GroupDTO group = groupService.reopenGroup(id, currentUser);

                return ResponseEntity.ok(ApiResponse.success(group, "Group reopened. Members have been notified."));
        }

        /**
         * Close group early and proceed (when 50%+ members joined)
         * POST /api/groups/{id}/close-early
         */
        @PostMapping("/{id}/close-early")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<GroupDTO>> closeGroupEarly(
                        @PathVariable Long id,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Closing group early: {}", id);

                GroupDTO group = groupService.closeGroupEarly(id, currentUser);

                return ResponseEntity.ok(ApiResponse.success(group, "Group closed and proceeding with " +
                                group.getCurrentMembers() + " members. Agents can now be assigned."));
        }
}