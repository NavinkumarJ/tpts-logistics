package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * JobApplication Entity
 * Handles public job applications from potential delivery agents
 * No login required to apply - creates agent account when hired
 */
@Entity
@Table(name = "job_applications", indexes = {
        @Index(name = "idx_ja_company", columnList = "company_id"),
        @Index(name = "idx_ja_status", columnList = "status"),
        @Index(name = "idx_ja_email", columnList = "applicant_email"),
        @Index(name = "idx_ja_phone", columnList = "applicant_phone")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Company being applied to
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private CompanyAdmin company;

    // ==========================================
    // Personal Information
    // ==========================================

    @Column(name = "applicant_name", nullable = false, length = 100)
    private String applicantName;

    @Column(name = "applicant_email", nullable = false, length = 100)
    private String applicantEmail;

    @Column(name = "applicant_phone", nullable = false, length = 15)
    private String applicantPhone;

    @Column(name = "date_of_birth")
    private String dateOfBirth;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "state", length = 100)
    private String state;

    @Column(name = "pincode", length = 10)
    private String pincode;

    // ==========================================
    // Professional Information
    // ==========================================

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", length = 20)
    private VehicleType vehicleType;

    @Column(name = "vehicle_number", length = 20)
    private String vehicleNumber;

    @Column(name = "license_number", length = 50)
    private String licenseNumber;

    @Column(name = "license_expiry")
    private String licenseExpiry;

    // Experience: 0-1, 1-3, 3-5, 5+
    @Column(name = "experience_years", length = 20)
    private String experienceYears;

    // Previous employer (optional)
    @Column(name = "previous_employer", length = 200)
    private String previousEmployer;

    // Service pincodes (JSON array)
    @Column(name = "service_pincodes", columnDefinition = "TEXT")
    private String servicePincodes;

    // Preferred shifts: morning, afternoon, evening, night, flexible
    @Column(name = "preferred_shifts", length = 100)
    private String preferredShifts;

    // ==========================================
    // Documents (URLs)
    // ==========================================

    @Column(name = "license_document_url", length = 500)
    private String licenseDocumentUrl;

    @Column(name = "aadhaar_document_url", length = 500)
    private String aadhaarDocumentUrl;

    @Column(name = "rc_document_url", length = 500)
    private String rcDocumentUrl;

    @Column(name = "vehicle_photo_url", length = 500)
    private String vehiclePhotoUrl;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    // Additional documents (JSON array of URLs)
    @Column(name = "additional_documents", columnDefinition = "TEXT")
    private String additionalDocuments;

    // ==========================================
    // Application Details
    // ==========================================

    @Column(name = "cover_letter", columnDefinition = "TEXT")
    private String coverLetter;

    @Column(name = "expected_salary")
    private Integer expectedSalary;

    @Column(name = "available_from")
    private String availableFrom;

    // Can work on weekends?
    @Column(name = "weekend_availability")
    @Builder.Default
    private Boolean weekendAvailability = true;

    // ==========================================
    // Status & Review
    // ==========================================

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    @Builder.Default
    private ApplicationStatus status = ApplicationStatus.PENDING;

    // Interview details
    @Column(name = "interview_date")
    private LocalDateTime interviewDate;

    @Column(name = "interview_notes", columnDefinition = "TEXT")
    private String interviewNotes;

    // Review notes by company
    @Column(name = "review_notes", columnDefinition = "TEXT")
    private String reviewNotes;

    // Rejection reason
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    // Reviewed by (company admin name)
    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    // ==========================================
    // Hire Details
    // ==========================================

    // Agent ID created when hired
    @Column(name = "hired_as_agent_id")
    private Long hiredAsAgentId;

    @Column(name = "hired_at")
    private LocalDateTime hiredAt;

    // ==========================================
    // Timestamps
    // ==========================================

    @Column(name = "applied_at", updatable = false)
    private LocalDateTime appliedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        appliedAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Helper methods
    public boolean canBeReviewed() {
        return status == ApplicationStatus.PENDING || status == ApplicationStatus.UNDER_REVIEW;
    }

    public boolean canBeHired() {
        return status == ApplicationStatus.APPROVED || status == ApplicationStatus.SHORTLISTED;
    }

    public boolean isActive() {
        return status != ApplicationStatus.REJECTED &&
                status != ApplicationStatus.HIRED &&
                status != ApplicationStatus.WITHDRAWN;
    }
}