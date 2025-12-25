package com.tpts.dto.request;

import com.tpts.entity.VehicleType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for creating a delivery agent by company admin
 * POST /api/company/agents
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateAgentRequest {

    // Personal Information
    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Please provide a valid 10-digit phone number")
    private String phone;

    // Password (optional - will be auto-generated if not provided)
    @Size(min = 6, max = 50, message = "Password must be between 6 and 50 characters")
    private String password;

    // Vehicle Details
    @NotNull(message = "Vehicle type is required")
    private VehicleType vehicleType;

    @Size(max = 20, message = "Vehicle number cannot exceed 20 characters")
    private String vehicleNumber;

    @Size(max = 50, message = "License number cannot exceed 50 characters")
    private String licenseNumber;

    // Operating Area
    @Size(max = 100, message = "City name cannot exceed 100 characters")
    private String city;

    private List<String> servicePincodes;

    // **DOCUMENT URLS - CLOUDINARY (After upload)**
    private String profilePhotoUrl; // Agent's profile photo from Cloudinary

    private String licenseDocumentUrl; // Driving license document URL

    private String aadhaarDocumentUrl; // Aadhaar card document URL

    private String rcDocumentUrl; // Vehicle RC document URL

    private String vehiclePhotoUrl; // Vehicle photo URL

    private String additionalDocuments; // JSON array of additional document URLs: ["url1", "url2"]
}
