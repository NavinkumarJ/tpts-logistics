package com.tpts.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for approving a company
 * POST /api/super-admin/companies/{id}/approve
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApproveCompanyRequest {

    @DecimalMin(value = "0.0", message = "Commission rate cannot be negative")
    @DecimalMax(value = "50.0", message = "Commission rate cannot exceed 50%")
    @Builder.Default
    private BigDecimal commissionRate = BigDecimal.valueOf(5.0); // Default 5%

    private String approvalNotes;
}