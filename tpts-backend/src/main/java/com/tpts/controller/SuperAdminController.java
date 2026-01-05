package com.tpts.controller;

import com.tpts.dto.request.*;
import com.tpts.dto.response.*;
import com.tpts.entity.User;
import com.tpts.entity.UserType;
import com.tpts.service.SuperAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Super Admin Controller
 * Platform management, company approvals, user management
 *
 * All endpoints require SUPER_ADMIN role
 *
 * Dashboard:
 * - GET /api/super-admin/stats - Platform statistics
 * - GET /api/super-admin/profile - Current admin profile
 *
 * Company Management:
 * - GET /api/super-admin/companies/pending - Pending approvals
 * - GET /api/super-admin/companies/approved - Approved companies
 * - GET /api/super-admin/companies/{id} - Company details
 * - POST /api/super-admin/companies/{id}/approve - Approve company
 * - POST /api/super-admin/companies/{id}/reject - Reject company
 * - POST /api/super-admin/companies/{id}/suspend - Suspend company
 * - POST /api/super-admin/companies/{id}/reactivate- Reactivate company
 * - PATCH /api/super-admin/companies/{id}/commission - Update commission
 *
 * User Management:
 * - GET /api/super-admin/users - List all users
 * - GET /api/super-admin/users/{id} - User details
 * - PATCH /api/super-admin/users/{id}/status - Update status
 * - DELETE /api/super-admin/users/{id} - Delete user
 *
 * Admin Management:
 * - GET /api/super-admin/admins - List all admins
 * - POST /api/super-admin/admins - Create admin
 *
 * Content Moderation:
 * - GET /api/super-admin/ratings/flagged - Flagged ratings
 * - POST /api/super-admin/ratings/{id}/unflag - Unflag rating
 * - POST /api/super-admin/ratings/{id}/remove - Remove rating
 */
@RestController
@RequestMapping("/api/super-admin")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
@Slf4j
public class SuperAdminController {

    private final SuperAdminService superAdminService;

    // ==========================================
    // Dashboard & Statistics
    // ==========================================

    /**
     * Get platform statistics
     * GET /api/super-admin/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<PlatformStatsDTO>> getPlatformStats() {
        log.info("Getting platform statistics");
        PlatformStatsDTO stats = superAdminService.getPlatformStats();
        return ResponseEntity.ok(ApiResponse.success(stats, "Platform statistics retrieved"));
    }

    /**
     * Get current admin profile
     * GET /api/super-admin/profile
     */
    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<SuperAdminDTO>> getCurrentAdminProfile(
            @AuthenticationPrincipal User currentUser) {
        log.info("Getting admin profile for: {}", currentUser.getEmail());
        SuperAdminDTO admin = superAdminService.getCurrentAdmin(currentUser);
        return ResponseEntity.ok(ApiResponse.success(admin, "Admin profile retrieved"));
    }

    /**
     * Get platform settings
     * GET /api/super-admin/settings
     */
    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<PlatformSettingsResponseDTO>> getPlatformSettings() {
        log.info("Getting platform settings");

        PlatformSettingsResponseDTO settings = superAdminService.getPlatformSettings();

        return ResponseEntity.ok(ApiResponse.success(settings, "Settings retrieved"));
    }

    /**
     * Update platform settings
     * PUT /api/super-admin/settings
     */
    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<PlatformSettingsResponseDTO>> updatePlatformSettings(
            @Valid @RequestBody PlatformSettingsResponseDTO request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Updating platform settings");

        PlatformSettingsResponseDTO settings = superAdminService.updatePlatformSettings(request, currentUser);

        return ResponseEntity.ok(ApiResponse.success(settings, "Settings updated successfully"));
    }

    /**
     * Get complete dashboard data (stats + profile)
     * GET /api/super-admin/dashboard
     */
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboard(
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting super admin dashboard for: {}", currentUser.getEmail());

        PlatformStatsDTO stats = superAdminService.getPlatformStats();
        SuperAdminDTO profile = superAdminService.getCurrentAdmin(currentUser);

        Map<String, Object> dashboard = new java.util.HashMap<>();
        dashboard.put("stats", stats);
        dashboard.put("profile", profile);

        return ResponseEntity.ok(ApiResponse.success(dashboard, "Dashboard data retrieved"));
    }

    // ==========================================
    // Company Approval Management
    // ==========================================

