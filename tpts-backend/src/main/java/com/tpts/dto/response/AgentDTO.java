package com.tpts.dto.response;

import com.tpts.entity.VehicleType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for Delivery Agent response
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentDTO {

    private Long id;
    private Long userId;
    private Long companyId;
    private String companyName;

    // Personal info
    private String email;
    private String phone;
    private String fullName;

    // Vehicle details
    private VehicleType vehicleType;
    private String vehicleNumber;
    private String licenseNumber;

    // Operating area
    private String city;
    private List<String> servicePincodes;

    // Availability flags
    private Boolean isActive; // Set by Company
    private Boolean isAvailable; // Set by Agent
    private Boolean isVerified;

    // Current location
    private BigDecimal currentLatitude;
    private BigDecimal currentLongitude;
    private LocalDateTime locationUpdatedAt;

    // Statistics
    private BigDecimal ratingAvg;
    private Integer totalDeliveries;
    private Integer currentOrdersCount;
    private Long totalRatings; // Total count of reviews/ratings

    // **DOCUMENT URLS - CLOUDINARY**
    private String profilePhotoUrl;
    private String licenseDocumentUrl;
    private String aadhaarDocumentUrl;
    private String rcDocumentUrl;
    private String vehiclePhotoUrl;
    private String additionalDocuments; // JSON array

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
