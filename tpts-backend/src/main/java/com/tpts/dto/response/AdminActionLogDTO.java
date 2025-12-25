package com.tpts.dto.response;

import lombok.*;

import java.time.LocalDateTime;

/**
 * DTO for Admin Action Log responses
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminActionLogDTO {
    private Long id;
    private String userEmail;
    private String actionType;
    private String action;
    private Long targetId;
    private String targetName;
    private LocalDateTime createdAt;
}
