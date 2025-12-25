package com.tpts.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity for Delivery Agent
 * Agents employed by companies to deliver parcels
 */
@Entity
@Table(name = "delivery_agent")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryAgent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // User relationship
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // Company relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private CompanyAdmin company;

    // Personal Information
    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    // Vehicle Details
    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 20)
    private VehicleType vehicleType;

    @Column(name = "vehicle_number", length = 20)
    private String vehicleNumber;

    @Column(name = "license_number", length = 50)
    private String licenseNumber;

    // Operating Area
    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "service_pincodes", columnDefinition = "TEXT") // JSON array
    private String servicePincodes;

    // Availability Flags
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true; // Set by Company

    @Column(name = "is_available", nullable = false)
    @Builder.Default
    private Boolean isAvailable = false; // Set by Agent

    // Current Location
    @Column(name = "current_latitude", precision = 10, scale = 7)
    private BigDecimal currentLatitude;

    @Column(name = "current_longitude", precision = 10, scale = 7)
    private BigDecimal currentLongitude;

    @Column(name = "location_updated_at")
    private LocalDateTime locationUpdatedAt;

    // Statistics
    @Column(name = "rating_avg", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(name = "total_deliveries")
    @Builder.Default
    private Integer totalDeliveries = 0;

    @Column(name = "current_orders_count")
    @Builder.Default
    private Integer currentOrdersCount = 0;

    // **DOCUMENT URLS - CLOUDINARY**
    @Column(name = "profile_photo_url", length = 500)
    private String profilePhotoUrl; // Agent's profile photo from Cloudinary

    @Column(name = "license_document_url", length = 500)
    private String licenseDocumentUrl; // Driving license document

    @Column(name = "aadhaar_document_url", length = 500)
    private String aadhaarDocumentUrl; // Aadhaar card document

    @Column(name = "rc_document_url", length = 500)
    private String rcDocumentUrl; // Vehicle RC (Registration Certificate)

    @Column(name = "vehicle_photo_url", length = 500)
    private String vehiclePhotoUrl; // Vehicle photo

    @Column(name = "additional_documents", columnDefinition = "TEXT")
    private String additionalDocuments; // JSON array of additional document URLs

    // Audit Fields
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
