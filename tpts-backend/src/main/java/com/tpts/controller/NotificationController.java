package com.tpts.controller;

import com.tpts.dto.request.SendBulkNotificationRequest;
import com.tpts.dto.request.SendNotificationRequest;
import com.tpts.dto.response.ApiResponse;
import com.tpts.dto.response.NotificationDTO;
import com.tpts.entity.User;
import com.tpts.service.NotificationService;
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
 * Notification Controller
 * Handles user notifications - SMS, Email, Push, In-App
 *
 * User Endpoints (all authenticated users):
 * - GET  /api/notifications                    - Get my notifications
 * - GET  /api/notifications/in-app             - Get in-app notifications
 * - GET  /api/notifications/unread             - Get unread notifications
 * - GET  /api/notifications/unread/count       - Get unread count
 * - POST /api/notifications/{id}/read          - Mark as read
 * - POST /api/notifications/read-all           - Mark all as read
 *
 * Admin Endpoints (Super Admin only):
 * - POST /api/notifications/send               - Send notification to user
 * - POST /api/notifications/send-bulk          - Send bulk notifications
 * - POST /api/notifications/test-sms           - Test SMS
 * - POST /api/notifications/test-email         - Test Email
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;

    // ==========================================
    // User Endpoints (All Authenticated Users)
    // ==========================================

    /**
     * Get my notifications
     * GET /api/notifications
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getMyNotifications(
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting notifications for user: {}", currentUser.getEmail());

        List<NotificationDTO> notifications = notificationService.getUserNotifications(currentUser);

        return ResponseEntity.ok(ApiResponse.success(notifications,
                "Retrieved " + notifications.size() + " notifications"));
    }

    /**
     * Get in-app notifications
     * GET /api/notifications/in-app
     */
    @GetMapping("/in-app")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getInAppNotifications(
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting in-app notifications for user: {}", currentUser.getEmail());

        List<NotificationDTO> notifications = notificationService.getInAppNotifications(currentUser);

        return ResponseEntity.ok(ApiResponse.success(notifications,
                "Retrieved " + notifications.size() + " in-app notifications"));
    }

    /**
     * Get unread notifications
     * GET /api/notifications/unread
     */
    @GetMapping("/unread")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getUnreadNotifications(
            @AuthenticationPrincipal User currentUser) {

        List<NotificationDTO> notifications = notificationService.getUnreadNotifications(currentUser);

        return ResponseEntity.ok(ApiResponse.success(notifications,
                notifications.size() + " unread notifications"));
    }

    /**
     * Get unread notification count
     * GET /api/notifications/unread/count
     */
    @GetMapping("/unread/count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(
            @AuthenticationPrincipal User currentUser) {

        long count = notificationService.getUnreadCount(currentUser);

        return ResponseEntity.ok(ApiResponse.success(
                Map.of("unreadCount", count),
                "Unread count retrieved"));
    }

    /**
     * Mark notification as read
     * POST /api/notifications/{id}/read
     */
    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        log.info("Marking notification {} as read", id);

        notificationService.markAsRead(id, currentUser);

        return ResponseEntity.ok(ApiResponse.success(null, "Notification marked as read"));
    }

    /**
     * Mark all notifications as read
     * POST /api/notifications/read-all
     */
    @PostMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            @AuthenticationPrincipal User currentUser) {

        log.info("Marking all notifications as read for user: {}", currentUser.getEmail());

        notificationService.markAllAsRead(currentUser);

        return ResponseEntity.ok(ApiResponse.success(null, "All notifications marked as read"));
    }

    // ==========================================
    // Admin Endpoints (Super Admin Only)
    // ==========================================

    /**
     * Send notification to a user
     * POST /api/notifications/send
     */
    @PostMapping("/send")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<NotificationDTO>> sendNotification(
            @Valid @RequestBody SendNotificationRequest request) {

        log.info("Sending {} notification to user {}: {}",
                request.getChannel(), request.getUserId(), request.getTitle());

        NotificationDTO notification = notificationService.sendNotification(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(notification, "Notification sent"));
    }

    /**
     * Send bulk notifications
     * POST /api/notifications/send-bulk
     */
    @PostMapping("/send-bulk")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> sendBulkNotification(
            @Valid @RequestBody SendBulkNotificationRequest request) {

        log.info("Sending bulk {} notifications: {}", request.getChannel(), request.getTitle());

        List<NotificationDTO> notifications = notificationService.sendBulkNotification(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(notifications,
                        "Sent " + notifications.size() + " notifications"));
    }

    /**
     * Test SMS notification
     * POST /api/notifications/test-sms
     */
    @PostMapping("/test-sms")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<NotificationDTO>> testSms(
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User currentUser) {

        String message = (String) request.getOrDefault("message", "This is a test SMS from TPTS");

        log.info("Sending test SMS to admin: {}", currentUser.getPhone());

        SendNotificationRequest smsRequest = SendNotificationRequest.builder()
                .userId(currentUser.getId())
                .title("Test SMS")
                .message(message)
                .shortMessage(message)
                .type(com.tpts.entity.NotificationType.SYSTEM_ALERT)
                .channel(com.tpts.entity.NotificationChannel.SMS)
                .priority(1)
                .build();

        NotificationDTO notification = notificationService.sendNotification(smsRequest);

        return ResponseEntity.ok(ApiResponse.success(notification, "Test SMS sent"));
    }

    /**
     * Test Email notification
     * POST /api/notifications/test-email
     */
    @PostMapping("/test-email")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<NotificationDTO>> testEmail(
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User currentUser) {

        String subject = (String) request.getOrDefault("subject", "Test Email from TPTS");
        String message = (String) request.getOrDefault("message",
                "This is a test email from TPTS notification system.\n\nIf you received this, email notifications are working correctly!");

        log.info("Sending test email to admin: {}", currentUser.getEmail());

        SendNotificationRequest emailRequest = SendNotificationRequest.builder()
                .userId(currentUser.getId())
                .title(subject)
                .message(message)
                .type(com.tpts.entity.NotificationType.SYSTEM_ALERT)
                .channel(com.tpts.entity.NotificationChannel.EMAIL)
                .priority(1)
                .build();

        NotificationDTO notification = notificationService.sendNotification(emailRequest);

        return ResponseEntity.ok(ApiResponse.success(notification, "Test email sent"));
    }
}