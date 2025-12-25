package com.tpts.repository;

import com.tpts.entity.AssignmentStatus;
import com.tpts.entity.DeliveryRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for DeliveryRequest entity
 */
@Repository
public interface DeliveryRequestRepository extends JpaRepository<DeliveryRequest, Long> {

    // ==========================================
    // Find by Parcel
    // ==========================================

    Optional<DeliveryRequest> findByParcelId(Long parcelId);

    List<DeliveryRequest> findByParcelIdOrderByCreatedAtDesc(Long parcelId);

    boolean existsByParcelIdAndAssignmentStatusIn(Long parcelId, List<AssignmentStatus> statuses);

    // ==========================================
    // Company Queries
    // ==========================================

    List<DeliveryRequest> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    List<DeliveryRequest> findByCompanyIdAndAssignmentStatus(Long companyId, AssignmentStatus status);

    @Query("SELECT dr FROM DeliveryRequest dr WHERE dr.company.id = :companyId " +
            "AND dr.assignmentStatus IN :statuses ORDER BY dr.priority ASC, dr.createdAt DESC")
    List<DeliveryRequest> findByCompanyIdAndStatusIn(
            @Param("companyId") Long companyId,
            @Param("statuses") List<AssignmentStatus> statuses);

    // Requests needing reassignment
    @Query("SELECT dr FROM DeliveryRequest dr WHERE dr.company.id = :companyId " +
            "AND dr.assignmentStatus = 'REASSIGN_NEEDED' ORDER BY dr.priority ASC, dr.createdAt ASC")
    List<DeliveryRequest> findRequestsNeedingReassignment(@Param("companyId") Long companyId);

    // Pending requests (waiting for agent response)
    @Query("SELECT dr FROM DeliveryRequest dr WHERE dr.company.id = :companyId " +
            "AND dr.assignmentStatus = 'PENDING' ORDER BY dr.assignedAt ASC")
    List<DeliveryRequest> findPendingRequests(@Param("companyId") Long companyId);

    // Count by status
    long countByCompanyIdAndAssignmentStatus(Long companyId, AssignmentStatus status);

    // ==========================================
    // Agent Queries
    // ==========================================

    List<DeliveryRequest> findByAssignedAgentIdOrderByCreatedAtDesc(Long agentId);

    List<DeliveryRequest> findByAssignedAgentIdAndAssignmentStatus(Long agentId, AssignmentStatus status);

    // Pending requests for agent
    @Query("SELECT dr FROM DeliveryRequest dr WHERE dr.assignedAgent.id = :agentId " +
            "AND dr.assignmentStatus = 'PENDING' ORDER BY dr.priority ASC, dr.assignedAt ASC")
    List<DeliveryRequest> findPendingRequestsForAgent(@Param("agentId") Long agentId);

    // Active requests for agent (pending or accepted)
    @Query("SELECT dr FROM DeliveryRequest dr WHERE dr.assignedAgent.id = :agentId " +
            "AND dr.assignmentStatus IN ('PENDING', 'ACCEPTED') ORDER BY dr.priority ASC")
    List<DeliveryRequest> findActiveRequestsForAgent(@Param("agentId") Long agentId);

    // Count pending for agent
    long countByAssignedAgentIdAndAssignmentStatus(Long agentId, AssignmentStatus status);

    // ==========================================
    // Status Updates
    // ==========================================

    @Modifying
    @Query("UPDATE DeliveryRequest dr SET dr.assignmentStatus = :status, " +
            "dr.agentResponseAt = :responseAt, dr.updatedAt = :now WHERE dr.id = :id")
    void updateAgentResponse(
            @Param("id") Long id,
            @Param("status") AssignmentStatus status,
            @Param("responseAt") LocalDateTime responseAt,
            @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE DeliveryRequest dr SET dr.assignmentStatus = 'COMPLETED', " +
            "dr.completedAt = :completedAt, dr.updatedAt = :now WHERE dr.id = :id")
    void markCompleted(@Param("id") Long id, @Param("completedAt") LocalDateTime completedAt, @Param("now") LocalDateTime now);

    // ==========================================
    // Find by ID with verification
    // ==========================================

    @Query("SELECT dr FROM DeliveryRequest dr WHERE dr.id = :id AND dr.company.id = :companyId")
    Optional<DeliveryRequest> findByIdAndCompanyId(@Param("id") Long id, @Param("companyId") Long companyId);

    @Query("SELECT dr FROM DeliveryRequest dr WHERE dr.id = :id AND dr.assignedAgent.id = :agentId")
    Optional<DeliveryRequest> findByIdAndAgentId(@Param("id") Long id, @Param("agentId") Long agentId);

    // ==========================================
    // Statistics
    // ==========================================

    // Count total requests by company
    long countByCompanyId(Long companyId);

    // Count accepted today
    @Query("SELECT COUNT(dr) FROM DeliveryRequest dr WHERE dr.company.id = :companyId " +
            "AND dr.assignmentStatus = 'ACCEPTED' AND DATE(dr.agentResponseAt) = CURRENT_DATE")
    long countAcceptedTodayByCompany(@Param("companyId") Long companyId);

    // Count rejected today
    @Query("SELECT COUNT(dr) FROM DeliveryRequest dr WHERE dr.company.id = :companyId " +
            "AND dr.assignmentStatus = 'REJECTED' AND DATE(dr.agentResponseAt) = CURRENT_DATE")
    long countRejectedTodayByCompany(@Param("companyId") Long companyId);

    // Agent acceptance rate
    @Query("SELECT COUNT(dr) FROM DeliveryRequest dr WHERE dr.assignedAgent.id = :agentId " +
            "AND dr.assignmentStatus = 'ACCEPTED'")
    long countAcceptedByAgent(@Param("agentId") Long agentId);

    @Query("SELECT COUNT(dr) FROM DeliveryRequest dr WHERE dr.assignedAgent.id = :agentId " +
            "AND dr.assignmentStatus IN ('ACCEPTED', 'REJECTED')")
    long countRespondedByAgent(@Param("agentId") Long agentId);
}