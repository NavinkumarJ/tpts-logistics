package com.tpts.dto.response;

import com.tpts.entity.EmailLog.EmailLogStatus;
import com.tpts.entity.EmailLog.EmailRecipientType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailLogDTO {
    private Long id;
    private Long senderUserId;
    private String senderName;
    private String senderEmail;
    private EmailRecipientType recipientType;
    private Long recipientId;
    private String recipientEmail;
    private String recipientName;
    private Integer recipientCount;
    private String subject;
    private String message;
    private EmailLogStatus status;
    private String errorMessage;
    private LocalDateTime sentAt;
    private LocalDateTime createdAt;
}
