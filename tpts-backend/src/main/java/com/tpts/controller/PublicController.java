package com.tpts.controller;

import com.tpts.dto.request.ContactFormRequest;
import com.tpts.dto.response.ApiResponse;
import com.tpts.service.EmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class PublicController {

    private final EmailService emailService;

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
                    ApiResponse.success(null, "Message sent successfully! We'll get back to you soon.")
            );
        } catch (Exception e) {
            log.error("Failed to send contact form", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to send message. Please try again."));
        }
    }
}
