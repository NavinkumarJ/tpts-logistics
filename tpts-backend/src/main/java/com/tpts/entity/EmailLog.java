package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * EmailLog Entity
 * Tracks all bulk/admin emails sent for history and audit
 */
@Entity
@Table(name = "email_logs", indexes = {
        @Index(name = "idx_email_log_sender", columnList = "sender_user_id"),
        @Index(name = "idx_email_log_recipient_type", columnList = "recipient_type"),
        @Index(name = "idx_email_log_sent_at", columnList = "sent_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_user_id")
    private User senderUser;

    @Column(name = "sender_name", length = 100)
    private String senderName;

    @Column(name = "sender_email", length = 100)
    private String senderEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "recipient_type", nullable = false, length = 20)
    private EmailRecipientType recipientType;

    @Column(name = "recipient_id")
    private Long recipientId; // null if sent to all

    @Column(name = "recipient_email", length = 100)
    private String recipientEmail;

    @Column(name = "recipient_name", length = 100)
    private String recipientName;

    @Column(name = "recipient_count")
    private Integer recipientCount; // for bulk emails

    @Column(name = "subject", nullable = false, length = 200)
    private String subject;

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private EmailLogStatus status = EmailLogStatus.PENDING;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum EmailRecipientType {
        COMPANY,
        CUSTOMER,
        AGENT
    }

    public enum EmailLogStatus {
        PENDING,
        SENT,
        FAILED,
        PARTIAL // some sent, some failed
    }
}
