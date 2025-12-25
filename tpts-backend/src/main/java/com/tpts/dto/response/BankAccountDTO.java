package com.tpts.dto.response;

import com.tpts.entity.AccountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankAccountDTO {

    private Long id;
    private String bankName;
    private String branchName;
    private String maskedAccountNumber;
    private String ifscCode;
    private String accountHolderName;
    private AccountType accountType;
    private String upiId;
    private Boolean isVerified;
    private Boolean isPrimary;
    private Boolean isActive;
    private String label;
    private String displayName;
    private LocalDateTime createdAt;
}