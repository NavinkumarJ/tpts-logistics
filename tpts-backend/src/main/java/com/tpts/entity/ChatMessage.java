package com.tpts.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity for storing chat messages between customers and delivery agents
 */
@Entity
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_chat_parcel", columnList = "parcel_id"),
        @Index(name = "idx_chat_sender", columnList = "sender_id"),
        @Index(name = "idx_chat_receiver", columnList = "receiver_id"),
        @Index(name = "idx_chat_created", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Link to parcel (can be null for group chats)
    @Column(name = "parcel_id")
    private Long parcelId;

    // Link to group shipment (for group buy orders)
    @Column(name = "group_shipment_id")
    private Long groupShipmentId;

    // Sender information
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false)
    private UserType senderType;

    // Receiver information
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    // Message content
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    // Read status
    @Column(name = "is_read")
    @Builder.Default
    private Boolean isRead = false;

    // Timestamps
    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "read_at")
    private LocalDateTime readAt;
}
