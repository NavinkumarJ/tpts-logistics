package com.tpts.dto.request;

import com.tpts.entity.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for initiating payment
 * POST /api/payments/initiate
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePaymentRequest {

    @NotNull(message = "Parcel ID is required")
    private Long parcelId;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    // Optional: Override description
    private String description;
}