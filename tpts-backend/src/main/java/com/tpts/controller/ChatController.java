package com.tpts.controller;

import com.tpts.dto.request.SendMessageRequest;
import com.tpts.dto.response.ApiResponse;
import com.tpts.dto.response.ChatMessageDTO;
import com.tpts.entity.User;
import com.tpts.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller for in-app chat between customers and delivery agents
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    // ==========================================
    // Parcel Chat (Regular Orders)
    // ==========================================

    /**
     * Get chat messages for a parcel
     */
    @GetMapping("/parcel/{parcelId}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageDTO>>> getParcelMessages(
            @PathVariable Long parcelId,
            @AuthenticationPrincipal User currentUser) {

        List<ChatMessageDTO> messages = chatService.getParcelChatMessages(parcelId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    /**
     * Send a message for a parcel
     */
    @PostMapping("/parcel/{parcelId}/send")
    public ResponseEntity<ApiResponse<ChatMessageDTO>> sendParcelMessage(
            @PathVariable Long parcelId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal User currentUser) {

        ChatMessageDTO message = chatService.sendParcelMessage(parcelId, request, currentUser);
        return ResponseEntity.ok(ApiResponse.success(message, "Message sent"));
    }

    /**
     * Mark parcel messages as read
     */
    @PutMapping("/parcel/{parcelId}/read")
    public ResponseEntity<ApiResponse<String>> markParcelMessagesAsRead(
            @PathVariable Long parcelId,
            @AuthenticationPrincipal User currentUser) {

        chatService.markParcelMessagesAsRead(parcelId, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Messages marked as read"));
    }

    /**
     * Get unread count for a parcel
     */
    @GetMapping("/parcel/{parcelId}/unread")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getParcelUnreadCount(
            @PathVariable Long parcelId,
            @AuthenticationPrincipal User currentUser) {

        Long count = chatService.getParcelUnreadCount(parcelId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", count)));
    }

    // ==========================================
    // Group Chat (Group Buy Orders)
    // ==========================================

    /**
     * Get chat messages for a group shipment
     * 
     * @param parcelId Optional - filter messages for a specific parcel/customer
     */
    @GetMapping("/group/{groupId}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageDTO>>> getGroupMessages(
            @PathVariable Long groupId,
            @RequestParam(required = false) Long parcelId,
            @AuthenticationPrincipal User currentUser) {

        List<ChatMessageDTO> messages = chatService.getGroupChatMessages(groupId, parcelId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    /**
     * Send a message for a group shipment
     * 
     * @param receiverParcelId Optional - specific parcel/customer to message (for
     *                         agents)
     */
    @PostMapping("/group/{groupId}/send")
    public ResponseEntity<ApiResponse<ChatMessageDTO>> sendGroupMessage(
            @PathVariable Long groupId,
            @RequestParam(required = false) Long receiverParcelId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal User currentUser) {

        ChatMessageDTO message = chatService.sendGroupMessage(groupId, receiverParcelId, request, currentUser);
        return ResponseEntity.ok(ApiResponse.success(message, "Message sent"));
    }

    /**
     * Mark group messages as read
     */
    @PutMapping("/group/{groupId}/read")
    public ResponseEntity<ApiResponse<String>> markGroupMessagesAsRead(
            @PathVariable Long groupId,
            @AuthenticationPrincipal User currentUser) {

        chatService.markGroupMessagesAsRead(groupId, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Messages marked as read"));
    }

    /**
     * Get unread count for a group
     */
    @GetMapping("/group/{groupId}/unread")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getGroupUnreadCount(
            @PathVariable Long groupId,
            @AuthenticationPrincipal User currentUser) {

        Long count = chatService.getGroupUnreadCount(groupId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", count)));
    }

    // ==========================================
    // General
    // ==========================================

    /**
     * Get total unread message count for current user
     */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getTotalUnreadCount(
            @AuthenticationPrincipal User currentUser) {

        Long count = chatService.getUnreadCount(currentUser);
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", count)));
    }
}
