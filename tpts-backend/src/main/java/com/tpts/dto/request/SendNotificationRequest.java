package com.tpts.dto.request;

import com.tpts.entity.NotificationChannel;
import com.tpts.entity.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for sending a notification
 * POST /api/notifications/send
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SendNotificationRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Message is required")
    private String message;

    private String shortMessage; // For SMS

    @NotNull(message = "Notification type is required")
    private NotificationType type;

    @NotNull(message = "Channel is required")
    private NotificationChannel channel;

    // Optional reference
    private Long referenceId;
    private String referenceType;

    // Priority (1-10, default 5)
    @Builder.Default
    private Integer priority = 5;

    // Additional metadata (JSON)
    private String metadata;
}