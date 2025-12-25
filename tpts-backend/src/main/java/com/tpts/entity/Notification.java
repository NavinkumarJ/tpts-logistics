package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Notification Entity
 * Stores all notifications sent to users via SMS, Email, Push, In-App
 */
@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notification_user", columnList = "user_id"),
        @Index(name = "idx_notification_type", columnList = "type"),
        @Index(name = "idx_notification_read", columnList = "is_read"),
        @Index(name = "idx_notification_created", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ==========================================
    // Recipient
    // ==========================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Recipient contact info (denormalized for delivery)
    @Column(name = "recipient_email", length = 100)
    private String recipientEmail;

    @Column(name = "recipient_phone", length = 15)
    private String recipientPhone;

    // ==========================================
    // Notification Content
    // ==========================================

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "short_message", length = 160)
    private String shortMessage; // For SMS (160 char limit)

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private NotificationType type;

    // ==========================================
    // Delivery Channel
    // ==========================================

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 20)
    private NotificationChannel channel;

    // ==========================================
    // Reference (Related Entity)
    // ==========================================

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "reference_type", length = 50)
    private String referenceType; // PARCEL, GROUP, PAYMENT, etc.

    // ==========================================
    // Delivery Status
    // ==========================================

    @Column(name = "is_sent")
    @Builder.Default
    private Boolean isSent = false;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "is_delivered")
    @Builder.Default
    private Boolean isDelivered = false;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "is_read")
    @Builder.Default
    private Boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    // ==========================================
    // External Provider Info
    // ==========================================

    @Column(name = "provider", length = 50)
    private String provider; // TWILIO, SENDGRID, FCM

    @Column(name = "provider_message_id", length = 100)
    private String providerMessageId;

    @Column(name = "provider_status", length = 50)
    private String providerStatus;

    // ==========================================
    // Error Handling
    // ==========================================

    @Column(name = "is_failed")
    @Builder.Default
    private Boolean isFailed = false;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "max_retries")
    @Builder.Default
    private Integer maxRetries = 3;

    @Column(name = "next_retry_at")
    private LocalDateTime nextRetryAt;

    // ==========================================
    // Metadata
    // ==========================================

    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata; // JSON for additional data

    @Column(name = "priority")
    @Builder.Default
    private Integer priority = 5; // 1=highest, 10=lowest

    // ==========================================
    // Timestamps
    // ==========================================

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    public void markAsSent(String messageId) {
        this.isSent = true;
        this.sentAt = LocalDateTime.now();
        this.providerMessageId = messageId;
    }

    public void markAsDelivered() {
        this.isDelivered = true;
        this.deliveredAt = LocalDateTime.now();
    }

    public void markAsRead() {
        this.isRead = true;
        this.readAt = LocalDateTime.now();
    }

    public void markAsFailed(String reason) {
        this.isFailed = true;
        this.failureReason = reason;
        this.retryCount++;
        if (this.retryCount < this.maxRetries) {
            // Exponential backoff: 1min, 5min, 15min
            int delayMinutes = (int) Math.pow(5, this.retryCount);
            this.nextRetryAt = LocalDateTime.now().plusMinutes(delayMinutes);
        }
    }

    public boolean canRetry() {
        return !isSent && retryCount < maxRetries &&
                (nextRetryAt == null || LocalDateTime.now().isAfter(nextRetryAt));
    }
}