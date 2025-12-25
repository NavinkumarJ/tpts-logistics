// src/main/java/com/tpts/dto/response/PlatformSettingsResponseDTO.java
package com.tpts.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO for Platform Settings
 * Used by Super Admin to view/update platform configuration
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformSettingsResponseDTO {

    // Commission Settings
    private BigDecimal defaultCommissionRate;
    private BigDecimal minCommissionRate;
    private BigDecimal maxCommissionRate;
    private BigDecimal groupBuyCommissionRate;

    // Group Buy Rules
    private Integer minGroupMembers;
    private Integer maxGroupMembers;
    private Integer defaultGroupDeadlineHours;
    private Integer minGroupDeadlineHours;
    private Integer maxGroupDeadlineHours;
    private Integer groupDiscountPercentage;

    // Pricing Rules
    private BigDecimal minDeliveryCharge;
    private BigDecimal maxDeliveryCharge;
    private BigDecimal minWeightKg;
    private BigDecimal maxWeightKg;

    // Platform Features
    private Boolean allowPublicTracking;
    private Boolean allowGroupShipments;
    private Boolean allowJobApplications;
    private Boolean maintenanceMode;

    // Notification Settings
    private Boolean smsEnabled;
    private Boolean emailEnabled;
    private Boolean pushNotificationsEnabled;

    // Integration Keys (masked for security)
    private String razorpayKeyId;
    private String twilioAccountSid;
    private String smtpHost;
    private Integer smtpPort;

    // Audit
    private LocalDateTime updatedAt;
    private Long updatedBy;
}
