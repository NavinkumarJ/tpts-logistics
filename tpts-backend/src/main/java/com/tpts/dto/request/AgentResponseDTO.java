package com.tpts.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for agent response (accept/reject delivery request)
 * PATCH /api/delivery-requests/{id}/respond
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentResponseDTO {

    @NotNull(message = "Response (accept/reject) is required")
    private Boolean accept;

    // Required if rejecting
    private String rejectionReason;
}