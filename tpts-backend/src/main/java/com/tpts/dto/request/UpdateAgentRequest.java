package com.tpts.dto.request;

import com.tpts.entity.VehicleType;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for updating agent profile
 * PUT /api/agents/profile
 * PUT /api/company/agents/{id}
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateAgentRequest {

    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    private VehicleType vehicleType;

    @Size(max = 20, message = "Vehicle number cannot exceed 20 characters")
    private String vehicleNumber;

    @Size(max = 50, message = "License number cannot exceed 50 characters")
    private String licenseNumber;

    @Size(max = 100, message = "City name cannot exceed 100 characters")
    private String city;

    private List<String> servicePincodes;

    // **DOCUMENT URLS - CLOUDINARY (For updates)**
    private String profilePhotoUrl;

    private String licenseDocumentUrl;

    private String aadhaarDocumentUrl;

    private String rcDocumentUrl;

    private String vehiclePhotoUrl;

    private String additionalDocuments; // JSON array
}
