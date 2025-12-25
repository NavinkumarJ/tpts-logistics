package com.tpts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for Agent Dashboard
 * GET /api/agents/dashboard
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentDashboardDTO {

    private AgentDTO agent;
    private DashboardStats stats;
    private TodayStats todayStats;
    private EarningsStats earnings;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DashboardStats {
        private Integer totalDeliveries;
        private Integer pendingDeliveries;
        private Integer completedDeliveries;
        private BigDecimal ratingAvg;
        private Integer totalRatings;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TodayStats {
        private Integer deliveriesToday;
        private Integer pendingToday;
        private Integer completedToday;
        private BigDecimal distanceTodayKm;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EarningsStats {
        private BigDecimal todayEarnings;
        private BigDecimal weeklyEarnings;
        private BigDecimal monthlyEarnings;
        private BigDecimal totalEarnings;
        private BigDecimal pendingPayout;
    }
}