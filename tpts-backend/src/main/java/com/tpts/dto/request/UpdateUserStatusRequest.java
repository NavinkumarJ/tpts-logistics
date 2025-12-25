package com.tpts.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for updating user status (suspend/activate)
 * PATCH /api/super-admin/users/{id}/status
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateUserStatusRequest {

    private Boolean isActive;

    private String reason;

    // Duration in days for temporary suspension (0 = permanent)
    private Integer suspensionDays;
}