package com.tpts.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for customer joining a group
 * POST /api/groups/{groupId}/join
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JoinGroupRequest {

    @NotNull(message = "Parcel ID is required")
    private Long parcelId;
}