    /**
     * Get companies pending approval
     * GET /api/super-admin/companies/pending
     */
    @GetMapping("/companies/pending")
    public ResponseEntity<ApiResponse<List<CompanyDTO>>> getPendingCompanies() {
        log.info("Getting pending company approvals");

        List<CompanyDTO> companies = superAdminService.getPendingCompanies();

        return ResponseEntity.ok(ApiResponse.success(companies,
                companies.size() + " companies pending approval"));
    }

    /**
     * Get approved companies
     * GET /api/super-admin/companies/approved
     */
    @GetMapping("/companies/approved")
    public ResponseEntity<ApiResponse<List<CompanyDTO>>> getApprovedCompanies() {
        log.info("Getting approved companies");

        List<CompanyDTO> companies = superAdminService.getApprovedCompanies();

        return ResponseEntity.ok(ApiResponse.success(companies,
                "Retrieved " + companies.size() + " approved companies"));
    }

    /**
     * Get rejected companies
     * GET /api/super-admin/companies/rejected
     */
    @GetMapping("/companies/rejected")
    public ResponseEntity<ApiResponse<List<CompanyDTO>>> getRejectedCompanies() {
        log.info("Getting rejected companies");

        List<CompanyDTO> companies = superAdminService.getRejectedCompanies();

        return ResponseEntity.ok(ApiResponse.success(companies,
                "Retrieved " + companies.size() + " rejected companies"));
    }

    /**
     * Get company by ID (for detailed review)
     * GET /api/super-admin/companies/{id}
     */
    @GetMapping("/companies/{id}")
    public ResponseEntity<ApiResponse<CompanyDTO>> getCompanyById(@PathVariable Long id) {
        log.info("Getting company details: {}", id);

        CompanyDTO company = superAdminService.getCompanyById(id);

        return ResponseEntity.ok(ApiResponse.success(company, "Company details retrieved"));
    }

    /**
     * Approve a company
     * POST /api/super-admin/companies/{id}/approve
     */
    @PostMapping("/companies/{id}/approve")
    public ResponseEntity<ApiResponse<CompanyDTO>> approveCompany(
            @PathVariable Long id,
            @RequestBody(required = false) ApproveCompanyRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Approving company: {}", id);

        if (request == null) {
            request = new ApproveCompanyRequest();
        }

        CompanyDTO company = superAdminService.approveCompany(id, request, currentUser);

        return ResponseEntity.ok(ApiResponse.success(company,
                "Company approved with " + request.getCommissionRate() + "% commission"));
    }

    /**
     * Reject a company
     * POST /api/super-admin/companies/{id}/reject
     */
    @PostMapping("/companies/{id}/reject")
    public ResponseEntity<ApiResponse<CompanyDTO>> rejectCompany(
            @PathVariable Long id,
            @Valid @RequestBody RejectCompanyRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Rejecting company: {}", id);

        CompanyDTO company = superAdminService.rejectCompany(id, request, currentUser);

        return ResponseEntity.ok(ApiResponse.success(company, "Company rejected"));
    }

    /**
     * Suspend an approved company
     * POST /api/super-admin/companies/{id}/suspend
     */
    @PostMapping("/companies/{id}/suspend")
    public ResponseEntity<ApiResponse<CompanyDTO>> suspendCompany(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal User currentUser) {

        String reason = request.getOrDefault("reason", "Suspended by admin");

        log.info("Suspending company: {}", id);

        CompanyDTO company = superAdminService.suspendCompany(id, reason, currentUser);

        return ResponseEntity.ok(ApiResponse.success(company, "Company suspended"));
    }

    /**
     * Reactivate a suspended company
     * POST /api/super-admin/companies/{id}/reactivate
     */
    @PostMapping("/companies/{id}/reactivate")
    public ResponseEntity<ApiResponse<CompanyDTO>> reactivateCompany(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        log.info("Reactivating company: {}", id);

        CompanyDTO company = superAdminService.reactivateCompany(id, currentUser);

        return ResponseEntity.ok(ApiResponse.success(company, "Company reactivated"));
    }

    /**
     * Update company commission rate
     * PATCH /api/super-admin/companies/{id}/commission
     */
    @PatchMapping("/companies/{id}/commission")
    public ResponseEntity<ApiResponse<CompanyDTO>> updateCompanyCommission(
            @PathVariable Long id,
            @RequestBody Map<String, BigDecimal> request,
            @AuthenticationPrincipal User currentUser) {

        BigDecimal commissionRate = request.get("commissionRate");
        if (commissionRate == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Commission rate is required"));
        }

        log.info("Updating commission for company {}: {}%", id, commissionRate);

        CompanyDTO company = superAdminService.updateCompanyCommission(id, commissionRate, currentUser);

        return ResponseEntity.ok(ApiResponse.success(company,
                "Commission updated to " + commissionRate + "%"));
    }

