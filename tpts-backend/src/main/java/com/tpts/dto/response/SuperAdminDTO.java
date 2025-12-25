package com.tpts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for SuperAdmin response
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SuperAdminDTO {

    private Long id;
    private Long userId;
    private String email;
    private String phone;
    private String fullName;
    private String department;
    private String role;
    private String permissions;
    private Boolean twoFactorEnabled;
    private LocalDateTime lastLoginAt;
    private String lastAction;
    private LocalDateTime lastActionAt;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}