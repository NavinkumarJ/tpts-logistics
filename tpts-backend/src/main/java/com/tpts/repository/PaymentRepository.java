package com.tpts.repository;

import com.tpts.entity.Payment;
import com.tpts.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for Payment entity
 */
@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

        // ==========================================
        // Find by Related Entities
        // ==========================================

        Optional<Payment> findByParcelId(Long parcelId);

        List<Payment> findByStatusAndCreatedAtBetween(PaymentStatus status, LocalDateTime start, LocalDateTime end);

        Optional<Payment> findByRazorpayRefundId(String razorpayRefundId);

        List<Payment> findByParcelIdOrderByCreatedAtDesc(Long parcelId);

        // Get the first (most recent) payment for a parcel - needed since balance
        // payments can create multiple records
        Optional<Payment> findFirstByParcelIdOrderByCreatedAtDesc(Long parcelId);

        List<Payment> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

        List<Payment> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

        // ==========================================
        // Find by Razorpay IDs
        // ==========================================

        Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);

        Optional<Payment> findByRazorpayPaymentId(String razorpayPaymentId);

        boolean existsByRazorpayOrderId(String razorpayOrderId);

        // ==========================================
        // Find by Status
        // ==========================================

        List<Payment> findByStatus(PaymentStatus status);

        List<Payment> findByCustomerIdAndStatus(Long customerId, PaymentStatus status);

        List<Payment> findByCompanyIdAndStatus(Long companyId, PaymentStatus status);

        // Pending payments older than X minutes (for cleanup/retry)
        @Query("SELECT p FROM Payment p WHERE p.status = 'PENDING' AND p.initiatedAt < :cutoff")
        List<Payment> findStalePendingPayments(@Param("cutoff") LocalDateTime cutoff);

        // ==========================================
        // Customer Payment History
        // ==========================================

        @Query("SELECT p FROM Payment p WHERE p.customer.id = :customerId " +
                        "AND p.status = 'SUCCESS' ORDER BY p.completedAt DESC")
        List<Payment> findSuccessfulPaymentsByCustomer(@Param("customerId") Long customerId);

        @Query("SELECT p FROM Payment p WHERE p.customer.id = :customerId " +
                        "ORDER BY p.createdAt DESC")
        List<Payment> findAllPaymentsByCustomer(@Param("customerId") Long customerId);

        // ==========================================
        // Company Revenue
        // ==========================================

        @Query("SELECT p FROM Payment p WHERE p.company.id = :companyId " +
                        "AND p.status = 'SUCCESS' ORDER BY p.completedAt DESC")
        List<Payment> findSuccessfulPaymentsByCompany(@Param("companyId") Long companyId);

        @Query("SELECT COALESCE(SUM(p.totalAmount), 0) FROM Payment p " +
                        "WHERE p.company.id = :companyId AND p.status = 'SUCCESS'")
        BigDecimal getTotalRevenueByCompany(@Param("companyId") Long companyId);

        @Query("SELECT COALESCE(SUM(p.totalAmount), 0) FROM Payment p " +
                        "WHERE p.company.id = :companyId AND p.status = 'SUCCESS' " +
                        "AND DATE(p.completedAt) = CURRENT_DATE")
        BigDecimal getTodayRevenueByCompany(@Param("companyId") Long companyId);

        @Query("SELECT COALESCE(SUM(p.totalAmount), 0) FROM Payment p " +
                        "WHERE p.company.id = :companyId AND p.status = 'SUCCESS' " +
                        "AND MONTH(p.completedAt) = MONTH(CURRENT_DATE) " +
                        "AND YEAR(p.completedAt) = YEAR(CURRENT_DATE)")
        BigDecimal getMonthlyRevenueByCompany(@Param("companyId") Long companyId);

        // ==========================================
        // Refund Queries
        // ==========================================

        @Query("SELECT p FROM Payment p WHERE p.company.id = :companyId " +
                        "AND p.status IN ('REFUNDED', 'PARTIALLY_REFUNDED', 'REFUND_INITIATED') " +
                        "ORDER BY p.refundedAt DESC")
        List<Payment> findRefundedPaymentsByCompany(@Param("companyId") Long companyId);

        @Query("SELECT COALESCE(SUM(p.refundAmount), 0) FROM Payment p " +
                        "WHERE p.company.id = :companyId " +
                        "AND p.status IN ('REFUNDED', 'PARTIALLY_REFUNDED')")
        BigDecimal getTotalRefundsByCompany(@Param("companyId") Long companyId);

        // ==========================================
        // Statistics
        // ==========================================

        long countByCompanyIdAndStatus(Long companyId, PaymentStatus status);

        long countByCustomerIdAndStatus(Long customerId, PaymentStatus status);

        @Query("SELECT COUNT(p) FROM Payment p WHERE p.company.id = :companyId " +
                        "AND p.status = 'SUCCESS' AND DATE(p.completedAt) = CURRENT_DATE")
        long countTodaySuccessfulPayments(@Param("companyId") Long companyId);

        // ==========================================
        // Date Range Queries
        // ==========================================

        @Query("SELECT p FROM Payment p WHERE p.company.id = :companyId " +
                        "AND p.status = 'SUCCESS' AND p.completedAt BETWEEN :startDate AND :endDate " +
                        "ORDER BY p.completedAt DESC")
        List<Payment> findPaymentsByCompanyAndDateRange(
                        @Param("companyId") Long companyId,
                        @Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate);

        @Query("SELECT COALESCE(SUM(p.totalAmount), 0) FROM Payment p " +
                        "WHERE p.company.id = :companyId AND p.status = 'SUCCESS' " +
                        "AND p.completedAt BETWEEN :startDate AND :endDate")
        BigDecimal getRevenueByCompanyAndDateRange(
                        @Param("companyId") Long companyId,
                        @Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate);

        // ==========================================
        // Verification
        // ==========================================

        @Query("SELECT p FROM Payment p WHERE p.id = :id AND p.customer.id = :customerId")
        Optional<Payment> findByIdAndCustomerId(@Param("id") Long id, @Param("customerId") Long customerId);

        @Query("SELECT p FROM Payment p WHERE p.id = :id AND p.company.id = :companyId")
        Optional<Payment> findByIdAndCompanyId(@Param("id") Long id, @Param("companyId") Long companyId);

        // Check if parcel has successful payment
        boolean existsByParcelIdAndStatus(Long parcelId, PaymentStatus status);

        // Count by status (for platform stats)
        long countByStatus(PaymentStatus status);

        // Add these methods to your PaymentRepository interface:

        Optional<Payment> findByTransactionId(String transactionId);

        Optional<Payment> findByRefundId(String refundId);

        @Query("SELECT p FROM Payment p WHERE p.status = :status AND p.createdAt < :before")
        List<Payment> findByStatusAndCreatedAtBefore(@Param("status") PaymentStatus status,
                        @Param("before") LocalDateTime before);

}