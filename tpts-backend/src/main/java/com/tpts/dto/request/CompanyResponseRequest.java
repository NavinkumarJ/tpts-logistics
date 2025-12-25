package com.tpts.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for company responding to a rating
 * POST /api/ratings/{id}/respond
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyResponseRequest {

    @NotBlank(message = "Response is required")
    @Size(max = 1000, message = "Response cannot exceed 1000 characters")
    private String response;
}