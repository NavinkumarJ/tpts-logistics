package com.tpts.dto.response;

import com.tpts.entity.TransactionStatus;
import com.tpts.entity.TransactionType;
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
public class TransactionDTO {

    private Long id;
    private String transactionId;
    private Long walletId;
    private TransactionType transactionType;
    private BigDecimal amount;
    private BigDecimal balanceAfter;
    private String description;
    private String referenceType;
    private Long referenceId;
    private TransactionStatus status;
    private LocalDateTime createdAt;

    // Computed fields
    private Boolean isCredit;
    private String formattedAmount; // "+₹500" or "-₹100"
    private String timeAgo;
}