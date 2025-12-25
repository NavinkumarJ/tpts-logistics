package com.tpts.dto.response;

import com.tpts.entity.WalletType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WalletDTO {

    private Long id;
    private Long userId;
    private WalletType walletType;
    private BigDecimal availableBalance;
    private BigDecimal pendingBalance;
    private BigDecimal totalBalance;
    private BigDecimal totalEarnings;
    private BigDecimal totalWithdrawn;
    private String currency;
    private Boolean isActive;
    private LocalDateTime createdAt;

    // Additional stats
    private Long totalTransactions;
    private BigDecimal todayEarnings;
    private BigDecimal thisWeekEarnings;
    private BigDecimal thisMonthEarnings;
}