package com.tpts.repository;

import com.tpts.entity.BankAccount;
import com.tpts.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BankAccountRepository extends JpaRepository<BankAccount, Long> {

    List<BankAccount> findByUserOrderByIsPrimaryDescCreatedAtDesc(User user);

    List<BankAccount> findByUserIdOrderByIsPrimaryDescCreatedAtDesc(Long userId);

    List<BankAccount> findByUserIdAndIsActiveTrue(Long userId);

    Optional<BankAccount> findByUserIdAndIsPrimaryTrue(Long userId);

    Optional<BankAccount> findByIdAndUserId(Long id, Long userId);

    // Check if account number exists for user
    boolean existsByUserIdAndAccountNumber(Long userId, String accountNumber);

    // Check if UPI ID exists for user
    boolean existsByUserIdAndUpiId(Long userId, String upiId);

    // Count active accounts
    long countByUserIdAndIsActiveTrue(Long userId);

    // Set all accounts as non-primary for user
    @Modifying
    @Query("UPDATE BankAccount b SET b.isPrimary = false WHERE b.user.id = :userId")
    void clearPrimaryForUser(@Param("userId") Long userId);

    // Deactivate account
    @Modifying
    @Query("UPDATE BankAccount b SET b.isActive = false WHERE b.id = :id")
    void deactivate(@Param("id") Long id);
}