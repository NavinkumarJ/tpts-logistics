package com.tpts.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for creating a delivery request (assigning agent to parcel)
 * POST /api/delivery-requests
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDeliveryRequestDTO {

    @NotNull(message = "Parcel ID is required")
    private Long parcelId;

    @NotNull(message = "Agent ID is required")
    private Long agentId;

    // Optional: Priority level (1-10, 1 is highest)
    @Min(value = 1, message = "Priority must be between 1 and 10")
    @Max(value = 10, message = "Priority must be between 1 and 10")
    private Integer priority;

    // Optional: Estimated earnings for this delivery
    private BigDecimal estimatedEarnings;

    // Optional: Notes for the agent
    private String companyNotes;
}