    // ==========================================
    // User Management
    // ==========================================

    /**
     * Get all users with filters
     * GET /api/super-admin/users?userType=CUSTOMER&isActive=true
     */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserListDTO>>> getAllUsers(
            @RequestParam(required = false) UserType userType,
            @RequestParam(required = false) Boolean isActive) {

        log.info("Getting users - type: {}, active: {}", userType, isActive);

        List<UserListDTO> users = superAdminService.getAllUsers(userType, isActive);

        return ResponseEntity.ok(ApiResponse.success(users,
                "Retrieved " + users.size() + " users"));
    }

    /**
     * Get user details by ID
     * GET /api/super-admin/users/{id}
     */
    @GetMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserListDTO>> getUserById(@PathVariable Long id) {
        log.info("Getting user details: {}", id);

        UserListDTO user = superAdminService.getUserById(id);

        return ResponseEntity.ok(ApiResponse.success(user, "User details retrieved"));
    }

    /**
     * Update user status (suspend/activate)
     * PATCH /api/super-admin/users/{id}/status
     */
    @PatchMapping("/users/{id}/status")
    public ResponseEntity<ApiResponse<UserListDTO>> updateUserStatus(
            @PathVariable Long id,
            @RequestBody UpdateUserStatusRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Updating user {} status to: {}", id, request.getIsActive());

        UserListDTO user = superAdminService.updateUserStatus(id, request, currentUser);

        String action = request.getIsActive() ? "activated" : "suspended";
        return ResponseEntity.ok(ApiResponse.success(user, "User " + action));
    }

    /**
     * Delete user (soft delete)
     * DELETE /api/super-admin/users/{id}
     */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        log.info("Deleting user: {}", id);

        superAdminService.deleteUser(id, currentUser);

