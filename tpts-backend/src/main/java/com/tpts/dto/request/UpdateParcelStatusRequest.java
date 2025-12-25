package com.tpts.dto.request;

import com.tpts.entity.ParcelStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for updating parcel status
 * PATCH /api/parcels/{id}/status
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateParcelStatusRequest {

    @NotNull(message = "Status is required")
    private ParcelStatus status;

    // OTP for pickup/delivery verification
    @Size(min = 6, max = 6, message = "OTP must be exactly 6 digits")
    private String otp;

    // Photo URL (for pickup/delivery proof)
    @Size(max = 500, message = "Photo URL cannot exceed 500 characters")
    private String photoUrl;

    // Signature URL (for delivery)
    @Size(max = 500, message = "Signature URL cannot exceed 500 characters")
    private String signatureUrl;

    // Notes
    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;

    // Cancellation reason (required when cancelling)
    @Size(max = 500, message = "Cancellation reason cannot exceed 500 characters")
    private String cancellationReason;
}