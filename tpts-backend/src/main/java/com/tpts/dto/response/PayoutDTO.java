package com.tpts.dto.response;

import com.tpts.entity.PayoutMethod;
import com.tpts.entity.PayoutStatus;
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
public class PayoutDTO {

    private Long id;
    private String payoutId;
    private Long userId;
    private String userName;
    private String userType;

    private BigDecimal amount;
    private PayoutStatus status;
    private PayoutMethod payoutMethod;

    // Bank details (masked)
    private String bankName;
    private String maskedAccountNumber;
    private String ifscCode;
    private String accountHolderName;
    private String upiId;

    // Processing
    private LocalDateTime processedAt;
    private String transactionReference;
    private String rejectionReason;

    private LocalDateTime createdAt;

    // Status display
    private String statusLabel;
    private String statusColor; // For UI
}