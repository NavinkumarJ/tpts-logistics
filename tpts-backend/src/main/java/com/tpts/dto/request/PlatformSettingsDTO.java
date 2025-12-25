package com.tpts.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for Platform Settings
 * GET/PUT /api/super-admin/settings
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformSettingsDTO {

    // Commission settings
    private BigDecimal defaultCommissionRate;
    private BigDecimal minCommissionRate;
    private BigDecimal maxCommissionRate;

    // Pricing limits
    private BigDecimal minDeliveryRate;
    private BigDecimal maxDeliveryRate;

    // Group buy settings
    private Integer minGroupMembers;
    private Integer maxGroupMembers;
    private Integer minGroupDeadlineHours;
    private Integer maxGroupDeadlineHours;
    private BigDecimal minGroupDiscount;
    private BigDecimal maxGroupDiscount;

    // Payment settings
    private Boolean codEnabled;
    private BigDecimal codFee;
    private BigDecimal minOrderAmount;

    // Agent settings
    private Integer maxActiveOrdersPerAgent;
    private Integer agentResponseTimeoutMinutes;

    // Rating settings
    private Boolean ratingsEnabled;
    private Integer ratingEditWindowHours;

    // Notifications
    private Boolean smsEnabled;
    private Boolean emailEnabled;
    private Boolean pushEnabled;
}