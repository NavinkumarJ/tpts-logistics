package com.tpts.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for hiring an applicant (creating agent account)
 * POST /api/job-applications/{id}/hire
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HireApplicantRequest {

    // Optional: Override service pincodes from application
    private String servicePincodes;

    // Optional: Set initial password (otherwise auto-generated)
    private String initialPassword;

    // Optional: Activate immediately or keep inactive
    @Builder.Default
    private Boolean activateImmediately = true;

    // Optional: Additional notes for the new agent
    private String welcomeNotes;
}