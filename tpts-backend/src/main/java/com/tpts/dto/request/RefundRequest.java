package com.tpts.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for initiating refund
 * POST /api/payments/{id}/refund
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundRequest {

    @NotNull(message = "Refund amount is required")
    @DecimalMin(value = "1.00", message = "Refund amount must be at least ₹1")
    private BigDecimal amount;

    @NotBlank(message = "Refund reason is required")
    private String reason;

    // Optional: For partial refunds, specify if this is final
    @Builder.Default
    private Boolean fullRefund = true;
}