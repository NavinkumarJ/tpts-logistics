package com.tpts.dto.response;

import com.tpts.entity.EarningStatus;
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
public class EarningDTO {

    private Long id;
    private Long parcelId;
    private String trackingNumber;

    // Company details
    private Long companyId;
    private String companyName;

    // Agent details
    private Long agentId;
    private String agentName;

    // Amount breakdown
    private BigDecimal orderAmount;
    private BigDecimal platformCommissionRate;
    private BigDecimal platformCommission;
    private BigDecimal companyEarning;
    private BigDecimal agentCommissionRate;
    private BigDecimal agentEarning;
    private BigDecimal companyNetEarning;
    private BigDecimal agentBonus;
    private BigDecimal customerTip;
    private BigDecimal totalAgentEarning;

    private EarningStatus status;
    private LocalDateTime clearedAt;
    private LocalDateTime createdAt;

    // Route info
    private String pickupCity;
    private String deliveryCity;
}