package com.tpts.controller;

import com.tpts.dto.response.ApiResponse;
import com.tpts.service.RouteService;
import com.tpts.service.GeocodingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

/**
 * Route and Geocoding API Controller
 */
@RestController
@RequestMapping("/api/route")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;
    private final GeocodingService geocodingService;

    /**
     * Calculate route between two points
     * GET /api/route/calculate?fromLat=13.08&fromLng=80.27&toLat=12.97&toLng=77.59
     */
    @GetMapping("/calculate")
    public ResponseEntity<ApiResponse<RouteService.RouteResponse>> calculateRoute(
            @RequestParam BigDecimal fromLat,
            @RequestParam BigDecimal fromLng,
            @RequestParam BigDecimal toLat,
            @RequestParam BigDecimal toLng) {

        RouteService.RouteResponse route = routeService.calculateRoute(fromLat, fromLng, toLat, toLng);
        return ResponseEntity.ok(ApiResponse.success(route, "Route calculated successfully"));
    }

    /**
     * Calculate ETA to destination
     * GET /api/route/eta?fromLat=13.08&fromLng=80.27&toLat=12.97&toLng=77.59
     */
    @GetMapping("/eta")
    public ResponseEntity<ApiResponse<RouteService.EtaResponse>> calculateEta(
            @RequestParam BigDecimal fromLat,
            @RequestParam BigDecimal fromLng,
            @RequestParam BigDecimal toLat,
            @RequestParam BigDecimal toLng) {

        RouteService.EtaResponse eta = routeService.calculateEta(fromLat, fromLng, toLat, toLng);
        return ResponseEntity.ok(ApiResponse.success(eta, "ETA calculated successfully"));
    }

    /**
     * Geocode address to coordinates
     * GET /api/route/geocode?address=Anna Nagar&city=Chennai&pincode=600040
     */
    @GetMapping("/geocode")
    public ResponseEntity<ApiResponse<GeocodingService.GeocodingResponse>> geocodeAddress(
            @RequestParam String address,
            @RequestParam String city,
            @RequestParam String pincode) {

        GeocodingService.GeocodingResponse result = geocodingService.geocodeAddress(address, city, pincode);
        return ResponseEntity.ok(ApiResponse.success(result, "Address geocoded successfully"));
    }

    /**
     * Reverse geocode coordinates to address
     * GET /api/route/reverse-geocode?lat=13.08&lng=80.27
     */
    @GetMapping("/reverse-geocode")
    public ResponseEntity<ApiResponse<GeocodingService.ReverseGeocodingResponse>> reverseGeocode(
            @RequestParam BigDecimal lat,
            @RequestParam BigDecimal lng) {

        GeocodingService.ReverseGeocodingResponse result = geocodingService.reverseGeocode(lat, lng);
        return ResponseEntity.ok(ApiResponse.success(result, "Coordinates reverse geocoded successfully"));
    }
}
