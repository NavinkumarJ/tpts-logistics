package com.tpts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for Company Admin Dashboard
 * GET /api/company/dashboard
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyDashboardDTO {

    private CompanyDTO company;
    private DashboardStats stats;
    private OrderStats orderStats;
    private AgentStats agentStats;

    // Lists for dashboard sections
    private List<ParcelDTO> recentShipments; // Top 2 completed/recent parcels
    private List<AgentDTO> activeAgents; // Top 2 active agents alphabetically
    private List<JobApplicationDTO> pendingApplications; // Pending job applications

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DashboardStats {
        private Integer totalOrders;
        private Integer activeOrders;
        private Integer completedOrders;
        private Integer cancelledOrders;
        private Integer pendingOrders;
        private BigDecimal totalRevenue; // Company's net revenue
        private BigDecimal totalOrderAmount; // Full customer payment (basePrice + GST = 100%)
        private BigDecimal platformCommission; // Total platform commission (10%)
        private BigDecimal agentEarning; // Total agent earnings (20%)
        private BigDecimal todayRevenue;
        private BigDecimal ratingAvg;
        private String avgDeliveryTime; // Calculated average delivery time
        private Integer onTimeDeliveryRate; // Percentage of on-time deliveries
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderStats {
        private Integer pendingAssignment;
        private Integer inTransit;
        private Integer deliveredToday;
        private Integer cancelledToday;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AgentStats {
        private Integer totalAgents;
        private Integer activeAgents;
        private Integer availableAgents;
        private Integer pendingApplications;
    }
}