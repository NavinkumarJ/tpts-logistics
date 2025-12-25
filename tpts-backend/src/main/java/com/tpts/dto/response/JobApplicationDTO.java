package com.tpts.dto.response;

import com.tpts.entity.ApplicationStatus;
import com.tpts.entity.VehicleType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for Job Application response
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobApplicationDTO {

    private Long id;

    // Company info
    private Long companyId;
    private String companyName;
    private String companyCity;

    // Personal info
    private String applicantName;
    private String applicantEmail;
    private String applicantPhone;
    private String dateOfBirth;
    private String address;
    private String city;
    private String state;
    private String pincode;

    // Professional info
    private VehicleType vehicleType;
    private String vehicleNumber;
    private String licenseNumber;
    private String licenseExpiry;
    private String experienceYears;
    private String previousEmployer;
    private String servicePincodes;
    private String preferredShifts;

    // Documents
    private String licenseDocumentUrl;
    private String aadhaarDocumentUrl;
    private String rcDocumentUrl;
    private String vehiclePhotoUrl;
    private String photoUrl;
    private String additionalDocuments;

    // Application details
    private String coverLetter;
    private Integer expectedSalary;
    private String availableFrom;
    private Boolean weekendAvailability;

    // Status & Review
    private ApplicationStatus status;
    private LocalDateTime interviewDate;
    private String interviewNotes;
    private String reviewNotes;
    private String rejectionReason;
    private String reviewedBy;
    private LocalDateTime reviewedAt;

    // Hire details
    private Long hiredAsAgentId;
    private LocalDateTime hiredAt;

    // Timestamps
    private LocalDateTime appliedAt;
    private LocalDateTime updatedAt;

    // Helper flags
    private Boolean canBeReviewed;
    private Boolean canBeHired;
    private Boolean isActive;
}