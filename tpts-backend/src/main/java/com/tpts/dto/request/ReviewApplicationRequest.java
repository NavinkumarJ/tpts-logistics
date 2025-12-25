package com.tpts.dto.request;

import com.tpts.entity.ApplicationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for reviewing job application
 * PATCH /api/job-applications/{id}/review
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewApplicationRequest {

    @NotNull(message = "New status is required")
    private ApplicationStatus status;

    // Required if status is REJECTED
    private String rejectionReason;

    // Required if status is INTERVIEW_SCHEDULED
    private LocalDateTime interviewDate;
    private String interviewNotes;

    // Optional review notes
    private String reviewNotes;
}