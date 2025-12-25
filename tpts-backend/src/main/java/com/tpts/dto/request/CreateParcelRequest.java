package com.tpts.dto.request;

import com.tpts.entity.PackageType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for creating a new parcel/shipment
 * POST /api/parcels
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateParcelRequest {

    // Company to ship with
    @NotNull(message = "Company ID is required")
    private Long companyId;

    // Group shipment (optional - for group buy)
    private Long groupShipmentId;

    // ==========================================
    // Pickup (Sender) Details
    // ==========================================

    @NotBlank(message = "Pickup name is required")
    @Size(max = 100, message = "Pickup name cannot exceed 100 characters")
    private String pickupName;

    @NotBlank(message = "Pickup phone is required")
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Please provide a valid 10-digit Indian phone number")
    private String pickupPhone;

    @NotBlank(message = "Pickup address is required")
    private String pickupAddress;

    @NotBlank(message = "Pickup city is required")
    @Size(max = 100, message = "Pickup city cannot exceed 100 characters")
    private String pickupCity;

    @Size(max = 100, message = "Pickup state cannot exceed 100 characters")
    private String pickupState;

    @NotBlank(message = "Pickup pincode is required")
    @Pattern(regexp = "^[1-9][0-9]{5}$", message = "Please provide a valid 6-digit pincode")
    private String pickupPincode;

    private BigDecimal pickupLatitude;
    private BigDecimal pickupLongitude;

    // ==========================================
    // Delivery (Receiver) Details
    // ==========================================

    @NotBlank(message = "Delivery name is required")
    @Size(max = 100, message = "Delivery name cannot exceed 100 characters")
    private String deliveryName;

    @NotBlank(message = "Delivery phone is required")
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Please provide a valid 10-digit Indian phone number")
    private String deliveryPhone;

    @NotBlank(message = "Delivery address is required")
    private String deliveryAddress;

    @NotBlank(message = "Delivery city is required")
    @Size(max = 100, message = "Delivery city cannot exceed 100 characters")
    private String deliveryCity;

    @Size(max = 100, message = "Delivery state cannot exceed 100 characters")
    private String deliveryState;

    @NotBlank(message = "Delivery pincode is required")
    @Pattern(regexp = "^[1-9][0-9]{5}$", message = "Please provide a valid 6-digit pincode")
    private String deliveryPincode;

    private BigDecimal deliveryLatitude;
    private BigDecimal deliveryLongitude;

    // ==========================================
    // Package Details
    // ==========================================

    private PackageType packageType;

    @DecimalMin(value = "0.1", message = "Weight must be at least 0.1 kg")
    @DecimalMax(value = "100", message = "Weight cannot exceed 100 kg")
    private BigDecimal weightKg;

    @Size(max = 50, message = "Dimensions cannot exceed 50 characters")
    private String dimensions; // e.g., "30x20x15"

    private Boolean isFragile;

    @Size(max = 500, message = "Special instructions cannot exceed 500 characters")
    private String specialInstructions;

    // ==========================================
    // Optional: Pre-calculated values
    // ==========================================

    private BigDecimal distanceKm; // Can be calculated by frontend using OSRM
}