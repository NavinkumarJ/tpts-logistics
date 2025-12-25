package com.tpts.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for updating company profile
 * PUT /api/company/profile
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateCompanyRequest {

    @Size(min = 2, max = 200, message = "Company name must be between 2 and 200 characters")
    private String companyName;

    @Size(max = 50, message = "Registration number cannot exceed 50 characters")
    private String registrationNumber;

    @Size(max = 20, message = "GST number cannot exceed 20 characters")
    private String gstNumber;

    private String address;

    @Size(max = 100, message = "City name cannot exceed 100 characters")
    private String city;

    @Size(max = 100, message = "State name cannot exceed 100 characters")
    private String state;

    @Pattern(regexp = "^[1-9][0-9]{5}$", message = "Please provide a valid 6-digit pincode")
    private String pincode;

    private List<String> serviceCities;

    @DecimalMin(value = "0.0", message = "Base rate per km cannot be negative")
    private BigDecimal baseRatePerKm;

    @DecimalMin(value = "0.0", message = "Base rate per kg cannot be negative")
    private BigDecimal baseRatePerKg;

    @Size(min = 2, max = 100, message = "Contact person name must be between 2 and 100 characters")
    private String contactPersonName;

    // **DOCUMENT URLS - CLOUDINARY (For updates)**
    private String companyLogoUrl;

    private String registrationCertificateUrl;

    private String gstCertificateUrl;

    private String documentsUrl; // JSON array

    private String additionalDocuments; // JSON array
}
