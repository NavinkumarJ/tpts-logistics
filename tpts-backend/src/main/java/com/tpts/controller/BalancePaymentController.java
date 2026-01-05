package com.tpts.controller;

import com.tpts.dto.request.VerifyPaymentRequest;
import com.tpts.dto.response.PaymentDTO;
import com.tpts.entity.User;
import com.tpts.service.BalancePaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller for Balance Payment operations
 * Handles balance payments for partial group buys with pro-rated discounts
 */
@RestController
@RequestMapping("/api/payments/balance")
@RequiredArgsConstructor
@Slf4j
public class BalancePaymentController {

    private final BalancePaymentService balancePaymentService;

    /**
     * Create a Razorpay order for balance payment
     */
    @PostMapping("/{parcelId}/create")
    public ResponseEntity<Map<String, Object>> createBalanceOrder(
            @PathVariable Long parcelId,
            @AuthenticationPrincipal User currentUser) {
        log.info("Creating balance payment order for parcel {} by user {}", parcelId, currentUser.getId());
        Map<String, Object> order = balancePaymentService.createBalancePaymentOrder(parcelId, currentUser);
        return ResponseEntity.ok(order);
    }

    /**
     * Verify Razorpay balance payment
     */
    @PostMapping("/{parcelId}/verify")
    public ResponseEntity<PaymentDTO> verifyBalancePayment(
            @PathVariable Long parcelId,
            @RequestBody VerifyPaymentRequest request,
            @AuthenticationPrincipal User currentUser) {
        log.info("Verifying balance payment for parcel {} by user {}", parcelId, currentUser.getId());
        PaymentDTO payment = balancePaymentService.verifyBalancePayment(parcelId, request, currentUser);
        return ResponseEntity.ok(payment);
    }

    /**
     * Record cash collection by agent (with photo proof)
     */
    @PostMapping("/{parcelId}/cash")
    public ResponseEntity<Map<String, Object>> recordCashCollection(
            @PathVariable Long parcelId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal User currentUser) {
        String photoUrl = request.get("photoUrl");
        log.info("Recording cash collection for parcel {} by agent {}", parcelId, currentUser.getId());
        Map<String, Object> result = balancePaymentService.recordCashCollection(parcelId, photoUrl, currentUser);
        return ResponseEntity.ok(result);
    }

    /**
     * Get balance payment status for a parcel
     */
    @GetMapping("/{parcelId}/status")
    public ResponseEntity<Map<String, Object>> getBalanceStatus(
            @PathVariable Long parcelId,
            @AuthenticationPrincipal User currentUser) {
        Map<String, Object> status = balancePaymentService.getBalanceStatus(parcelId, currentUser);
        return ResponseEntity.ok(status);
    }
}
