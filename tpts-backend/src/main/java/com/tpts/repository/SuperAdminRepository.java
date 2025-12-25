package com.tpts.repository;

import com.tpts.entity.SuperAdmin;
import com.tpts.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for SuperAdmin entity
 */
@Repository
public interface SuperAdminRepository extends JpaRepository<SuperAdmin, Long> {

    // Find by user
    Optional<SuperAdmin> findByUser(User user);

    // Find by user id
    Optional<SuperAdmin> findByUserId(Long userId);

    // Check if super admin exists for user
    boolean existsByUserId(Long userId);

    // Find by role
    List<SuperAdmin> findByRole(String role);

    // Find all active admins
    @Query("SELECT sa FROM SuperAdmin sa WHERE sa.user.isActive = true")
    List<SuperAdmin> findAllActive();

    // Find admins by department
    List<SuperAdmin> findByDepartment(String department);

    // Find admins who logged in recently
    @Query("SELECT sa FROM SuperAdmin sa WHERE sa.lastLoginAt >= :since ORDER BY sa.lastLoginAt DESC")
    List<SuperAdmin> findRecentlyLoggedIn(@Param("since") LocalDateTime since);

    // Update last login
    @Modifying
    @Query("UPDATE SuperAdmin sa SET sa.lastLoginAt = :time WHERE sa.id = :id")
    void updateLastLogin(@Param("id") Long id, @Param("time") LocalDateTime time);

    // Count by role
    long countByRole(String role);
}