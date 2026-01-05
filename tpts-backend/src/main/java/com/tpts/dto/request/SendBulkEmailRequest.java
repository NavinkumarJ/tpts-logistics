package com.tpts.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SendBulkEmailRequest {

    /**
     * Type of recipients: COMPANY, CUSTOMER, or AGENT
     */
    @NotBlank(message = "Recipient type is required")
    private String recipientType;

    /**
     * List of recipient IDs. If empty/null, send to ALL of that type.
     */
    private List<Long> recipientIds;

    /**
     * Email subject
     */
    @NotBlank(message = "Subject is required")
    @Size(max = 200, message = "Subject must be less than 200 characters")
    private String subject;

    /**
     * Email message (HTML supported)
     */
    @NotBlank(message = "Message is required")
    private String message;

    /**
     * Whether to send to all recipients of the type
     */
    @Builder.Default
    private boolean sendToAll = false;
}
