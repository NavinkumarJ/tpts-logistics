package com.tpts.repository;

import com.tpts.entity.User;
import com.tpts.entity.Wallet;
import com.tpts.entity.WalletType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, Long> {

    Optional<Wallet> findByUser(User user);

    Optional<Wallet> findByUserId(Long userId);

    Optional<Wallet> findByUserIdAndWalletType(Long userId, WalletType walletType);

    List<Wallet> findByWalletType(WalletType walletType);

    List<Wallet> findByIsActiveTrue();

    // Find wallets with available balance >= amount
    @Query("SELECT w FROM Wallet w WHERE w.availableBalance >= :amount AND w.isActive = true")
    List<Wallet> findWalletsWithAvailableBalance(@Param("amount") BigDecimal amount);

    // Get total platform earnings
    @Query("SELECT SUM(w.totalEarnings) FROM Wallet w WHERE w.walletType = 'PLATFORM'")
    BigDecimal getTotalPlatformEarnings();

    // Get total company earnings
    @Query("SELECT SUM(w.totalEarnings) FROM Wallet w WHERE w.walletType = 'COMPANY'")
    BigDecimal getTotalCompanyEarnings();

    // Get total agent earnings
    @Query("SELECT SUM(w.totalEarnings) FROM Wallet w WHERE w.walletType = 'AGENT'")
    BigDecimal getTotalAgentEarnings();

    // Get total pending balance by type
    @Query("SELECT SUM(w.pendingBalance) FROM Wallet w WHERE w.walletType = :type")
    BigDecimal getTotalPendingByType(@Param("type") WalletType type);

    // Get total available balance by type
    @Query("SELECT SUM(w.availableBalance) FROM Wallet w WHERE w.walletType = :type")
    BigDecimal getTotalAvailableByType(@Param("type") WalletType type);

    // Check if wallet exists for user
    boolean existsByUserId(Long userId);
}