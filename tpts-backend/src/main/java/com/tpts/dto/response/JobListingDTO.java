package com.tpts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for Public Job Listing (Companies Hiring)
 * Shown on public /jobs page
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobListingDTO {

    private Long companyId;
    private String companyName;
    private String companyCity;
    private BigDecimal companyRating;
    private Integer totalDeliveries;

    // Job details
    private Integer openPositions;
    private Integer salaryRangeMin;
    private Integer salaryRangeMax;
    private String salaryDisplay; // e.g., "₹15,000 - ₹25,000/month"

    // Requirements (from company profile)
    private String serviceCities;
    private String description;

    // Stats
    private Long totalApplications;
    private Boolean isUrgent; // If many positions open
}