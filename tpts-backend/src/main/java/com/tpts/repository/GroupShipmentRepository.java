package com.tpts.repository;

import com.tpts.entity.GroupShipment;
import com.tpts.entity.GroupStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for GroupShipment entity
 */
@Repository
public interface GroupShipmentRepository extends JpaRepository<GroupShipment, Long> {

        // ==========================================
        // Find by Group Code
        // ==========================================

        Optional<GroupShipment> findByGroupCode(String groupCode);

        Long countByStatusIn(List<GroupStatus> statuses);

        boolean existsByGroupCode(String groupCode);

        // ==========================================
        // Company Queries
        // ==========================================

        List<GroupShipment> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

        List<GroupShipment> findByCompanyIdAndStatus(Long companyId, GroupStatus status);

        @Query("SELECT g FROM GroupShipment g WHERE g.company.id = :companyId AND g.status IN :statuses ORDER BY g.createdAt DESC")
        List<GroupShipment> findByCompanyIdAndStatusIn(@Param("companyId") Long companyId,
                        @Param("statuses") List<GroupStatus> statuses);

        long countByCompanyId(Long companyId);

        long countByCompanyIdAndStatus(Long companyId, GroupStatus status);

        // ==========================================
        // Public Queries (Open Groups)
        // ==========================================

        // Find open groups by source city
        @Query("SELECT g FROM GroupShipment g WHERE g.status = 'OPEN' AND g.sourceCity = :city AND g.deadline > :now ORDER BY g.deadline ASC")
        List<GroupShipment> findOpenGroupsBySourceCity(@Param("city") String city, @Param("now") LocalDateTime now);

        // Find open groups by target city
        @Query("SELECT g FROM GroupShipment g WHERE g.status = 'OPEN' AND g.targetCity = :city AND g.deadline > :now ORDER BY g.deadline ASC")
        List<GroupShipment> findOpenGroupsByTargetCity(@Param("city") String city, @Param("now") LocalDateTime now);

        // Find open groups by route (source → target)
        @Query("SELECT g FROM GroupShipment g WHERE g.status = 'OPEN' AND g.sourceCity = :sourceCity AND g.targetCity = :targetCity AND g.deadline > :now ORDER BY g.deadline ASC")
        List<GroupShipment> findOpenGroupsByRoute(
                        @Param("sourceCity") String sourceCity,
                        @Param("targetCity") String targetCity,
                        @Param("now") LocalDateTime now);

        // Find all open groups not expired
        @Query("SELECT g FROM GroupShipment g WHERE g.status = 'OPEN' AND g.deadline > :now ORDER BY g.deadline ASC")
        List<GroupShipment> findAllOpenGroups(@Param("now") LocalDateTime now);

        // ==========================================
        // Agent Queries
        // ==========================================

        // Find groups assigned to pickup agent
        List<GroupShipment> findByPickupAgentId(Long agentId);

        // Find groups assigned to delivery agent
        List<GroupShipment> findByDeliveryAgentId(Long agentId);

        // Find active groups for pickup agent
        @Query("SELECT g FROM GroupShipment g WHERE g.pickupAgent.id = :agentId AND g.status IN ('FULL', 'PICKUP_IN_PROGRESS')")
        List<GroupShipment> findActivePickupGroupsForAgent(@Param("agentId") Long agentId);

        // Find active groups for delivery agent
        @Query("SELECT g FROM GroupShipment g WHERE g.deliveryAgent.id = :agentId AND g.status IN ('PICKUP_COMPLETE', 'DELIVERY_IN_PROGRESS')")
        List<GroupShipment> findActiveDeliveryGroupsForAgent(@Param("agentId") Long agentId);

        // Count completed groups where agent was pickup agent
        @Query("SELECT COUNT(g) FROM GroupShipment g WHERE g.pickupAgent.id = :agentId AND g.status = 'COMPLETED'")
        long countCompletedByPickupAgentId(@Param("agentId") Long agentId);

        // Count completed groups where agent was delivery agent
        @Query("SELECT COUNT(g) FROM GroupShipment g WHERE g.deliveryAgent.id = :agentId AND g.status = 'COMPLETED'")
        long countCompletedByDeliveryAgentId(@Param("agentId") Long agentId);

        // ==========================================
        // Status Updates
        // ==========================================

        @Modifying
        @Query("UPDATE GroupShipment g SET g.currentMembers = g.currentMembers + 1 WHERE g.id = :groupId")
        void incrementMemberCount(@Param("groupId") Long groupId);

        @Modifying
        @Query("UPDATE GroupShipment g SET g.currentMembers = g.currentMembers - 1 WHERE g.id = :groupId AND g.currentMembers > 0")
        void decrementMemberCount(@Param("groupId") Long groupId);

        @Modifying
        @Query("UPDATE GroupShipment g SET g.status = :status, g.updatedAt = :now WHERE g.id = :groupId")
        void updateStatus(@Param("groupId") Long groupId, @Param("status") GroupStatus status,
                        @Param("now") LocalDateTime now);

        // ==========================================
        // Expired Groups
        // ==========================================

        // Find expired open groups (deadline passed)
        @Query("SELECT g FROM GroupShipment g WHERE g.status = 'OPEN' AND g.deadline < :now")
        List<GroupShipment> findExpiredOpenGroups(@Param("now") LocalDateTime now);

        // ==========================================
        // Statistics
        // ==========================================

        // Count open groups by city
        @Query("SELECT COUNT(g) FROM GroupShipment g WHERE g.status = 'OPEN' AND g.sourceCity = :city AND g.deadline > :now")
        long countOpenGroupsBySourceCity(@Param("city") String city, @Param("now") LocalDateTime now);

        // Average discount percentage for completed groups
        @Query("SELECT AVG(g.discountPercentage) FROM GroupShipment g WHERE g.company.id = :companyId AND g.status = 'COMPLETED'")
        BigDecimal getAverageDiscountByCompany(@Param("companyId") Long companyId);

        Long countByStatus(GroupStatus groupStatus);

        // Add these methods to your GroupShipmentRepository interface:

        @Query("SELECT g FROM GroupShipment g WHERE g.status = :status AND g.deadline < :before")
        List<GroupShipment> findByStatusAndDeadlineBefore(@Param("status") GroupStatus status,
                        @Param("before") LocalDateTime before);

        @Query("SELECT g FROM GroupShipment g WHERE g.status = :status AND g.deadline BETWEEN :start AND :end")
        List<GroupShipment> findByStatusAndDeadlineBetween(@Param("status") GroupStatus status,
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

}