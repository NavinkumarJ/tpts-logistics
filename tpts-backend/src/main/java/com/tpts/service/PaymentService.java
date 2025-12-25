package com.tpts.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Refund;
import com.tpts.dto.request.CreatePaymentRequest;
import com.tpts.dto.request.RefundRequest;
import com.tpts.dto.request.VerifyPaymentRequest;
import com.tpts.dto.response.PaymentDTO;
import com.tpts.dto.response.RazorpayOrderDTO;
import com.tpts.entity.*;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.*;
import com.tpts.util.QRCodeGenerator;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Service for Payment operations with Razorpay integration
 * ENHANCED with UPI QR Code Generation
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final ParcelRepository parcelRepository;
    private final CustomerRepository customerRepository;
    private final CompanyAdminRepository companyRepository;
    private final WalletService walletService;
    private final NotificationService notificationService;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Value("${razorpay.webhook.secret}")
    private String webhookSecret;

    private RazorpayClient razorpayClient;

    // UPI Configuration
    private static final String MERCHANT_UPI_ID = "jaisakthisumi@okaxis";
    private static final String MERCHANT_NAME = "TPTS";

    @PostConstruct
    public void init() {
        try {
            if (razorpayKeyId != null && !razorpayKeyId.startsWith("rzp_test_xxx")) {
                razorpayClient = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
                log.info("Razorpay client initialized successfully");
            } else {
                log.warn("Razorpay keys not configured - running in SIMULATION mode");
            }
        } catch (RazorpayException e) {
            log.error("Failed to initialize Razorpay client: {}", e.getMessage());
        }
    }

    // ==========================================
    // Initiate Payment (ENHANCED with QR Code)
    // ==========================================

    @Transactional
    public RazorpayOrderDTO initiatePayment(CreatePaymentRequest request, User currentUser) {
        Parcel parcel = parcelRepository.findById(request.getParcelId())
                .orElseThrow(() -> new ResourceNotFoundException("Parcel", "id", request.getParcelId()));

        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        if (!parcel.getCustomer().getId().equals(customer.getId())) {
            throw new ForbiddenException("You can only pay for your own parcels");
        }

        if (paymentRepository.existsByParcelIdAndStatus(parcel.getId(), PaymentStatus.SUCCESS)) {
            throw new BadRequestException("This parcel has already been paid for");
        }

        if (parcel.getStatus() != ParcelStatus.PENDING && parcel.getStatus() != ParcelStatus.CONFIRMED) {
            throw new BadRequestException("Cannot initiate payment for parcel in status: " + parcel.getStatus());
        }

        if (request.getPaymentMethod() == PaymentMethod.COD) {
            return handleCodPayment(parcel, customer, request);
        }

        // finalPrice already includes GST (calculated in ParcelService)
        BigDecimal baseAmount = parcel.getFinalPrice() != null ? parcel.getFinalPrice() : parcel.getBasePrice();
        BigDecimal discountAmount = parcel.getDiscountAmount() != null ? parcel.getDiscountAmount() : BigDecimal.ZERO;
        // Don't add GST again - finalPrice already includes it
        BigDecimal taxAmount = BigDecimal.ZERO; // GST already in finalPrice
        BigDecimal convenienceFee = calculateConvenienceFee(request.getPaymentMethod());
        BigDecimal totalAmount = baseAmount.add(convenienceFee); // No extra tax

        Payment payment = Payment.builder()
                .parcel(parcel)
                .customer(customer)
                .company(parcel.getCompany())
                .baseAmount(baseAmount)
                .discountAmount(discountAmount)
                .taxAmount(taxAmount)
                .convenienceFee(convenienceFee)
                .totalAmount(totalAmount)
                .currency("INR")
                .status(PaymentStatus.PENDING)
                .paymentMethod(request.getPaymentMethod())
                .paymentDescription(request.getDescription() != null ? request.getDescription()
                        : "Payment for parcel " + parcel.getTrackingNumber())
                .build();

        String razorpayOrderId = createRazorpayOrder(payment);
        payment.setRazorpayOrderId(razorpayOrderId);
        payment = paymentRepository.save(payment);

        log.info("Payment initiated: ID={}, Razorpay Order={}, Amount={}",
                payment.getId(), razorpayOrderId, totalAmount);

        // Build DTO
        RazorpayOrderDTO razorpayOrderDTO = RazorpayOrderDTO.builder()
                .paymentId(payment.getId())
                .razorpayOrderId(razorpayOrderId)
                .razorpayKeyId(razorpayKeyId)
                .amountInPaise(totalAmount.multiply(BigDecimal.valueOf(100)).longValue())
                .amount(totalAmount)
                .currency("INR")
                .customerName(customer.getFullName())
                .customerEmail(currentUser.getEmail())
                .customerPhone(currentUser.getPhone())
                .description(payment.getPaymentDescription())
                .trackingNumber(parcel.getTrackingNumber())
                .isCod(false)
                .build();

        // ✅ Generate UPI QR code and add to DTO
        generateUpiQrCode(payment, razorpayOrderDTO);

        return razorpayOrderDTO;
    }

    /**
     * Generate UPI QR code for payment
     * ENHANCED: Adds QR code to response DTO
     */
    private void generateUpiQrCode(Payment payment, RazorpayOrderDTO orderDTO) {
        try {
            // Build UPI payment string
            String upiString = QRCodeGenerator.buildUpiPaymentString(
                    MERCHANT_UPI_ID,
                    MERCHANT_NAME,
                    payment.getTotalAmount().toString(),
                    payment.getParcel().getTrackingNumber(),
                    "Payment for " + payment.getParcel().getTrackingNumber());

            // Generate QR code
            String qrCodeBase64 = QRCodeGenerator.generateQRCodeBase64(upiString);

            // Add to response DTO
            orderDTO.setQrCodeBase64(qrCodeBase64);
            orderDTO.setUpiPaymentString(upiString);

            log.info("✅ QR code generated for payment: {}", payment.getId());

        } catch (Exception e) {
            log.error("Failed to generate QR code for payment {}: {}",
                    payment.getId(), e.getMessage());
            // Don't fail the payment if QR generation fails
        }
    }

    private RazorpayOrderDTO handleCodPayment(Parcel parcel, Customer customer, CreatePaymentRequest request) {
        BigDecimal baseAmount = parcel.getFinalPrice() != null ? parcel.getFinalPrice() : parcel.getBasePrice();
        BigDecimal codFee = BigDecimal.valueOf(30);

        Payment payment = Payment.builder()
                .parcel(parcel)
                .customer(customer)
                .company(parcel.getCompany())
                .baseAmount(baseAmount)
                .discountAmount(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .convenienceFee(codFee)
                .totalAmount(baseAmount.add(codFee))
                .currency("INR")
                .status(PaymentStatus.PENDING)
                .paymentMethod(PaymentMethod.COD)
                .paymentDescription("COD payment for " + parcel.getTrackingNumber())
                .build();

        payment = paymentRepository.save(payment);

        parcel.setStatus(ParcelStatus.CONFIRMED);
        parcel.setPaymentStatus(PaymentStatus.PENDING);
        parcelRepository.save(parcel);

        log.info("COD payment registered: ID={}, Amount={}", payment.getId(), payment.getTotalAmount());

        return RazorpayOrderDTO.builder()
                .paymentId(payment.getId())
                .amount(payment.getTotalAmount())
                .currency("INR")
                .customerName(customer.getFullName())
                .trackingNumber(parcel.getTrackingNumber())
                .isCod(true)
                .build();
    }

    // ==========================================
    // Verify Payment
    // ==========================================

    @Transactional
    public PaymentDTO verifyPayment(VerifyPaymentRequest request) {
        Payment payment = paymentRepository.findByRazorpayOrderId(request.getRazorpayOrderId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Payment not found for order: " + request.getRazorpayOrderId()));

        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            throw new BadRequestException("Payment already verified");
        }

        boolean isValid = verifyRazorpaySignature(
                request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(),
                request.getRazorpaySignature());

        if (!isValid) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason("Signature verification failed");
            paymentRepository.save(payment);
            throw new BadRequestException("Payment verification failed - Invalid signature");
        }

        payment.setRazorpayPaymentId(request.getRazorpayPaymentId());
        payment.setRazorpaySignature(request.getRazorpaySignature());
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAmount(payment.getTotalAmount());
        payment.setPaidAt(LocalDateTime.now());
        payment.setCompletedAt(LocalDateTime.now());
        payment = paymentRepository.save(payment);

        Parcel parcel = payment.getParcel();
        parcel.setStatus(ParcelStatus.CONFIRMED);
        parcel.setPaymentStatus(PaymentStatus.SUCCESS);
        parcelRepository.save(parcel);

        CompanyAdmin company = payment.getCompany();
        company.setTotalDeliveries(company.getTotalDeliveries() + 1);
        companyRepository.save(company);

        try {
            walletService.processDeliveryEarnings(parcel);
            log.info("Earnings processed for parcel {}", parcel.getTrackingNumber());
        } catch (Exception e) {
            log.error("Failed to process earnings split: {}", e.getMessage());
        }

        try {
            User customerUser = payment.getCustomer().getUser();
            User companyUser = payment.getCompany().getUser();
            String formattedAmount = formatAmount(payment.getTotalAmount());

            // Payment success notifications
            notificationService.sendPaymentSuccessToCustomer(
                    customerUser,
                    payment.getParcel().getTrackingNumber(),
                    formattedAmount);

            notificationService.sendPaymentReceivedToCompany(
                    companyUser,
                    payment.getParcel().getTrackingNumber(),
                    formattedAmount);

            // Order confirmation notifications (with tracking number)
            notificationService.sendOrderConfirmation(
                    customerUser,
                    parcel.getTrackingNumber(),
                    parcel.getDeliveryAddress() + ", " + parcel.getDeliveryCity());

            notificationService.sendNewShipmentToCompany(
                    companyUser,
                    parcel.getTrackingNumber(),
                    parcel.getPickupCity(),
                    parcel.getDeliveryCity());

        } catch (Exception e) {
            log.error("Failed to send payment notification: {}", e.getMessage());
        }

        log.info("Payment verified: ID={}, Razorpay Payment={}", payment.getId(), request.getRazorpayPaymentId());

        return mapToDTO(payment);
    }

    @Transactional
    public PaymentDTO markPaymentFailed(String razorpayOrderId, String errorCode, String errorDescription) {
        Payment payment = paymentRepository.findByRazorpayOrderId(razorpayOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));

        payment.setStatus(PaymentStatus.FAILED);
        payment.setErrorCode(errorCode);
        payment.setErrorDescription(errorDescription);
        payment.setFailureReason(errorDescription);
        payment = paymentRepository.save(payment);

        Parcel parcel = payment.getParcel();
        parcel.setPaymentStatus(PaymentStatus.FAILED);
        parcelRepository.save(parcel);

        log.warn("Payment failed: ID={}, Error={}", payment.getId(), errorCode);

        return mapToDTO(payment);
    }

    // ==========================================
    // Refund
    // ==========================================

    @Transactional
    public PaymentDTO initiateRefund(Long paymentId, RefundRequest request, User currentUser) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment", "id", paymentId));

        if (!payment.getCompany().getUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You can only refund your company's payments");
        }

        if (!payment.canBeRefunded()) {
            throw new BadRequestException("This payment cannot be refunded");
        }

        if (request.getAmount().compareTo(payment.getRemainingRefundableAmount()) > 0) {
            throw new BadRequestException("Refund amount exceeds remaining refundable amount: " +
                    payment.getRemainingRefundableAmount());
        }

        String refundId = processRazorpayRefund(payment, request.getAmount());

        BigDecimal totalRefunded = payment.getRefundAmount() != null
                ? payment.getRefundAmount().add(request.getAmount())
                : request.getAmount();

        payment.setRefundId(refundId);
        payment.setRefundAmount(totalRefunded);
        payment.setRefundReason(request.getReason());
        payment.setRefundedAt(LocalDateTime.now());
        payment.setRefundStatus(RefundStatus.INITIATED);

        if (totalRefunded.compareTo(payment.getTotalAmount()) >= 0) {
            payment.setStatus(PaymentStatus.REFUNDED);
            payment.setRefundStatus(RefundStatus.PROCESSED);
        } else {
            payment.setStatus(PaymentStatus.PARTIALLY_REFUNDED);
        }

        payment = paymentRepository.save(payment);

        try {
            User customerUser = payment.getCustomer().getUser();
            notificationService.sendRefundInitiated(
                    customerUser,
                    request.getAmount().toString(),
                    payment.getParcel().getTrackingNumber(),
                    request.getReason());
        } catch (Exception e) {
            log.error("Failed to send refund notification: {}", e.getMessage());
        }

        log.info("Refund processed: Payment={}, Amount={}, Refund ID={}",
                paymentId, request.getAmount(), refundId);

        return mapToDTO(payment);
    }

    // ==========================================
    // Query Methods
    // ==========================================

    public PaymentDTO getPaymentById(Long paymentId, User currentUser) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment", "id", paymentId));

        Customer customer = customerRepository.findByUser(currentUser).orElse(null);
        if (customer != null && payment.getCustomer().getId().equals(customer.getId())) {
            return mapToDTO(payment);
        }

        if (payment.getCompany().getUser().getId().equals(currentUser.getId())) {
            return mapToDTO(payment);
        }

        throw new ForbiddenException("Access denied");
    }

    public PaymentDTO getPaymentByParcelId(Long parcelId, User currentUser) {
        Payment payment = paymentRepository.findByParcelId(parcelId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found for parcel: " + parcelId));

        return mapToDTO(payment);
    }

    public List<PaymentDTO> getCustomerPayments(User currentUser) {
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        List<Payment> payments = paymentRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId());

        return payments.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public List<PaymentDTO> getCompanyPayments(User currentUser) {
        CompanyAdmin company = companyRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));

        List<Payment> payments = paymentRepository.findByCompanyIdOrderByCreatedAtDesc(company.getId());

        return payments.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public RevenueStatsDTO getCompanyRevenueStats(Long companyId) {
        BigDecimal totalRevenue = paymentRepository.getTotalRevenueByCompany(companyId);
        BigDecimal todayRevenue = paymentRepository.getTodayRevenueByCompany(companyId);
        BigDecimal monthlyRevenue = paymentRepository.getMonthlyRevenueByCompany(companyId);
        BigDecimal totalRefunds = paymentRepository.getTotalRefundsByCompany(companyId);
        long successfulPayments = paymentRepository.countByCompanyIdAndStatus(companyId, PaymentStatus.SUCCESS);

        return RevenueStatsDTO.builder()
                .totalRevenue(totalRevenue)
                .todayRevenue(todayRevenue)
                .monthlyRevenue(monthlyRevenue)
                .totalRefunds(totalRefunds)
                .successfulPayments(successfulPayments)
                .build();
    }

    // ==========================================
    // Webhook Handler Methods
    // ==========================================

    @Transactional
    public void updatePaymentStatus(String razorpayOrderId, String status, String paymentId, Double amount) {
        Payment payment = paymentRepository.findByRazorpayOrderId(razorpayOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found for order: " + razorpayOrderId));

        if ("CAPTURED".equals(status) && payment.getStatus() != PaymentStatus.SUCCESS) {
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setRazorpayPaymentId(paymentId);
            payment.setPaidAmount(BigDecimal.valueOf(amount));
            payment.setCompletedAt(LocalDateTime.now());
            paymentRepository.save(payment);

            Parcel parcel = payment.getParcel();
            parcel.setStatus(ParcelStatus.CONFIRMED);
            parcel.setPaymentStatus(PaymentStatus.SUCCESS);
            parcel.setConfirmedAt(LocalDateTime.now());
            parcelRepository.save(parcel);

            try {
                walletService.processDeliveryEarnings(parcel);
            } catch (Exception e) {
                log.error("Failed to process earnings: {}", e.getMessage());
            }

            try {
                notificationService.sendPaymentSuccessToCustomer(
                        payment.getCustomer().getUser(),
                        parcel.getTrackingNumber(),
                        formatAmount(payment.getTotalAmount()));
            } catch (Exception e) {
                log.error("Failed to send notification: {}", e.getMessage());
            }

            log.info("✅ Payment captured for order {} via webhook", razorpayOrderId);
        }
    }

    @Transactional
    public void handlePaymentFailure(String razorpayOrderId, String errorDescription) {
        Payment payment = paymentRepository.findByRazorpayOrderId(razorpayOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found for order: " + razorpayOrderId));

        if (payment.getStatus() != PaymentStatus.FAILED) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason(errorDescription);
            paymentRepository.save(payment);

            Parcel parcel = payment.getParcel();
            parcel.setPaymentStatus(PaymentStatus.FAILED);
            parcelRepository.save(parcel);

            try {
                notificationService.sendPaymentFailed(
                        payment.getCustomer().getUser(),
                        parcel.getTrackingNumber(),
                        errorDescription);
            } catch (Exception e) {
                log.error("Failed to send failure notification: {}", e.getMessage());
            }

            log.warn("⚠️ Payment failed for order {} via webhook: {}", razorpayOrderId, errorDescription);
        }
    }

    @Transactional
    public void initiateRefund(String razorpayPaymentId, String razorpayRefundId, Double amount) {
        Payment payment = paymentRepository.findByRazorpayPaymentId(razorpayPaymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found: " + razorpayPaymentId));

        payment.setRazorpayRefundId(razorpayRefundId);
        payment.setRefundedAmount(BigDecimal.valueOf(amount));
        payment.setStatus(PaymentStatus.REFUND_INITIATED);
        paymentRepository.save(payment);

        log.info("Refund initiated: {} for payment {}", razorpayRefundId, razorpayPaymentId);
    }

    @Transactional
    public void completeRefund(String razorpayRefundId, String status) {
        Payment payment = paymentRepository.findByRazorpayRefundId(razorpayRefundId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found for refund: " + razorpayRefundId));

        if ("processed".equalsIgnoreCase(status)) {
            boolean isPartialRefund = payment.getRefundedAmount().compareTo(payment.getTotalAmount()) < 0;
            payment.setStatus(isPartialRefund ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED);
            payment.setRefundedAt(LocalDateTime.now());
            paymentRepository.save(payment);

            try {
                notificationService.sendRefundProcessed(
                        payment.getCustomer().getUser(),
                        payment.getRefundedAmount().toString(),
                        payment.getParcel().getTrackingNumber());
            } catch (Exception e) {
                log.error("Failed to send refund notification: {}", e.getMessage());
            }

            log.info("✅ Refund completed: {} with status {}", razorpayRefundId, status);
        }
    }

    // ==========================================
    // Razorpay Integration Methods
    // ==========================================

    private String createRazorpayOrder(Payment payment) {
        if (razorpayClient == null) {
            String simulatedOrderId = "order_sim_" + System.currentTimeMillis();
            log.info("SIMULATION: Created Razorpay order {}", simulatedOrderId);
            return simulatedOrderId;
        }

        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", payment.getTotalAmount().multiply(BigDecimal.valueOf(100)).intValue());
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "rcpt_" + payment.getParcel().getTrackingNumber());
            orderRequest.put("notes", new JSONObject()
                    .put("parcel_id", payment.getParcel().getId())
                    .put("tracking_number", payment.getParcel().getTrackingNumber()));

            Order order = razorpayClient.orders.create(orderRequest);
            return order.get("id");
        } catch (RazorpayException e) {
            log.error("Failed to create Razorpay order: {}", e.getMessage());
            throw new BadRequestException("Failed to create payment order: " + e.getMessage());
        }
    }

    private boolean verifyRazorpaySignature(String orderId, String paymentId, String signature) {
        if (razorpayClient == null) {
            log.info("SIMULATION: Signature verification bypassed");
            return true;
        }

        try {
            String payload = orderId + "|" + paymentId;
            String generatedSignature = hmacSha256(payload, razorpayKeySecret);
            return generatedSignature.equals(signature);
        } catch (Exception e) {
            log.error("Signature verification failed: {}", e.getMessage());
            return false;
        }
    }

    private String processRazorpayRefund(Payment payment, BigDecimal amount) {
        if (razorpayClient == null) {
            String simulatedRefundId = "rfnd_sim_" + System.currentTimeMillis();
            log.info("SIMULATION: Created refund {}", simulatedRefundId);
            return simulatedRefundId;
        }

        try {
            JSONObject refundRequest = new JSONObject();
            refundRequest.put("amount", amount.multiply(BigDecimal.valueOf(100)).intValue());
            refundRequest.put("speed", "normal");
            refundRequest.put("notes", new JSONObject()
                    .put("reason", payment.getRefundReason()));

            Refund refund = razorpayClient.payments.refund(payment.getRazorpayPaymentId(), refundRequest);
            return refund.get("id");
        } catch (RazorpayException e) {
            log.error("Failed to process refund: {}", e.getMessage());
            throw new BadRequestException("Failed to process refund: " + e.getMessage());
        }
    }

    private String hmacSha256(String data, String secret) throws Exception {
        Mac sha256Hmac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(), "HmacSHA256");
        sha256Hmac.init(secretKey);
        byte[] hash = sha256Hmac.doFinal(data.getBytes());
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1)
                hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private BigDecimal calculateTax(BigDecimal baseAmount) {
        return baseAmount.multiply(BigDecimal.valueOf(0.18)).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private BigDecimal calculateConvenienceFee(PaymentMethod method) {
        return switch (method) {
            case UPI -> BigDecimal.ZERO;
            case CARD -> BigDecimal.valueOf(10);
            case NETBANKING -> BigDecimal.valueOf(15);
            case WALLET -> BigDecimal.valueOf(5);
            case COD -> BigDecimal.valueOf(30);
        };
    }

    private String formatAmount(BigDecimal amount) {
        NumberFormat formatter = NumberFormat
                .getCurrencyInstance(new Locale.Builder().setLanguage("en").setRegion("IN").build());
        return formatter.format(amount);
    }

    private PaymentDTO mapToDTO(Payment payment) {
        return PaymentDTO.builder()
                .id(payment.getId())
                .parcelId(payment.getParcel().getId())
                .trackingNumber(payment.getParcel().getTrackingNumber())
                .customerId(payment.getCustomer().getId())
                .customerName(payment.getCustomer().getFullName())
                .companyId(payment.getCompany().getId())
                .companyName(payment.getCompany().getCompanyName())
                .baseAmount(payment.getBaseAmount())
                .discountAmount(payment.getDiscountAmount())
                .taxAmount(payment.getTaxAmount())
                .convenienceFee(payment.getConvenienceFee())
                .totalAmount(payment.getTotalAmount())
                .currency(payment.getCurrency())
                .totalAmountFormatted(formatAmount(payment.getTotalAmount()))
                .status(payment.getStatus())
                .paymentMethod(payment.getPaymentMethod())
                .razorpayOrderId(payment.getRazorpayOrderId())
                .razorpayPaymentId(payment.getRazorpayPaymentId())
                .refundId(payment.getRefundId())
                .refundAmount(payment.getRefundAmount())
                .refundReason(payment.getRefundReason())
                .refundedAt(payment.getRefundedAt())
                .transactionId(payment.getTransactionId())
                .paymentDescription(payment.getPaymentDescription())
                .errorCode(payment.getErrorCode())
                .errorDescription(payment.getErrorDescription())
                .initiatedAt(payment.getInitiatedAt())
                .completedAt(payment.getCompletedAt())
                .createdAt(payment.getCreatedAt())
                .isSuccessful(payment.isSuccessful())
                .isPending(payment.isPending())
                .canBeRefunded(payment.canBeRefunded())
                .remainingRefundableAmount(payment.getRemainingRefundableAmount())
                .build();
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class RevenueStatsDTO {
        private BigDecimal totalRevenue;
        private BigDecimal todayRevenue;
        private BigDecimal monthlyRevenue;
        private BigDecimal totalRefunds;
        private Long successfulPayments;
    }
}
