package com.tpts.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * OSRM Route Calculation Service
 * Calculates distance, duration, and ETA using OpenStreetMap OSRM API
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class RouteService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // OSRM Public API (free, no key required)
    private static final String OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving/";

    /**
     * Calculate route between two coordinates
     * @return RouteResponse with distance, duration, geometry
     */
    public RouteResponse calculateRoute(BigDecimal fromLat, BigDecimal fromLng,
                                        BigDecimal toLat, BigDecimal toLng) {
        try {
            // Format: lng,lat;lng,lat (OSRM uses lng,lat order!)
            String coordinates = String.format("%s,%s;%s,%s",
                    fromLng, fromLat, toLng, toLat);

            String url = OSRM_BASE_URL + coordinates + "?overview=full&geometries=geojson";

            log.info("Calling OSRM API: {}", url);

            String response = restTemplate.getForObject(url, String.class);
            JsonNode root = objectMapper.readTree(response);

            if (!"Ok".equals(root.path("code").asText())) {
                throw new RuntimeException("OSRM returned error: " + root.path("message").asText());
            }

            JsonNode route = root.path("routes").get(0);

            // Distance in meters, convert to km
            double distanceMeters = route.path("distance").asDouble();
            BigDecimal distanceKm = BigDecimal.valueOf(distanceMeters / 1000)
                    .setScale(2, RoundingMode.HALF_UP);

            // Duration in seconds, convert to minutes
            double durationSeconds = route.path("duration").asDouble();
            int durationMinutes = (int) Math.ceil(durationSeconds / 60);

            // Extract geometry for map polyline
            String geometry = route.path("geometry").toString();

            log.info("Route calculated: {}km, {}min", distanceKm, durationMinutes);

            return RouteResponse.builder()
                    .distanceKm(distanceKm)
                    .durationMinutes(durationMinutes)
                    .durationSeconds((int) durationSeconds)
                    .geometry(geometry)
                    .fromLat(fromLat)
                    .fromLng(fromLng)
                    .toLat(toLat)
                    .toLng(toLng)
                    .build();

        } catch (RestClientException e) {
            log.error("OSRM API call failed", e);
            // Fallback to Haversine distance if API fails
            return getFallbackRoute(fromLat, fromLng, toLat, toLng);
        } catch (Exception e) {
            log.error("Route calculation failed", e);
            return getFallbackRoute(fromLat, fromLng, toLat, toLng);
        }
    }

    /**
     * Calculate straight-line distance using Haversine formula (fallback)
     */
    private RouteResponse getFallbackRoute(BigDecimal lat1, BigDecimal lng1,
                                           BigDecimal lat2, BigDecimal lng2) {
        BigDecimal distance = calculateHaversineDistance(lat1, lng1, lat2, lng2);

        // Estimate: avg 40km/h in city, add 20% for actual roads
        int estimatedMinutes = (int) Math.ceil(distance.doubleValue() * 1.2 * 1.5);

        log.warn("Using fallback Haversine distance: {}km", distance);

        return RouteResponse.builder()
                .distanceKm(distance)
                .durationMinutes(estimatedMinutes)
                .durationSeconds(estimatedMinutes * 60)
                .geometry(null)
                .fromLat(lat1)
                .fromLng(lng1)
                .toLat(lat2)
                .toLng(lng2)
                .isFallback(true)
                .build();
    }

    /**
     * Haversine formula for straight-line distance
     */
    public BigDecimal calculateHaversineDistance(BigDecimal lat1, BigDecimal lng1,
                                                 BigDecimal lat2, BigDecimal lng2) {
        double earthRadius = 6371; // km

        double dLat = Math.toRadians(lat2.doubleValue() - lat1.doubleValue());
        double dLng = Math.toRadians(lng2.doubleValue() - lng1.doubleValue());

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1.doubleValue())) *
                        Math.cos(Math.toRadians(lat2.doubleValue())) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = earthRadius * c;

        return BigDecimal.valueOf(distance).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Calculate ETA from current location to destination
     */
    public EtaResponse calculateEta(BigDecimal fromLat, BigDecimal fromLng,
                                    BigDecimal toLat, BigDecimal toLng) {
        RouteResponse route = calculateRoute(fromLat, fromLng, toLat, toLng);

        return EtaResponse.builder()
                .distanceKm(route.getDistanceKm())
                .etaMinutes(route.getDurationMinutes())
                .etaText(formatEta(route.getDurationMinutes()))
                .build();
    }

    /**
     * Format ETA as human-readable text
     */
    private String formatEta(int minutes) {
        if (minutes < 60) {
            return minutes + " mins";
        }
        int hours = minutes / 60;
        int mins = minutes % 60;
        return hours + "h " + mins + "m";
    }

    // ==================== DTOs ====================

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class RouteResponse {
        private BigDecimal distanceKm;
        private Integer durationMinutes;
        private Integer durationSeconds;
        private String geometry; // GeoJSON LineString
        private BigDecimal fromLat;
        private BigDecimal fromLng;
        private BigDecimal toLat;
        private BigDecimal toLng;
        private Boolean isFallback; // True if Haversine was used
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class EtaResponse {
        private BigDecimal distanceKm;
        private Integer etaMinutes;
        private String etaText; // "25 mins" or "1h 15m"
    }
}
