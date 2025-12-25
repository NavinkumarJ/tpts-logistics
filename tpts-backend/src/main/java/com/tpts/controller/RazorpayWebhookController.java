package com.tpts.controller;

import com.tpts.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class RazorpayWebhookController {

    private final PaymentService paymentService;

    @Value("${razorpay.webhook.secret}")
    private String webhookSecret;

    /**
     * Razorpay Webhook Handler
     * POST /api/payments/webhook
     */
    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody Map<String, Object> payload,
            @RequestHeader("X-Razorpay-Signature") String signature) {

        try {
            // Verify webhook signature
            if (!verifyWebhookSignature(payload.toString(), signature)) {
                log.error("Invalid webhook signature");
                return ResponseEntity.badRequest().body("Invalid signature");
            }

            String event = (String) payload.get("event");
            Map<String, Object> payloadData = (Map<String, Object>) payload.get("payload");
            Map<String, Object> paymentEntity = (Map<String, Object>) payloadData.get("payment");
            Map<String, Object> entity = paymentEntity != null ? paymentEntity : payloadData;

            log.info("Received webhook event: {}", event);

            switch (event) {
                case "payment.captured":
                    handlePaymentCaptured(entity);
                    break;
                case "payment.failed":
                    handlePaymentFailed(entity);
                    break;
                case "refund.created":
                    handleRefundCreated(entity);
                    break;
                case "refund.processed":
                    handleRefundProcessed(entity);
                    break;
                default:
                    log.info("Unhandled webhook event: {}", event);
            }

            return ResponseEntity.ok("Webhook processed");

        } catch (Exception e) {
            log.error("Webhook processing failed", e);
            return ResponseEntity.internalServerError().body("Processing failed");
        }
    }

    private void handlePaymentCaptured(Map<String, Object> entity) {
        String paymentId = (String) entity.get("id");
        String orderId = (String) entity.get("order_id");
        Integer amount = (Integer) entity.get("amount");

        log.info("Payment captured: {} for order {}", paymentId, orderId);
        paymentService.updatePaymentStatus(orderId, "CAPTURED", paymentId, amount / 100.0);
    }

    private void handlePaymentFailed(Map<String, Object> entity) {
        String paymentId = (String) entity.get("id");
        String orderId = (String) entity.get("order_id");
        String errorDescription = (String) entity.get("error_description");

        log.warn("Payment failed: {} for order {}", paymentId, orderId);
        paymentService.handlePaymentFailure(orderId, errorDescription);
    }

    private void handleRefundCreated(Map<String, Object> entity) {
        String refundId = (String) entity.get("id");
        String paymentId = (String) entity.get("payment_id");
        Integer amount = (Integer) entity.get("amount");

        log.info("Refund created: {} for payment {}", refundId, paymentId);
        paymentService.initiateRefund(paymentId, refundId, amount / 100.0);
    }

    private void handleRefundProcessed(Map<String, Object> entity) {
        String refundId = (String) entity.get("id");
        String status = (String) entity.get("status");

        log.info("Refund processed: {} with status {}", refundId, status);
        paymentService.completeRefund(refundId, status);
    }

    /**
     * Verify Razorpay webhook signature using HMAC SHA256
     */
    private boolean verifyWebhookSignature(String payload, String signature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(webhookSecret.getBytes(), "HmacSHA256");
            mac.init(secretKey);

            byte[] hash = mac.doFinal(payload.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }

            return hexString.toString().equals(signature);

        } catch (Exception e) {
            log.error("Signature verification failed", e);
            return false;
        }
    }
}
