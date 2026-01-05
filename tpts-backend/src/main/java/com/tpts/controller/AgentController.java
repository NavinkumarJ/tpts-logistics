package com.tpts.controller;

import com.tpts.dto.request.CreateAgentRequest;
import com.tpts.dto.request.UpdateAgentRequest;
import com.tpts.dto.request.UpdateAvailabilityRequest;
import com.tpts.dto.request.UpdateLocationRequest;
import com.tpts.dto.request.ChangePasswordRequest;
import com.tpts.dto.response.AgentDTO;
import com.tpts.dto.response.AgentDashboardDTO;
import com.tpts.dto.response.ApiResponse;
import com.tpts.entity.User;
import com.tpts.service.AgentService;
import com.tpts.service.AgentLocationService;
import com.tpts.service.CloudinaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Agent Controller
 * Handles all delivery agent-related endpoints
 */
@RestController
@RequestMapping("/api/agents")
@RequiredArgsConstructor
@Slf4j
public class AgentController {

    private final AgentService agentService;
    private final AgentLocationService agentLocationService;
    private final CloudinaryService cloudinaryService;

    // ==========================================
    // Agent Self-Service Endpoints
    // ==========================================

    @GetMapping("/me")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<AgentDTO>> getCurrentAgent(
            @AuthenticationPrincipal User currentUser) {
        log.info("Getting profile for agent user: {}", currentUser.getEmail());
        AgentDTO agent = agentService.getAgentByUser(currentUser);
        return ResponseEntity.ok(ApiResponse.success(agent, "Agent profile retrieved"));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<AgentDashboardDTO>> getAgentDashboard(
            @AuthenticationPrincipal User currentUser) {
        log.info("Getting dashboard for agent: {}", currentUser.getEmail());
        AgentDashboardDTO dashboard = agentService.getAgentDashboard(currentUser);
        return ResponseEntity.ok(ApiResponse.success(dashboard, "Dashboard retrieved"));
    }

    @GetMapping("/my-groups")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyGroupAssignments(
            @AuthenticationPrincipal User currentUser) {
        log.info("Getting group assignments for agent: {}", currentUser.getEmail());
        Map<String, Object> groups = agentService.getAgentGroupAssignments(currentUser);
        return ResponseEntity.ok(ApiResponse.success(groups, "Group assignments retrieved"));
    }

    @PostMapping("/share-location")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<String>> shareLocation(
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User currentUser) {
        log.info("Agent {} sharing location", currentUser.getEmail());

        Double latitude = request.get("latitude") != null ? Double.parseDouble(request.get("latitude").toString())
                : null;
        Double longitude = request.get("longitude") != null ? Double.parseDouble(request.get("longitude").toString())
                : null;
        Long groupShipmentId = request.get("groupShipmentId") != null
                ? Long.parseLong(request.get("groupShipmentId").toString())
                : null;

        if (latitude == null || longitude == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Location coordinates required"));
        }

        agentService.updateAgentLocation(currentUser, latitude, longitude, groupShipmentId);
        return ResponseEntity.ok(ApiResponse.success("Location shared", "Location updated successfully"));
    }

    @PostMapping(value = "/pickups/{parcelId}/verify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<String>> verifyPickupWithPhoto(
            @PathVariable Long parcelId,
            @RequestParam String otp,
            @RequestParam Long groupShipmentId,
            @RequestParam(required = false) MultipartFile pickupPhoto,
            @AuthenticationPrincipal User currentUser) {
        log.info("Agent {} verifying pickup for parcel {} with OTP", currentUser.getEmail(), parcelId);

        try {
            // Upload photo to Cloudinary if provided
            String photoUrl = null;
            if (pickupPhoto != null && !pickupPhoto.isEmpty()) {
                photoUrl = cloudinaryService.uploadImage(pickupPhoto, "pickup_photos");
                log.info("Pickup photo uploaded: {}", photoUrl);
            }

            // Verify OTP and update parcel status
            agentService.verifyPickupOtp(currentUser, parcelId, groupShipmentId, otp, photoUrl);

            return ResponseEntity
                    .ok(ApiResponse.success("Pickup verified", "OTP verified and parcel picked up successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Pickup verification failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Verification failed: " + e.getMessage()));
        }
    }

    /**
     * Verify delivery OTP (JSON version - for frontend that sends already-uploaded
     * photo URL)
     * POST /api/agent/deliveries/{parcelId}/verify
     */
    @PostMapping("/deliveries/{parcelId}/verify")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<String>> verifyDeliveryOtp(
            @PathVariable Long parcelId,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User currentUser) {
        log.info("Agent {} verifying delivery for parcel {} with OTP", currentUser.getEmail(), parcelId);

        try {
            String otp = (String) request.get("otp");
            Long groupShipmentId = request.get("groupShipmentId") != null
                    ? Long.parseLong(request.get("groupShipmentId").toString())
                    : null;
            String photoUrl = (String) request.get("photoUrl");

            log.info("Delivery verify - PhotoUrl received: {}", photoUrl);

            // Verify OTP and update parcel status to DELIVERED
            agentService.verifyDeliveryOtp(currentUser, parcelId, groupShipmentId, otp, photoUrl);

            return ResponseEntity
                    .ok(ApiResponse.success("Delivery verified", "OTP verified and parcel delivered successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Delivery verification failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Verification failed: " + e.getMessage()));
        }
    }

    /**
     * Verify delivery OTP with photo upload (MultipartFile version - handles photo
     * upload directly)
     * POST /api/agent/deliveries/{parcelId}/verify-with-photo
     */
    @PostMapping(value = "/deliveries/{parcelId}/verify-with-photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<String>> verifyDeliveryWithPhoto(
            @PathVariable Long parcelId,
            @RequestParam String otp,
            @RequestParam Long groupShipmentId,
            @RequestParam(required = false) MultipartFile deliveryPhoto,
            @AuthenticationPrincipal User currentUser) {
        log.info("Agent {} verifying delivery with photo for parcel {} with OTP", currentUser.getEmail(), parcelId);

        try {
            // Upload photo to Cloudinary if provided
            String photoUrl = null;
            if (deliveryPhoto != null && !deliveryPhoto.isEmpty()) {
                photoUrl = cloudinaryService.uploadImage(deliveryPhoto, "delivery_photos");
                log.info("Delivery photo uploaded: {}", photoUrl);
            }

            // Verify OTP and update parcel status to DELIVERED
            agentService.verifyDeliveryOtp(currentUser, parcelId, groupShipmentId, otp, photoUrl);

            return ResponseEntity
                    .ok(ApiResponse.success("Delivery verified", "OTP verified and parcel delivered successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Delivery verification failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Verification failed: " + e.getMessage()));
        }
    }

    @PostMapping(value = "/warehouse-arrival", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<String>> confirmWarehouseArrival(
            @RequestParam Long groupShipmentId,
            @RequestParam(required = false) MultipartFile warehousePhoto,
            @AuthenticationPrincipal User currentUser) {
        log.info("Agent {} confirming warehouse arrival for group {}", currentUser.getEmail(), groupShipmentId);

        try {
            // Upload photo to Cloudinary if provided
            String photoUrl = null;
            if (warehousePhoto != null && !warehousePhoto.isEmpty()) {
                photoUrl = cloudinaryService.uploadImage(warehousePhoto, "warehouse_arrivals");
                log.info("Warehouse arrival photo uploaded: {}", photoUrl);
            }

            // Update all parcels in group to AT_WAREHOUSE status
            agentService.confirmWarehouseArrival(currentUser, groupShipmentId, photoUrl);

            return ResponseEntity
                    .ok(ApiResponse.success("Warehouse arrival confirmed",
                            "All parcels have been updated to AT_WAREHOUSE status"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Warehouse arrival confirmation failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Confirmation failed: " + e.getMessage()));
        }
    }

    @PutMapping("/profile")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<AgentDTO>> updateAgentProfile(
            @Valid @RequestBody UpdateAgentRequest request,
            @AuthenticationPrincipal User currentUser) {
        log.info("Agent {} updating their profile", currentUser.getEmail());
        AgentDTO agent = agentService.updateAgentProfile(request, currentUser);
        return ResponseEntity.ok(ApiResponse.success(agent, "Profile updated successfully"));
    }

    @PutMapping("/change-password")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal User currentUser) {
        log.info("Agent {} changing password", currentUser.getEmail());
        agentService.changePassword(request, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully"));
    }

    @PatchMapping("/availability")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<AgentDTO>> updateAvailability(
            @Valid @RequestBody UpdateAvailabilityRequest request,
            @AuthenticationPrincipal User currentUser) {
        log.info("Agent {} setting availability to {}", currentUser.getEmail(), request.getIsAvailable());
        AgentDTO agent = agentService.updateAvailability(request.getIsAvailable(), currentUser);
        String message = request.getIsAvailable() ? "You are now available for deliveries" : "You are now offline";
        return ResponseEntity.ok(ApiResponse.success(agent, message));
    }

    @PatchMapping("/location")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<AgentDTO>> updateLocation(
            @Valid @RequestBody UpdateLocationRequest request,
            @AuthenticationPrincipal User currentUser) {
        log.debug("Agent {} updating location", currentUser.getEmail());
        AgentDTO agent = agentService.updateLocation(request, currentUser);

        // Also broadcast location to customers tracking this agent's parcels via
        // WebSocket
        agentLocationService.updateAgentLocation(agent.getId(), request.getLatitude(), request.getLongitude());

        return ResponseEntity.ok(ApiResponse.success(agent, "Location updated"));
    }

    @PatchMapping("/{agentId}/location")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> updateLocationById(
            @PathVariable Long agentId,
            @RequestParam BigDecimal latitude,
            @RequestParam BigDecimal longitude) {
        agentLocationService.updateAgentLocation(agentId, latitude, longitude);
        return ResponseEntity.ok(ApiResponse.success(null, "Location updated"));
    }

    /**
     * Public endpoint to get agent's current location for customer tracking
     */
    @GetMapping("/{agentId}/location")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getAgentLocation(
            @PathVariable Long agentId) {
        log.debug("Fetching location for agent {}", agentId);
        var agent = agentService.getAgentById(agentId);
        if (agent == null || agent.getCurrentLatitude() == null || agent.getCurrentLongitude() == null) {
            return ResponseEntity.ok(ApiResponse.success(null, "Location not available"));
        }
        java.util.Map<String, Object> locationData = new java.util.HashMap<>();
        locationData.put("agentLat", agent.getCurrentLatitude());
        locationData.put("agentLng", agent.getCurrentLongitude());
        locationData.put("agentName", agent.getFullName());
        locationData.put("timestamp", agent.getLocationUpdatedAt());
        return ResponseEntity.ok(ApiResponse.success(locationData, "Agent location retrieved"));
    }

    // ==========================================
    // Company Admin Endpoints
    // ==========================================

    @GetMapping
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<List<AgentDTO>>> getAllAgents(
            @AuthenticationPrincipal User currentUser) {
        log.info("Getting all agents for company user: {}", currentUser.getEmail());
        List<AgentDTO> agents = agentService.getAgentsByCompany(currentUser);
        return ResponseEntity.ok(ApiResponse.success(agents,
                "Retrieved " + agents.size() + " agents"));
    }

    @PostMapping
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<AgentDTO>> createAgent(
            @Valid @RequestBody CreateAgentRequest request,
            @AuthenticationPrincipal User currentUser) {
        log.info("Creating agent for company user: {}", currentUser.getEmail());
        AgentDTO agent = agentService.createAgent(request, currentUser);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(agent, "Agent created successfully. Credentials sent via SMS."));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<AgentDTO>> getAgentById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        log.info("Getting agent {} for company", id);
        AgentDTO agent = agentService.getAgentByIdForCompany(id, currentUser);
        return ResponseEntity.ok(ApiResponse.success(agent, "Agent retrieved"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<AgentDTO>> updateAgent(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAgentRequest request,
            @AuthenticationPrincipal User currentUser) {
        log.info("Updating agent {} by company", id);
        AgentDTO agent = agentService.updateAgentByCompany(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.success(agent, "Agent updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteAgent(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        log.info("Deactivating agent {} by company", id);
        agentService.deleteAgent(id, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Agent deactivated successfully"));
    }

    @PatchMapping("/{id}/active")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<AgentDTO>> setActiveStatus(
            @PathVariable Long id,
            @RequestParam Boolean isActive,
            @RequestBody(required = false) Map<String, String> request,
            @AuthenticationPrincipal User currentUser) {
        String reason = request != null ? request.getOrDefault("reason", null) : null;
        log.info("Setting agent {} active status to {} (reason: {})", id, isActive, reason);
        AgentDTO agent = agentService.updateActiveStatus(id, isActive, reason, currentUser);
        String message = isActive ? "Agent activated" : "Agent deactivated";
        return ResponseEntity.ok(ApiResponse.success(agent, message));
    }

    @GetMapping("/available")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<List<AgentDTO>>> getAvailableAgents(
            @AuthenticationPrincipal User currentUser) {
        log.info("Getting available agents for company");
        List<AgentDTO> agents = agentService.getAvailableAgents(currentUser);
        return ResponseEntity.ok(ApiResponse.success(agents,
                "Retrieved " + agents.size() + " available agents"));
    }

    @GetMapping("/available/priority")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<List<AgentDTO>>> getAvailableAgentsWithPriority(
            @RequestParam String pincode,
            @RequestParam String city,
            @AuthenticationPrincipal User currentUser) {
        log.info("Getting available agents with priority for pincode {} and city {}", pincode, city);
        List<AgentDTO> agents = agentService.getAvailableAgentsWithPriority(pincode, city, currentUser);
        return ResponseEntity.ok(ApiResponse.success(agents,
                "Retrieved " + agents.size() + " agents (ordered by pincode priority)"));
    }

    // ==========================================
    // Profile Image Management
    // ==========================================

    @PostMapping(value = "/{id}/profile-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadProfileImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User currentUser) {
        log.info("Agent {} uploading profile image", id);

        try {
            String imageUrl = cloudinaryService.uploadProfileImage(file, currentUser.getId());
            agentService.updateProfilePhotoUrl(id, imageUrl, currentUser);

            return ResponseEntity.ok(ApiResponse.success(
                    Map.of("profilePhotoUrl", imageUrl),
                    "Profile image uploaded successfully"));
        } catch (Exception e) {
            log.error("Failed to upload profile image: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to upload image: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/profile-image")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<Void>> removeProfileImage(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        log.info("Agent {} removing profile image", id);

        agentService.updateProfilePhotoUrl(id, null, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Profile image removed successfully"));
    }
}
