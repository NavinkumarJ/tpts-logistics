package com.tpts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EarningsSummaryDTO {

    // Balances
    private BigDecimal availableBalance;
    private BigDecimal pendingBalance;
    private BigDecimal totalBalance;

    // Earnings
    private BigDecimal todayEarnings;
    private BigDecimal thisWeekEarnings;
    private BigDecimal thisMonthEarnings;
    private BigDecimal totalEarnings;

    // Withdrawals
    private BigDecimal totalWithdrawn;
    private BigDecimal pendingPayout;

    // Stats
    private Long todayDeliveries;
    private Long thisWeekDeliveries;
    private Long thisMonthDeliveries;
    private Long totalDeliveries;

    // Pending clearance info
    private Long pendingEarningsCount;
    private BigDecimal pendingEarningsAmount;

    // For platform admin
    private BigDecimal totalPlatformCommission;
    private BigDecimal totalCompanyPayouts;
    private BigDecimal totalAgentPayouts;
}