        return ResponseEntity.ok(ApiResponse.success(null, "User deleted"));
    }

    // ==========================================
    // Admin Management
    // ==========================================

    /**
     * Get all super admins
     * GET /api/super-admin/admins
     */
    @GetMapping("/admins")
    public ResponseEntity<ApiResponse<List<SuperAdminDTO>>> getAllAdmins() {
        log.info("Getting all super admins");

        List<SuperAdminDTO> admins = superAdminService.getAllSuperAdmins();

        return ResponseEntity.ok(ApiResponse.success(admins,
                "Retrieved " + admins.size() + " admins"));
    }

    /**
     * Create new super admin
     * POST /api/super-admin/admins
     */
    @PostMapping("/admins")
    public ResponseEntity<ApiResponse<SuperAdminDTO>> createSuperAdmin(
            @Valid @RequestBody CreateSuperAdminRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Creating new admin: {}", request.getEmail());

        SuperAdminDTO admin = superAdminService.createSuperAdmin(request, currentUser);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(admin, "Admin created successfully"));
    }

    // ==========================================
    // Content Moderation
    // ==========================================

    /**
     * Get flagged ratings
     * GET /api/super-admin/ratings/flagged
     */
    @GetMapping("/ratings/flagged")
    public ResponseEntity<ApiResponse<List<RatingDTO>>> getFlaggedRatings() {
        log.info("Getting flagged ratings");

        List<RatingDTO> ratings = superAdminService.getFlaggedRatings();

        return ResponseEntity.ok(ApiResponse.success(ratings,
                ratings.size() + " flagged ratings"));
    }

    /**
     * Unflag a rating
     * POST /api/super-admin/ratings/{id}/unflag
     */
    @PostMapping("/ratings/{id}/unflag")
    public ResponseEntity<ApiResponse<Void>> unflagRating(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        log.info("Unflagging rating: {}", id);

        superAdminService.unflagRating(id, currentUser);

        return ResponseEntity.ok(ApiResponse.success(null, "Rating unflagged"));
    }

    /**
     * Remove a rating from public view
     * POST /api/super-admin/ratings/{id}/remove
     */
    @PostMapping("/ratings/{id}/remove")
    public ResponseEntity<ApiResponse<Void>> removeRating(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        log.info("Removing rating from public: {}", id);

        superAdminService.removeRating(id, currentUser);

        return ResponseEntity.ok(ApiResponse.success(null, "Rating removed from public view"));
    }

    // ==========================================
    // Notifications
    // ==========================================

    /**
     * Get all platform notifications
     * GET /api/super-admin/notifications
     */
    @GetMapping("/notifications")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getNotifications(
            @RequestParam(defaultValue = "50") int limit) {

        log.info("Getting platform notifications (limit: {})", limit);

        List<NotificationDTO> notifications = superAdminService.getAllNotifications();

        return ResponseEntity.ok(ApiResponse.success(notifications,
                notifications.size() + " notifications retrieved"));
    }

    /**
     * Mark notification as read
     * POST /api/super-admin/notifications/{id}/read
     */
    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markNotificationRead(@PathVariable Long id) {

        log.info("Marking notification as read: {}", id);

        superAdminService.markNotificationRead(id);

        return ResponseEntity.ok(ApiResponse.success(null, "Notification marked as read"));
    }

    // ==========================================
    // Action Logs
    // ==========================================

    /**
     * Get admin action logs
     * GET /api/super-admin/logs?type=COMPANY&limit=50
     */
    @GetMapping("/logs")
    public ResponseEntity<ApiResponse<List<AdminActionLogDTO>>> getActionLogs(
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) String search) {

        log.info("Getting action logs (type: {}, limit: {}, search: {})", type, limit, search);

        List<AdminActionLogDTO> logs;
        if (search != null && !search.isEmpty()) {
            logs = superAdminService.searchActionLogs(search);
        } else {
            logs = superAdminService.getActionLogs(type, limit);
        }

        return ResponseEntity.ok(ApiResponse.success(logs,
                logs.size() + " action logs retrieved"));
    }

    // ==========================================
    // Messaging
    // ==========================================

    /**
     * Send bulk email to companies/customers
     * POST /api/super-admin/messaging/send
     */
    @PostMapping("/messaging/send")
    public ResponseEntity<ApiResponse<EmailLogDTO>> sendBulkEmail(
            @Valid @RequestBody SendBulkEmailRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Sending bulk email - type: {}, sendToAll: {}",
                request.getRecipientType(), request.isSendToAll());

        EmailLogDTO result = superAdminService.sendBulkEmail(request, currentUser);

        if (result == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("No recipients found"));
        }

        return ResponseEntity.ok(ApiResponse.success(result, "Email sent successfully"));
    }

    /**
     * Get email history
     * GET /api/super-admin/messaging/history
     */
    @GetMapping("/messaging/history")
    public ResponseEntity<ApiResponse<List<EmailLogDTO>>> getEmailHistory(
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "50") int limit) {

        log.info("Getting email history - type: {}, limit: {}", type, limit);

        List<EmailLogDTO> history = superAdminService.getEmailHistory(type, limit);

        return ResponseEntity.ok(ApiResponse.success(history,
                history.size() + " emails retrieved"));
    }

    /**
     * Search companies for messaging
     * GET /api/super-admin/search/companies?q=
     */
    @GetMapping("/search/companies")
    public ResponseEntity<ApiResponse<List<CompanyDTO>>> searchCompanies(
            @RequestParam(required = false, defaultValue = "") String q) {

        log.info("Searching companies: {}", q);

        List<CompanyDTO> companies = superAdminService.searchCompanies(q);

        return ResponseEntity.ok(ApiResponse.success(companies,
                companies.size() + " companies found"));
    }

    /**
     * Search customers for messaging
     * GET /api/super-admin/search/customers?q=
     */
    @GetMapping("/search/customers")
    public ResponseEntity<ApiResponse<List<CustomerDTO>>> searchCustomers(
            @RequestParam(required = false, defaultValue = "") String q) {

        log.info("Searching customers: {}", q);

        List<CustomerDTO> customers = superAdminService.searchCustomers(q);

        return ResponseEntity.ok(ApiResponse.success(customers,
                customers.size() + " customers found"));
    }

    // ==========================================
    // Cancellation Analytics
    // ==========================================

    /**
     * Get cancellation statistics
     * GET /api/super-admin/stats/cancellations
     */
    @GetMapping("/stats/cancellations")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCancellationStats() {

        log.info("Getting cancellation statistics");

        Map<String, Object> stats = superAdminService.getCancellationStats();

        return ResponseEntity.ok(ApiResponse.success(stats, "Cancellation stats retrieved"));
    }

    // ==========================================
    // Login Activity Logs
    // ==========================================

    /**
     * Get recent login activity logs
     * GET /api/super-admin/login-activity
     */
    @GetMapping("/login-activity")
    public ResponseEntity<ApiResponse<List<LoginActivityDTO>>> getLoginActivity(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        log.info("Getting login activity logs, page: {}, size: {}", page, size);

        List<LoginActivityDTO> activities = superAdminService.getLoginActivities(page, size);

        return ResponseEntity.ok(ApiResponse.success(activities,
                activities.size() + " login activities retrieved"));
    }
}