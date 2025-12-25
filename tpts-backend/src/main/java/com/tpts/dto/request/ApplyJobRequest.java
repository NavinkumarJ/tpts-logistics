package com.tpts.dto.request;

import com.tpts.entity.VehicleType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for submitting job application
 * POST /api/job-applications (Public - No auth required)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplyJobRequest {

    // ==========================================
    // Company to apply to
    // ==========================================

    @NotNull(message = "Company ID is required")
    private Long companyId;

    // ==========================================
    // Step 1: Personal Information
    // ==========================================

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String applicantName;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String applicantEmail;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Please provide a valid 10-digit phone number")
    private String applicantPhone;

    private String dateOfBirth; // DD-MM-YYYY

    @NotBlank(message = "Address is required")
    private String address;

    @NotBlank(message = "City is required")
    @Size(max = 100)
    private String city;

    @Size(max = 100)
    private String state;

    @NotBlank(message = "Pincode is required")
    @Pattern(regexp = "^[1-9][0-9]{5}$", message = "Please provide a valid 6-digit pincode")
    private String pincode;

    // ==========================================
    // Step 2: Professional Information..!!
    // ==========================================

    @NotNull(message = "Vehicle type is required")
    private VehicleType vehicleType;

    @NotBlank(message = "Vehicle number is required")
    @Size(max = 20)
    private String vehicleNumber;

    @NotBlank(message = "License number is required")
    @Size(max = 50)
    private String licenseNumber;

    private String licenseExpiry; // MM-YYYY

    // Experience: 0-1, 1-3, 3-5, 5+
    private String experienceYears;

    private String previousEmployer;

    // JSON array of pincodes willing to serve
    private String servicePincodes;

    // Preferred shifts: morning, afternoon, evening, night, flexible
    private String preferredShifts;

    // ==========================================
    // Step 3: Documents (URLs after upload)
    // ==========================================

    private String licenseDocumentUrl;
    private String aadhaarDocumentUrl;
    private String rcDocumentUrl;
    private String vehiclePhotoUrl;
    private String photoUrl;
    private String additionalDocuments; // JSON array

    // ==========================================
    // Additional Information
    // ==========================================

    private String coverLetter;

    @Min(value = 5000, message = "Expected salary must be at least ₹5,000")
    @Max(value = 100000, message = "Expected salary cannot exceed ₹1,00,000")
    private Integer expectedSalary;

    private String availableFrom; // DD-MM-YYYY or "Immediately"

    @Builder.Default
    private Boolean weekendAvailability = true;
}