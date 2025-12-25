package com.tpts.dto.response;

import com.tpts.entity.UserType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for User List (Super Admin user management)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserListDTO {

    private Long id;
    private Long userId;
    private String email;
    private String phone;
    private String fullName;
    private UserType userType;
    private Boolean isActive;
    private Boolean isVerified;

    // Additional info based on user type
    private String companyName;      // For COMPANY_ADMIN
    private String city;             // For COMPANY_ADMIN, DELIVERY_AGENT
    private Long companyId;          // For DELIVERY_AGENT

    // Stats
    private Integer totalOrders;     // Parcels/Deliveries
    private Double rating;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
}