package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * SuperAdmin Entity - Platform administrators
 * Links to User entity via user_id foreign key
 */
@Entity
@Table(name = "super_admins")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SuperAdmin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "role", length = 50)
    @Builder.Default
    private String role = "ADMIN"; // ADMIN, SUPER_ADMIN, MODERATOR

    // Permissions (JSON or comma-separated)
    @Column(name = "permissions", columnDefinition = "TEXT")
    private String permissions;

    // Activity tracking
    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "last_action")
    private String lastAction;

    @Column(name = "last_action_at")
    private LocalDateTime lastActionAt;

    // Two-factor auth
    @Column(name = "two_factor_enabled")
    @Builder.Default
    private Boolean twoFactorEnabled = false;

    @Column(name = "two_factor_secret", length = 100)
    private String twoFactorSecret;

    // Notes
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // Timestamps
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

    // Helper methods
    public void recordAction(String action) {
        this.lastAction = action;
        this.lastActionAt = LocalDateTime.now();
    }

    public void recordLogin() {
        this.lastLoginAt = LocalDateTime.now();
    }
}