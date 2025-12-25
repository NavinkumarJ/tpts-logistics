package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * DeliveryRequest Entity
 * Tracks the assignment workflow between company and delivery agent
 * Supports accept/reject flow for agent assignments
 */
@Entity
@Table(name = "delivery_requests", indexes = {
        @Index(name = "idx_dr_parcel", columnList = "parcel_id"),
        @Index(name = "idx_dr_company", columnList = "company_id"),
        @Index(name = "idx_dr_agent", columnList = "assigned_agent_id"),
        @Index(name = "idx_dr_status", columnList = "assignment_status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The parcel being assigned
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parcel_id", nullable = false)
    private Parcel parcel;

    // The company making the assignment
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private CompanyAdmin company;

    // The agent being assigned (can be null initially or after rejection)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_agent_id")
    private DeliveryAgent assignedAgent;

    // Assignment status
    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_status", nullable = false, length = 20)
    @Builder.Default
    private AssignmentStatus assignmentStatus = AssignmentStatus.PENDING;

    // Timestamps for tracking
    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "agent_response_at")
    private LocalDateTime agentResponseAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // Rejection details
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    // Assignment attempt count (for tracking reassignments)
    @Column(name = "attempt_count")
    @Builder.Default
    private Integer attemptCount = 1;

    // Notes from company
    @Column(name = "company_notes", columnDefinition = "TEXT")
    private String companyNotes;

    // Priority level (1 = highest)
    @Column(name = "priority")
    @Builder.Default
    private Integer priority = 5;

    // Estimated earnings for this delivery
    @Column(name = "estimated_earnings")
    private java.math.BigDecimal estimatedEarnings;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Helper methods
    public boolean isPending() {
        return assignmentStatus == AssignmentStatus.PENDING;
    }

    public boolean canRespond() {
        return assignmentStatus == AssignmentStatus.PENDING;
    }

    public boolean needsReassignment() {
        return assignmentStatus == AssignmentStatus.REASSIGN_NEEDED;
    }
}