package com.tpts.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import com.tpts.dto.request.VerifyPaymentRequest;
import com.tpts.dto.response.PaymentDTO;
import com.tpts.entity.*;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Service for Balance Payment operations
 * Handles balance payments for partial group buys with pro-rated discounts
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BalancePaymentService {

    private final ParcelRepository parcelRepository;
    private final CustomerRepository customerRepository;
    private final DeliveryAgentRepository agentRepository;
    private final PaymentRepository paymentRepository;
    private final NotificationService notificationService;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    /**
     * Create a Razorpay order for balance payment
     */
    @Transactional
    public Map<String, Object> createBalancePaymentOrder(Long parcelId, User currentUser) {
        // Get parcel
        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        // Verify customer owns the parcel
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        if (!parcel.getCustomer().getId().equals(customer.getId())) {
            throw new ForbiddenException("Access denied - parcel belongs to another customer");
        }

        // Check if balance payment is needed
        if (parcel.getBalanceAmount() == null || parcel.getBalanceAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("No balance payment required for this parcel");
        }

        // Check if already paid
        if (Boolean.TRUE.equals(parcel.getBalancePaid())) {
            throw new BadRequestException("Balance already paid for this parcel");
        }

        try {
            RazorpayClient razorpay = new RazorpayClient(razorpayKeyId, razorpayKeySecret);

            // Create Razorpay order
            JSONObject orderRequest = new JSONObject();
            // Convert to paise (Razorpay uses smallest currency unit)
            int amountInPaise = parcel.getBalanceAmount().multiply(new BigDecimal("100")).intValue();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "BAL_" + parcel.getTrackingNumber());
            orderRequest.put("notes", new JSONObject()
                    .put("parcel_id", parcelId.toString())
                    .put("tracking_number", parcel.getTrackingNumber())
                    .put("type", "balance_payment"));

            Order order = razorpay.orders.create(orderRequest);

            log.info("Created Razorpay balance order {} for parcel {} amount ₹{}",
                    order.get("id"), parcel.getTrackingNumber(), parcel.getBalanceAmount());

            Map<String, Object> response = new HashMap<>();
            response.put("orderId", order.get("id"));
            response.put("amount", parcel.getBalanceAmount());
            response.put("amountInPaise", amountInPaise);
            response.put("currency", "INR");
            response.put("keyId", razorpayKeyId);
            response.put("trackingNumber", parcel.getTrackingNumber());
            response.put("customerName", customer.getFullName());
            response.put("customerEmail", currentUser.getEmail());
            response.put("customerPhone", currentUser.getPhone());

            return response;

        } catch (RazorpayException e) {
            log.error("Failed to create Razorpay balance order: {}", e.getMessage());
            throw new RuntimeException("Failed to create payment order: " + e.getMessage());
        }
    }

    /**
     * Verify Razorpay balance payment
     */
    @Transactional
    public PaymentDTO verifyBalancePayment(Long parcelId, VerifyPaymentRequest request, User currentUser) {
        // Get parcel
        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        // Verify customer owns the parcel
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        if (!parcel.getCustomer().getId().equals(customer.getId())) {
            throw new ForbiddenException("Access denied");
        }

        // Verify signature
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", request.getRazorpayOrderId());
            options.put("razorpay_payment_id", request.getRazorpayPaymentId());
            options.put("razorpay_signature", request.getRazorpaySignature());

            boolean isValid = Utils.verifyPaymentSignature(options, razorpayKeySecret);

            if (!isValid) {
                throw new BadRequestException("Payment verification failed - invalid signature");
            }

            // Update parcel balance status
            parcel.setBalancePaid(true);
            parcel.setBalancePaymentMethod("RAZORPAY");
            parcel.setBalancePaidAt(LocalDateTime.now());
            parcelRepository.save(parcel);

            // Create payment record for balance
            Payment payment = Payment.builder()
                    .parcel(parcel)
                    .customer(customer)
                    .company(parcel.getCompany())
                    .razorpayOrderId(request.getRazorpayOrderId())
                    .transactionId(request.getRazorpayPaymentId())
                    .baseAmount(parcel.getBalanceAmount())
                    .totalAmount(parcel.getBalanceAmount())
                    .currency("INR")
                    .status(PaymentStatus.COMPLETED)
                    .paymentMethod(PaymentMethod.RAZORPAY)
                    .paidAt(LocalDateTime.now())
                    .build();
            payment = paymentRepository.save(payment);

            log.info("Balance payment verified for parcel {}: ₹{} via Razorpay",
                    parcel.getTrackingNumber(), parcel.getBalanceAmount());

            // Notify customer
            notificationService.sendBalancePaidConfirmation(
                    currentUser,
                    parcel.getTrackingNumber(),
                    parcel.getBalanceAmount(),
                    "Razorpay");

            return PaymentDTO.builder()
                    .id(payment.getId())
                    .parcelId(parcel.getId())
                    .trackingNumber(parcel.getTrackingNumber())
                    .transactionId(request.getRazorpayPaymentId())
                    .totalAmount(parcel.getBalanceAmount())
                    .status(PaymentStatus.COMPLETED)
                    .paymentMethod(PaymentMethod.RAZORPAY)
                    .completedAt(payment.getPaidAt())
                    .build();

        } catch (RazorpayException e) {
            log.error("Razorpay signature verification failed: {}", e.getMessage());
            throw new BadRequestException("Payment verification failed: " + e.getMessage());
        }
    }

    /**
     * Record cash collection by agent with photo proof
     */
    @Transactional
    public Map<String, Object> recordCashCollection(Long parcelId, String photoUrl, User currentUser) {
        // Get parcel
        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        // Verify agent is assigned to this parcel
        DeliveryAgent agent = agentRepository.findByUser(currentUser)
                .orElseThrow(() -> new ForbiddenException("Only agents can collect cash"));

        if (parcel.getAgent() == null || !parcel.getAgent().getId().equals(agent.getId())) {
            throw new ForbiddenException("You are not assigned to this parcel");
        }

        // Check if balance payment is needed
        if (parcel.getBalanceAmount() == null || parcel.getBalanceAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("No balance payment required for this parcel");
        }

        // Check if already paid
        if (Boolean.TRUE.equals(parcel.getBalancePaid())) {
            throw new BadRequestException("Balance already paid for this parcel");
        }

        // Require photo proof for cash collection
        if (photoUrl == null || photoUrl.isBlank()) {
            throw new BadRequestException("Photo proof is required for cash collection");
        }

        // Update parcel balance status
        parcel.setBalancePaid(true);
        parcel.setBalancePaymentMethod("CASH");
        parcel.setBalancePaidAt(LocalDateTime.now());
        parcel.setBalanceCashPhotoUrl(photoUrl);
        parcelRepository.save(parcel);

        log.info("Cash collection recorded for parcel {} by agent {}: ₹{}",
                parcel.getTrackingNumber(), agent.getId(), parcel.getBalanceAmount());

        // Notify customer
        notificationService.sendBalancePaidConfirmation(
                parcel.getCustomer().getUser(),
                parcel.getTrackingNumber(),
                parcel.getBalanceAmount(),
                "Cash");

        // Notify company about cash collection
        notificationService.sendCashCollectionToCompany(
                parcel.getCompany().getUser(),
                parcel.getTrackingNumber(),
                agent.getFullName(),
                parcel.getBalanceAmount());

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Cash collection recorded successfully");
        response.put("trackingNumber", parcel.getTrackingNumber());
        response.put("amount", parcel.getBalanceAmount());
        response.put("photoUrl", photoUrl);
        response.put("collectedAt", parcel.getBalancePaidAt());

        return response;
    }

    /**
     * Get balance payment status for a parcel
     */
    public Map<String, Object> getBalanceStatus(Long parcelId, User currentUser) {
        Parcel parcel = parcelRepository.findById(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", parcelId));

        Map<String, Object> status = new HashMap<>();
        status.put("parcelId", parcel.getId());
        status.put("trackingNumber", parcel.getTrackingNumber());
        status.put("balanceAmount", parcel.getBalanceAmount());
        status.put("balancePaid", parcel.getBalancePaid());
        status.put("balancePaymentMethod", parcel.getBalancePaymentMethod());
        status.put("balancePaidAt", parcel.getBalancePaidAt());
        status.put("balanceCashPhotoUrl", parcel.getBalanceCashPhotoUrl());
        status.put("originalDiscountPercentage", parcel.getOriginalDiscountPercentage());
        status.put("effectiveDiscountPercentage", parcel.getEffectiveDiscountPercentage());

        return status;
    }
}
