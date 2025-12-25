package com.tpts.repository;

import com.tpts.entity.Notification;
import com.tpts.entity.NotificationChannel;
import com.tpts.entity.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for Notification entity
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // ==========================================
    // User Notifications
    // ==========================================

    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Notification> findByUserIdAndChannelOrderByCreatedAtDesc(Long userId, NotificationChannel channel);

    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);

    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId " +
            "ORDER BY n.createdAt DESC LIMIT :limit")
    List<Notification> findRecentByUserId(@Param("userId") Long userId, @Param("limit") int limit);

    // ==========================================
    // In-App Notifications
    // ==========================================

    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId " +
            "AND n.channel = 'IN_APP' ORDER BY n.createdAt DESC")
    List<Notification> findInAppNotifications(@Param("userId") Long userId);

    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId " +
            "AND n.channel = 'IN_APP' AND n.isRead = false ORDER BY n.createdAt DESC")
    List<Notification> findUnreadInAppNotifications(@Param("userId") Long userId);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user.id = :userId " +
            "AND n.channel = 'IN_APP' AND n.isRead = false")
    long countUnreadByUserId(@Param("userId") Long userId);

    // ==========================================
    // Mark as Read
    // ==========================================

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :now " +
            "WHERE n.id = :id AND n.user.id = :userId")
    void markAsRead(@Param("id") Long id, @Param("userId") Long userId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :now " +
            "WHERE n.user.id = :userId AND n.isRead = false")
    void markAllAsRead(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    // ==========================================
    // Pending/Failed Notifications (for retry)
    // ==========================================

    @Query("SELECT n FROM Notification n WHERE n.isSent = false AND n.isFailed = false " +
            "AND n.channel IN ('SMS', 'EMAIL') ORDER BY n.priority ASC, n.createdAt ASC")
    List<Notification> findPendingNotifications();

    @Query("SELECT n FROM Notification n WHERE n.isFailed = true " +
            "AND n.retryCount < n.maxRetries AND n.nextRetryAt <= :now " +
            "ORDER BY n.priority ASC")
    List<Notification> findNotificationsToRetry(@Param("now") LocalDateTime now);

    @Query("SELECT n FROM Notification n WHERE n.isFailed = true " +
            "AND n.retryCount >= n.maxRetries ORDER BY n.createdAt DESC")
    List<Notification> findPermanentlyFailedNotifications();

    // ==========================================
    // By Type
    // ==========================================

    List<Notification> findByUserIdAndTypeOrderByCreatedAtDesc(Long userId, NotificationType type);

    List<Notification> findByType(NotificationType type);

    // ==========================================
    // By Reference
    // ==========================================

    List<Notification> findByReferenceIdAndReferenceType(Long referenceId, String referenceType);

    @Query("SELECT n FROM Notification n WHERE n.referenceId = :refId " +
            "AND n.referenceType = :refType AND n.user.id = :userId")
    List<Notification> findByReferenceAndUser(
            @Param("refId") Long referenceId,
            @Param("refType") String referenceType,
            @Param("userId") Long userId);

    // ==========================================
    // Statistics
    // ==========================================

    long countByUserIdAndChannel(Long userId, NotificationChannel channel);

    long countByChannelAndIsSentTrue(NotificationChannel channel);

    long countByChannelAndIsFailedTrue(NotificationChannel channel);

    @Query("SELECT n.type, COUNT(n) FROM Notification n " +
            "WHERE n.createdAt >= :since GROUP BY n.type")
    List<Object[]> countByTypeSince(@Param("since") LocalDateTime since);

    @Query("SELECT n.channel, COUNT(n) FROM Notification n " +
            "WHERE n.createdAt >= :since GROUP BY n.channel")
    List<Object[]> countByChannelSince(@Param("since") LocalDateTime since);

    // ==========================================
    // Cleanup
    // ==========================================

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.isRead = true AND n.createdAt < :before")
    void deleteOldReadNotifications(@Param("before") LocalDateTime before);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.createdAt < :before AND n.isRead = true")
    void deleteOldNotifications(@Param("before") LocalDateTime before);

}