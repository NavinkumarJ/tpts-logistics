package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * AdminActionLog Entity
 * Stores audit trail of all admin actions for compliance and tracking
 */
@Entity
@Table(name = "admin_action_logs", indexes = {
        @Index(name = "idx_admin_log_user", columnList = "user_id"),
        @Index(name = "idx_admin_log_action", columnList = "action_type"),
        @Index(name = "idx_admin_log_created", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminActionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "user_email", length = 100)
    private String userEmail;

    @Column(name = "action_type", nullable = false, length = 50)
    private String actionType; // COMPANY, USER, SETTINGS, MODERATION, ADMIN

    @Column(name = "action", nullable = false, length = 500)
    private String action;

    @Column(name = "target_id")
    private Long targetId;

    @Column(name = "target_type", length = 50)
    private String targetType; // COMPANY, USER, RATING, SETTINGS, etc.

    @Column(name = "target_name", length = 200)
    private String targetName;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details; // JSON for additional details

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
