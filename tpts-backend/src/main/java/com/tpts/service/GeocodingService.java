package com.tpts.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Nominatim Geocoding Service
 * Converts addresses to coordinates and vice versa
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class GeocodingService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
    private static final String USER_AGENT = "TPTSApp/1.0"; // Required by Nominatim

    /**
     * Geocode address to coordinates (Forward Geocoding)
     */
    public GeocodingResponse geocodeAddress(String address, String city, String pincode) {
        try {
            String fullAddress = String.format("%s, %s, %s, India", address, city, pincode);

            String url = UriComponentsBuilder.fromHttpUrl(NOMINATIM_BASE_URL + "/search")
                    .queryParam("q", fullAddress)
                    .queryParam("format", "json")
                    .queryParam("limit", 1)
                    .queryParam("countrycodes", "in")
                    .build()
                    .toUriString();

            log.info("Geocoding address: {}", fullAddress);

            String response = restTemplate.getForObject(url, String.class);
            JsonNode results = objectMapper.readTree(response);

            if (results.isEmpty()) {
                log.warn("No geocoding results for: {}", fullAddress);
                return getFallbackCoordinates(city, pincode);
            }

            JsonNode firstResult = results.get(0);
            BigDecimal lat = new BigDecimal(firstResult.path("lat").asText());
            BigDecimal lng = new BigDecimal(firstResult.path("lon").asText());
            String displayName = firstResult.path("display_name").asText();

            log.info("Geocoded to: {}, {}", lat, lng);

            return GeocodingResponse.builder()
                    .latitude(lat)
                    .longitude(lng)
                    .displayName(displayName)
                    .success(true)
                    .build();

        } catch (Exception e) {
            log.error("Geocoding failed", e);
            return getFallbackCoordinates(city, pincode);
        }
    }

    /**
     * Reverse geocode coordinates to address
     */
    public ReverseGeocodingResponse reverseGeocode(BigDecimal lat, BigDecimal lng) {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(NOMINATIM_BASE_URL + "/reverse")
                    .queryParam("lat", lat)
                    .queryParam("lon", lng)
                    .queryParam("format", "json")
                    .build()
                    .toUriString();

            log.info("Reverse geocoding: {}, {}", lat, lng);

            String response = restTemplate.getForObject(url, String.class);
            JsonNode result = objectMapper.readTree(response);

            JsonNode address = result.path("address");

            return ReverseGeocodingResponse.builder()
                    .displayName(result.path("display_name").asText())
                    .city(address.path("city").asText())
                    .state(address.path("state").asText())
                    .postcode(address.path("postcode").asText())
                    .country(address.path("country").asText())
                    .success(true)
                    .build();

        } catch (Exception e) {
            log.error("Reverse geocoding failed", e);
            return ReverseGeocodingResponse.builder()
                    .success(false)
                    .build();
        }
    }

    /**
     * Fallback coordinates for major Indian cities
     */
    private GeocodingResponse getFallbackCoordinates(String city, String pincode) {
        // Default coordinates for major cities
        BigDecimal lat, lng;

        switch (city.toLowerCase()) {
            case "chennai":
                lat = new BigDecimal("13.0827");
                lng = new BigDecimal("80.2707");
                break;
            case "bangalore", "bengaluru":
                lat = new BigDecimal("12.9716");
                lng = new BigDecimal("77.5946");
                break;
            case "mumbai":
                lat = new BigDecimal("19.0760");
                lng = new BigDecimal("72.8777");
                break;
            case "delhi":
                lat = new BigDecimal("28.7041");
                lng = new BigDecimal("77.1025");
                break;
            default:
                // Default to Chennai
                lat = new BigDecimal("13.0827");
                lng = new BigDecimal("80.2707");
        }

        log.warn("Using fallback coordinates for {}: {}, {}", city, lat, lng);

        return GeocodingResponse.builder()
                .latitude(lat)
                .longitude(lng)
                .displayName(city + ", India")
                .success(false)
                .isFallback(true)
                .build();
    }

    // ==================== DTOs ====================

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class GeocodingResponse {
        private BigDecimal latitude;
        private BigDecimal longitude;
        private String displayName;
        private Boolean success;
        private Boolean isFallback;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ReverseGeocodingResponse {
        private String displayName;
        private String city;
        private String state;
        private String postcode;
        private String country;
        private Boolean success;
    }
}
