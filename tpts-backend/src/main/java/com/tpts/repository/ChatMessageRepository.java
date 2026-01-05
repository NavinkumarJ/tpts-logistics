package com.tpts.repository;

import com.tpts.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

        // Get all messages for a parcel
        List<ChatMessage> findByParcelIdOrderByCreatedAtAsc(Long parcelId);

        // Get all messages for a parcel (for agents to see full conversation)
        @Query("SELECT m FROM ChatMessage m WHERE m.parcelId = :parcelId ORDER BY m.createdAt ASC")
        List<ChatMessage> findAllParcelMessages(@Param("parcelId") Long parcelId);

        // Get all messages for a group shipment
        List<ChatMessage> findByGroupShipmentIdOrderByCreatedAtAsc(Long groupShipmentId);

        // Get messages for a specific parcel involving a specific user
        @Query("SELECT m FROM ChatMessage m WHERE m.parcelId = :parcelId " +
                        "AND (m.sender.id = :userId OR m.receiver.id = :userId) " +
                        "ORDER BY m.createdAt ASC")
        List<ChatMessage> findParcelChatMessages(@Param("parcelId") Long parcelId, @Param("userId") Long userId);

        // Get messages for a specific group involving a specific user
        @Query("SELECT m FROM ChatMessage m WHERE m.groupShipmentId = :groupId " +
                        "AND (m.sender.id = :userId OR m.receiver.id = :userId) " +
                        "ORDER BY m.createdAt ASC")
        List<ChatMessage> findGroupChatMessages(@Param("groupId") Long groupId, @Param("userId") Long userId);

        // Count unread messages for a user
        @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.receiver.id = :userId AND m.isRead = false")
        Long countUnreadByReceiverId(@Param("userId") Long userId);

        // Count unread messages for a parcel
        @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.parcelId = :parcelId " +
                        "AND m.receiver.id = :userId AND m.isRead = false")
        Long countUnreadByParcelAndReceiver(@Param("parcelId") Long parcelId, @Param("userId") Long userId);

        // Count unread messages for a group
        @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.groupShipmentId = :groupId " +
                        "AND m.receiver.id = :userId AND m.isRead = false")
        Long countUnreadByGroupAndReceiver(@Param("groupId") Long groupId, @Param("userId") Long userId);

        // Mark messages as read
        @Modifying
        @Query("UPDATE ChatMessage m SET m.isRead = true, m.readAt = :readAt " +
                        "WHERE m.parcelId = :parcelId AND m.receiver.id = :userId AND m.isRead = false")
        void markParcelMessagesAsRead(@Param("parcelId") Long parcelId,
                        @Param("userId") Long userId,
                        @Param("readAt") LocalDateTime readAt);

        @Modifying
        @Query("UPDATE ChatMessage m SET m.isRead = true, m.readAt = :readAt " +
                        "WHERE m.groupShipmentId = :groupId AND m.receiver.id = :userId AND m.isRead = false")
        void markGroupMessagesAsRead(@Param("groupId") Long groupId,
                        @Param("userId") Long userId,
                        @Param("readAt") LocalDateTime readAt);
}
