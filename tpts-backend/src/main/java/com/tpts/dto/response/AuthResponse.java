package com.tpts.dto.response;

import com.tpts.entity.UserType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for authentication response
 * Returns JWT tokens and user info after successful login
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn; // Access token expiration in seconds
    private UserInfo user;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserInfo {
        private Long id;
        private String email;
        private String phone;
        private UserType userType;
        private Boolean isVerified;
        private Boolean isActive;

        // Role-specific ID (customerId, companyId, agentId, etc.)
        private Long profileId;

        // Display name (from Customer/Company/Agent profile)
        private String displayName;

        // Full name for customer/agent
        private String fullName;

        // Profile image URL for sidebar display
        private String profileImageUrl;
    }
}
