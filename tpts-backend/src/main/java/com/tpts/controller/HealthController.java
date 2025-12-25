package com.tpts.controller;

import com.tpts.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Health Check Controller
 * Provides health check endpoints for monitoring
 */
@RestController
public class HealthController {

    @GetMapping("/")
    public ResponseEntity<ApiResponse<Map<String, Object>>> root() {
        Map<String, Object> data = new HashMap<>();
        data.put("name", "TPTS Backend API");
        data.put("version", "1.0.0");
        data.put("status", "running");
        data.put("timestamp", LocalDateTime.now());
        
        return ResponseEntity.ok(ApiResponse.success(data, "Welcome to TPTS API"));
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        Map<String, Object> data = new HashMap<>();
        data.put("status", "UP");
        data.put("timestamp", LocalDateTime.now());
        
        return ResponseEntity.ok(ApiResponse.success(data, "Service is healthy"));
    }
}
