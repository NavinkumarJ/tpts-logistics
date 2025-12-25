package com.tpts.repository;

import com.tpts.entity.User;
import com.tpts.entity.UserType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for User entity
 * Provides custom queries for authentication and user management
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Find by email (for login)
    Optional<User> findByEmail(String email);
    // Find by phone
    Optional<User> findByPhone(String phone);

    // Check if email exists
    boolean existsByEmail(String email);

    // Check if phone exists
    boolean existsByPhone(String phone);

    // ADD THIS - Count active users today
    Long countByLastLoginAfter(LocalDateTime dateTime);

    // Find by email and user type
    Optional<User> findByEmailAndUserType(String email, UserType userType);

    // Find by refresh token
    Optional<User> findByRefreshToken(String refreshToken);

    // Find by reset token
    Optional<User> findByResetToken(String resetToken);

    // Find all users by type
    List<User> findByUserType(UserType userType);

    // Find active users by type
    List<User> findByUserTypeAndIsActive(UserType userType, Boolean isActive);

    // Count users by type
    long countByUserType(UserType userType);

    // Custom query: Find user with valid OTP
    @Query("SELECT u FROM User u WHERE u.email = :email AND u.otp = :otp AND u.otpExpiry > CURRENT_TIMESTAMP")
    Optional<User> findByEmailAndValidOtp(@Param("email") String email, @Param("otp") String otp);

    @Query("SELECT u FROM User u WHERE u.resetToken = :token AND u.resetTokenExpiry > CURRENT_TIMESTAMP")
    Optional<User> findByValidResetToken(@Param("token") String token);
}
