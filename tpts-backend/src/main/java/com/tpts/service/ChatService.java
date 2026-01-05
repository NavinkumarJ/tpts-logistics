package com.tpts.service;

import com.tpts.dto.request.SendMessageRequest;
import com.tpts.dto.response.ChatMessageDTO;
import com.tpts.entity.*;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for handling in-app chat between customers and delivery agents
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final ParcelRepository parcelRepository;
    private final GroupShipmentRepository groupShipmentRepository;
    private final DeliveryAgentRepository agentRepository;
    private final CustomerRepository customerRepository;
    private final NotificationService notificationService;

    // ==========================================
    // Get Chat Messages
    // ==========================================

    /**
     * Get chat messages for a parcel (regular order)
     */
    public List<ChatMessageDTO> getParcelChatMessages(Long parcelId, User currentUser) {
        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        validateChatAccess(parcel, currentUser);

        List<ChatMessage> messages = chatMessageRepository.findParcelChatMessages(parcelId, currentUser.getId());
        return messages.stream()
                .map(m -> mapToDTO(m, currentUser))
                .collect(Collectors.toList());
    }

    /**
     * Get chat messages for a group shipment (group buy order)
     * 
     * @param groupId     Group shipment ID
     * @param parcelId    Optional - filter messages for a specific parcel/customer
     * @param currentUser Current authenticated user
     */
    public List<ChatMessageDTO> getGroupChatMessages(Long groupId, Long parcelId, User currentUser) {
        GroupShipment group = groupShipmentRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group", "id", groupId));

        validateGroupChatAccess(group, currentUser);

        List<ChatMessage> messages;

        // If parcelId is provided, get ALL messages for that parcel (full conversation)
        if (parcelId != null) {
            // Use findAllParcelMessages to get complete chat history for the parcel
            messages = chatMessageRepository.findAllParcelMessages(parcelId);
        } else {
            // Otherwise return messages for the group involving current user
            messages = chatMessageRepository.findGroupChatMessages(groupId, currentUser.getId());
        }

        return messages.stream()
                .map(m -> mapToDTO(m, currentUser))
                .collect(Collectors.toList());
    }

    // ==========================================
    // Send Message
    // ==========================================

    /**
     * Send message for a parcel (regular order)
     */
    @Transactional
    public ChatMessageDTO sendParcelMessage(Long parcelId, SendMessageRequest request, User currentUser) {
        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        validateChatAccess(parcel, currentUser);

        User receiver = determineParcelReceiver(parcel, currentUser);

        if (receiver == null) {
            throw new BadRequestException("Cannot determine message recipient. Please try again later.");
        }

        ChatMessage message = ChatMessage.builder()
                .parcelId(parcelId)
                .sender(currentUser)
                .senderType(currentUser.getUserType())
                .receiver(receiver)
                .message(request.getMessage())
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        message = chatMessageRepository.save(message);

        log.info("Chat message sent for parcel {} from {} to {}",
                parcelId, currentUser.getId(), receiver.getId());

        sendChatNotification(receiver, currentUser, parcel.getTrackingNumber());

        return mapToDTO(message, currentUser);
    }

    /**
     * Send message for a group shipment (group buy order)
     */
    @Transactional
    public ChatMessageDTO sendGroupMessage(Long groupId, Long receiverParcelId, SendMessageRequest request,
            User currentUser) {
        GroupShipment group = groupShipmentRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group", "id", groupId));

        validateGroupChatAccess(group, currentUser);

        User receiver = determineGroupReceiver(group, receiverParcelId, currentUser);

        ChatMessage message = ChatMessage.builder()
                .groupShipmentId(groupId)
                .parcelId(receiverParcelId)
                .sender(currentUser)
                .senderType(currentUser.getUserType())
                .receiver(receiver)
                .message(request.getMessage())
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        message = chatMessageRepository.save(message);

        log.info("Chat message sent for group {} from {} to {}",
                group.getGroupCode(), currentUser.getId(), receiver.getId());

        sendChatNotification(receiver, currentUser, group.getGroupCode());

        return mapToDTO(message, currentUser);
    }

    // ==========================================
    // Mark as Read
    // ==========================================

    @Transactional
    public void markParcelMessagesAsRead(Long parcelId, User currentUser) {
        chatMessageRepository.markParcelMessagesAsRead(parcelId, currentUser.getId(), LocalDateTime.now());
        log.info("Marked parcel {} messages as read for user {}", parcelId, currentUser.getId());
    }

    @Transactional
    public void markGroupMessagesAsRead(Long groupId, User currentUser) {
        chatMessageRepository.markGroupMessagesAsRead(groupId, currentUser.getId(), LocalDateTime.now());
        log.info("Marked group {} messages as read for user {}", groupId, currentUser.getId());
    }

    // ==========================================
    // Unread Count
    // ==========================================

    public Long getUnreadCount(User currentUser) {
        return chatMessageRepository.countUnreadByReceiverId(currentUser.getId());
    }

    public Long getParcelUnreadCount(Long parcelId, User currentUser) {
        return chatMessageRepository.countUnreadByParcelAndReceiver(parcelId, currentUser.getId());
    }

    public Long getGroupUnreadCount(Long groupId, User currentUser) {
        return chatMessageRepository.countUnreadByGroupAndReceiver(groupId, currentUser.getId());
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private void validateChatAccess(Parcel parcel, User currentUser) {
        boolean isCustomer = currentUser.getUserType() == UserType.CUSTOMER &&
                parcel.getCustomer() != null &&
                parcel.getCustomer().getUser().getId().equals(currentUser.getId());

        // Parcel has single 'agent' field, check if current user is that agent
        boolean isAgent = currentUser.getUserType() == UserType.DELIVERY_AGENT &&
                parcel.getAgent() != null &&
                parcel.getAgent().getUser().getId().equals(currentUser.getId());

        // Also check group shipment agents if parcel is in a group
        if (!isAgent && currentUser.getUserType() == UserType.DELIVERY_AGENT && parcel.getGroupShipmentId() != null) {
            GroupShipment group = groupShipmentRepository.findById(parcel.getGroupShipmentId()).orElse(null);
            if (group != null) {
                isAgent = (group.getPickupAgent() != null &&
                        group.getPickupAgent().getUser().getId().equals(currentUser.getId())) ||
                        (group.getDeliveryAgent() != null &&
                                group.getDeliveryAgent().getUser().getId().equals(currentUser.getId()));
            }
        }

        if (!isCustomer && !isAgent) {
            throw new ForbiddenException("You don't have access to this chat");
        }
    }

    private void validateGroupChatAccess(GroupShipment group, User currentUser) {
        boolean isAgent = currentUser.getUserType() == UserType.DELIVERY_AGENT &&
                ((group.getPickupAgent() != null
                        && group.getPickupAgent().getUser().getId().equals(currentUser.getId())) ||
                        (group.getDeliveryAgent() != null
                                && group.getDeliveryAgent().getUser().getId().equals(currentUser.getId())));

        boolean isCustomer = currentUser.getUserType() == UserType.CUSTOMER;
        if (isCustomer) {
            List<Parcel> groupParcels = parcelRepository.findByGroupShipmentId(group.getId());
            isCustomer = groupParcels.stream()
                    .anyMatch(p -> p.getCustomer() != null &&
                            p.getCustomer().getUser().getId().equals(currentUser.getId()));
        }

        if (!isCustomer && !isAgent) {
            throw new ForbiddenException("You don't have access to this chat");
        }
    }

    private User determineParcelReceiver(Parcel parcel, User sender) {
        if (sender.getUserType() == UserType.CUSTOMER) {
            // Customer sending - receiver is the assigned agent
            DeliveryAgent agent = parcel.getAgent();

            // If no direct agent, check group shipment agents
            if (agent == null && parcel.getGroupShipmentId() != null) {
                GroupShipment group = groupShipmentRepository.findById(parcel.getGroupShipmentId()).orElse(null);
                if (group != null) {
                    agent = group.getDeliveryAgent() != null ? group.getDeliveryAgent() : group.getPickupAgent();
                }
            }

            if (agent == null) {
                throw new BadRequestException("No agent assigned to this parcel yet");
            }

            return agent.getUser();
        } else {
            // Agent sending - receiver is the customer
            if (parcel.getCustomer() == null) {
                throw new BadRequestException("No customer associated with this parcel");
            }
            return parcel.getCustomer().getUser();
        }
    }

    private User determineGroupReceiver(GroupShipment group, Long receiverParcelId, User sender) {
        if (sender.getUserType() == UserType.DELIVERY_AGENT) {
            // Agent sending - need to determine which customer
            if (receiverParcelId != null) {
                Parcel parcel = parcelRepository.findById(receiverParcelId)
                        .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", receiverParcelId));
                return parcel.getCustomer().getUser();
            }
            throw new BadRequestException("Please specify which customer to message");
        } else {
            // Customer sending - receiver is the agent
            DeliveryAgent agent = group.getDeliveryAgent() != null
                    ? group.getDeliveryAgent()
                    : group.getPickupAgent();

            if (agent == null) {
                throw new BadRequestException("No agent assigned to this group yet");
            }
            return agent.getUser();
        }
    }

    private void sendChatNotification(User receiver, User sender, String reference) {
        try {
            String senderName = getSenderName(sender);
            notificationService.sendNotification(
                    receiver,
                    "New Message",
                    senderName + " sent you a message regarding " + reference,
                    "CHAT_MESSAGE",
                    null);
        } catch (Exception e) {
            log.warn("Failed to send chat notification: {}", e.getMessage());
        }
    }

    private String getSenderName(User sender) {
        if (sender.getUserType() == UserType.CUSTOMER) {
            return customerRepository.findByUser(sender)
                    .map(Customer::getFullName)
                    .orElse("Customer");
        } else if (sender.getUserType() == UserType.DELIVERY_AGENT) {
            return agentRepository.findByUser(sender)
                    .map(DeliveryAgent::getFullName)
                    .orElse("Delivery Agent");
        }
        return "User";
    }

    private ChatMessageDTO mapToDTO(ChatMessage message, User currentUser) {
        String senderName = getSenderName(message.getSender());
        String senderAvatar = null;

        if (message.getSender().getUserType() == UserType.DELIVERY_AGENT) {
            senderAvatar = agentRepository.findByUser(message.getSender())
                    .map(DeliveryAgent::getProfilePhotoUrl)
                    .orElse(null);
        } else if (message.getSender().getUserType() == UserType.CUSTOMER) {
            senderAvatar = customerRepository.findByUser(message.getSender())
                    .map(Customer::getProfileImageUrl)
                    .orElse(null);
        }

        return ChatMessageDTO.builder()
                .id(message.getId())
                .parcelId(message.getParcelId())
                .groupShipmentId(message.getGroupShipmentId())
                .senderId(message.getSender().getId())
                .senderName(senderName)
                .senderType(message.getSenderType().name())
                .senderAvatar(senderAvatar)
                .receiverId(message.getReceiver().getId())
                .receiverName(getSenderName(message.getReceiver()))
                .message(message.getMessage())
                .isRead(message.getIsRead())
                .createdAt(message.getCreatedAt())
                .readAt(message.getReadAt())
                .isMine(message.getSender().getId().equals(currentUser.getId()))
                .build();
    }
}
