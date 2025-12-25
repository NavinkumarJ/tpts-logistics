package com.tpts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for Public Company listing (limited information)
 * Used for company comparison and public jobs page
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyPublicDTO {

    private Long id;
    private String companyName;
    private String city;
    private String state;
    private List<String> serviceCities;

    // Pricing (for comparison)
    private BigDecimal baseRatePerKm;
    private BigDecimal baseRatePerKg;

    // Statistics
    private BigDecimal ratingAvg;
    private Integer totalDeliveries;

    // Hiring info (for jobs page)
    private Boolean isHiring;
    private Integer openPositions;
    private Integer salaryRangeMin;
    private Integer salaryRangeMax;

    // Calculated fields
    private BigDecimal estimatedPrice; // Set during price comparison
    private Integer estimatedDays;     // Set during price comparison
}