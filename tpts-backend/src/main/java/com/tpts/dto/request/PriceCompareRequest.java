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
 * DTO for price comparison request
 * GET /api/companies/compare
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceCompareRequest {

    @NotBlank(message = "From city is required")
    private String fromCity;

    @NotBlank(message = "To city is required")
    private String toCity;

    @NotNull(message = "Weight is required")
    @DecimalMin(value = "0.1", message = "Weight must be at least 0.1 kg")
    private BigDecimal weightKg;

    private BigDecimal distanceKm; // Optional - can be calculated
}