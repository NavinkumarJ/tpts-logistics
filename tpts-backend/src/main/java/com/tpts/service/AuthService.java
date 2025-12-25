package com.tpts.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tpts.dto.request.*;
import com.tpts.dto.response.AuthResponse;
import com.tpts.entity.*;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.*;
import com.tpts.security.JwtUtil;
import com.tpts.util.OtpUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Authentication Service
 * Handles user registration, login, OTP verification, and password reset
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final CompanyAdminRepository companyAdminRepository;
    private final DeliveryAgentRepository deliveryAgentRepository;
    private final SuperAdminRepository superAdminRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final OtpUtil otpUtil;
    private final AuthenticationManager authenticationManager;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService; // ← ADD THIS
    private final EmailService emailService; // ✅ ADD THIS

    @Value("${otp.expiration-minutes:10}")
    private int otpExpirationMinutes;

    // ==========================================
    // Customer Registration
    // ==========================================

    @Transactional
    public AuthResponse registerCustomer(CustomerRegisterRequest request) {
        log.info("Registering customer with email: {}", request.getEmail());

        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }

        // Check if phone already exists
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new DuplicateResourceException("User", "phone", request.getPhone());
        }

        // Generate OTP
        String otp = otpUtil.generateOtp();
        LocalDateTime otpExpiry = LocalDateTime.now().plusMinutes(otpExpirationMinutes);

        // Create User entity
        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .userType(UserType.CUSTOMER)
                .isVerified(false)
                .isActive(true)
                .otp(otp)
                .otpExpiry(otpExpiry)
                .build();

        user = userRepository.save(user);

        // Create Customer entity
        Customer customer = Customer.builder()
                .user(user)
                .fullName(request.getFullName())
                .city(request.getCity())
                .pincode(request.getPincode())
                .build();

        customer = customerRepository.save(customer);

        // ✅ SEND OTP EMAIL - Replace TODO with this:
        try {
            notificationService.sendOtpNotification(user, otp);
            log.info("OTP email sent successfully to {}", request.getEmail());
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", request.getEmail(), e.getMessage());
            // Don't fail registration if email fails
        }

        log.info("OTP for {}: {} (expires at {})", request.getEmail(), otp, otpExpiry);
        // Generate tokens
        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshToken = jwtUtil.generateRefreshToken(user);

        // Save refresh token
        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiry(LocalDateTime.now().plusSeconds(jwtUtil.getRefreshTokenExpiration() / 1000));
        userRepository.save(user);

        emailService.sendCustomerWelcomeEmail(
                request.getEmail(),
                request.getFullName());

        return buildAuthResponse(user, customer.getId(), customer.getFullName(), customer.getFullName(), null,
                accessToken, refreshToken);
    }

    // ==========================================
    // Company Registration
    // ==========================================

    @Transactional
    public AuthResponse registerCompany(CompanyRegisterRequest request) {
        log.info("Registering company: {}", request.getCompanyName());

        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }

        // Check if phone already exists
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new DuplicateResourceException("User", "phone", request.getPhone());
        }

        // Check if company name already exists
        if (companyAdminRepository.existsByCompanyName(request.getCompanyName())) {
            throw new DuplicateResourceException("Company", "companyName", request.getCompanyName());
        }

        // Generate OTP
        String otp = otpUtil.generateOtp();
        LocalDateTime otpExpiry = LocalDateTime.now().plusMinutes(otpExpirationMinutes);

        // Create User entity
        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .userType(UserType.COMPANY_ADMIN)
                .isVerified(false)
                .isActive(true)
                .otp(otp)
                .otpExpiry(otpExpiry)
                .build();

        user = userRepository.save(user);

        // Convert service cities list to JSON
        String serviceCitiesJson = null;
        if (request.getServiceCities() != null && !request.getServiceCities().isEmpty()) {
            try {
                serviceCitiesJson = objectMapper.writeValueAsString(request.getServiceCities());
            } catch (JsonProcessingException e) {
                log.warn("Failed to convert service cities to JSON", e);
            }
        }

        CompanyAdmin company = CompanyAdmin.builder()
                .user(user)
                .companyName(request.getCompanyName())
                .registrationNumber(request.getRegistrationNumber())
                .gstNumber(request.getGstNumber())
                .contactPersonName(request.getContactPersonName())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .pincode(request.getPincode())
                .serviceCities(serviceCitiesJson)
                .baseRatePerKm(request.getBaseRatePerKm())
                .baseRatePerKg(request.getBaseRatePerKg())
                // **NEW: Document URLs from Cloudinary**
                .companyLogoUrl(request.getCompanyLogoUrl())
                .registrationCertificateUrl(request.getRegistrationCertificateUrl())
                .gstCertificateUrl(request.getGstCertificateUrl())
                .documentsUrl(request.getDocumentsUrl())
                .additionalDocuments(request.getAdditionalDocuments())
                .isApproved(false) // Requires SuperAdmin approval
                .isHiring(false)
                .build();

        company = companyAdminRepository.save(company);

        // ✅ SEND OTP EMAIL
        try {
            notificationService.sendOtpNotification(user, otp);
            log.info("OTP email sent successfully to {}", request.getEmail());
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", request.getEmail(), e.getMessage());
        }

        log.info("OTP for {}: {} (expires at {})", request.getEmail(), otp, otpExpiry);
        // Generate tokens
        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshToken = jwtUtil.generateRefreshToken(user);

        // Save refresh token
        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiry(LocalDateTime.now().plusSeconds(jwtUtil.getRefreshTokenExpiration() / 1000));
        userRepository.save(user);
        emailService.sendCompanyUnderReviewEmail(
                request.getEmail(),
                request.getCompanyName(),
                request.getContactPersonName(),
                otp);

        return buildAuthResponse(user, company.getId(), company.getCompanyName(), company.getContactPersonName(),
                company.getCompanyLogoUrl(), accessToken, refreshToken);
    }

    // ==========================================
    // Login
    // ==========================================

    @Transactional
    public AuthResponse login(LoginRequest request) {
        log.info("Login attempt for email: {} as {}", request.getEmail(), request.getUserType());

        // Authenticate user
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        // Find user
        User user = userRepository.findByEmailAndUserType(request.getEmail(), request.getUserType())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials or user type"));

        // Check if account is active
        if (!user.getIsActive()) {
            throw new AccountInactiveException("Your account has been deactivated. Please contact support.");
        }

        // For Company Admin, check approval status
        if (user.getUserType() == UserType.COMPANY_ADMIN) {
            CompanyAdmin company = companyAdminRepository.findByUser(user)
                    .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));
            if (!company.getIsApproved()) {
                throw new ForbiddenException("Your company is pending approval. Please wait for admin verification.");
            }
        }

        // Generate tokens
        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshToken = jwtUtil.generateRefreshToken(user);

        // Save refresh token and update last login
        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiry(LocalDateTime.now().plusSeconds(jwtUtil.getRefreshTokenExpiration() / 1000));
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        // Get profile info based on user type
        Long profileId = null;
        String displayName = null;
        String fullName = null;
        String profileImageUrl = null;

        // Get profile info based on user type using Optional.map pattern
        switch (user.getUserType()) {
            case CUSTOMER -> {
                var opt = customerRepository.findByUser(user);
                profileId = opt.map(Customer::getId).orElse(null);
                displayName = opt.map(Customer::getFullName).orElse(null);
                fullName = opt.map(Customer::getFullName).orElse(null);
                profileImageUrl = opt.map(Customer::getProfileImageUrl).orElse(null);
            }
            case COMPANY_ADMIN -> {
                var opt = companyAdminRepository.findByUser(user);
                profileId = opt.map(CompanyAdmin::getId).orElse(null);
                displayName = opt.map(CompanyAdmin::getCompanyName).orElse(null);
                fullName = opt.map(CompanyAdmin::getContactPersonName).orElse(null);
                profileImageUrl = opt.map(CompanyAdmin::getCompanyLogoUrl).orElse(null);
            }
            case DELIVERY_AGENT -> {
                var opt = deliveryAgentRepository.findByUser(user);
                profileId = opt.map(DeliveryAgent::getId).orElse(null);
                displayName = opt.map(DeliveryAgent::getFullName).orElse(null);
                fullName = opt.map(DeliveryAgent::getFullName).orElse(null);
                profileImageUrl = opt.map(DeliveryAgent::getProfilePhotoUrl).orElse(null);
            }
            case SUPER_ADMIN -> {
                var opt = superAdminRepository.findByUser(user);
                profileId = opt.map(SuperAdmin::getId).orElse(null);
                displayName = opt.map(SuperAdmin::getFullName).orElse(null);
                fullName = opt.map(SuperAdmin::getFullName).orElse(null);
            }
        }

        return buildAuthResponse(user, profileId, displayName, fullName, profileImageUrl, accessToken, refreshToken);
    }

    // ==========================================
    // Verify OTP
    // ==========================================

    @Transactional
    public AuthResponse verifyOtp(VerifyOtpRequest request) {
        log.info("Verifying OTP for email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", request.getEmail()));

        // Check if already verified
        if (user.getIsVerified()) {
            throw new BadRequestException("Account is already verified");
        }

        // Check if OTP matches
        if (user.getOtp() == null || !user.getOtp().equals(request.getOtp())) {
            throw new InvalidOtpException("Invalid OTP");
        }

        // Check if OTP is expired
        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new OtpExpiredException("OTP has expired. Please request a new one.");
        }

        // Mark as verified
        user.setIsVerified(true);
        user.setOtp(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        log.info("OTP verified successfully for email: {}", request.getEmail());

        // Generate new tokens
        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshToken = jwtUtil.generateRefreshToken(user);

        // Save refresh token
        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiry(LocalDateTime.now().plusSeconds(jwtUtil.getRefreshTokenExpiration() / 1000));
        userRepository.save(user);

        // Get profile info using Optional.map pattern
        Long profileId = null;
        String displayName = null;
        String fullName = null;
        String profileImageUrl = null;

        switch (user.getUserType()) {
            case CUSTOMER -> {
                var opt = customerRepository.findByUser(user);
                profileId = opt.map(Customer::getId).orElse(null);
                displayName = opt.map(Customer::getFullName).orElse(null);
                fullName = opt.map(Customer::getFullName).orElse(null);
                profileImageUrl = opt.map(Customer::getProfileImageUrl).orElse(null);
            }
            case COMPANY_ADMIN -> {
                var opt = companyAdminRepository.findByUser(user);
                profileId = opt.map(CompanyAdmin::getId).orElse(null);
                displayName = opt.map(CompanyAdmin::getCompanyName).orElse(null);
                fullName = opt.map(CompanyAdmin::getContactPersonName).orElse(null);
                profileImageUrl = opt.map(CompanyAdmin::getCompanyLogoUrl).orElse(null);
            }
            case DELIVERY_AGENT -> {
                var opt = deliveryAgentRepository.findByUser(user);
                profileId = opt.map(DeliveryAgent::getId).orElse(null);
                displayName = opt.map(DeliveryAgent::getFullName).orElse(null);
                fullName = opt.map(DeliveryAgent::getFullName).orElse(null);
                profileImageUrl = opt.map(DeliveryAgent::getProfilePhotoUrl).orElse(null);
            }
            case SUPER_ADMIN -> {
                var opt = superAdminRepository.findByUser(user);
                profileId = opt.map(SuperAdmin::getId).orElse(null);
                displayName = opt.map(SuperAdmin::getFullName).orElse(null);
                fullName = opt.map(SuperAdmin::getFullName).orElse(null);
            }
        }

        return buildAuthResponse(user, profileId, displayName, fullName, profileImageUrl, accessToken, refreshToken);
    }

    // ==========================================
    // Resend OTP
    // ==========================================

    @Transactional
    public void resendOtp(ResendOtpRequest request) {
        log.info("Resending OTP for email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", request.getEmail()));

        // Check if already verified
        if (user.getIsVerified()) {
            throw new BadRequestException("Account is already verified");
        }

        // Generate new OTP
        String otp = otpUtil.generateOtp();
        LocalDateTime otpExpiry = LocalDateTime.now().plusMinutes(otpExpirationMinutes);

        user.setOtp(otp);
        user.setOtpExpiry(otpExpiry);
        userRepository.save(user);

        // ✅ SEND OTP EMAIL
        try {
            notificationService.sendOtpNotification(user, otp);
            log.info("OTP email resent successfully to {}", request.getEmail());
        } catch (Exception e) {
            log.error("Failed to resend OTP email to {}: {}", request.getEmail(), e.getMessage());
            throw new RuntimeException("Failed to send OTP email. Please try again.");
        }

        log.info("New OTP for {}: {} (expires at {})", request.getEmail(), otp, otpExpiry);
    }

    // ==========================================
    // Refresh Token
    // ==========================================

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        log.info("Refreshing token");

        // Find user by refresh token
        User user = userRepository.findByRefreshToken(request.getRefreshToken())
                .orElseThrow(() -> new InvalidTokenException("Invalid refresh token"));

        // Check if refresh token is expired
        if (user.getRefreshTokenExpiry() == null || user.getRefreshTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new InvalidTokenException("Refresh token has expired. Please login again.");
        }

        // Validate token
        if (!jwtUtil.isValidToken(request.getRefreshToken())) {
            throw new InvalidTokenException("Invalid refresh token");
        }

        // Generate new tokens
        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshToken = jwtUtil.generateRefreshToken(user);

        // Save new refresh token
        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiry(LocalDateTime.now().plusSeconds(jwtUtil.getRefreshTokenExpiration() / 1000));
        userRepository.save(user);

        // Get profile info using Optional.map pattern
        Long profileId = null;
        String displayName = null;
        String fullName = null;
        String profileImageUrl = null;

        switch (user.getUserType()) {
            case CUSTOMER -> {
                var opt = customerRepository.findByUser(user);
                profileId = opt.map(Customer::getId).orElse(null);
                displayName = opt.map(Customer::getFullName).orElse(null);
                fullName = opt.map(Customer::getFullName).orElse(null);
                profileImageUrl = opt.map(Customer::getProfileImageUrl).orElse(null);
            }
            case COMPANY_ADMIN -> {
                var opt = companyAdminRepository.findByUser(user);
                profileId = opt.map(CompanyAdmin::getId).orElse(null);
                displayName = opt.map(CompanyAdmin::getCompanyName).orElse(null);
                fullName = opt.map(CompanyAdmin::getContactPersonName).orElse(null);
                profileImageUrl = opt.map(CompanyAdmin::getCompanyLogoUrl).orElse(null);
            }
            case DELIVERY_AGENT -> {
                var opt = deliveryAgentRepository.findByUser(user);
                profileId = opt.map(DeliveryAgent::getId).orElse(null);
                displayName = opt.map(DeliveryAgent::getFullName).orElse(null);
                fullName = opt.map(DeliveryAgent::getFullName).orElse(null);
                profileImageUrl = opt.map(DeliveryAgent::getProfilePhotoUrl).orElse(null);
            }
            case SUPER_ADMIN -> {
                var opt = superAdminRepository.findByUser(user);
                profileId = opt.map(SuperAdmin::getId).orElse(null);
                displayName = opt.map(SuperAdmin::getFullName).orElse(null);
                fullName = opt.map(SuperAdmin::getFullName).orElse(null);
            }
        }

        return buildAuthResponse(user, profileId, displayName, fullName, profileImageUrl, accessToken, refreshToken);
    }

    // ==========================================
    // Forgot Password
    // ==========================================

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        log.info("Forgot password request for email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", request.getEmail()));

        // Log old token info for debugging
        log.info("Previous reset token: {}, Previous expiry: {}",
                user.getResetToken(), user.getResetTokenExpiry());

        // Generate NEW reset token
        String resetToken = otpUtil.generateResetToken();
        LocalDateTime resetTokenExpiry = LocalDateTime.now().plusMinutes(30); // 30 minutes validity

        log.info("Generated NEW reset token: {}, NEW expiry: {}", resetToken, resetTokenExpiry);

        // Update user with new token
        user.setResetToken(resetToken);
        user.setResetTokenExpiry(resetTokenExpiry);

        // Save and verify
        User savedUser = userRepository.save(user);
        log.info("Token saved to database - Token: {}, Expiry: {}",
                savedUser.getResetToken(), savedUser.getResetTokenExpiry());

        // Send password reset email
        try {
            notificationService.sendPasswordResetEmail(savedUser, resetToken);
            log.info("✅ Password reset email sent successfully to {}", request.getEmail());
        } catch (Exception e) {
            log.error("❌ Failed to send password reset email to {}: {}", request.getEmail(), e.getMessage(), e);
            // Note: Token is still saved in DB even if email fails
            throw new RuntimeException("Failed to send password reset email. Please try again later.");
        }

        log.info("✅ Password reset process completed for {}", request.getEmail());
    }

    // ==========================================
    // Reset Password
    // ==========================================

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        log.info("Attempting password reset with token: {}", request.getToken());

        // Find user by valid reset token
        User user = userRepository.findByValidResetToken(request.getToken())
                .orElseThrow(() -> {
                    log.error("❌ Invalid or expired reset token: {}", request.getToken());
                    return new InvalidTokenException(
                            "Invalid or expired reset token. Please request a new password reset.");
                });

        log.info("Valid reset token found for user: {}", user.getEmail());

        // Update password
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        log.info("✅ Password reset successfully for user: {}", user.getEmail());

        // Optional: Send confirmation email
        try {
            notificationService.sendPasswordChangeConfirmation(user);
        } catch (Exception e) {
            log.warn("Failed to send password change confirmation email", e);
            // Don't fail the operation if confirmation email fails
        }
    }

    // ==========================================
    // Logout
    // ==========================================

    @Transactional
    public void logout(User user) {
        log.info("Logging out user: {}", user.getEmail());

        user.setRefreshToken(null);
        user.setRefreshTokenExpiry(null);
        userRepository.save(user);
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private AuthResponse buildAuthResponse(User user, Long profileId, String displayName,
            String fullName, String profileImageUrl,
            String accessToken, String refreshToken) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtUtil.getAccessTokenExpiration() / 1000) // Convert to seconds
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .phone(user.getPhone())
                        .userType(user.getUserType())
                        .isVerified(user.getIsVerified())
                        .isActive(user.getIsActive())
                        .profileId(profileId)
                        .displayName(displayName)
                        .fullName(fullName != null ? fullName : displayName)
                        .profileImageUrl(profileImageUrl)
                        .build())
                .build();
    }
}
