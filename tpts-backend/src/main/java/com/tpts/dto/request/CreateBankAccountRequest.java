package com.tpts.dto.request;

import com.tpts.entity.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateBankAccountRequest {

    @NotBlank(message = "Bank name is required")
    @Size(max = 100, message = "Bank name must not exceed 100 characters")
    private String bankName;

    @Size(max = 100, message = "Branch name must not exceed 100 characters")
    private String branchName;

    @NotBlank(message = "Account number is required")
    @Size(min = 9, max = 18, message = "Account number must be between 9-18 digits")
    @Pattern(regexp = "^[0-9]+$", message = "Account number must contain only digits")
    private String accountNumber;

    @NotBlank(message = "IFSC code is required")
    @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$", message = "Invalid IFSC code format")
    private String ifscCode;

    @NotBlank(message = "Account holder name is required")
    @Size(max = 100, message = "Account holder name must not exceed 100 characters")
    private String accountHolderName;

    @Builder.Default
    private AccountType accountType = AccountType.SAVINGS;

    @Size(max = 100, message = "UPI ID must not exceed 100 characters")
    @Pattern(regexp = "^[a-zA-Z0-9.\\-_]+@[a-zA-Z]+$", message = "Invalid UPI ID format")
    private String upiId;

    @Size(max = 50, message = "Label must not exceed 50 characters")
    private String label;

    @Builder.Default
    private Boolean isPrimary = false;
}