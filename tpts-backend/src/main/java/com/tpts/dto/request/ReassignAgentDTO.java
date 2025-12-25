package com.tpts.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for reassigning delivery request to a new agent
 * PATCH /api/delivery-requests/{id}/reassign
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReassignAgentDTO {

    @NotNull(message = "New agent ID is required")
    private Long newAgentId;

    // Optional: Updated estimated earnings
    private BigDecimal estimatedEarnings;

    // Optional: Updated notes
    private String companyNotes;
}