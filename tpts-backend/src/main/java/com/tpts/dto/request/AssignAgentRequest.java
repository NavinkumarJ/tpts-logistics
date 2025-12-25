package com.tpts.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for assigning agent to parcel
 * PATCH /api/parcels/{id}/assign
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignAgentRequest {

    @NotNull(message = "Agent ID is required")
    private Long agentId;
}