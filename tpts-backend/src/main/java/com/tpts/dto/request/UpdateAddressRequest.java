package com.tpts.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for updating an address
 * PUT /api/customers/{customerId}/addresses/{addressId}
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateAddressRequest {

    @Size(max = 50, message = "Label cannot exceed 50 characters")
    private String label;

    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Please provide a valid 10-digit Indian phone number")
    private String phone;

    @Size(max = 255, message = "Address line 1 cannot exceed 255 characters")
    private String addressLine1;

    @Size(max = 255, message = "Address line 2 cannot exceed 255 characters")
    private String addressLine2;

    @Size(max = 100, message = "Landmark cannot exceed 100 characters")
    private String landmark;

    @Size(max = 100, message = "City name cannot exceed 100 characters")
    private String city;

    @Size(max = 100, message = "State name cannot exceed 100 characters")
    private String state;

    @Pattern(regexp = "^[1-9][0-9]{5}$", message = "Please provide a valid 6-digit pincode")
    private String pincode;

    private BigDecimal latitude;
    private BigDecimal longitude;

    private Boolean isDefault;
}