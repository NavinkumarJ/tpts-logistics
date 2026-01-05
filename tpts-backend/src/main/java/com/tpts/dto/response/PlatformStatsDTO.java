package com.tpts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for Platform Statistics (Super Admin Dashboard)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformStatsDTO {

    // User counts
    private Long totalUsers;
    private Long totalCustomers;
    private Long totalCompanies;
    private Long totalAgents;
    private Long totalSuperAdmins;
    private Long activeUsersToday; // ADD THIS

    // Company stats
    private Long pendingCompanyApprovals;
    private Long approvedCompanies;
    private Long rejectedCompanies;
    private Long hiringCompanies;

    // Parcel stats (raw parcel counts)
    private Long totalParcels;
    private Long pendingParcels;
    private Long inTransitParcels;
    private Long deliveredParcels;
    private Long todayParcels;

    // Order stats (groups counted as 1 order)
    private Long totalOrders; // regularOrders + groupBuyOrders
    private Long regularOrders; // Parcels not in any group
    private Long groupBuyOrders; // Number of groups (not parcels in groups)
    private Long completedOrders; // Delivered orders
    private Long cancelledOrders; // Cancelled orders

    // Group stats
    private Long totalGroups;
    private Long openGroups;
    private Long activeGroups;
    private Long activeGroupShipments; // ADD THIS
    private Long completedGroups;

    // Financial Statistics - ADD THESE
    private BigDecimal totalRevenue;
    private BigDecimal commissionEarned;
    private BigDecimal todayRevenue;
    private BigDecimal weeklyRevenue;
    private BigDecimal monthlyRevenue;

    // Payment stats
    private BigDecimal totalRefunds;
    private Long successfulPayments;
    private Long pendingPayments;

    // Job application stats
    private Long totalApplications;
    private Long pendingApplications;
    private Long hiredApplications;

    // Rating stats
    private Long totalRatings;
    private Double averagePlatformRating;
    private Long flaggedRatings; // ADD THIS

    // Agent Statistics - ADD THESE
    private Long activeAgents;
    private Long availableAgents;

    // Cancellation Statistics
    private Long cancelledParcels;
    private Double cancellationRate; // Percentage of total parcels that were cancelled
    private Long cancelledByCustomer;
    private Long cancelledByCompany;
    private Long cancelledByAgent;
    private Long cancelledByAdmin;
}