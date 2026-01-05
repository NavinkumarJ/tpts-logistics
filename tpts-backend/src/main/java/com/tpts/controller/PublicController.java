package com.tpts.controller;

import com.tpts.dto.request.ContactFormRequest;
import com.tpts.dto.response.ApiResponse;
import com.tpts.entity.ParcelStatus;
import com.tpts.repository.CompanyAdminRepository;
import com.tpts.repository.CustomerRepository;
import com.tpts.repository.DeliveryAgentRepository;
import com.tpts.repository.ParcelRepository;
import com.tpts.service.EmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class PublicController {

    private final EmailService emailService;
    private final CompanyAdminRepository companyRepository;
    private final CustomerRepository customerRepository;
    private final DeliveryAgentRepository agentRepository;
    private final ParcelRepository parcelRepository;

    /**
     * Get public platform statistics for landing page
     * GET /api/public/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPlatformStats() {
        try {
            Map<String, Object> stats = new HashMap<>();

            // Count approved companies
            long totalCompanies = companyRepository.countByIsApprovedTrue();
            stats.put("totalCompanies", totalCompanies);

            // Count total delivered parcels
            long totalDeliveries = parcelRepository.countByStatus(ParcelStatus.DELIVERED);
            stats.put("totalDeliveries", totalDeliveries);

            // Count total customers
            long totalCustomers = customerRepository.count();
            stats.put("totalCustomers", totalCustomers);

            // Count total active agents
            long totalAgents = agentRepository.countByIsActiveTrue();
            stats.put("totalAgents", totalAgents);

            // Estimate cities covered (based on unique service cities from companies)
            // For now, use a reasonable estimate based on approved companies
            long citiesCovered = Math.max(5, totalCompanies / 3 + 2);
            stats.put("citiesCovered", citiesCovered);

            return ResponseEntity.ok(ApiResponse.success(stats, "Platform stats retrieved"));
        } catch (Exception e) {
            log.error("Failed to get platform stats", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to get stats"));
        }
    }

    /**
     * Contact Form Submission (Two-way email)
     * 1. Sends notification to support email
     * 2. Sends confirmation to customer
     */
    @PostMapping("/contact")
    public ResponseEntity<ApiResponse<Void>> submitContactForm(@RequestBody @Valid ContactFormRequest request) {
        try {
            log.info("Contact form submitted by: {}", request.getEmail());

            // Send both emails
            emailService.sendContactFormEmails(request);

            return ResponseEntity.ok(
                    ApiResponse.success(null, "Message sent successfully! We'll get back to you soon."));
        } catch (Exception e) {
            log.error("Failed to send contact form", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to send message. Please try again."));
        }
    }
}
