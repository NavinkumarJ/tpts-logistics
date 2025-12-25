package com.tpts.entity;

/**
 * Enum for Job Application Status
 * Tracks the hiring workflow
 */
public enum ApplicationStatus {
    PENDING,      // Application submitted, waiting for review
    UNDER_REVIEW, // Company is reviewing
    SHORTLISTED,  // Shortlisted for interview
    INTERVIEW_SCHEDULED, // Interview date set
    APPROVED,     // Approved, pending hire
    REJECTED,     // Application rejected
    HIRED,        // Hired and agent account created
    WITHDRAWN     // Applicant withdrew application
}