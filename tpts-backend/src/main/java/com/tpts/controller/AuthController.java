package com.tpts.controller;

import com.tpts.dto.request.*;
import com.tpts.dto.response.ApiResponse;
import com.tpts.dto.response.AuthResponse;
import com.tpts.entity.User;
import com.tpts.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication Controller
 * Handles all authentication related endpoints
 * 
 * Endpoints:
 * - POST /api/auth/register/customer - Register new customer
 * - POST /api/auth/register/company - Register new company
 * - POST /api/auth/login - Login user
 * - POST /api/auth/verify-otp - Verify OTP
 * - POST /api/auth/resend-otp - Resend OTP
 * - POST /api/auth/refresh-token - Refresh access token
 * - POST /api/auth/forgot-password - Request password reset
 * - POST /api/auth/reset-password - Reset password with token
 * - POST /api/auth/logout - Logout user
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    // ==========================================
    // Registration Endpoints
    // ==========================================

    /**
     * Register a new customer
     * POST /api/auth/register/customer
     */
    @PostMapping("/register/customer")
    public ResponseEntity<ApiResponse<AuthResponse>> registerCustomer(
            @Valid @RequestBody CustomerRegisterRequest request) {
        
        log.info("Customer registration request for email: {}", request.getEmail());
        
        AuthResponse response = authService.registerCustomer(request);
        
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Customer registered successfully. Please verify your OTP."));
    }

    /**
     * Register a new company
     * POST /api/auth/register/company
     */
    @PostMapping("/register/company")
    public ResponseEntity<ApiResponse<AuthResponse>> registerCompany(
            @Valid @RequestBody CompanyRegisterRequest request) {
        
        log.info("Company registration request for: {}", request.getCompanyName());
        
        AuthResponse response = authService.registerCompany(request);
        
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Company registered successfully. Pending approval."));
    }

    // ==========================================
    // Login Endpoint
    // ==========================================

    /**
     * Login user
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        
        log.info("Login request for email: {} as {}", request.getEmail(), request.getUserType());
        
        AuthResponse response = authService.login(request);
        
        return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
    }

    // ==========================================
    // OTP Endpoints
    // ==========================================

    /**
     * Verify OTP
     * POST /api/auth/verify-otp
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {
        
        log.info("OTP verification request for email: {}", request.getEmail());
        
        AuthResponse response = authService.verifyOtp(request);
        
        return ResponseEntity.ok(ApiResponse.success(response, "OTP verified successfully"));
    }

    /**
     * Resend OTP
     * POST /api/auth/resend-otp
     */
    @PostMapping("/resend-otp")
    public ResponseEntity<ApiResponse<Void>> resendOtp(
            @Valid @RequestBody ResendOtpRequest request) {
        
        log.info("Resend OTP request for email: {}", request.getEmail());
        
        authService.resendOtp(request);
        
        return ResponseEntity.ok(ApiResponse.success("OTP sent successfully"));
    }

    // ==========================================
    // Token Endpoints
    // ==========================================

    /**
     * Refresh access token
     * POST /api/auth/refresh-token
     */
    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request) {
        
        log.info("Token refresh request");
        
        AuthResponse response = authService.refreshToken(request);
        
        return ResponseEntity.ok(ApiResponse.success(response, "Token refreshed successfully"));
    }

    // ==========================================
    // Password Reset Endpoints
    // ==========================================

    /**
     * Forgot password - Request reset link
     * POST /api/auth/forgot-password
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        
        log.info("Forgot password request for email: {}", request.getEmail());
        
        authService.forgotPassword(request);
        
        return ResponseEntity.ok(ApiResponse.success("Password reset link sent to your email"));
    }

    /**
     * Reset password with token
     * POST /api/auth/reset-password
     */
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        
        log.info("Password reset request");
        
        authService.resetPassword(request);
        
        return ResponseEntity.ok(ApiResponse.success("Password reset successfully. Please login with your new password."));
    }

    // ==========================================
    // Logout Endpoint
    // ==========================================

    /**
     * Logout user
     * POST /api/auth/logout
     * Requires authentication
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@AuthenticationPrincipal User user) {
        
        if (user != null) {
            log.info("Logout request for user: {}", user.getEmail());
            authService.logout(user);
        }
        
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully"));
    }

    // ==========================================
    // Health Check Endpoint
    // ==========================================

    /**
     * Check if auth service is running
     * GET /api/auth/health
     */
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> health() {
        return ResponseEntity.ok(ApiResponse.success("Auth service is running", "OK"));
    }
}
