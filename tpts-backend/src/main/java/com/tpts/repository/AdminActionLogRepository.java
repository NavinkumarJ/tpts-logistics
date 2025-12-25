package com.tpts.repository;

import com.tpts.entity.AdminActionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for AdminActionLog entity
 * Provides methods to query admin action audit logs
 */
@Repository
public interface AdminActionLogRepository extends JpaRepository<AdminActionLog, Long> {

    // Find all logs ordered by date
    List<AdminActionLog> findAllByOrderByCreatedAtDesc();

    // Find recent logs with limit
    @Query("SELECT a FROM AdminActionLog a ORDER BY a.createdAt DESC LIMIT :limit")
    List<AdminActionLog> findRecentLogs(@Param("limit") int limit);

    // Find logs by action type
    List<AdminActionLog> findByActionTypeOrderByCreatedAtDesc(String actionType);

    // Find logs by user
    List<AdminActionLog> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Find logs by user email
    List<AdminActionLog> findByUserEmailOrderByCreatedAtDesc(String userEmail);

    // Find logs within date range
    @Query("SELECT a FROM AdminActionLog a WHERE a.createdAt BETWEEN :start AND :end ORDER BY a.createdAt DESC")
    List<AdminActionLog> findByDateRange(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    // Paginated queries
    Page<AdminActionLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<AdminActionLog> findByActionTypeOrderByCreatedAtDesc(String actionType, Pageable pageable);

    // Search in action description
    @Query("SELECT a FROM AdminActionLog a WHERE LOWER(a.action) LIKE LOWER(CONCAT('%', :search, '%')) ORDER BY a.createdAt DESC")
    List<AdminActionLog> searchByAction(@Param("search") String search);

    // Count by action type
    long countByActionType(String actionType);

    // Count since date
    @Query("SELECT COUNT(a) FROM AdminActionLog a WHERE a.createdAt >= :since")
    long countSince(@Param("since") LocalDateTime since);
}
