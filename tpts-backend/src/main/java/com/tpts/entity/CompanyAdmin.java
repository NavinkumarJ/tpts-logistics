package com.tpts.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "company_admin")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyAdmin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // Company Details
    @Column(name = "company_name", nullable = false, unique = true, length = 200)
    private String companyName;

    @Column(name = "registration_number", length = 50)
    private String registrationNumber;

    @Column(name = "gst_number", length = 20)
    private String gstNumber;

    @Column(name = "contact_person_name", nullable = false, length = 100)
    private String contactPersonName;

    // Address
    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "state", length = 100)
    private String state;

    @Column(name = "pincode", length = 10)
    private String pincode;

    // Service Configuration
    @Column(name = "service_cities", columnDefinition = "TEXT")
    private String serviceCities;

    // Pricing
    @Column(name = "base_rate_per_km", precision = 10, scale = 2)
    private BigDecimal baseRatePerKm;

    @Column(name = "base_rate_per_kg", precision = 10, scale = 2)
    private BigDecimal baseRatePerKg;

    // Platform Configuration
    @Column(name = "commission_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal commissionRate = BigDecimal.valueOf(10.0); // Platform commission (10%)

    // Agent Commission Rate (20% of total order amount)
    @Column(name = "agent_commission_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal agentCommissionRate = BigDecimal.valueOf(20.0); // Agent commission (20% of total)

    // Status Flags
    @Column(name = "is_approved", nullable = false)
    @Builder.Default
    private Boolean isApproved = false;

    // Hiring Management
    @Column(name = "is_hiring", nullable = false)
    @Builder.Default
    private Boolean isHiring = false;

    @Column(name = "open_positions")
    private Integer openPositions;

    @Column(name = "salary_range_min")
    private Integer salaryRangeMin;

    @Column(name = "salary_range_max")
    private Integer salaryRangeMax;

    // Statistics
    @Column(name = "rating_avg", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(name = "total_deliveries")
    @Builder.Default
    private Integer totalDeliveries = 0;

    // Document URLs - Cloudinary
    @Column(name = "documents_url", columnDefinition = "TEXT")
    private String documentsUrl;

    @Column(name = "company_logo_url", length = 500)
    private String companyLogoUrl;

    @Column(name = "registration_certificate_url", length = 500)
    private String registrationCertificateUrl;

    @Column(name = "gst_certificate_url", length = 500)
    private String gstCertificateUrl;

    @Column(name = "additional_documents", columnDefinition = "TEXT")
    private String additionalDocuments;

    // Audit Fields
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
