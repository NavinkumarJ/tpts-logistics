package com.tpts.repository;

import com.tpts.entity.Transaction;
import com.tpts.entity.TransactionStatus;
import com.tpts.entity.TransactionType;
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
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    Optional<Transaction> findByTransactionId(String transactionId);

    // Find by wallet
    List<Transaction> findByWalletOrderByCreatedAtDesc(Wallet wallet);

    Page<Transaction> findByWalletOrderByCreatedAtDesc(Wallet wallet, Pageable pageable);

    List<Transaction> findByWalletIdOrderByCreatedAtDesc(Long walletId);

    Page<Transaction> findByWalletIdOrderByCreatedAtDesc(Long walletId, Pageable pageable);

    // Find by wallet and type
    List<Transaction> findByWalletAndTransactionTypeOrderByCreatedAtDesc(
            Wallet wallet, TransactionType type);

    // Find by wallet and status
    List<Transaction> findByWalletAndStatusOrderByCreatedAtDesc(
            Wallet wallet, TransactionStatus status);

    // Find by reference
    List<Transaction> findByReferenceTypeAndReferenceId(String referenceType, Long referenceId);

    // Find recent transactions
    @Query("SELECT t FROM Transaction t WHERE t.wallet.id = :walletId " +
            "ORDER BY t.createdAt DESC")
    List<Transaction> findRecentByWalletId(@Param("walletId") Long walletId, Pageable pageable);

    // Sum by type for wallet
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
            "WHERE t.wallet.id = :walletId AND t.transactionType = :type AND t.status = 'COMPLETED'")
    BigDecimal sumByWalletAndType(@Param("walletId") Long walletId,
                                  @Param("type") TransactionType type);

    // Sum by type for wallet in date range
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
            "WHERE t.wallet.id = :walletId AND t.transactionType = :type " +
            "AND t.status = 'COMPLETED' " +
            "AND t.createdAt BETWEEN :startDate AND :endDate")
    BigDecimal sumByWalletAndTypeInPeriod(@Param("walletId") Long walletId,
                                          @Param("type") TransactionType type,
                                          @Param("startDate") LocalDateTime startDate,
                                          @Param("endDate") LocalDateTime endDate);

    // Count transactions by wallet
    long countByWalletId(Long walletId);

    // Get transactions in date range
    @Query("SELECT t FROM Transaction t WHERE t.wallet.id = :walletId " +
            "AND t.createdAt BETWEEN :startDate AND :endDate " +
            "ORDER BY t.createdAt DESC")
    List<Transaction> findByWalletIdAndDateRange(@Param("walletId") Long walletId,
                                                 @Param("startDate") LocalDateTime startDate,
                                                 @Param("endDate") LocalDateTime endDate);

    // Platform statistics
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
            "WHERE t.transactionType = 'PLATFORM_COMMISSION' AND t.status = 'COMPLETED'")
    BigDecimal getTotalPlatformCommission();

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
            "WHERE t.transactionType = 'PLATFORM_COMMISSION' AND t.status = 'COMPLETED' " +
            "AND t.createdAt >= :since")
    BigDecimal getPlatformCommissionSince(@Param("since") LocalDateTime since);
}