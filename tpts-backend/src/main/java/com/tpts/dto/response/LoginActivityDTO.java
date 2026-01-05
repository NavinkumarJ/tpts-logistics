package com.tpts.dto.response;

import com.tpts.entity.LoginActivity.ActivityType;
import com.tpts.entity.UserType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for Login Activity response
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginActivityDTO {
    private Long id;
    private Long userId;
    private String userEmail;
    private String userName;
    private UserType userType;
    private ActivityType activityType;
    private String ipAddress;
    private LocalDateTime timestamp;
}
