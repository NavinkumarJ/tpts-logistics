package com.tpts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for Company response
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyDTO {

    private Long id;
    private Long userId;
    private String email;
    private String phone;

    // Company details
    private String companyName;
    private String registrationNumber;
    private String gstNumber;

    // Address
    private String address;
    private String city;
    private String state;
    private String pincode;

    // Service configuration
    private List<String> serviceCities;

    // Pricing
    private BigDecimal baseRatePerKm;
    private BigDecimal baseRatePerKg;

    // Status
    private Boolean isApproved;
    private Boolean isVerified;

    // Hiring
    private Boolean isHiring;
    private Integer openPositions;
    private Integer salaryRangeMin;
    private Integer salaryRangeMax;

    // Platform
    private BigDecimal commissionRate;

    // Statistics
    private BigDecimal ratingAvg;
    private Integer totalDeliveries;
    private Integer totalAgents; // Number of agents belonging to this company
    private BigDecimal totalRevenue; // Total earnings from completed deliveries

    // Contact
    private String contactPersonName;

    // **DOCUMENT URLS - CLOUDINARY**
    private String companyLogoUrl;
    private String registrationCertificateUrl;
    private String gstCertificateUrl;
    private String documentsUrl; // JSON array
    private String additionalDocuments; // JSON array

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
