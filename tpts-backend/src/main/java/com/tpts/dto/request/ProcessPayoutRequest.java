package com.tpts.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessPayoutRequest {

    @NotNull(message = "Action is required")
    private PayoutAction action;

    // Required for COMPLETE action
    private String transactionReference;

    // Required for REJECT action
    private String rejectionReason;

    private String notes;

    public enum PayoutAction {
        APPROVE,    // Mark as processing
        COMPLETE,   // Mark as completed with UTR
        REJECT      // Reject with reason
    }
}