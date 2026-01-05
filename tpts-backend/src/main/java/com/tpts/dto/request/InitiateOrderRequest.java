package com.tpts.dto.request;

import com.tpts.entity.PackageType;
import com.tpts.entity.PaymentMethod;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for initiating payment with parcel data (parcel created after payment
 * success)
 * POST /api/payments/initiate-order
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InitiateOrderRequest {

    // Company Info
    @NotNull(message = "Company ID is required")
    private Long companyId;

    // Optional: Group shipment ID for group buy
    private Long groupShipmentId;

    // Payment Method
    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    // ==========================================
    // Pickup Details (Sender)
    // ==========================================
    @NotBlank(message = "Pickup name is required")
    @Size(max = 100, message = "Pickup name cannot exceed 100 characters")
    private String pickupName;

    @NotBlank(message = "Pickup phone is required")
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid Indian phone number")
    private String pickupPhone;

    @NotBlank(message = "Pickup address is required")
    @Size(max = 255, message = "Pickup address cannot exceed 255 characters")
    private String pickupAddress;

    @NotBlank(message = "Pickup city is required")
    @Size(max = 50, message = "Pickup city cannot exceed 50 characters")
    private String pickupCity;

    @NotBlank(message = "Pickup state is required")
    @Size(max = 50, message = "Pickup state cannot exceed 50 characters")
    private String pickupState;

    @NotBlank(message = "Pickup pincode is required")
    @Pattern(regexp = "^[1-9][0-9]{5}$", message = "Invalid pincode")
    private String pickupPincode;

    private BigDecimal pickupLatitude;
    private BigDecimal pickupLongitude;

    // ==========================================
    // Delivery Details (Receiver)
    // ==========================================
    @NotBlank(message = "Delivery name is required")
    @Size(max = 100, message = "Delivery name cannot exceed 100 characters")
    private String deliveryName;

    @NotBlank(message = "Delivery phone is required")
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid Indian phone number")
    private String deliveryPhone;

    @NotBlank(message = "Delivery address is required")
    @Size(max = 255, message = "Delivery address cannot exceed 255 characters")
    private String deliveryAddress;

    @NotBlank(message = "Delivery city is required")
    @Size(max = 50, message = "Delivery city cannot exceed 50 characters")
    private String deliveryCity;

    @NotBlank(message = "Delivery state is required")
    @Size(max = 50, message = "Delivery state cannot exceed 50 characters")
    private String deliveryState;

    @NotBlank(message = "Delivery pincode is required")
    @Pattern(regexp = "^[1-9][0-9]{5}$", message = "Invalid pincode")
    private String deliveryPincode;

    private BigDecimal deliveryLatitude;
    private BigDecimal deliveryLongitude;

    // ==========================================
    // Package Details
    // ==========================================
    private PackageType packageType;

    @DecimalMin(value = "0.1", message = "Weight must be at least 0.1 kg")
    @DecimalMax(value = "500.0", message = "Weight cannot exceed 500 kg")
    private BigDecimal weightKg;

    private BigDecimal distanceKm;

    @Size(max = 50, message = "Dimensions cannot exceed 50 characters")
    private String dimensions;

    private Boolean isFragile;

    @Size(max = 500, message = "Special instructions cannot exceed 500 characters")
    private String specialInstructions;
}
