package com.tpts.repository;

import com.tpts.entity.Payout;
import com.tpts.entity.PayoutStatus;
import com.tpts.entity.User;
import com.tpts.entity.Wallet;
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
public interface PayoutRepository extends JpaRepository<Payout, Long> {

    Optional<Payout> findByPayoutId(String payoutId);

    // By User
    List<Payout> findByUserOrderByCreatedAtDesc(User user);

    Page<Payout> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    List<Payout> findByUserIdOrderByCreatedAtDesc(Long userId);

    // By Wallet
    List<Payout> findByWalletOrderByCreatedAtDesc(Wallet wallet);

    // By Status
    List<Payout> findByStatusOrderByCreatedAtDesc(PayoutStatus status);

    Page<Payout> findByStatusOrderByCreatedAtDesc(PayoutStatus status, Pageable pageable);

    // Pending payouts (for admin)
    @Query("SELECT p FROM Payout p WHERE p.status IN ('REQUESTED', 'PROCESSING') " +
            "ORDER BY p.createdAt ASC")
    List<Payout> findPendingPayouts();

    @Query("SELECT p FROM Payout p WHERE p.status IN ('REQUESTED', 'PROCESSING') " +
            "ORDER BY p.createdAt ASC")
    Page<Payout> findPendingPayouts(Pageable pageable);

    // User's pending payouts
    @Query("SELECT p FROM Payout p WHERE p.user.id = :userId " +
            "AND p.status IN ('REQUESTED', 'PROCESSING') ORDER BY p.createdAt DESC")
    List<Payout> findUserPendingPayouts(@Param("userId") Long userId);

    // Sum by status
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payout p WHERE p.status = :status")
    BigDecimal sumByStatus(@Param("status") PayoutStatus status);

    // Sum completed payouts by user
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payout p " +
            "WHERE p.user.id = :userId AND p.status = 'COMPLETED'")
    BigDecimal sumCompletedByUser(@Param("userId") Long userId);

    // Sum completed payouts in period
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payout p " +
            "WHERE p.status = 'COMPLETED' AND p.processedAt BETWEEN :startDate AND :endDate")
    BigDecimal sumCompletedInPeriod(@Param("startDate") LocalDateTime startDate,
                                    @Param("endDate") LocalDateTime endDate);

    // Count by status
    long countByStatus(PayoutStatus status);

    long countByUserIdAndStatus(Long userId, PayoutStatus status);

    // Check for pending payout
    boolean existsByUserIdAndStatusIn(Long userId, List<PayoutStatus> statuses);

    // Recent payouts
    @Query("SELECT p FROM Payout p WHERE p.user.id = :userId " +
            "ORDER BY p.createdAt DESC")
    List<Payout> findRecentByUserId(@Param("userId") Long userId, Pageable pageable);
}