package com.tpts.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for creating a new Super Admin
 * POST /api/super-admin/admins
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateSuperAdminRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Please provide a valid 10-digit phone number")
    private String phone;

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100)
    private String fullName;

    private String department;

    @Builder.Default
    private String role = "ADMIN"; // ADMIN, SUPER_ADMIN, MODERATOR

    private String permissions; // JSON or comma-separated

    private String notes;
}