package com.tpts.repository;

import com.tpts.entity.Parcel;
import com.tpts.entity.ParcelStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ParcelRepository extends JpaRepository<Parcel, Long> {

        // ==========================================
        // Find by Tracking Number
        // ==========================================
        Optional<Parcel> findByTrackingNumber(String trackingNumber);

        boolean existsByTrackingNumber(String trackingNumber);

        // ==========================================
        // Public Tracking
        // ==========================================
        @Query("SELECT p FROM Parcel p WHERE p.trackingNumber = :trackingNumber AND p.deliveryPhone LIKE %:phoneLastFour")
        Optional<Parcel> findByTrackingNumberAndPhoneLastFour(
                        @Param("trackingNumber") String trackingNumber,
                        @Param("phoneLastFour") String phoneLastFour);

        // ==========================================
        // Customer Queries
        // ==========================================
        List<Parcel> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

        List<Parcel> findByCustomerIdAndStatus(Long customerId, ParcelStatus status);

        @Query("SELECT p FROM Parcel p WHERE p.customer.id = :customerId AND p.status IN :statuses ORDER BY p.createdAt DESC")
        List<Parcel> findByCustomerIdAndStatusIn(@Param("customerId") Long customerId,
                        @Param("statuses") List<ParcelStatus> statuses);

        long countByCustomerId(Long customerId);

        long countByCustomerIdAndStatus(Long customerId, ParcelStatus status);

        // ==========================================
        // Company Queries
        // ==========================================
        List<Parcel> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

        List<Parcel> findByCompanyId(Long companyId);

        List<Parcel> findByCompanyIdAndStatus(Long companyId, ParcelStatus status);

        @Query("SELECT p FROM Parcel p WHERE p.company.id = :companyId AND p.status IN :statuses ORDER BY p.createdAt DESC")
        List<Parcel> findByCompanyIdAndStatusIn(@Param("companyId") Long companyId,
                        @Param("statuses") List<ParcelStatus> statuses);

        long countByCompanyId(Long companyId);

        long countByCompanyIdAndStatus(Long companyId, ParcelStatus status);

        @Query("SELECT p FROM Parcel p WHERE p.company.id = :companyId AND p.status = 'CONFIRMED' AND p.agent IS NULL ORDER BY p.createdAt ASC")
        List<Parcel> findParcelsNeedingAssignment(@Param("companyId") Long companyId);

        // ==========================================
        // Agent Queries
        // ==========================================
        List<Parcel> findByAgentIdOrderByCreatedAtDesc(Long agentId);

        List<Parcel> findByAgentIdAndStatus(Long agentId, ParcelStatus status);

        @Query("SELECT p FROM Parcel p WHERE p.agent.id = :agentId AND p.status IN :statuses ORDER BY p.createdAt DESC")
        List<Parcel> findByAgentIdAndStatusIn(@Param("agentId") Long agentId,
                        @Param("statuses") List<ParcelStatus> statuses);

        @Query("SELECT p FROM Parcel p WHERE p.agent.id = :agentId AND p.status IN ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY') ORDER BY p.assignedAt ASC")
        List<Parcel> findActiveDeliveriesForAgent(@Param("agentId") Long agentId);

        long countByAgentId(Long agentId);

        long countByAgentIdAndStatus(Long agentId, ParcelStatus status);

        // ==========================================
        // Group Shipment Queries
        // ==========================================
        List<Parcel> findByGroupShipmentId(Long groupShipmentId);

        long countByGroupShipmentId(Long groupShipmentId);

        // ==========================================
        // Status Updates
        // ==========================================
        @Modifying
        @Query("UPDATE Parcel p SET p.status = :status, p.updatedAt = :now WHERE p.id = :parcelId")
        void updateStatus(@Param("parcelId") Long parcelId, @Param("status") ParcelStatus status,
                        @Param("now") LocalDateTime now);

        @Modifying
        @Query("UPDATE Parcel p SET p.agent.id = :agentId, p.status = 'ASSIGNED', p.assignedAt = :now, p.updatedAt = :now WHERE p.id = :parcelId")
        void assignAgent(@Param("parcelId") Long parcelId, @Param("agentId") Long agentId,
                        @Param("now") LocalDateTime now);

        // ==========================================
        // Statistics
        // ==========================================
        @Query("SELECT COUNT(p) FROM Parcel p WHERE p.company.id = :companyId AND p.status = 'DELIVERED' AND p.deliveredAt >= :startOfDay")
        long countDeliveredTodayByCompany(@Param("companyId") Long companyId,
                        @Param("startOfDay") LocalDateTime startOfDay);

        @Query("SELECT COUNT(p) FROM Parcel p WHERE p.agent.id = :agentId AND p.status = 'DELIVERED' AND p.deliveredAt >= :startOfDay")
        long countDeliveredTodayByAgent(@Param("agentId") Long agentId, @Param("startOfDay") LocalDateTime startOfDay);

        List<Parcel> findByPickupCityOrDeliveryCity(String pickupCity, String deliveryCity);

        long countByStatus(ParcelStatus status);

        // ✅ NEW: Find delivered parcels without ratings (using RatingRepository
        // instead)
        @Query("SELECT p FROM Parcel p WHERE p.status = :status AND p.deliveredAt BETWEEN :start AND :end")
        List<Parcel> findByStatusAndDeliveredAtBetween(@Param("status") ParcelStatus status,
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);
}
