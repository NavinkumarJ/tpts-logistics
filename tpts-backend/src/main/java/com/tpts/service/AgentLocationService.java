package com.tpts.service;

import com.tpts.controller.TrackingWebSocketController;
import com.tpts.entity.DeliveryAgent;
import com.tpts.entity.Parcel;
import com.tpts.entity.ParcelStatus;
import com.tpts.repository.DeliveryAgentRepository;
import com.tpts.repository.ParcelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgentLocationService {

    private final DeliveryAgentRepository agentRepository;
    private final ParcelRepository parcelRepository;
    private final TrackingWebSocketController wsController;

    /**
     * Update agent location and broadcast to tracking subscribers
     */
    @Transactional
    public void updateAgentLocation(Long agentId, BigDecimal latitude, BigDecimal longitude) {
        DeliveryAgent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent not found"));

        agent.setCurrentLatitude(latitude);
        agent.setCurrentLongitude(longitude);
        agent.setLocationUpdatedAt(LocalDateTime.now());
        agentRepository.save(agent);

        // Get all active deliveries for this agent
        List<Parcel> activeParcels = parcelRepository.findByAgentIdAndStatusIn(
                agentId,
                List.of(ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT, ParcelStatus.OUT_FOR_DELIVERY)
        );

        // Broadcast location to each active parcel's tracking subscribers
        activeParcels.forEach(parcel -> {
            try {
                // Calculate ETA (simple distance-based calculation)
                double distanceKm = calculateDistance(
                        latitude.doubleValue(), longitude.doubleValue(),
                        parcel.getDeliveryLatitude().doubleValue(),
                        parcel.getDeliveryLongitude().doubleValue()
                );

                int etaMinutes = (int) (distanceKm * 3); // Assume 20km/h average speed
                String etaText = etaMinutes < 60 ?
                        etaMinutes + " mins" :
                        (etaMinutes / 60) + " hrs " + (etaMinutes % 60) + " mins";

                Map<String, Object> locationData = new HashMap<>();
                locationData.put("agentLat", latitude);
                locationData.put("agentLng", longitude);
                locationData.put("distanceKm", String.format("%.2f", distanceKm));
                locationData.put("etaMinutes", etaMinutes);
                locationData.put("etaText", etaText);
                locationData.put("timestamp", LocalDateTime.now());

                wsController.broadcastAgentLocation(parcel.getTrackingNumber(), locationData);
            } catch (Exception e) {
                log.error("Failed to broadcast location for parcel {}: {}",
                        parcel.getTrackingNumber(), e.getMessage());
            }
        });

        log.debug("Agent {} location updated: {}, {}", agentId, latitude, longitude);
    }

    /**
     * Calculate distance between two lat/lng points (Haversine formula)
     */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of the earth in km

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
