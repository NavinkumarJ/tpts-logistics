package com.tpts.dto.request;

import com.tpts.entity.NotificationChannel;
import com.tpts.entity.NotificationType;
import com.tpts.entity.UserType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for sending bulk notifications
 * POST /api/notifications/send-bulk
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SendBulkNotificationRequest {

    // Either userIds OR userType (for broadcasting)
    private List<Long> userIds;
    private UserType userType; // Send to all users of this type

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Message is required")
    private String message;

    private String shortMessage;

    @NotNull(message = "Notification type is required")
    private NotificationType type;

    @NotNull(message = "Channel is required")
    private NotificationChannel channel;

    @Builder.Default
    private Integer priority = 5;
}