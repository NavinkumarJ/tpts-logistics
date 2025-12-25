package com.tpts.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for company registration
 * POST /api/auth/register/company
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyRegisterRequest {

    // Company Details
    @NotBlank(message = "Company name is required")
    @Size(min = 2, max = 200, message = "Company name must be between 2 and 200 characters")
    private String companyName;

    @Size(max = 50, message = "Registration number cannot exceed 50 characters")
    private String registrationNumber;

    @Size(max = 20, message = "GST number cannot exceed 20 characters")
    private String gstNumber;

    // Admin/Contact Details
    @NotBlank(message = "Contact person name is required")
    @Size(min = 2, max = 100, message = "Contact person name must be between 2 and 100 characters")
    private String contactPersonName;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Please provide a valid 10-digit Indian phone number")
    private String phone;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 50, message = "Password must be between 6 and 50 characters")
    private String password;

    // Address
    @NotBlank(message = "Address is required")
    private String address;

    @NotBlank(message = "City is required")
    @Size(max = 100, message = "City name cannot exceed 100 characters")
    private String city;

    @NotBlank(message = "State is required")
    @Size(max = 100, message = "State name cannot exceed 100 characters")
    private String state;

    @NotBlank(message = "Pincode is required")
    @Pattern(regexp = "^[1-9][0-9]{5}$", message = "Please provide a valid 6-digit pincode")
    private String pincode;

    // Service Configuration
    private List<String> serviceCities;

    // Pricing
    @DecimalMin(value = "0.0", message = "Base rate per km cannot be negative")
    private BigDecimal baseRatePerKm;

    @DecimalMin(value = "0.0", message = "Base rate per kg cannot be negative")
    private BigDecimal baseRatePerKg;

    // **DOCUMENT URLS - CLOUDINARY (After upload)**
    private String companyLogoUrl; // Company logo uploaded to Cloudinary

    private String registrationCertificateUrl; // Company registration certificate

    private String gstCertificateUrl; // GST certificate

    private String documentsUrl; // JSON array of additional document URLs: ["url1", "url2", "url3"]

    private String additionalDocuments; // JSON array of other documents
}
