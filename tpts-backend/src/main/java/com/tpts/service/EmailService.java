package com.tpts.service;

import com.tpts.dto.request.ContactFormRequest;
import com.tpts.dto.response.ParcelDTO;
import com.tpts.dto.response.PaymentDTO;
import com.tpts.exception.TptsExceptions;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Email Service with HTML Templates
 * Uses Spring Mail + Thymeleaf for templating
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.name:TPTS}")
    private String appName;

    @Value("${app.url:http://localhost:5173}")
    private String appUrl;

    /**
     * Send OTP Email
     */
    public void sendOtpEmail(String toEmail, String name, String otp, String purpose) {
        try {
            Context context = new Context();
            context.setVariable("name", name);
            context.setVariable("otp", otp);
            context.setVariable("purpose", purpose);
            context.setVariable("appName", appName);
            context.setVariable("validityMinutes", 60);

            String htmlContent = templateEngine.process("email/otp-email", context);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Your OTP for %s", appName, purpose),
                    htmlContent);

            log.info("OTP email sent to {} for {}", maskEmail(toEmail), purpose);

        } catch (Exception e) {
            log.error("Failed to send OTP email to {}", maskEmail(toEmail), e);
            throw new TptsExceptions.EmailSendFailedException("Failed to send OTP email");
        }
    }

    /**
     * Send Booking Confirmation Email
     */
    public void sendBookingConfirmation(String toEmail, ParcelDTO parcel,
            PaymentDTO payment, byte[] receiptPdf) {
        try {
            Context context = new Context();
            context.setVariable("customerName", parcel.getCustomerName());
            context.setVariable("trackingNumber", parcel.getTrackingNumber());
            context.setVariable("companyName", parcel.getCompanyName());
            context.setVariable("pickupCity", parcel.getPickupCity());
            context.setVariable("deliveryCity", parcel.getDeliveryCity());
            context.setVariable("amount", payment.getTotalAmount());
            context.setVariable("transactionId", payment.getTransactionId());
            context.setVariable("bookingDate", formatDateTime(parcel.getCreatedAt()));
            context.setVariable("estimatedDelivery", formatDateTime(parcel.getEstimatedDelivery()));
            context.setVariable("trackingUrl", appUrl + "/track/" + parcel.getTrackingNumber());
            context.setVariable("appName", appName);

            String htmlContent = templateEngine.process("email/booking-confirmation", context);

            // Send with PDF attachment
            sendHtmlEmailWithAttachment(
                    toEmail,
                    String.format("[%s] Booking Confirmed - %s", appName, parcel.getTrackingNumber()),
                    htmlContent,
                    receiptPdf,
                    "receipt_" + parcel.getTrackingNumber() + ".pdf");

            log.info("Booking confirmation sent to {} for {}", maskEmail(toEmail), parcel.getTrackingNumber());

        } catch (Exception e) {
            log.error("Failed to send booking confirmation", e);
            throw new TptsExceptions.EmailSendFailedException("Failed to send booking confirmation");
        }
    }

    /**
     * Send Parcel Status Update Email
     */
    public void sendStatusUpdate(String toEmail, String customerName, String trackingNumber,
            String status, String statusMessage, String nextAction) {
        try {
            Context context = new Context();
            context.setVariable("customerName", customerName);
            context.setVariable("trackingNumber", trackingNumber);
            context.setVariable("status", status);
            context.setVariable("statusMessage", statusMessage);
            context.setVariable("nextAction", nextAction);
            context.setVariable("updateTime", formatDateTime(LocalDateTime.now()));
            context.setVariable("trackingUrl", appUrl + "/track/" + trackingNumber);
            context.setVariable("appName", appName);

            String htmlContent = templateEngine.process("email/status-update", context);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Parcel Update - %s - %s", appName, trackingNumber, status),
                    htmlContent);

            log.info("Status update email sent to {} for {}", maskEmail(toEmail), trackingNumber);

        } catch (Exception e) {
            log.error("Failed to send status update email", e);
            // Don't throw exception - status update is secondary
        }
    }

    /**
     * Send Delivery Notification Email
     */
    public void sendDeliveryNotification(String toEmail, String receiverName,
            String trackingNumber, String agentName,
            String agentPhone, String deliveryOtp) {
        try {
            Context context = new Context();
            context.setVariable("receiverName", receiverName);
            context.setVariable("trackingNumber", trackingNumber);
            context.setVariable("agentName", agentName);
            context.setVariable("agentPhone", agentPhone);
            context.setVariable("deliveryOtp", deliveryOtp);
            context.setVariable("appName", appName);

            String htmlContent = templateEngine.process("email/delivery-notification", context);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Out for Delivery - %s", appName, trackingNumber),
                    htmlContent);

            log.info("Delivery notification sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send delivery notification", e);
        }
    }

    /**
     * Send Password Change Confirmation Email
     */
    public void sendPasswordChangeConfirmation(String toEmail, String name) {
        try {
            Context context = new Context();
            context.setVariable("name", name);
            context.setVariable("changeTime", formatDateTime(LocalDateTime.now()));
            context.setVariable("loginUrl", appUrl + "/login");
            context.setVariable("supportEmail", "support@tpts.in");
            context.setVariable("appName", appName);

            String htmlContent = templateEngine.process("email/password-changed", context);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Password Changed Successfully", appName),
                    htmlContent);

            log.info("Password change confirmation sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send password change confirmation", e);
            // Don't throw - this is optional
        }
    }

    /**
     * Send Contact Form Emails (Two-way)
     * 1. Notification to support team
     * 2. Confirmation to customer
     */
    public void sendContactFormEmails(ContactFormRequest request) {
        try {
            // ✅ Email 1: Send to support team (your email)
            sendContactFormToSupport(request);

            // ✅ Email 2: Send confirmation to customer
            sendContactFormConfirmation(request);

            log.info("Contact form emails sent successfully for {}", maskEmail(request.getEmail()));

        } catch (Exception e) {
            log.error("Failed to send contact form emails", e);
            throw new TptsExceptions.EmailSendFailedException("Failed to send contact form emails");
        }
    }

    /**
     * Send contact form details to support team
     */
    private void sendContactFormToSupport(ContactFormRequest request) throws MessagingException {
        Context context = new Context();
        context.setVariable("name", request.getName());
        context.setVariable("email", request.getEmail());
        context.setVariable("phone", request.getPhone() != null ? request.getPhone() : "Not provided");
        context.setVariable("subject", request.getSubject());
        context.setVariable("message", request.getMessage());
        context.setVariable("timestamp", formatDateTime(LocalDateTime.now()));
        context.setVariable("appName", appName);

        String htmlContent = templateEngine.process("email/contact-form-support", context);

        sendHtmlEmail(
                fromEmail, // alamalujai@gmail.com (your support email)
                String.format("[%s Contact Form] %s", appName, request.getSubject()),
                htmlContent);

        log.info("Contact form notification sent to support");
    }

    /**
     * Send confirmation email to customer
     */
    private void sendContactFormConfirmation(ContactFormRequest request) throws MessagingException {
        Context context = new Context();
        context.setVariable("name", request.getName());
        context.setVariable("subject", request.getSubject());
        context.setVariable("message", request.getMessage());
        context.setVariable("appName", appName);
        context.setVariable("supportEmail", fromEmail);

        String htmlContent = templateEngine.process("email/contact-form-confirmation", context);

        sendHtmlEmail(
                request.getEmail(), // Customer's email
                String.format("[%s] We received your message", appName),
                htmlContent);

        log.info("Contact form confirmation sent to {}", maskEmail(request.getEmail()));
    }

    /**
     * Send Welcome Email (WITHOUT OTP - sent separately)
     */
    public void sendCustomerWelcomeEmail(String toEmail, String name) {
        try {
            Context context = new Context();
            context.setVariable("name", name);
            context.setVariable("appName", appName);
            context.setVariable("appUrl", appUrl);
            context.setVariable("loginUrl", appUrl + "/login");

            String htmlContent = templateEngine.process("email/customer-welcome", context);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Welcome to the Platform! 🎉", appName),
                    htmlContent);

            log.info("Customer welcome email sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send customer welcome email", e);
            // Don't throw - registration should succeed even if email fails
        }
    }

    /**
     * Send Company Registration Under Review Email
     */
    public void sendCompanyUnderReviewEmail(String toEmail, String companyName, String contactPersonName, String otp) {
        try {
            Context context = new Context();
            context.setVariable("companyName", companyName);
            context.setVariable("contactPersonName", contactPersonName);
            context.setVariable("otp", otp);
            context.setVariable("validityMinutes", 10);
            context.setVariable("reviewTime", "24-48 hours");
            context.setVariable("supportEmail", "support@tpts.in");
            context.setVariable("appName", appName);

            String htmlContent = templateEngine.process("email/company-under-review", context);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Registration Received - Under Review", appName),
                    htmlContent);

            log.info("Company under review email sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send company under review email", e);
        }
    }

    /**
     * Send Company Approval Email
     * Sent when a company's registration is approved by Super Admin
     */
    public void sendCompanyApprovalEmail(String toEmail, String companyName, String contactPersonName) {
        try {
            String htmlContent = buildCompanyApprovalHtml(companyName, contactPersonName);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Congratulations! Your Company is Approved 🎉", appName),
                    htmlContent);

            log.info("Company approval email sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send company approval email", e);
        }
    }

    private String buildCompanyApprovalHtml(String companyName, String contactPersonName) {
        return String.format(
                """
                        <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                                    <h1 style="margin: 0;">🎉 Congratulations!</h1>
                                    <p style="margin: 10px 0 0;">Your Company Has Been Approved</p>
                                </div>

                                <h2 style="color: #333;">Welcome to %s, %s!</h2>

                                <p>Great news! Your company <strong>%s</strong> has been approved to operate on our platform.</p>

                                <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                                    <h3 style="margin-top: 0; color: #059669;">What's Next?</h3>
                                    <ul style="margin: 0; padding-left: 20px;">
                                        <li>Log in to your dashboard using your registered email</li>
                                        <li>Start posting jobs to hire delivery agents</li>
                                        <li>Set up your delivery pricing and service areas</li>
                                        <li>Begin accepting parcel bookings from customers</li>
                                    </ul>
                                </div>

                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="%s/login" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                        Go to Dashboard →
                                    </a>
                                </div>

                                <p>Your login credentials are the same ones you used during registration. If you've forgotten your password, you can reset it from the login page.</p>

                                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

                                <p style="color: #666; font-size: 14px;">
                                    Need help? Contact our support team at <a href="mailto:support@tpts.in">support@tpts.in</a>
                                </p>

                                <p style="color: #999; font-size: 12px; text-align: center;">
                                    © 2024 %s. All rights reserved.
                                </p>
                            </div>
                        </body>
                        </html>
                        """,
                appName, contactPersonName, companyName, appUrl, appName);
    }

    /**
     * Send Delivered Confirmation Email
     */
    public void sendDeliveredConfirmation(String toEmail, String customerName,
            String trackingNumber, LocalDateTime deliveredAt) {
        try {
            Context context = new Context();
            context.setVariable("customerName", customerName);
            context.setVariable("trackingNumber", trackingNumber);
            context.setVariable("deliveredAt", formatDateTime(deliveredAt));
            context.setVariable("ratingUrl", appUrl + "/rate/" + trackingNumber);
            context.setVariable("appName", appName);

            String htmlContent = templateEngine.process("email/delivered-confirmation", context);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Delivered Successfully - %s", appName, trackingNumber),
                    htmlContent);

            log.info("Delivered confirmation sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send delivered confirmation", e);
        }
    }

    /**
     * Send Password Reset Email
     */
    public void sendPasswordResetEmail(String toEmail, String name, String resetToken) {
        try {
            Context context = new Context();
            context.setVariable("name", name);
            context.setVariable("resetUrl", appUrl + "/reset-password?token=" + resetToken);
            context.setVariable("expiryMinutes", 30); // Changed to 30 to match your token expiry
            context.setVariable("appName", appName);

            String htmlContent = templateEngine.process("email/password-reset-email", context); // ✅ FIXED PATH

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Password Reset Request", appName),
                    htmlContent);

            log.info("Password reset email sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send password reset email to {}", maskEmail(toEmail), e);
            throw new TptsExceptions.EmailSendFailedException("Failed to send password reset email");
        }
    }

    /**
     * Send Group Buy Alert Email
     */
    public void sendGroupBuyAlert(String toEmail, String customerName, String groupCode,
            String route, int membersNeeded, String deadline) {
        try {
            Context context = new Context();
            context.setVariable("customerName", customerName);
            context.setVariable("groupCode", groupCode);
            context.setVariable("route", route);
            context.setVariable("membersNeeded", membersNeeded);
            context.setVariable("deadline", deadline);
            context.setVariable("discount", "40%");
            context.setVariable("groupUrl", appUrl + "/groups/" + groupCode);
            context.setVariable("appName", appName);

            String htmlContent = templateEngine.process("email/group-buy-alert", context);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Group Buy Alert - Save 40%%!", appName),
                    htmlContent);

            log.info("Group buy alert sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send group buy alert", e);
        }
    }

    /**
     * Send Agent Credentials Email
     */
    public void sendAgentCredentials(String toEmail, String agentName, String tempPassword,
            String companyName) {
        try {
            Context context = new Context();
            context.setVariable("agentName", agentName);
            context.setVariable("email", toEmail);
            context.setVariable("tempPassword", tempPassword);
            context.setVariable("companyName", companyName);
            context.setVariable("loginUrl", appUrl + "/agent/login");
            context.setVariable("appName", appName);

            String htmlContent = templateEngine.process("email/agent-credentials", context);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Welcome - Your Agent Account is Ready", appName),
                    htmlContent);

            log.info("Agent credentials sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send agent credentials", e);
            throw new TptsExceptions.EmailSendFailedException("Failed to send agent credentials");
        }
    }

    /**
     * Send Job Application Status Email
     */
    public void sendJobApplicationStatus(String toEmail, String applicantName,
            String companyName, String status,
            String message, String interviewDate) {
        try {
            Context context = new Context();
            context.setVariable("applicantName", applicantName);
            context.setVariable("companyName", companyName);
            context.setVariable("status", status);
            context.setVariable("message", message);
            context.setVariable("interviewDate", interviewDate);
            context.setVariable("jobsUrl", appUrl + "/jobs");
            context.setVariable("appName", appName);

            String htmlContent = templateEngine.process("email/job-application-status", context);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Application Update - %s", appName, companyName),
                    htmlContent);

            log.info("Job application status sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send job application status", e);
        }
    }

    /**
     * Core method to send HTML email
     */
    private void sendHtmlEmail(String to, String subject, String htmlContent) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);

        mailSender.send(message);
    }

    /**
     * Send HTML email with attachment
     */
    private void sendHtmlEmailWithAttachment(String to, String subject, String htmlContent,
            byte[] attachment, String filename) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);

        if (attachment != null && attachment.length > 0) {
            helper.addAttachment(filename, new ByteArrayResource(attachment));
        }

        mailSender.send(message);
    }

    /**
     * Format DateTime for display
     */
    private String formatDateTime(LocalDateTime dateTime) {
        if (dateTime == null)
            return "N/A";
        return dateTime.format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
    }

    /**
     * Mask email for logging
     */
    private String maskEmail(String email) {
        if (email == null || !email.contains("@"))
            return "****";
        String[] parts = email.split("@");
        return parts[0].substring(0, 2) + "****@" + parts[1];
    }
}
