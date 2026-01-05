package com.tpts.service;

import com.tpts.entity.LoginActivity;
import com.tpts.entity.LoginActivity.ActivityType;
import com.tpts.entity.User;
import com.tpts.entity.UserType;
import com.tpts.repository.LoginActivityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Service for managing login/logout activity logs
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoginActivityService {

    private final LoginActivityRepository loginActivityRepository;

    /**
     * Record a login activity
     */
    @Transactional
    public void recordLogin(User user, HttpServletRequest request) {
        recordActivity(user, ActivityType.LOGIN, request);
        log.info("Login recorded for user: {}", user.getEmail());
    }

    /**
     * Record a logout activity
     */
    @Transactional
    public void recordLogout(User user, HttpServletRequest request) {
        recordActivity(user, ActivityType.LOGOUT, request);
        log.info("Logout recorded for user: {}", user.getEmail());
    }

    /**
     * Record a failed login attempt
     */
    @Transactional
    public void recordLoginFailed(String email, UserType userType, HttpServletRequest request) {
        LoginActivity activity = LoginActivity.builder()
                .activityType(ActivityType.LOGIN_FAILED)
                .userType(userType)
                .userEmail(email)
                .userName(email)
                .ipAddress(getClientIp(request))
                .userAgent(request != null ? request.getHeader("User-Agent") : null)
                .timestamp(LocalDateTime.now())
                .build();

        loginActivityRepository.save(activity);
        log.warn("Failed login attempt recorded for email: {}", email);
    }

    /**
     * Record a generic activity
     */
    @Transactional
    public void recordActivity(User user, ActivityType activityType, HttpServletRequest request) {
        String userName = getUserDisplayName(user);

        LoginActivity activity = LoginActivity.builder()
                .user(user)
                .activityType(activityType)
                .userType(user.getUserType())
                .userEmail(user.getEmail())
                .userName(userName)
                .ipAddress(getClientIp(request))
                .userAgent(request != null ? request.getHeader("User-Agent") : null)
                .timestamp(LocalDateTime.now())
                .build();

        loginActivityRepository.save(activity);
    }

    /**
     * Get recent login activities (paginated)
     */
    public Page<LoginActivity> getRecentActivities(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return loginActivityRepository.findAllByOrderByTimestampDesc(pageable);
    }

    /**
     * Get activities for a specific user
     */
    public List<LoginActivity> getActivitiesForUser(Long userId) {
        return loginActivityRepository.findByUserIdOrderByTimestampDesc(userId);
    }

    /**
     * Get activities by type
     */
    public List<LoginActivity> getActivitiesByType(ActivityType activityType) {
        return loginActivityRepository.findByActivityTypeOrderByTimestampDesc(activityType);
    }

    /**
     * Count logins today
     */
    public Long countLoginsToday() {
        LocalDateTime startOfDay = LocalDateTime.now().truncatedTo(ChronoUnit.DAYS);
        Long count = loginActivityRepository.countLoginsToday(startOfDay);
        return count != null ? count : 0L;
    }

    /**
     * Count unique non-admin users who logged in today
     */
    public Long countUniqueUsersLoggedInToday() {
        LocalDateTime startOfDay = LocalDateTime.now().truncatedTo(ChronoUnit.DAYS);
        Long count = loginActivityRepository.countUniqueLoginsToday(startOfDay);
        return count != null ? count : 0L;
    }

    /**
     * Get activities from the last N hours
     */
    public List<LoginActivity> getRecentActivities(int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return loginActivityRepository.findRecentActivities(since);
    }

    /**
     * Get activities for date range
     */
    public List<LoginActivity> getActivitiesBetween(LocalDateTime start, LocalDateTime end) {
        return loginActivityRepository.findActivitiesBetween(start, end);
    }

    /**
     * Get client IP address from request
     */
    private String getClientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }

        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }

    /**
     * Get display name for user
     */
    private String getUserDisplayName(User user) {
        // Return email as default, will be enriched by caller if needed
        return user.getEmail();
    }
}
