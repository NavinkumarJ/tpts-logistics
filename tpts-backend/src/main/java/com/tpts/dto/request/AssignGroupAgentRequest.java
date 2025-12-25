package com.tpts.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for assigning agent to group shipment
 * PATCH /api/groups/{id}/assign-pickup-agent
 * PATCH /api/groups/{id}/assign-delivery-agent
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignGroupAgentRequest {

    @NotNull(message = "Agent ID is required")
    private Long agentId;
}