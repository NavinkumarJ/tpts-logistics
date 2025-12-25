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
            @AuthenticationPrincipal User currentUser) {
        log.info("Setting agent {} active status to {}", id, isActive);
        AgentDTO agent = agentService.updateActiveStatus(id, isActive, currentUser);
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
