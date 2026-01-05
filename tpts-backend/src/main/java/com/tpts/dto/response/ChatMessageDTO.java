package com.tpts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDTO {
    private Long id;
    private Long parcelId;
    private Long groupShipmentId;

    // Sender info
    private Long senderId;
    private String senderName;
    private String senderType;
    private String senderAvatar;

    // Receiver info
    private Long receiverId;
    private String receiverName;

    // Message
    private String message;
    private Boolean isRead;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;

    // For UI - is this message from current user
    private Boolean isMine;
}
