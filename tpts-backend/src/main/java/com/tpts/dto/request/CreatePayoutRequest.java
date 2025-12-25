package com.tpts.dto.request;

import com.tpts.entity.PayoutMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePayoutRequest {

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "100.00", message = "Minimum payout amount is ₹100")
    private BigDecimal amount;

    // Either bank account ID or UPI ID
    private Long bankAccountId;

    // Or provide bank details directly
    private String bankName;
    private String accountNumber;
    private String ifscCode;
    private String accountHolderName;
    private String upiId;

    @Builder.Default
    private PayoutMethod payoutMethod = PayoutMethod.BANK_TRANSFER;

    private String notes;
}