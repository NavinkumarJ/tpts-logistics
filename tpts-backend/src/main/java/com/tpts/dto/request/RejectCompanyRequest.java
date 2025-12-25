package com.tpts.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for rejecting a company
 * POST /api/super-admin/companies/{id}/reject
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RejectCompanyRequest {

    @NotBlank(message = "Rejection reason is required")
    private String reason;

    private String additionalNotes;

    // Allow reapplication after rejection?
    @Builder.Default
    private Boolean allowReapply = true;
}