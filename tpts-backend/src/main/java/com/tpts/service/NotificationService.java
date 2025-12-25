package com.tpts.service;

import com.tpts.dto.request.SendBulkNotificationRequest;
import com.tpts.dto.request.SendNotificationRequest;
import com.tpts.dto.response.NotificationDTO;
import com.tpts.entity.*;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.*;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for Notification operations
 * Supports SMS (Twilio), Email, Push, In-App notifications
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

        private final NotificationRepository notificationRepository;
        private final UserRepository userRepository;
        private final JavaMailSender mailSender;
        private final CustomerRepository customerRepository;
        private final CompanyAdminRepository companyAdminRepository;
        private final DeliveryAgentRepository deliveryAgentRepository;
        private final SuperAdminRepository superAdminRepository;
        private final EmailService emailService;
        private final SmsService smsService;

        // Twilio configuration
        @Value("${twilio.account.sid:}")
        private String twilioAccountSid;

        @Value("${twilio.auth.token:}")
        private String twilioAuthToken;

        @Value("${twilio.phone.number:}")
        private String twilioPhoneNumber;

        // Email configuration
        @Value("${spring.mail.username:noreply@tpts.com}")
        private String fromEmail;

        @Value("${app.frontend.url}")
        private String frontendUrl;

        @Value("${app.name:TPTS}")
        private String appName;

        // Feature flags
        @Value("${notification.sms.enabled:false}")
        private boolean smsEnabled;

        @Value("${notification.email.enabled:true}")
        private boolean emailEnabled;

        private boolean twilioInitialized = false;

        @PostConstruct
        public void init() {
                // Initialize Twilio if credentials are provided
                if (twilioAccountSid != null && !twilioAccountSid.isBlank() &&
                                twilioAuthToken != null && !twilioAuthToken.isBlank()) {
                        try {
                                Twilio.init(twilioAccountSid, twilioAuthToken);
                                twilioInitialized = true;
                                log.info("Twilio initialized successfully");
                        } catch (Exception e) {
                                log.warn("Failed to initialize Twilio: {}", e.getMessage());
                        }
                } else {
                        log.info("Twilio credentials not configured - SMS will be simulated");
                }
        }

        // ==========================================
        // Send Single Notification
        // ==========================================

        /**
         * Send a notification to a user
         */
        @Transactional
        public NotificationDTO sendNotification(SendNotificationRequest request) {
                User user = userRepository.findById(request.getUserId())
                                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getUserId()));

                Notification notification = Notification.builder()
                                .user(user)
                                .recipientEmail(user.getEmail())
                                .recipientPhone(user.getPhone())
                                .title(request.getTitle())
                                .message(request.getMessage())
                                .shortMessage(request.getShortMessage() != null ? request.getShortMessage()
                                                : truncateForSms(request.getMessage()))
                                .type(request.getType())
                                .channel(request.getChannel())
                                .referenceId(request.getReferenceId())
                                .referenceType(request.getReferenceType())
                                .priority(request.getPriority())
                                .metadata(request.getMetadata())
                                .build();

                notification = notificationRepository.save(notification);

                // Send based on channel
                deliverNotification(notification);

                return mapToDTO(notification);
        }

        /**
         * Send group deadline reminder with exact minutes
         */
        public void sendGroupDeadlineReminderWithMinutes(User user, String groupCode, int membersNeeded,
                        long minutesRemaining, int currentMembers, int targetMembers) {

                // Format time remaining
                String timeLeftText;
                if (minutesRemaining >= 60) {
                        long hours = minutesRemaining / 60;
                        long mins = minutesRemaining % 60;
                        timeLeftText = hours + " hour(s)" + (mins > 0 ? " " + mins + " min(s)" : "");
                } else {
                        timeLeftText = minutesRemaining + " minute(s)";
                }

                String message = String.format(
                                "⏰ Group Buy Deadline Approaching!\n\n" +
                                                "Group: %s\n" +
                                                "Members: %d/%d\n" +
                                                "Need: %d more members\n" +
                                                "Time Left: %s\n\n" +
                                                "Share with friends to fill the group!",
                                groupCode, currentMembers, targetMembers, membersNeeded, timeLeftText);

                SendNotificationRequest request = SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("Group Deadline: " + timeLeftText + " left")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(3)
                                .build();

                sendNotification(request);
        }

        /**
         * Deliver notification through appropriate channel
         */
        @Async
        public void deliverNotification(Notification notification) {
                try {
                        switch (notification.getChannel()) {
                                case SMS -> sendSms(notification);
                                case EMAIL -> sendEmail(notification);
                                case IN_APP -> markInAppAsSent(notification);
                                case PUSH -> sendPushNotification(notification);
                                default -> log.warn("Unknown notification channel: {}", notification.getChannel());
                        }
                } catch (Exception e) {
                        log.error("Failed to deliver notification {}: {}", notification.getId(), e.getMessage());
                        notification.markAsFailed(e.getMessage());
                        notificationRepository.save(notification);
                }
        }

        // ==========================================
        // SMS via Twilio
        // ==========================================

        private void sendSms(Notification notification) {
                if (!smsEnabled) {
                        log.info("SMS disabled - simulating send to {}: {}",
                                        notification.getRecipientPhone(), notification.getShortMessage());
                        notification.markAsSent("SMS_SIMULATED_" + System.currentTimeMillis());
                        notification.setProvider("SIMULATED");
                        notificationRepository.save(notification);
                        return;
                }

                if (!twilioInitialized) {
                        log.warn("Twilio not initialized - cannot send SMS");
                        notification.markAsFailed("Twilio not configured");
                        notificationRepository.save(notification);
                        return;
                }

                try {
                        String toPhone = formatPhoneNumber(notification.getRecipientPhone());

                        Message message = Message.creator(
                                        new PhoneNumber(toPhone),
                                        new PhoneNumber(twilioPhoneNumber),
                                        notification.getShortMessage()).create();

                        notification.markAsSent(message.getSid());
                        notification.setProvider("TWILIO");
                        notification.setProviderStatus(message.getStatus().toString());
                        notificationRepository.save(notification);

                        log.info("SMS sent successfully: {} to {}", message.getSid(), toPhone);
                } catch (Exception e) {
                        log.error("Failed to send SMS: {}", e.getMessage());
                        notification.markAsFailed(e.getMessage());
                        notificationRepository.save(notification);
                }
        }

        private String formatPhoneNumber(String phone) {
                // Add India country code if not present
                if (phone != null && !phone.startsWith("+")) {
                        return "+91" + phone;
                }
                return phone;
        }

        private String truncateForSms(String message) {
                if (message == null)
                        return "";
                return message.length() > 160 ? message.substring(0, 157) + "..." : message;
        }

        // ==========================================
        // Email
        // ==========================================

        private void sendEmail(Notification notification) {
                if (!emailEnabled) {
                        log.info("Email disabled - simulating send to {}: {}",
                                        notification.getRecipientEmail(), notification.getTitle());
                        notification.markAsSent("EMAIL_SIMULATED_" + System.currentTimeMillis());
                        notification.setProvider("SIMULATED");
                        notificationRepository.save(notification);
                        return;
                }

                try {
                        MimeMessage mimeMessage = mailSender.createMimeMessage();
                        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

                        helper.setFrom(fromEmail);
                        helper.setTo(notification.getRecipientEmail());
                        helper.setSubject(appName + " - " + notification.getTitle());
                        helper.setText(buildEmailBody(notification), true);

                        mailSender.send(mimeMessage);

                        notification.markAsSent("EMAIL_" + System.currentTimeMillis());
                        notification.setProvider("SMTP");
                        notificationRepository.save(notification);

                        log.info("Email sent successfully to {}", notification.getRecipientEmail());
                } catch (MessagingException e) {
                        log.error("Failed to send email: {}", e.getMessage());
                        notification.markAsFailed(e.getMessage());
                        notificationRepository.save(notification);
                }
        }

        private String buildEmailBody(Notification notification) {
                return """
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <style>
                                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                        .header { background: #F97316; color: white; padding: 20px; text-align: center; }
                                        .content { padding: 20px; background: #f9f9f9; }
                                        .footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }
                                    </style>
                                </head>
                                <body>
                                    <div class="container">
                                        <div class="header">
                                            <h1>%s</h1>
                                        </div>
                                        <div class="content">
                                            <h2>%s</h2>
                                            <p>%s</p>
                                        </div>
                                        <div class="footer">
                                            <p>This is an automated message from %s. Please do not reply.</p>
                                        </div>
                                    </div>
                                </body>
                                </html>
                                """
                                .formatted(appName, notification.getTitle(),
                                                notification.getMessage().replace("\n", "<br>"), appName);
        }

        // ==========================================
        // Push Notification (Placeholder)
        // ==========================================

        private void sendPushNotification(Notification notification) {
                // TODO: Implement FCM/APNS push notifications
                log.info("Push notification simulated for user {}: {}",
                                notification.getUser().getId(), notification.getTitle());
                notification.markAsSent("PUSH_SIMULATED_" + System.currentTimeMillis());
                notification.setProvider("SIMULATED");
                notificationRepository.save(notification);
        }

        // ==========================================
        // In-App Notification
        // ==========================================

        private void markInAppAsSent(Notification notification) {
                notification.markAsSent("IN_APP_" + System.currentTimeMillis());
                notification.setProvider("IN_APP");
                notificationRepository.save(notification);
        }

        // ==========================================
        // Bulk Notifications
        // ==========================================

        /**
         * Send bulk notifications
         */
        @Transactional
        public List<NotificationDTO> sendBulkNotification(SendBulkNotificationRequest request) {
                List<User> users;

                if (request.getUserIds() != null && !request.getUserIds().isEmpty()) {
                        users = userRepository.findAllById(request.getUserIds());
                } else if (request.getUserType() != null) {
                        users = userRepository.findByUserType(request.getUserType());
                } else {
                        throw new BadRequestException("Either userIds or userType must be provided");
                }

                List<NotificationDTO> results = new ArrayList<>();

                for (User user : users) {
                        try {
                                SendNotificationRequest singleRequest = SendNotificationRequest.builder()
                                                .userId(user.getId())
                                                .title(request.getTitle())
                                                .message(request.getMessage())
                                                .shortMessage(request.getShortMessage())
                                                .type(request.getType())
                                                .channel(request.getChannel())
                                                .priority(request.getPriority())
                                                .build();

                                results.add(sendNotification(singleRequest));
                        } catch (Exception e) {
                                log.error("Failed to send notification to user {}: {}", user.getId(), e.getMessage());
                        }
                }

                return results;
        }

        // ==========================================
        // Predefined Notification Templates
        // ==========================================

        /**
         * Send OTP notification
         */
        public void sendOtpNotification(User user, String otp) {
                String message = String.format("Your TPTS verification code is: %s. Valid for 10 minutes.", otp);

                // SMS
                sendNotification(SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("Verification Code")
                                .message(message)
                                .shortMessage(message)
                                .type(NotificationType.OTP)
                                .channel(NotificationChannel.SMS)
                                .priority(1)
                                .build());

                // EMAIL
                sendNotification(SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("Verification Code")
                                .message(message)
                                .shortMessage(message)
                                .type(NotificationType.OTP)
                                .channel(NotificationChannel.EMAIL)
                                .priority(1)
                                .build());
        }

        /**
         * Send order confirmation
         */
        public void sendOrderConfirmation(User user, String trackingNumber, String deliveryAddress) {
                String message = String.format(
                                "Your order has been confirmed!\n\nTracking Number: %s\nDelivery Address: %s\n\nTrack your shipment at tpts.com/track",
                                trackingNumber, deliveryAddress);

                // Send both SMS and Email
                sendNotification(SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("Order Confirmed")
                                .message(message)
                                .type(NotificationType.ORDER_CONFIRMED)
                                .channel(NotificationChannel.SMS)
                                .build());

                sendNotification(SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("Order Confirmed - " + trackingNumber)
                                .message(message)
                                .type(NotificationType.ORDER_CONFIRMED)
                                .channel(NotificationChannel.EMAIL)
                                .build());

                sendNotification(SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("Order Confirmed")
                                .message(message)
                                .type(NotificationType.ORDER_CONFIRMED)
                                .channel(NotificationChannel.IN_APP)
                                .build());
        }

        /**
         * Send delivery status update
         */
        public void sendDeliveryUpdate(User user, String trackingNumber, ParcelStatus status) {
                String statusMessage = switch (status) {
                        case ASSIGNED -> "A delivery agent has been assigned to your package.";
                        case PICKED_UP -> "Your package has been picked up and is on its way!";
                        case IN_TRANSIT -> "Your package is in transit.";
                        case OUT_FOR_DELIVERY -> "Your package is out for delivery and will arrive soon!";
                        case DELIVERED -> "Your package has been delivered. Thank you for using TPTS!";
                        default -> "Your package status has been updated.";
                };

                String message = String.format("Tracking: %s\n%s", trackingNumber, statusMessage);

                NotificationType type = switch (status) {
                        case ASSIGNED -> NotificationType.AGENT_ASSIGNED;
                        case PICKED_UP -> NotificationType.PACKAGE_PICKED_UP;
                        case OUT_FOR_DELIVERY -> NotificationType.OUT_FOR_DELIVERY;
                        case DELIVERED -> NotificationType.DELIVERED;
                        default -> NotificationType.SYSTEM_ALERT;
                };

                sendNotification(SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("Delivery Update - " + status)
                                .message(message)
                                .type(type)
                                .channel(NotificationChannel.SMS)
                                .build());

                sendNotification(SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("Delivery Update")
                                .message(message)
                                .type(type)
                                .channel(NotificationChannel.IN_APP)
                                .build());
        }

        /**
         * Send agent assignment notification
         */
        public void sendAgentAssignment(User agentUser, String trackingNumber, String pickupAddress) {
                String message = String.format(
                                "New delivery assigned!\n\nTracking: %s\nPickup: %s\n\nOpen app to accept or reject.",
                                trackingNumber, pickupAddress);

                sendNotification(SendNotificationRequest.builder()
                                .userId(agentUser.getId())
                                .title("New Assignment")
                                .message(message)
                                .type(NotificationType.NEW_ASSIGNMENT)
                                .channel(NotificationChannel.SMS)
                                .priority(2)
                                .build());

                sendNotification(SendNotificationRequest.builder()
                                .userId(agentUser.getId())
                                .title("New Assignment")
                                .message(message)
                                .type(NotificationType.NEW_ASSIGNMENT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        /**
         * Send company approval notification
         */
        public void sendCompanyApproval(User companyUser, boolean approved, String reason) {
                NotificationType type = approved ? NotificationType.COMPANY_APPROVED
                                : NotificationType.COMPANY_REJECTED;
                String title = approved ? "Company Approved!" : "Company Application Update";
                String message = approved
                                ? "Congratulations! Your company has been approved. You can now start accepting orders."
                                : "Your company application was not approved. Reason: " + reason;

                sendNotification(SendNotificationRequest.builder()
                                .userId(companyUser.getId())
                                .title(title)
                                .message(message)
                                .type(type)
                                .channel(NotificationChannel.EMAIL)
                                .build());

                sendNotification(SendNotificationRequest.builder()
                                .userId(companyUser.getId())
                                .title(title)
                                .message(message)
                                .type(type)
                                .channel(NotificationChannel.IN_APP)
                                .build());
        }

        // ==========================================
        // NEW: Additional Notification Templates
        // ==========================================

        /**
         * Notify company when customer creates shipment
         */
        public void sendNewShipmentToCompany(User companyUser, String trackingNumber,
                        String pickupCity, String deliveryCity) {
                String message = String.format(
                                "📦 New shipment request received!\n\n" +
                                                "Tracking: %s\n" +
                                                "Route: %s → %s\n\n" +
                                                "Please assign an agent.",
                                trackingNumber, pickupCity, deliveryCity);

                // In-App
                sendNotification(SendNotificationRequest.builder()
                                .userId(companyUser.getId())
                                .title("New Shipment Request")
                                .message(message)
                                .type(NotificationType.ORDER_PLACED)
                                .channel(NotificationChannel.IN_APP)
                                .priority(3)
                                .build());

                // Email (optional)
                sendNotification(SendNotificationRequest.builder()
                                .userId(companyUser.getId())
                                .title("New Shipment - " + trackingNumber)
                                .message(message)
                                .type(NotificationType.ORDER_PLACED)
                                .channel(NotificationChannel.EMAIL)
                                .priority(4)
                                .build());
        }

        /**
         * Notify customer when company confirms shipment
         */
        public void sendShipmentConfirmedToCustomer(User customerUser, String trackingNumber,
                        String estimatedDelivery) {
                String message = String.format(
                                "✅ Your shipment has been confirmed!\n\n" +
                                                "Tracking: %s\n" +
                                                "Estimated Delivery: %s\n\n" +
                                                "An agent will be assigned soon.",
                                trackingNumber, estimatedDelivery);

                // SMS
                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Shipment Confirmed")
                                .message(message)
                                .shortMessage("Your shipment " + trackingNumber + " is confirmed!")
                                .type(NotificationType.ORDER_CONFIRMED)
                                .channel(NotificationChannel.SMS)
                                .priority(2)
                                .build());

                // In-App
                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Shipment Confirmed")
                                .message(message)
                                .type(NotificationType.ORDER_CONFIRMED)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        /**
         * Notify customer about payment success
         */
        public void sendPaymentSuccessToCustomer(User customerUser, String trackingNumber,
                        String amount) {
                String message = String.format(
                                "💳 Payment Successful!\n\n" +
                                                "Amount: %s\n" +
                                                "Tracking: %s\n\n" +
                                                "Your shipment will be processed shortly.",
                                amount, trackingNumber);

                // SMS
                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Payment Successful")
                                .message(message)
                                .shortMessage("Payment of " + amount + " received for " + trackingNumber)
                                .type(NotificationType.PAYMENT_SUCCESS)
                                .channel(NotificationChannel.SMS)
                                .priority(2)
                                .build());

                // In-App
                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Payment Successful")
                                .message(message)
                                .type(NotificationType.PAYMENT_SUCCESS)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        /**
         * Notify company about payment received
         */
        public void sendPaymentReceivedToCompany(User companyUser, String trackingNumber,
                        String amount) {
                String message = String.format(
                                "💰 Payment Received!\n\n" +
                                                "Tracking: %s\n" +
                                                "Amount: %s\n\n" +
                                                "Please proceed with delivery.",
                                trackingNumber, amount);

                sendNotification(SendNotificationRequest.builder()
                                .userId(companyUser.getId())
                                .title("Payment Received")
                                .message(message)
                                .type(NotificationType.PAYMENT_SUCCESS)
                                .channel(NotificationChannel.IN_APP)
                                .priority(3)
                                .build());
        }

        /**
         * Notify customer when agent is assigned
         */
        public void sendAgentAssignedToCustomer(User customerUser, String trackingNumber,
                        String agentName, String agentPhone) {
                String message = String.format(
                                "🚚 Agent Assigned!\n\n" +
                                                "Tracking: %s\n" +
                                                "Agent: %s\n" +
                                                "Contact: %s\n\n" +
                                                "Your package will be picked up soon.",
                                trackingNumber, agentName, agentPhone);

                // SMS
                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Agent Assigned")
                                .message(message)
                                .shortMessage("Agent " + agentName + " assigned to " + trackingNumber)
                                .type(NotificationType.AGENT_ASSIGNED)
                                .channel(NotificationChannel.SMS)
                                .priority(2)
                                .build());

                // In-App
                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Agent Assigned")
                                .message(message)
                                .type(NotificationType.AGENT_ASSIGNED)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        /**
         * Notify agent about new assignment
         */
        public void sendNewAssignmentToAgent(User agentUser, String trackingNumber,
                        String pickupAddress, String deliveryAddress) {
                String message = String.format(
                                "📍 New Delivery Assignment!\n\n" +
                                                "Tracking: %s\n" +
                                                "Pickup: %s\n" +
                                                "Delivery: %s\n\n" +
                                                "Open app to accept.",
                                trackingNumber, pickupAddress, deliveryAddress);

                // SMS (high priority)
                sendNotification(SendNotificationRequest.builder()
                                .userId(agentUser.getId())
                                .title("New Assignment")
                                .message(message)
                                .shortMessage("New delivery: " + trackingNumber)
                                .type(NotificationType.NEW_ASSIGNMENT)
                                .channel(NotificationChannel.SMS)
                                .priority(1)
                                .build());

                // In-App
                sendNotification(SendNotificationRequest.builder()
                                .userId(agentUser.getId())
                                .title("New Assignment")
                                .message(message)
                                .type(NotificationType.NEW_ASSIGNMENT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(1)
                                .build());
        }

        /**
         * Notify customer when parcel is picked up
         */
        public void sendParcelPickedUpToCustomer(User customerUser, String trackingNumber,
                        String agentName) {
                String message = String.format(
                                "📦 Package Picked Up!\n\n" +
                                                "Tracking: %s\n" +
                                                "Agent: %s\n\n" +
                                                "Your package is on the way!",
                                trackingNumber, agentName);

                // SMS
                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Package Picked Up")
                                .message(message)
                                .shortMessage("Your package " + trackingNumber + " is picked up!")
                                .type(NotificationType.PACKAGE_PICKED_UP)
                                .channel(NotificationChannel.SMS)
                                .priority(2)
                                .build());

                // In-App
                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Package Picked Up")
                                .message(message)
                                .type(NotificationType.PACKAGE_PICKED_UP)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        /**
         * Notify customer when parcel is out for delivery
         */
        public void sendOutForDeliveryToCustomer(User customerUser, String trackingNumber,
                        String agentName) {
                String message = String.format(
                                "🚚 Out for Delivery!\n\n" +
                                                "Tracking: %s\n" +
                                                "Agent: %s\n\n" +
                                                "Your package will arrive soon!",
                                trackingNumber, agentName);

                // SMS (high priority - near delivery)
                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Out for Delivery")
                                .message(message)
                                .shortMessage("Your package " + trackingNumber + " is out for delivery!")
                                .type(NotificationType.OUT_FOR_DELIVERY)
                                .channel(NotificationChannel.SMS)
                                .priority(1)
                                .build());

                // In-App
                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Out for Delivery")
                                .message(message)
                                .type(NotificationType.OUT_FOR_DELIVERY)
                                .channel(NotificationChannel.IN_APP)
                                .priority(1)
                                .build());
        }

        /**
         * Notify customer when parcel is delivered
         */
        public void sendParcelDeliveredToCustomer(User customerUser, String trackingNumber) {
                String message = String.format(
                                "✅ Package Delivered!\n\n" +
                                                "Tracking: %s\n\n" +
                                                "Thank you for using TPTS!\n" +
                                                "Please rate your experience.",
                                trackingNumber);

                // SMS
                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Package Delivered")
                                .message(message)
                                .shortMessage("Your package " + trackingNumber + " is delivered!")
                                .type(NotificationType.DELIVERED)
                                .channel(NotificationChannel.SMS)
                                .priority(2)
                                .build());

                // In-App
                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Package Delivered")
                                .message(message)
                                .type(NotificationType.DELIVERED)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        /**
         * Notify company when parcel is delivered
         */
        public void sendParcelDeliveredToCompany(User companyUser, String trackingNumber,
                        String customerName) {
                String message = String.format(
                                "✅ Delivery Completed!\n\n" +
                                                "Tracking: %s\n" +
                                                "Customer: %s\n\n" +
                                                "Payment will be processed.",
                                trackingNumber, customerName);

                sendNotification(SendNotificationRequest.builder()
                                .userId(companyUser.getId())
                                .title("Delivery Completed")
                                .message(message)
                                .type(NotificationType.DELIVERED)
                                .channel(NotificationChannel.IN_APP)
                                .priority(3)
                                .build());
        }

        /**
         * Notify company about new job application
         */
        public void sendNewJobApplicationToCompany(User companyUser, String applicantName,
                        String vehicleType) {
                String message = String.format(
                                "👤 New Job Application!\n\n" +
                                                "Applicant: %s\n" +
                                                "Vehicle: %s\n\n" +
                                                "Please review the application.",
                                applicantName, vehicleType);

                sendNotification(SendNotificationRequest.builder()
                                .userId(companyUser.getId())
                                .title("New Job Application")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(4)
                                .build());

                // Email too
                sendNotification(SendNotificationRequest.builder()
                                .userId(companyUser.getId())
                                .title("New Job Application - " + applicantName)
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.EMAIL)
                                .priority(5)
                                .build());
        }

        /**
         * Notify applicant about interview scheduled
         */
        public void sendInterviewScheduled(User applicantUser, String companyName,
                        LocalDateTime interviewDate) {
                String message = String.format(
                                "📅 Interview Scheduled!\n\n" +
                                                "Company: %s\n" +
                                                "Date: %s\n\n" +
                                                "Good luck!",
                                companyName, interviewDate);

                sendNotification(SendNotificationRequest.builder()
                                .userId(applicantUser.getId())
                                .title("Interview Scheduled")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.EMAIL)
                                .priority(2)
                                .build());
        }

        /**
         * Notify about group buy available
         */
        public void sendGroupBuyAvailable(User customerUser, String groupCode,
                        String route, String discount) {
                String message = String.format(
                                "🎉 Group Buy Available!\n\n" +
                                                "Route: %s\n" +
                                                "Discount: %s\n" +
                                                "Code: %s\n\n" +
                                                "Join now to save money!",
                                route, discount, groupCode);

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Group Buy - Save " + discount)
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(4)
                                .build());
        }

        // ==========================================
        // GROUP BUY NOTIFICATIONS
        // ==========================================

        /**
         * Notify customer when group buy is created (matching their route)
         */
        public void sendGroupBuyCreated(User customerUser, String groupCode,
                        String sourceCity, String targetCity,
                        String discountPercentage, LocalDateTime deadline) {
                String message = String.format(
                                "🎉 New Group Buy Available!\n\n" +
                                                "Route: %s → %s\n" +
                                                "Discount: %s%%\n" +
                                                "Code: %s\n" +
                                                "Deadline: %s\n\n" +
                                                "Join now to save!",
                                sourceCity, targetCity, discountPercentage, groupCode,
                                deadline.toLocalDate());

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Group Buy - Save " + discountPercentage + "%")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(4)
                                .referenceType("GROUP")
                                .build());
        }

        /**
         * Notify customer when they successfully join a group
         */
        public void sendGroupJoinSuccess(User customerUser, String groupCode,
                        String trackingNumber, String discountAmount) {
                String message = String.format(
                                "✅ Joined Group Buy!\n\n" +
                                                "Group Code: %s\n" +
                                                "Your Tracking: %s\n" +
                                                "Discount Applied: ₹%s\n\n" +
                                                "Wait for group to fill up.",
                                groupCode, trackingNumber, discountAmount);

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Group Buy Joined")
                                .message(message)
                                .type(NotificationType.ORDER_CONFIRMED)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());

                // SMS confirmation
                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Group Buy Joined")
                                .message(message)
                                .shortMessage("You joined group " + groupCode + "! Tracking: " + trackingNumber)
                                .type(NotificationType.ORDER_CONFIRMED)
                                .channel(NotificationChannel.SMS)
                                .priority(3)
                                .build());
        }

        /**
         * Notify all group members when group is full
         */
        public void sendGroupFullNotification(User customerUser, String groupCode,
                        String trackingNumber) {
                String message = String.format(
                                "🎊 Group Buy is Full!\n\n" +
                                                "Group Code: %s\n" +
                                                "Your Tracking: %s\n\n" +
                                                "Pickup will start soon!",
                                groupCode, trackingNumber);

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Group Buy Full - Starting Pickup")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.SMS)
                                .priority(2)
                                .build());

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Group Buy Full")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        /**
         * Notify group members when pickup agent is assigned
         */
        public void sendGroupPickupAgentAssigned(User customerUser, String groupCode,
                        String agentName, String agentPhone) {
                String message = String.format(
                                "🚚 Pickup Agent Assigned!\n\n" +
                                                "Group: %s\n" +
                                                "Agent: %s\n" +
                                                "Contact: %s\n\n" +
                                                "Your package will be picked up soon.",
                                groupCode, agentName, agentPhone);

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Group Pickup Agent Assigned")
                                .message(message)
                                .type(NotificationType.AGENT_ASSIGNED)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        /**
         * Notify group members when delivery agent is assigned
         */
        public void sendGroupDeliveryAgentAssigned(User customerUser, String groupCode,
                        String agentName, String agentPhone) {
                String message = String.format(
                                "🚚 Delivery Agent Assigned!\n\n" +
                                                "Group: %s\n" +
                                                "Agent: %s\n" +
                                                "Contact: %s\n\n" +
                                                "Final delivery will start soon.",
                                groupCode, agentName, agentPhone);

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Group Delivery Agent Assigned")
                                .message(message)
                                .type(NotificationType.AGENT_ASSIGNED)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        /**
         * Notify when group deadline is approaching
         */
        public void sendGroupDeadlineReminder(User customerUser, String groupCode,
                        int hoursRemaining, int currentMembers,
                        int targetMembers) {
                String message = String.format(
                                "⏰ Group Buy Deadline Approaching!\n\n" +
                                                "Group: %s\n" +
                                                "Members: %d/%d\n" +
                                                "Time Left: %d hours\n\n" +
                                                "Share with friends to fill the group!",
                                groupCode, currentMembers, targetMembers, hoursRemaining);

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Group Deadline in " + hoursRemaining + "h")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(3)
                                .build());
        }

        /**
         * Notify when group buy is cancelled (deadline passed, not enough members)
         */
        public void sendGroupCancelled(User customerUser, String groupCode,
                        String trackingNumber, String refundAmount) {
                String message = String.format(
                                "❌ Group Buy Cancelled\n\n" +
                                                "Group: %s\n" +
                                                "Tracking: %s\n" +
                                                "Refund: ₹%s\n\n" +
                                                "Not enough members joined. Please create a new shipment.",
                                groupCode, trackingNumber, refundAmount);

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Group Buy Cancelled - Refund Initiated")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.SMS)
                                .priority(2)
                                .build());

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Group Buy Cancelled")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        // ==========================================
        // RATING REMINDERS
        // ==========================================

        /**
         * Remind customer to rate after delivery
         */
        public void sendRatingReminder(User customerUser, String trackingNumber,
                        Long parcelId) {
                String message = String.format(
                                "⭐ Rate Your Experience\n\n" +
                                                "Tracking: %s\n\n" +
                                                "How was your delivery? Please share your feedback to help us improve!",
                                trackingNumber);

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Rate Your Delivery")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .referenceId(parcelId)
                                .referenceType("PARCEL")
                                .priority(4)
                                .build());
        }

        /**
         * Thank customer after rating
         */
        public void sendRatingThankYou(User customerUser, int rating) {
                String message = rating >= 4
                                ? "🎉 Thank you for your " + rating
                                                + "-star rating!\n\nWe're glad you had a great experience. See you again!"
                                : "📝 Thank you for your feedback!\n\nWe're working hard to improve our service.";

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Thank You for Rating!")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(5)
                                .build());
        }

        /**
         * Notify company when they receive a new rating
         */
        public void sendNewRatingToCompany(User companyUser, int rating,
                        String customerName, String trackingNumber) {
                String emoji = rating >= 4 ? "⭐" : rating >= 3 ? "👍" : "📝";
                String message = String.format(
                                "%s New Rating Received\n\n" +
                                                "Rating: %d/5\n" +
                                                "Customer: %s\n" +
                                                "Tracking: %s\n\n" +
                                                "View full review in dashboard.",
                                emoji, rating, customerName, trackingNumber);

                sendNotification(SendNotificationRequest.builder()
                                .userId(companyUser.getId())
                                .title("New " + rating + "⭐ Rating")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(4)
                                .build());
        }

        /**
         * Notify agent when they receive a rating
         */
        public void sendNewRatingToAgent(User agentUser, int rating,
                        String trackingNumber) {
                String emoji = rating >= 4 ? "🌟" : rating >= 3 ? "👍" : "📝";
                String message = String.format(
                                "%s You Received a Rating!\n\n" +
                                                "Rating: %d/5\n" +
                                                "Tracking: %s\n\n" +
                                                "%s",
                                emoji, rating, trackingNumber,
                                rating >= 4 ? "Great job! Keep it up!" : "Thanks for your service!");

                sendNotification(SendNotificationRequest.builder()
                                .userId(agentUser.getId())
                                .title("New " + rating + "⭐ Rating")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(4)
                                .build());
        }

        /**
         * Notify company when customer responds to rating
         */
        public void sendCompanyResponseReceived(User customerUser, String companyName) {
                String message = String.format(
                                "💬 %s Responded to Your Review\n\n" +
                                                "Check your rating to see their response.",
                                companyName);

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Company Responded to Review")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(4)
                                .build());
        }

        // ==========================================
        // WALLET & EARNINGS NOTIFICATIONS
        // ==========================================

        /**
         * Notify agent when earnings are credited
         */
        public void sendEarningsCredited(User agentUser, String amount,
                        String trackingNumber) {
                String message = String.format(
                                "💰 Earnings Credited!\n\n" +
                                                "Amount: ₹%s\n" +
                                                "Tracking: %s\n\n" +
                                                "Check your wallet for details.",
                                amount, trackingNumber);

                sendNotification(SendNotificationRequest.builder()
                                .userId(agentUser.getId())
                                .title("₹" + amount + " Credited")
                                .message(message)
                                .type(NotificationType.PAYMENT_SUCCESS)
                                .channel(NotificationChannel.SMS)
                                .priority(2)
                                .build());

                sendNotification(SendNotificationRequest.builder()
                                .userId(agentUser.getId())
                                .title("Earnings Credited")
                                .message(message)
                                .type(NotificationType.PAYMENT_SUCCESS)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        /**
         * Notify company when earnings are credited
         */
        public void sendCompanyEarningsCredited(User companyUser, String amount,
                        String trackingNumber) {
                String message = String.format(
                                "💰 Payment Received!\n\n" +
                                                "Amount: ₹%s\n" +
                                                "Tracking: %s\n\n" +
                                                "Added to your wallet.",
                                amount, trackingNumber);

                sendNotification(SendNotificationRequest.builder()
                                .userId(companyUser.getId())
                                .title("₹" + amount + " Received")
                                .message(message)
                                .type(NotificationType.PAYMENT_SUCCESS)
                                .channel(NotificationChannel.IN_APP)
                                .priority(3)
                                .build());
        }

        /**
         * Notify when payout is initiated
         */
        public void sendPayoutInitiated(User user, String amount, String method) {
                String message = String.format(
                                "💸 Payout Initiated\n\n" +
                                                "Amount: ₹%s\n" +
                                                "Method: %s\n\n" +
                                                "Processing... Funds will arrive in 1-3 business days.",
                                amount, method);

                sendNotification(SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("Payout Processing")
                                .message(message)
                                .type(NotificationType.PAYMENT_SUCCESS)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        /**
         * Notify when payout is completed
         */
        public void sendPayoutCompleted(User user, String amount, String transactionId) {
                String message = String.format(
                                "✅ Payout Successful!\n\n" +
                                                "Amount: ₹%s\n" +
                                                "Transaction ID: %s\n\n" +
                                                "Check your bank account.",
                                amount, transactionId);

                sendNotification(SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("₹" + amount + " Payout Completed")
                                .message(message)
                                .type(NotificationType.PAYMENT_SUCCESS)
                                .channel(NotificationChannel.SMS)
                                .priority(1)
                                .build());

                sendNotification(SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("Payout Completed")
                                .message(message)
                                .type(NotificationType.PAYMENT_SUCCESS)
                                .channel(NotificationChannel.IN_APP)
                                .priority(1)
                                .build());
        }

        /**
         * Notify when payout fails
         */
        public void sendPayoutFailed(User user, String amount, String reason) {
                String message = String.format(
                                "❌ Payout Failed\n\n" +
                                                "Amount: ₹%s\n" +
                                                "Reason: %s\n\n" +
                                                "Please contact support or update your bank details.",
                                amount, reason);

                sendNotification(SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("Payout Failed")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.EMAIL)
                                .priority(1)
                                .build());

                sendNotification(SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("Payout Failed")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(1)
                                .build());
        }

        /**
         * Notify when refund is initiated
         */
        public void sendRefundInitiated(User customerUser, String amount,
                        String trackingNumber, String reason) {
                String message = String.format(
                                "💳 Refund Initiated\n\n" +
                                                "Amount: ₹%s\n" +
                                                "Tracking: %s\n" +
                                                "Reason: %s\n\n" +
                                                "Refund will be processed in 5-7 business days.",
                                amount, trackingNumber, reason);

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Refund Processing")
                                .message(message)
                                .type(NotificationType.PAYMENT_SUCCESS)
                                .channel(NotificationChannel.SMS)
                                .priority(2)
                                .build());

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Refund Initiated")
                                .message(message)
                                .type(NotificationType.PAYMENT_SUCCESS)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        // ==========================================
        // JOB APPLICATION NOTIFICATIONS
        // ==========================================

        /**
         * Notify applicant when application status changes
         */
        public void sendApplicationStatusUpdate(User applicantUser, String status,
                        String companyName) {
                String message = switch (status) {
                        case "UNDER_REVIEW" -> String.format(
                                        "👀 Application Under Review\n\n" +
                                                        "Company: %s\n\n" +
                                                        "Your application is being reviewed. We'll notify you of updates.",
                                        companyName);
                        case "INTERVIEW_SCHEDULED" -> String.format(
                                        "📅 Interview Scheduled!\n\n" +
                                                        "Company: %s\n\n" +
                                                        "Check your email for interview details. Good luck!",
                                        companyName);
                        case "ACCEPTED" -> String.format(
                                        "🎉 Congratulations!\n\n" +
                                                        "Company: %s\n\n" +
                                                        "Your application has been accepted! Welcome to the team!",
                                        companyName);
                        case "REJECTED" -> String.format(
                                        "📝 Application Update\n\n" +
                                                        "Company: %s\n\n" +
                                                        "Unfortunately, we couldn't proceed with your application at this time. Keep trying!",
                                        companyName);
                        default -> "Application status updated";
                };

                sendNotification(SendNotificationRequest.builder()
                                .userId(applicantUser.getId())
                                .title("Application Status: " + status)
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.EMAIL)
                                .priority(2)
                                .build());

                sendNotification(SendNotificationRequest.builder()
                                .userId(applicantUser.getId())
                                .title("Application Update")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        /**
         * Notify agent when hired
         */
        public void sendAgentHired(User agentUser, String companyName) {
                String message = String.format(
                                "🎉 Welcome to the Team!\n\n" +
                                                "Company: %s\n\n" +
                                                "You've been hired as a delivery agent. Login to start accepting deliveries!",
                                companyName);

                sendNotification(SendNotificationRequest.builder()
                                .userId(agentUser.getId())
                                .title("You're Hired!")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.EMAIL)
                                .priority(1)
                                .build());

                sendNotification(SendNotificationRequest.builder()
                                .userId(agentUser.getId())
                                .title("Welcome to " + companyName)
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.SMS)
                                .priority(1)
                                .build());
        }

        /**
         * Send application submitted confirmation directly via email/SMS (for users
         * without account)
         * Uses EmailService and SmsService directly since applicant may not have User
         * account
         */
        public void sendApplicationSubmittedDirect(String applicantEmail, String applicantPhone,
                        String applicantName, String companyName) {
                try {
                        // Send email confirmation
                        emailService.sendJobApplicationStatus(
                                        applicantEmail,
                                        applicantName,
                                        companyName,
                                        "SUBMITTED",
                                        "Your application has been submitted successfully! You'll receive updates via email.",
                                        null);

                        // Send short SMS confirmation
                        smsService.sendJobApplicationStatus(
                                        applicantPhone,
                                        applicantName,
                                        companyName,
                                        "Submitted",
                                        "Track at TPTS Jobs portal.");

                        log.info("Sent application confirmation to: {} / {}", applicantEmail, applicantPhone);
                } catch (Exception e) {
                        log.warn("Failed to send application confirmation: {}", e.getMessage());
                }
        }

        /**
         * Send application rejection directly (for applicants without User account)
         */
        public void sendApplicationRejectedDirect(String applicantEmail, String applicantPhone,
                        String applicantName, String companyName, String reason) {
                try {
                        // Send email with reason
                        emailService.sendJobApplicationStatus(
                                        applicantEmail,
                                        applicantName,
                                        companyName,
                                        "REJECTED",
                                        reason != null ? reason
                                                        : "We couldn't proceed with your application at this time.",
                                        null);

                        // Send short SMS
                        smsService.sendJobApplicationStatus(
                                        applicantPhone,
                                        applicantName,
                                        companyName,
                                        "Not selected",
                                        "Good luck!");

                        log.info("Sent rejection notification to: {}", applicantEmail);
                } catch (Exception e) {
                        log.warn("Failed to send rejection notification: {}", e.getMessage());
                }
        }

        // ==========================================
        // DELIVERY REQUEST NOTIFICATIONS (Agent Assignment)
        // ==========================================

        /**
         * Notify agent when delivery request is accepted
         */
        public void sendDeliveryRequestAccepted(User companyUser, String agentName,
                        String trackingNumber) {
                String message = String.format(
                                "✅ Delivery Request Accepted\n\n" +
                                                "Agent: %s\n" +
                                                "Tracking: %s\n\n" +
                                                "Agent will start pickup soon.",
                                agentName, trackingNumber);

                sendNotification(SendNotificationRequest.builder()
                                .userId(companyUser.getId())
                                .title("Request Accepted by Agent")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(3)
                                .build());
        }

        /**
         * Notify company when agent rejects delivery
         */
        public void sendDeliveryRequestRejected(User companyUser, String agentName,
                        String trackingNumber, String reason) {
                String message = String.format(
                                "❌ Delivery Request Rejected\n\n" +
                                                "Agent: %s\n" +
                                                "Tracking: %s\n" +
                                                "Reason: %s\n\n" +
                                                "Please reassign to another agent.",
                                agentName, trackingNumber, reason);

                sendNotification(SendNotificationRequest.builder()
                                .userId(companyUser.getId())
                                .title("Request Rejected by Agent")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        // ==========================================
        // SYSTEM NOTIFICATIONS
        // ==========================================

        /**
         * Notify super admin about new company registration
         */
        public void sendNewCompanyRegistration(User superAdminUser, String companyName,
                        String city) {
                String message = String.format(
                                "🏢 New Company Registration\n\n" +
                                                "Company: %s\n" +
                                                "City: %s\n\n" +
                                                "Awaiting approval.",
                                companyName, city);

                sendNotification(SendNotificationRequest.builder()
                                .userId(superAdminUser.getId())
                                .title("New Company - " + companyName)
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(3)
                                .build());
        }

        /**
         * Send welcome notification to new customer
         */
        public void sendWelcomeCustomer(User customerUser, String name) {
                String message = String.format(
                                "🎉 Welcome to TPTS, %s!\n\n" +
                                                "Thank you for joining us. Start shipping your packages with the best rates and fastest delivery!",
                                name);

                sendNotification(SendNotificationRequest.builder()
                                .userId(customerUser.getId())
                                .title("Welcome to TPTS!")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.EMAIL)
                                .priority(4)
                                .build());
        }

        /**
         * Send promotional notification
         */
        public void sendPromoNotification(User user, String promoTitle,
                        String promoMessage, String promoCode) {
                String message = String.format(
                                "🎁 %s\n\n" +
                                                "%s\n\n" +
                                                "Use code: %s",
                                promoTitle, promoMessage, promoCode);

                sendNotification(SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title(promoTitle)
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(5)
                                .build());
        }

        // ==========================================
        // Query Methods
        // ==========================================

        /**
         * Get user's notifications
         */
        public List<NotificationDTO> getUserNotifications(User currentUser) {
                return notificationRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId())
                                .stream().map(this::mapToDTO).collect(Collectors.toList());
        }

        /**
         * Get user's in-app notifications
         */
        public List<NotificationDTO> getInAppNotifications(User currentUser) {
                return notificationRepository.findInAppNotifications(currentUser.getId())
                                .stream().map(this::mapToDTO).collect(Collectors.toList());
        }

        /**
         * Get unread notifications
         */
        public List<NotificationDTO> getUnreadNotifications(User currentUser) {
                return notificationRepository.findUnreadInAppNotifications(currentUser.getId())
                                .stream().map(this::mapToDTO).collect(Collectors.toList());
        }

        /**
         * Send password change confirmation email
         */
        public void sendPasswordChangeConfirmation(User user) {
                log.info("Sending password change confirmation to: {}", user.getEmail());

                String displayName = getUserDisplayName(user);

                try {
                        emailService.sendPasswordChangeConfirmation(
                                        user.getEmail(),
                                        displayName);
                        log.info("Password change confirmation sent to: {}", user.getEmail());
                } catch (Exception e) {
                        log.error("Failed to send password change confirmation: {}", e.getMessage());
                        // Don't throw - this is just a notification
                }
        }

        /**
         * Get unread count
         */
        public long getUnreadCount(User currentUser) {
                return notificationRepository.countUnreadByUserId(currentUser.getId());
        }

        /**
         * Mark notification as read
         */
        @Transactional
        public void markAsRead(Long notificationId, User currentUser) {
                notificationRepository.markAsRead(notificationId, currentUser.getId(), LocalDateTime.now());
        }

        /**
         * Mark all notifications as read
         */
        @Transactional
        public void markAllAsRead(User currentUser) {
                notificationRepository.markAllAsRead(currentUser.getId(), LocalDateTime.now());
        }

        // ==========================================
        // Helper Methods
        // ==========================================

        private NotificationDTO mapToDTO(Notification notification) {
                return NotificationDTO.builder()
                                .id(notification.getId())
                                .userId(notification.getUser().getId())
                                .title(notification.getTitle())
                                .message(notification.getMessage())
                                .type(notification.getType())
                                .channel(notification.getChannel())
                                .referenceId(notification.getReferenceId())
                                .referenceType(notification.getReferenceType())
                                .isRead(notification.getIsRead())
                                .readAt(notification.getReadAt())
                                .isSent(notification.getIsSent())
                                .sentAt(notification.getSentAt())
                                .createdAt(notification.getCreatedAt())
                                .timeAgo(calculateTimeAgo(notification.getCreatedAt()))
                                .icon(getIconForType(notification.getType()))
                                .actionUrl(buildActionUrl(notification))
                                .build();
        }

        private String calculateTimeAgo(LocalDateTime dateTime) {
                if (dateTime == null)
                        return "";

                Duration duration = Duration.between(dateTime, LocalDateTime.now());

                if (duration.toMinutes() < 1)
                        return "Just now";
                if (duration.toMinutes() < 60)
                        return duration.toMinutes() + "m ago";
                if (duration.toHours() < 24)
                        return duration.toHours() + "h ago";
                if (duration.toDays() < 7)
                        return duration.toDays() + "d ago";
                return dateTime.toLocalDate().toString();
        }

        private String getIconForType(NotificationType type) {
                return switch (type) {
                        case ORDER_PLACED, ORDER_CONFIRMED -> "package";
                        case DELIVERED -> "check-circle";
                        case PAYMENT_SUCCESS -> "credit-card";
                        case NEW_ASSIGNMENT -> "bell";
                        case OTP -> "key";
                        default -> "bell";
                };
        }

        /**
         * Send payment failed notification
         */
        public void sendPaymentFailed(User user, String trackingNumber, String reason) {
                String message = String.format(
                                "❌ Payment Failed\n\n" +
                                                "Tracking: %s\n" +
                                                "Reason: %s\n\n" +
                                                "Please try again or contact support.",
                                trackingNumber, reason);

                SendNotificationRequest request = SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("Payment Failed")
                                .message(message)
                                .type(NotificationType.PAYMENT_FAILED)
                                .channel(NotificationChannel.IN_APP)
                                .priority(3)
                                .build();

                sendNotification(request);
        }

        /**
         * Send refund processed notification
         */
        public void sendRefundProcessed(User user, String amount, String trackingNumber) {
                String message = String.format(
                                "✅ Refund Processed\n\n" +
                                                "Amount: ₹%s\n" +
                                                "Tracking: %s\n\n" +
                                                "Refund has been credited to your account.",
                                amount, trackingNumber);

                SendNotificationRequest request = SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("Refund Processed")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build();

                sendNotification(request);
        }

        private String buildActionUrl(Notification notification) {
                if (notification.getReferenceId() == null)
                        return null;

                return switch (notification.getReferenceType()) {
                        case "PARCEL" -> "/track/" + notification.getReferenceId();
                        case "GROUP" -> "/groups/" + notification.getReferenceId();
                        case "PAYMENT" -> "/payments/" + notification.getReferenceId();
                        default -> null;
                };
        }

        /**
         * Send group deadline reminder
         */
        public void sendGroupDeadlineReminder(User user, String groupCode, int membersNeeded,
                        int hoursRemaining, int currentMembers, int targetMembers) {
                String message = String.format(
                                "⏰ Group Buy Deadline Approaching!\n\n" +
                                                "Group: %s\n" +
                                                "Members: %d/%d\n" +
                                                "Need: %d more members\n" +
                                                "Time Left: %d hours\n\n" +
                                                "Share with friends to fill the group!",
                                groupCode, currentMembers, targetMembers, membersNeeded, hoursRemaining);

                SendNotificationRequest request = SendNotificationRequest.builder()
                                .userId(user.getId())
                                .title("Group Deadline in " + hoursRemaining + "h")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(3)
                                .build();

                sendNotification(request);
        }

        /**
         * Generic method to create notification
         */
        private void createNotification(User user, NotificationType type, String title, String message,
                        Long relatedEntityId, String relatedEntityType) {
                try {
                        Notification notification = Notification.builder()
                                        .user(user)
                                        .type(type) // ✅ Now passing NotificationType enum
                                        .title(title)
                                        .message(message)
                                        .referenceId(relatedEntityId)
                                        .referenceType(relatedEntityType)
                                        .isRead(false)
                                        .channel(NotificationChannel.IN_APP) // Add default channel
                                        .recipientEmail(user.getEmail())
                                        .recipientPhone(user.getPhone())
                                        .build();

                        notificationRepository.save(notification);
                        log.info("Notification created for user {}: {}", user.getId(), title);
                } catch (Exception e) {
                        log.error("Failed to create notification: {}", e.getMessage());
                }
        }

        /**
         * Send payment success notification
         */
        public void sendPaymentSuccessNotification(User user, String trackingNumber, BigDecimal amount) {
                try {
                        String message = String.format(
                                        "Payment of ₹%s successful! Your parcel %s has been confirmed.",
                                        amount, trackingNumber);

                        createNotification(
                                        user,
                                        NotificationType.PAYMENT_SUCCESS, // ✅ Change from "PAYMENT_SUCCESS" to
                                                                          // NotificationType.PAYMENT_SUCCESS
                                        "Payment Successful",
                                        message,
                                        null,
                                        null);

                        log.info("Payment success notification sent to user {}", user.getId());
                } catch (Exception e) {
                        log.error("Failed to send payment success notification: {}", e.getMessage());
                }
        }

        /**
         * Send password reset email
         */
        public void sendPasswordResetEmail(User user, String resetToken) {
                log.info("Sending password reset email to: {}", user.getEmail());

                // Get user's display name
                String displayName = getUserDisplayName(user);

                // Send email using EmailService
                emailService.sendPasswordResetEmail(
                                user.getEmail(),
                                displayName,
                                resetToken);

                log.info("Password reset email sent to: {}", user.getEmail());
        }

        /**
         * Helper method to get user's display name
         */
        private String getUserDisplayName(User user) {
                switch (user.getUserType()) {
                        case CUSTOMER:
                                return customerRepository.findByUser(user)
                                                .map(Customer::getFullName)
                                                .orElse("User");
                        case COMPANY_ADMIN:
                                return companyAdminRepository.findByUser(user)
                                                .map(CompanyAdmin::getContactPersonName)
                                                .orElse("User");
                        case DELIVERY_AGENT:
                                return deliveryAgentRepository.findByUser(user)
                                                .map(DeliveryAgent::getFullName)
                                                .orElse("Agent");
                        case SUPER_ADMIN:
                                return superAdminRepository.findByUser(user)
                                                .map(SuperAdmin::getFullName)
                                                .orElse("Admin");
                        default:
                                return "User";
                }
        }

        // ==========================================
        // AGENT ONBOARDING NOTIFICATIONS
        // ==========================================

        /**
         * Send welcome email with credentials to newly created agent
         */
        public void sendAgentWelcomeWithCredentials(User agentUser, String agentName,
                        String email, String tempPassword,
                        String companyName) {
                String message = String.format(
                                "🎉 Welcome to TPTS, %s!\\n\\n" +
                                                "You have been added as a Delivery Agent for %s.\\n\\n" +
                                                "📧 Your Login Credentials:\\n" +
                                                "Email: %s\\n" +
                                                "Password: %s\\n\\n" +
                                                "⚠️ Please change your password after first login.\\n\\n" +
                                                "Download the TPTS Agent App and start earning!",
                                agentName, companyName, email, tempPassword);

                // Email (primary for credentials)
                sendNotification(SendNotificationRequest.builder()
                                .userId(agentUser.getId())
                                .title("Welcome to TPTS - Your Login Credentials")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.EMAIL)
                                .priority(1)
                                .build());

                // SMS (short version)
                String smsMessage = String.format(
                                "Welcome to TPTS! Login: %s | Temp Password: %s - Change after login.",
                                email, tempPassword);

                sendNotification(SendNotificationRequest.builder()
                                .userId(agentUser.getId())
                                .title("TPTS Login Credentials")
                                .message(smsMessage)
                                .shortMessage(smsMessage)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.SMS)
                                .priority(1)
                                .build());

                log.info("Sent welcome credentials to agent {} at {}", agentName, email);
        }

        /**
         * Notify applicant about job application status change
         */
        public void sendApplicationStatusUpdate(User applicantUser, String applicantName,
                        String companyName, String status, String notes) {
                String emoji = switch (status) {
                        case "APPROVED" -> "✅";
                        case "REJECTED" -> "❌";
                        case "INTERVIEW_SCHEDULED" -> "📅";
                        case "HIRED" -> "🎉";
                        default -> "📝";
                };

                String message = String.format(
                                "%s Application Update\\n\\n" +
                                                "Company: %s\\n" +
                                                "Status: %s\\n" +
                                                (notes != null ? "Notes: %s\\n\\n" : "\\n") +
                                                "Check the app for details.",
                                emoji, companyName, status, notes != null ? notes : "");

                sendNotification(SendNotificationRequest.builder()
                                .userId(applicantUser.getId())
                                .title("Job Application: " + status)
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.EMAIL)
                                .priority(2)
                                .build());

                sendNotification(SendNotificationRequest.builder()
                                .userId(applicantUser.getId())
                                .title("Application Update")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }

        /**
         * Notify company about agent assignment rejection
         */
        public void sendAgentRejectedAssignment(User companyUser, String agentName,
                        String trackingNumber, String reason) {
                String message = String.format(
                                "⚠️ Assignment Rejected\\n\\n" +
                                                "Agent: %s\\n" +
                                                "Tracking: %s\\n" +
                                                "Reason: %s\\n\\n" +
                                                "Please reassign to another agent.",
                                agentName, trackingNumber, reason != null ? reason : "No reason provided");

                sendNotification(SendNotificationRequest.builder()
                                .userId(companyUser.getId())
                                .title("Assignment Rejected - Reassign Needed")
                                .message(message)
                                .type(NotificationType.SYSTEM_ALERT)
                                .channel(NotificationChannel.IN_APP)
                                .priority(2)
                                .build());
        }
}