package com.tpts.repository;

import com.tpts.entity.CompanyAdmin;
import com.tpts.entity.DeliveryAgent;
import com.tpts.entity.Earning;
import com.tpts.entity.EarningStatus;
import com.tpts.entity.Parcel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EarningRepository extends JpaRepository<Earning, Long> {

        Optional<Earning> findByParcel(Parcel parcel);

        Optional<Earning> findByParcelId(Long parcelId);

        // By Company
        List<Earning> findByCompanyOrderByCreatedAtDesc(CompanyAdmin company);

        Page<Earning> findByCompanyOrderByCreatedAtDesc(CompanyAdmin company, Pageable pageable);

        List<Earning> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

        List<Earning> findByCompanyId(Long companyId);

        List<Earning> findByCompanyIdAndStatusOrderByCreatedAtDesc(Long companyId, EarningStatus status);

        // By Agent
        List<Earning> findByAgentOrderByCreatedAtDesc(DeliveryAgent agent);

        Page<Earning> findByAgentOrderByCreatedAtDesc(DeliveryAgent agent, Pageable pageable);

        List<Earning> findByAgentIdOrderByCreatedAtDesc(Long agentId);

        List<Earning> findByAgentIdAndStatusOrderByCreatedAtDesc(Long agentId, EarningStatus status);

        // By Status
        List<Earning> findByStatus(EarningStatus status);

        // Pending earnings to be cleared
        @Query("SELECT e FROM Earning e WHERE e.status = 'PENDING' " +
                        "AND e.createdAt <= :cutoffTime")
        List<Earning> findPendingEarningsToBeCleared(@Param("cutoffTime") LocalDateTime cutoffTime);

        // Sum earnings by company
        @Query("SELECT COALESCE(SUM(e.companyNetEarning), 0) FROM Earning e " +
                        "WHERE e.company.id = :companyId AND e.status = 'CLEARED'")
        BigDecimal sumCompanyEarnings(@Param("companyId") Long companyId);

        @Query("SELECT COALESCE(SUM(e.companyNetEarning), 0) FROM Earning e " +
                        "WHERE e.company.id = :companyId AND e.status = 'CLEARED' " +
                        "AND e.createdAt BETWEEN :startDate AND :endDate")
        BigDecimal sumCompanyEarningsInPeriod(@Param("companyId") Long companyId,
                        @Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate);

        // Sum earnings by agent (include PENDING so agents see earnings immediately)
        @Query("SELECT COALESCE(SUM(e.agentEarning + COALESCE(e.agentBonus, 0) + COALESCE(e.customerTip, 0)), 0) " +
                        "FROM Earning e WHERE e.agent.id = :agentId AND e.status IN ('PENDING', 'CLEARED')")
        BigDecimal sumAgentEarnings(@Param("agentId") Long agentId);

        @Query("SELECT COALESCE(SUM(e.agentEarning + COALESCE(e.agentBonus, 0) + COALESCE(e.customerTip, 0)), 0) " +
                        "FROM Earning e WHERE e.agent.id = :agentId AND e.status IN ('PENDING', 'CLEARED') " +
                        "AND e.createdAt BETWEEN :startDate AND :endDate")
        BigDecimal sumAgentEarningsInPeriod(@Param("agentId") Long agentId,
                        @Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate);

        // Sum platform commission (include PENDING so admin sees expected commission)
        @Query("SELECT COALESCE(SUM(e.platformCommission), 0) FROM Earning e " +
                        "WHERE e.status IN ('PENDING', 'CLEARED')")
        BigDecimal sumPlatformCommission();

        @Query("SELECT COALESCE(SUM(e.platformCommission), 0) FROM Earning e " +
                        "WHERE e.status IN ('PENDING', 'CLEARED') AND e.createdAt BETWEEN :startDate AND :endDate")
        BigDecimal sumPlatformCommissionInPeriod(@Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate);

        // Sum total order amount (revenue) - excludes CANCELLED earnings
        @Query("SELECT COALESCE(SUM(e.orderAmount), 0) FROM Earning e " +
                        "WHERE e.status IN ('PENDING', 'CLEARED')")
        BigDecimal sumTotalOrderAmount();

        @Query("SELECT COALESCE(SUM(e.orderAmount), 0) FROM Earning e " +
                        "WHERE e.status IN ('PENDING', 'CLEARED') AND e.createdAt BETWEEN :startDate AND :endDate")
        BigDecimal sumTotalOrderAmountInPeriod(@Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate);

        // Count earnings
        long countByCompanyId(Long companyId);

        long countByAgentId(Long agentId);

        long countByCompanyIdAndStatus(Long companyId, EarningStatus status);

        long countByAgentIdAndStatus(Long agentId, EarningStatus status);

        // Today's earnings (include PENDING so agents see earnings immediately)
        @Query("SELECT COALESCE(SUM(e.agentEarning), 0) FROM Earning e " +
                        "WHERE e.agent.id = :agentId AND e.status IN ('PENDING', 'CLEARED') AND DATE(e.createdAt) = CURRENT_DATE")
        BigDecimal sumAgentEarningsToday(@Param("agentId") Long agentId);

        @Query("SELECT COUNT(e) FROM Earning e " +
                        "WHERE e.agent.id = :agentId AND DATE(e.createdAt) = CURRENT_DATE")
        long countAgentDeliveriesToday(@Param("agentId") Long agentId);
}