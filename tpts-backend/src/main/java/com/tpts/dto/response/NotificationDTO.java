package com.tpts.dto.response;

import com.tpts.entity.NotificationChannel;
import com.tpts.entity.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for Notification response
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDTO {

    private Long id;
    private Long userId;

    // Content
    private String title;
    private String message;
    private NotificationType type;
    private NotificationChannel channel;

    // Reference
    private Long referenceId;
    private String referenceType;

    // Status
    private Boolean isRead;
    private LocalDateTime readAt;
    private Boolean isSent;
    private LocalDateTime sentAt;

    // Timestamps
    private LocalDateTime createdAt;

    // Helper for frontend
    private String timeAgo;
    private String icon;
    private String actionUrl;
}