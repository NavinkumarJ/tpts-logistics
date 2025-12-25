// src/main/java/com/tpts/entity/PlatformSettings.java
package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "platform_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Commission Settings
    @Column(nullable = false)
    @Builder.Default
    private BigDecimal defaultCommissionRate = BigDecimal.valueOf(5.0);

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal minCommissionRate = BigDecimal.valueOf(1.0);

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal maxCommissionRate = BigDecimal.valueOf(50.0);

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal groupBuyCommissionRate = BigDecimal.valueOf(2.0);

    // Group Buy Rules
    @Column(nullable = false)
    @Builder.Default
    private Integer minGroupMembers = 5;

    @Column(nullable = false)
    @Builder.Default
    private Integer maxGroupMembers = 50;

    @Column(nullable = false)
    @Builder.Default
    private Integer defaultGroupDeadlineHours = 24;

    @Column(nullable = false)
    @Builder.Default
    private Integer minGroupDeadlineHours = 6;

    @Column(nullable = false)
    @Builder.Default
    private Integer maxGroupDeadlineHours = 72;

    @Column(nullable = false)
    @Builder.Default
    private Integer groupDiscountPercentage = 30;

    // Pricing Rules
    @Column(nullable = false)
    @Builder.Default
    private BigDecimal minDeliveryCharge = BigDecimal.valueOf(50.0);

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal maxDeliveryCharge = BigDecimal.valueOf(5000.0);

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal minWeightKg = BigDecimal.valueOf(0.1);

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal maxWeightKg = BigDecimal.valueOf(100.0);

    // Platform Features
    @Column(nullable = false)
    @Builder.Default
    private Boolean allowPublicTracking = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean allowGroupShipments = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean allowJobApplications = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean maintenanceMode = false;

    // Notification Settings
    @Column(nullable = false)
    @Builder.Default
    private Boolean smsEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean emailEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean pushNotificationsEnabled = true;

    // Integration Keys (encrypted in production)
    @Column(length = 500)
    private String razorpayKeyId;

    @Column(length = 500)
    private String razorpayKeySecret;

    @Column(length = 500)
    private String twilioAccountSid;

    @Column(length = 500)
    private String twilioAuthToken;

    @Column(length = 255)
    private String smtpHost;

    @Column
    @Builder.Default
    private Integer smtpPort = 587;

    @Column(length = 255)
    private String smtpUsername;

    @Column(length = 500)
    private String smtpPassword;

    // Audit
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column
    private Long updatedBy; // User ID who last updated

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
