package com.tpts.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for creating a new group shipment
 * POST /api/groups (by Company Admin)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateGroupRequest {

    // ==========================================
    // Route Information
    // ==========================================

    @NotBlank(message = "Source city is required")
    @Size(max = 100, message = "Source city cannot exceed 100 characters")
    private String sourceCity;

    @NotBlank(message = "Target city is required")
    @Size(max = 100, message = "Target city cannot exceed 100 characters")
    private String targetCity;

    // Optional: More specific area
    @Pattern(regexp = "^[1-9][0-9]{5}$|^$", message = "Please provide a valid 6-digit pincode")
    private String sourcePincode;

    @Pattern(regexp = "^[1-9][0-9]{5}$|^$", message = "Please provide a valid 6-digit pincode")
    private String targetPincode;

    // ==========================================
    // Group Configuration
    // ==========================================

    @NotNull(message = "Target members is required")
    @Min(value = 2, message = "Minimum 2 members required")
    @Max(value = 50, message = "Maximum 50 members allowed")
    private Integer targetMembers;

    @NotNull(message = "Discount percentage is required")
    @DecimalMin(value = "10.0", message = "Minimum discount is 10%")
    @DecimalMax(value = "50.0", message = "Maximum discount is 50%")
    private BigDecimal discountPercentage;

    // Deadline in hours from now (6, 12, 24, 48, 72)
    @NotNull(message = "Deadline hours is required")
    @Min(value = 6, message = "Minimum deadline is 6 hours")
    @Max(value = 168, message = "Maximum deadline is 168 hours (7 days)")
    private Integer deadlineHours;

    // ==========================================
    // Warehouse Information (Two-Agent Model)
    // ==========================================

    @NotBlank(message = "Warehouse address is required")
    private String warehouseAddress;

    @NotBlank(message = "Warehouse city is required")
    @Size(max = 100, message = "Warehouse city cannot exceed 100 characters")
    private String warehouseCity;

    @Pattern(regexp = "^[1-9][0-9]{5}$", message = "Please provide a valid 6-digit warehouse pincode")
    private String warehousePincode;

    private BigDecimal warehouseLatitude;
    private BigDecimal warehouseLongitude;
}