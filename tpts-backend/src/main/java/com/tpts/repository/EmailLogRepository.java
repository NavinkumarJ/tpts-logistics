package com.tpts.repository;

import com.tpts.entity.EmailLog;
import com.tpts.entity.EmailLog.EmailRecipientType;
import com.tpts.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {

    // Find by sender
    List<EmailLog> findBySenderUserOrderByCreatedAtDesc(User senderUser);

    Page<EmailLog> findBySenderUserOrderByCreatedAtDesc(User senderUser, Pageable pageable);

    // Find by recipient type
    List<EmailLog> findByRecipientTypeOrderByCreatedAtDesc(EmailRecipientType recipientType);

    Page<EmailLog> findByRecipientTypeOrderByCreatedAtDesc(EmailRecipientType recipientType, Pageable pageable);

    // Find by sender and recipient type (for company viewing their agent emails)
    Page<EmailLog> findBySenderUserAndRecipientTypeOrderByCreatedAtDesc(
            User senderUser, EmailRecipientType recipientType, Pageable pageable);

    // Search by subject or recipient name
    @Query("SELECT e FROM EmailLog e WHERE " +
            "(LOWER(e.subject) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(e.recipientName) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "ORDER BY e.createdAt DESC")
    Page<EmailLog> searchBySubjectOrRecipient(@Param("query") String query, Pageable pageable);

    // Find emails sent within date range
    List<EmailLog> findByCreatedAtBetweenOrderByCreatedAtDesc(
            LocalDateTime start, LocalDateTime end);

    // Count emails by sender
    long countBySenderUser(User senderUser);

    // Count emails by type
    long countByRecipientType(EmailRecipientType recipientType);

    // Get recent emails for admin dashboard
    List<EmailLog> findTop10ByOrderByCreatedAtDesc();
}
