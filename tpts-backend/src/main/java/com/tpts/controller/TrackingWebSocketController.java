package com.tpts.controller;

import com.tpts.dto.response.ParcelTrackingDTO;
import com.tpts.service.ParcelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class TrackingWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ParcelService parcelService;

    /**
     * Subscribe to parcel tracking
     * Frontend: stompClient.subscribe('/topic/tracking/{trackingNumber}')
     */
    @MessageMapping("/tracking/{trackingNumber}")
    @SendTo("/topic/tracking/{trackingNumber}")
    public ParcelTrackingDTO trackParcel(@DestinationVariable String trackingNumber) {
        return parcelService.getPublicTracking(trackingNumber, null);
    }

    /**
     * Broadcast parcel update to all subscribers
     * Called internally when parcel status changes
     */
    public void broadcastParcelUpdate(String trackingNumber, ParcelTrackingDTO tracking) {
        messagingTemplate.convertAndSend("/topic/tracking/" + trackingNumber, tracking);
        log.info("Broadcasted update for {}", trackingNumber);
    }

    /**
     * Broadcast agent location update
     * Called when agent updates GPS location
     */
    public void broadcastAgentLocation(String trackingNumber, Map<String, Object> locationData) {
        messagingTemplate.convertAndSend("/topic/agent-location/" + trackingNumber, locationData);
    }

    /**
     * Broadcast group shipment update
     */
    public void broadcastGroupUpdate(String groupCode, Map<String, Object> groupData) {
        messagingTemplate.convertAndSend("/topic/group/" + groupCode, groupData);
        log.info("Broadcasted group update for {}", groupCode);
    }
}
