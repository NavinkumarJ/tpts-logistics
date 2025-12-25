package com.tpts.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for updating hiring settings
 * PUT /api/company/hiring
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateHiringRequest {

    private Boolean isHiring;

    @Min(value = 0, message = "Open positions cannot be negative")
    @Max(value = 100, message = "Open positions cannot exceed 100")
    private Integer openPositions;

    @Min(value = 0, message = "Minimum salary cannot be negative")
    private Integer salaryRangeMin;

    @Min(value = 0, message = "Maximum salary cannot be negative")
    private Integer salaryRangeMax;
}