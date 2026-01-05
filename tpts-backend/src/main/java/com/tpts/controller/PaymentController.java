package com.tpts.controller;

import com.tpts.dto.request.CreatePaymentRequest;
import com.tpts.dto.request.InitiateOrderRequest;
import com.tpts.dto.request.RefundRequest;
import com.tpts.dto.request.VerifyPaymentRequest;
import com.tpts.dto.response.ApiResponse;
import com.tpts.dto.response.PaymentDTO;
import com.tpts.dto.response.RazorpayOrderDTO;
import com.tpts.entity.User;
import com.tpts.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Payment Controller
 * Handles payment operations with Razorpay integration
 *
 * Customer Endpoints:
 * - POST /api/payments/initiate - Initiate payment (get Razorpay order)
 * - POST /api/payments/verify - Verify payment after Razorpay checkout
 * - POST /api/payments/failed - Mark payment as failed
 * - GET /api/payments/{id} - Get payment by ID
 * - GET /api/payments/parcel/{id} - Get payment by parcel ID
 * - GET /api/payments/my-payments - Get customer payment history
 *
 * Company Admin Endpoints:
 * - GET /api/payments/company - Get company payments
 * - GET /api/payments/company/stats - Get revenue statistics
 * - POST /api/payments/{id}/refund - Initiate refund
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

        private final PaymentService paymentService;

        // ==========================================
        // Customer: Initiate Payment
        // ==========================================

        /**
         * Initiate payment - creates Razorpay order
         * POST /api/payments/initiate
         * Returns order details for frontend to launch Razorpay checkout
         */
        @PostMapping("/initiate")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<RazorpayOrderDTO>> initiatePayment(
                        @Valid @RequestBody CreatePaymentRequest request,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Initiating payment for parcel {} by user {}",
                                request.getParcelId(), currentUser.getEmail());

                RazorpayOrderDTO order = paymentService.initiatePayment(request, currentUser);

                String message = order.getIsCod()
                                ? "COD payment registered. Pay ₹" + order.getAmount() + " on delivery."
                                : "Payment initiated. Complete checkout to proceed.";

                return ResponseEntity
                                .status(HttpStatus.CREATED)
                                .body(ApiResponse.success(order, message));
        }

        /**
         * Initiate order - creates Razorpay order WITHOUT creating parcel first
         * POST /api/payments/initiate-order
         * Parcel is created only after successful payment verification
         * This is the preferred flow for group buy orders
         */
        @PostMapping("/initiate-order")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<RazorpayOrderDTO>> initiateOrder(
                        @Valid @RequestBody InitiateOrderRequest request,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Initiating order (payment-first) from {} to {} by user {}",
                                request.getPickupCity(), request.getDeliveryCity(), currentUser.getEmail());

                RazorpayOrderDTO order = paymentService.initiateOrder(request, currentUser);

                return ResponseEntity
                                .status(HttpStatus.CREATED)
                                .body(ApiResponse.success(order,
                                                "Order initiated. Complete payment to confirm shipment."));
        }

        // ==========================================
        // Customer: Verify Payment
        // ==========================================

        /**
         * Verify payment after Razorpay checkout
         * POST /api/payments/verify
         * Called by frontend after successful Razorpay payment
         */
        @PostMapping("/verify")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<PaymentDTO>> verifyPayment(
                        @Valid @RequestBody VerifyPaymentRequest request) {

                log.info("Verifying payment for Razorpay order: {}", request.getRazorpayOrderId());

                PaymentDTO payment = paymentService.verifyPayment(request);

                return ResponseEntity.ok(ApiResponse.success(payment,
                                "Payment successful! Your order has been confirmed."));
        }

        /**
         * Mark payment as failed
         * POST /api/payments/failed
         * Called by frontend when Razorpay payment fails
         */
        @PostMapping("/failed")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<PaymentDTO>> markPaymentFailed(
                        @RequestBody Map<String, String> request) {

                String orderId = request.get("razorpayOrderId");
                String errorCode = request.getOrDefault("errorCode", "UNKNOWN");
                String errorDescription = request.getOrDefault("errorDescription", "Payment failed");

                log.warn("Payment failed for order: {}, error: {}", orderId, errorCode);

                PaymentDTO payment = paymentService.markPaymentFailed(orderId, errorCode, errorDescription);

                return ResponseEntity.ok(ApiResponse.error("Payment failed: " + errorDescription));
        }

        // ==========================================
        // Customer: Get Payment Details
        // ==========================================

        /**
         * Get payment by ID
         * GET /api/payments/{id}
         */
        @GetMapping("/{id}")
        @PreAuthorize("hasAnyRole('CUSTOMER', 'COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<PaymentDTO>> getPaymentById(
                        @PathVariable Long id,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting payment: {}", id);

                PaymentDTO payment = paymentService.getPaymentById(id, currentUser);

                return ResponseEntity.ok(ApiResponse.success(payment, "Payment retrieved"));
        }

        /**
         * Get payment by parcel ID
         * GET /api/payments/parcel/{parcelId}
         */
        @GetMapping("/parcel/{parcelId}")
        @PreAuthorize("hasAnyRole('CUSTOMER', 'COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<PaymentDTO>> getPaymentByParcelId(
                        @PathVariable Long parcelId,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting payment for parcel: {}", parcelId);

                PaymentDTO payment = paymentService.getPaymentByParcelId(parcelId, currentUser);

                return ResponseEntity.ok(ApiResponse.success(payment, "Payment retrieved"));
        }

        /**
         * Get customer payment history
         * GET /api/payments/my-payments
         */
        @GetMapping("/my-payments")
        @PreAuthorize("hasRole('CUSTOMER')")
        public ResponseEntity<ApiResponse<List<PaymentDTO>>> getMyPayments(
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting payment history for customer: {}", currentUser.getEmail());

                List<PaymentDTO> payments = paymentService.getCustomerPayments(currentUser);

                return ResponseEntity.ok(ApiResponse.success(payments,
                                "Retrieved " + payments.size() + " payments"));
        }

        // ==========================================
        // Company Admin: Get Payments
        // ==========================================

        /**
         * Get company payments
         * GET /api/payments/company
         */
        @GetMapping("/company")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<List<PaymentDTO>>> getCompanyPayments(
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting payments for company admin: {}", currentUser.getEmail());

                List<PaymentDTO> payments = paymentService.getCompanyPayments(currentUser);

                return ResponseEntity.ok(ApiResponse.success(payments,
                                "Retrieved " + payments.size() + " payments"));
        }

        /**
         * Get company revenue statistics
         * GET /api/payments/company/stats
         */
        @GetMapping("/company/stats")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<PaymentService.RevenueStatsDTO>> getCompanyStats(
                        @RequestParam Long companyId,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Getting revenue stats for company: {}", companyId);

                PaymentService.RevenueStatsDTO stats = paymentService.getCompanyRevenueStats(companyId);

                return ResponseEntity.ok(ApiResponse.success(stats, "Revenue statistics retrieved"));
        }

        // ==========================================
        // Company Admin: Refund
        // ==========================================

        /**
         * Initiate refund
         * POST /api/payments/{id}/refund
         */
        @PostMapping("/{id}/refund")
        @PreAuthorize("hasRole('COMPANY_ADMIN')")
        public ResponseEntity<ApiResponse<PaymentDTO>> initiateRefund(
                        @PathVariable Long id,
                        @Valid @RequestBody RefundRequest request,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Initiating refund for payment: {}, amount: {}", id, request.getAmount());

                PaymentDTO payment = paymentService.initiateRefund(id, request, currentUser);

                String message = payment.getStatus().name().contains("PARTIAL")
                                ? "Partial refund of ₹" + request.getAmount() + " processed"
                                : "Full refund processed successfully";

                return ResponseEntity.ok(ApiResponse.success(payment, message));
        }
}