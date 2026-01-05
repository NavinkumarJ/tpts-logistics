package com.tpts.repository;

import com.tpts.entity.LoginActivity;
import com.tpts.entity.LoginActivity.ActivityType;
import com.tpts.entity.UserType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for LoginActivity entity
 */
@Repository
public interface LoginActivityRepository extends JpaRepository<LoginActivity, Long> {

    // Find all activities for a user
    List<LoginActivity> findByUserIdOrderByTimestampDesc(Long userId);

    // Find recent activities (paginated)
    Page<LoginActivity> findAllByOrderByTimestampDesc(Pageable pageable);

    // Find activities by type
    List<LoginActivity> findByActivityTypeOrderByTimestampDesc(ActivityType activityType);

    // Find activities by user type
    List<LoginActivity> findByUserTypeOrderByTimestampDesc(UserType userType);

    // Count activities by type
    long countByActivityType(ActivityType activityType);

    // Count logins today
    @Query("SELECT COUNT(la) FROM LoginActivity la WHERE la.activityType = 'LOGIN' AND la.timestamp >= :startOfDay")
    Long countLoginsToday(@Param("startOfDay") LocalDateTime startOfDay);

    // Get recent activities within time period
    @Query("SELECT la FROM LoginActivity la WHERE la.timestamp >= :since ORDER BY la.timestamp DESC")
    List<LoginActivity> findRecentActivities(@Param("since") LocalDateTime since);

    // Find activities by date range
    @Query("SELECT la FROM LoginActivity la WHERE la.timestamp BETWEEN :start AND :end ORDER BY la.timestamp DESC")
    List<LoginActivity> findActivitiesBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // Count unique non-admin users who logged in today
    @Query("SELECT COUNT(DISTINCT la.user.id) FROM LoginActivity la WHERE la.activityType = com.tpts.entity.LoginActivity$ActivityType.LOGIN AND la.userType <> com.tpts.entity.UserType.SUPER_ADMIN AND la.timestamp >= :startOfDay")
    Long countUniqueLoginsToday(@Param("startOfDay") LocalDateTime startOfDay);
}
