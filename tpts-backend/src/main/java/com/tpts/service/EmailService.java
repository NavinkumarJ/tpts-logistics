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

import java.math.BigDecimal;
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
     * Send Company Rejection Email
     * Sent when a company's registration is rejected by Super Admin with the reason
     */
    public void sendCompanyRejectionEmail(String toEmail, String companyName, String contactPersonName,
            String reason) {
        try {
            String htmlContent = buildCompanyRejectionHtml(companyName, contactPersonName, reason);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Registration Update - Application Not Approved", appName),
                    htmlContent);

            log.info("Company rejection email sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send company rejection email", e);
        }
    }

    private String buildCompanyRejectionHtml(String companyName, String contactPersonName, String reason) {
        return String.format(
                """
                        <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                                    <h1 style="margin: 0;">Registration Update</h1>
                                    <p style="margin: 10px 0 0;">Application Not Approved</p>
                                </div>

                                <h2 style="color: #333;">Dear %s,</h2>

                                <p>Thank you for your interest in partnering with us. After careful review of your company <strong>%s</strong>'s registration application, we regret to inform you that we are unable to approve your registration at this time.</p>

                                <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                                    <h3 style="margin-top: 0; color: #dc2626;">Reason:</h3>
                                    <p style="margin: 0; font-style: italic;">%s</p>
                                </div>

                                <div style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
                                    <h3 style="margin-top: 0; color: #0284c7;">What You Can Do:</h3>
                                    <ul style="margin: 0; padding-left: 20px; color: #64748b;">
                                        <li>Address the concerns mentioned above</li>
                                        <li>Ensure all documents are valid and complete</li>
                                        <li>Re-apply with updated information</li>
                                        <li>Contact our support team if you have questions</li>
                                    </ul>
                                </div>

                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="mailto:support@tpts.in" style="background: #0284c7; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                        Contact Support
                                    </a>
                                </div>

                                <p>We encourage you to review the feedback and consider reapplying once you have addressed the concerns.</p>

                                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

                                <p style="color: #666; font-size: 14px;">
                                    If you have any questions, please email us at <a href="mailto:support@tpts.in">support@tpts.in</a>
                                </p>

                                <p style="color: #999; font-size: 12px; text-align: center;">
                                    © 2024 %s. All rights reserved.
                                </p>
                            </div>
                        </body>
                        </html>
                        """,
                contactPersonName, companyName, reason, appName);
    }

    /**
     * Send Company Suspension Email
     * Sent when a company is suspended by Super Admin with the reason
     */
    public void sendCompanySuspensionEmail(String toEmail, String companyName, String contactPersonName,
            String reason) {
        try {
            String htmlContent = buildCompanySuspensionHtml(companyName, contactPersonName, reason);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Important: Your Company Account Has Been Suspended", appName),
                    htmlContent);

            log.info("Company suspension email sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send company suspension email", e);
        }
    }

    private String buildCompanySuspensionHtml(String companyName, String contactPersonName, String reason) {
        return String.format(
                """
                        <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                                    <h1 style="margin: 0;">⚠️ Account Suspended</h1>
                                    <p style="margin: 10px 0 0;">Important Notice</p>
                                </div>

                                <h2 style="color: #333;">Dear %s,</h2>

                                <p>We regret to inform you that your company <strong>%s</strong>'s account on our platform has been suspended.</p>

                                <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                                    <h3 style="margin-top: 0; color: #dc2626;">Reason for Suspension:</h3>
                                    <p style="margin: 0; font-style: italic;">%s</p>
                                </div>

                                <div style="background: #f8fafc; padding: 15px; margin: 20px 0; border-radius: 8px;">
                                    <h3 style="margin-top: 0; color: #475569;">What This Means:</h3>
                                    <ul style="margin: 0; padding-left: 20px; color: #64748b;">
                                        <li>You will not be able to log into your company dashboard</li>
                                        <li>New parcel bookings for your company will be disabled</li>
                                        <li>Your agents will not be able to access their accounts</li>
                                        <li>Existing deliveries in progress may still be completed</li>
                                    </ul>
                                </div>

                                <div style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
                                    <h3 style="margin-top: 0; color: #0284c7;">How to Resolve This:</h3>
                                    <p style="margin: 0;">If you believe this suspension was made in error or if you have addressed the concerns mentioned above, please contact our support team to request a review of your account.</p>
                                </div>

                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="mailto:support@tpts.in" style="background: #0284c7; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                        Contact Support
                                    </a>
                                </div>

                                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

                                <p style="color: #666; font-size: 14px;">
                                    If you have any questions, please email us at <a href="mailto:support@tpts.in">support@tpts.in</a>
                                </p>

                                <p style="color: #999; font-size: 12px; text-align: center;">
                                    © 2024 %s. All rights reserved.
                                </p>
                            </div>
                        </body>
                        </html>
                        """,
                contactPersonName, companyName, reason, appName);
    }

    /**
     * Send Company Reactivation Email
     * Sent when a suspended company is reactivated by Super Admin
     */
    public void sendCompanyReactivationEmail(String toEmail, String companyName, String contactPersonName) {
        try {
            String htmlContent = buildCompanyReactivationHtml(companyName, contactPersonName);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Great News! Your Company Account Has Been Reactivated", appName),
                    htmlContent);

            log.info("Company reactivation email sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send company reactivation email", e);
        }
    }

    private String buildCompanyReactivationHtml(String companyName, String contactPersonName) {
        return String.format(
                """
                        <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                                    <h1 style="margin: 0;">🎉 Account Reactivated!</h1>
                                    <p style="margin: 10px 0 0;">Welcome Back</p>
                                </div>

                                <h2 style="color: #333;">Dear %s,</h2>

                                <p>Great news! Your company <strong>%s</strong>'s account on our platform has been reactivated.</p>

                                <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                                    <h3 style="margin-top: 0; color: #059669;">What This Means:</h3>
                                    <ul style="margin: 0; padding-left: 20px; color: #166534;">
                                        <li>You can now log into your company dashboard</li>
                                        <li>New parcel bookings for your company are enabled</li>
                                        <li>Your agents can access their accounts again</li>
                                        <li>All services have been fully restored</li>
                                    </ul>
                                </div>

                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="%s/login" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                        Go to Dashboard →
                                    </a>
                                </div>

                                <p>We're happy to have you back! If you have any questions about your account, please don't hesitate to contact our support team.</p>

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
                contactPersonName, companyName, appUrl, appName);
    }

    /**
     * Send User Suspension Email
     * Sent when a user's account is suspended by Super Admin
     */
    public void sendUserSuspensionEmail(String toEmail, String userName, String reason) {
        try {
            String htmlContent = String.format(
                    """
                            <html>
                            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                    <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                                        <h1 style="margin: 0;">⚠️ Account Suspended</h1>
                                        <p style="margin: 10px 0 0;">Important Notice</p>
                                    </div>

                                    <h2 style="color: #333;">Dear %s,</h2>

                                    <p>We regret to inform you that your account on our platform has been suspended.</p>

                                    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                                        <h3 style="margin-top: 0; color: #dc2626;">Reason for Suspension:</h3>
                                        <p style="margin: 0; font-style: italic;">%s</p>
                                    </div>

                                    <div style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
                                        <h3 style="margin-top: 0; color: #0284c7;">How to Resolve This:</h3>
                                        <p style="margin: 0;">If you believe this suspension was made in error or if you have addressed the concerns mentioned above, please contact our support team to request a review of your account.</p>
                                    </div>

                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="mailto:support@tpts.in" style="background: #0284c7; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                            Contact Support
                                        </a>
                                    </div>

                                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

                                    <p style="color: #999; font-size: 12px; text-align: center;">
                                        © 2024 %s. All rights reserved.
                                    </p>
                                </div>
                            </body>
                            </html>
                            """,
                    userName, reason, appName);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Important: Your Account Has Been Suspended", appName),
                    htmlContent);

            log.info("User suspension email sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send user suspension email", e);
        }
    }

    /**
     * Send User Activation Email
     * Sent when a suspended user's account is reactivated by Super Admin
     */
    public void sendUserActivationEmail(String toEmail, String userName) {
        try {
            String htmlContent = String.format(
                    """
                            <html>
                            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                    <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                                        <h1 style="margin: 0;">🎉 Account Reactivated!</h1>
                                        <p style="margin: 10px 0 0;">Welcome Back</p>
                                    </div>

                                    <h2 style="color: #333;">Dear %s,</h2>

                                    <p>Great news! Your account on our platform has been reactivated.</p>

                                    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                                        <h3 style="margin-top: 0; color: #059669;">What This Means:</h3>
                                        <ul style="margin: 0; padding-left: 20px; color: #166534;">
                                            <li>You can now log into your account</li>
                                            <li>All your previous data and settings are intact</li>
                                            <li>All services have been fully restored</li>
                                        </ul>
                                    </div>

                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="%s/login" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                            Log In Now →
                                        </a>
                                    </div>

                                    <p>We're happy to have you back! If you have any questions, please don't hesitate to contact our support team.</p>

                                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

                                    <p style="color: #999; font-size: 12px; text-align: center;">
                                        © 2024 %s. All rights reserved.
                                    </p>
                                </div>
                            </body>
                            </html>
                            """,
                    userName, appUrl, appName);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Great News! Your Account Has Been Reactivated", appName),
                    htmlContent);

            log.info("User activation email sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send user activation email", e);
        }
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
     * Send Group Buy Cancelled Email to Company Admin
     * Sent when a group expires with insufficient members (< 70% filled)
     */
    public void sendGroupBuyCancelledToCompany(String toEmail, String companyName, String groupCode,
            String route, int currentMembers, int targetMembers) {
        try {
            String htmlContent = String.format(
                    """
                            <html>
                            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                    <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                                        <h1 style="margin: 0;">❌ Group Buy Cancelled</h1>
                                        <p style="margin: 10px 0 0;">Insufficient Members</p>
                                    </div>

                                    <h2 style="color: #333;">Dear %s Admin,</h2>

                                    <p>We're notifying you that a group buy has been automatically cancelled due to insufficient members joining before the deadline.</p>

                                    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                                        <h3 style="margin-top: 0; color: #dc2626;">Cancelled Group Details:</h3>
                                        <table style="width: 100%%; border-collapse: collapse;">
                                            <tr><td style="padding: 5px 0; color: #666;">Group Code:</td><td style="padding: 5px 0; font-weight: bold;">%s</td></tr>
                                            <tr><td style="padding: 5px 0; color: #666;">Route:</td><td style="padding: 5px 0; font-weight: bold;">%s</td></tr>
                                            <tr><td style="padding: 5px 0; color: #666;">Members Joined:</td><td style="padding: 5px 0; font-weight: bold;">%d / %d</td></tr>
                                            <tr><td style="padding: 5px 0; color: #666;">Fill Rate:</td><td style="padding: 5px 0; font-weight: bold; color: #dc2626;">%d%%</td></tr>
                                        </table>
                                    </div>

                                    <div style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
                                        <h3 style="margin-top: 0; color: #0284c7;">What Happens Next:</h3>
                                        <ul style="margin: 0; padding-left: 20px; color: #64748b;">
                                            <li>Customers who joined have been notified</li>
                                            <li>Refunds will be processed automatically</li>
                                            <li>Parcels have been cancelled</li>
                                        </ul>
                                    </div>

                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="%s/company/shipments" style="background: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                            View Dashboard →
                                        </a>
                                    </div>

                                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

                                    <p style="color: #999; font-size: 12px; text-align: center;">
                                        © 2024 %s. All rights reserved.
                                    </p>
                                </div>
                            </body>
                            </html>
                            """,
                    companyName, groupCode, route, currentMembers, targetMembers,
                    (currentMembers * 100 / targetMembers), appUrl, appName);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Group Buy Cancelled - %s", appName, groupCode),
                    htmlContent);

            log.info("Group buy cancelled email sent to company {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send group buy cancelled email to company", e);
        }
    }

    /**
     * Send Group Buy Ready Email to Company Admin
     * Sent when a group expires with sufficient members (>= 70% filled) OR reaches
     * target
     */
    public void sendGroupBuyReadyToCompany(String toEmail, String companyName, String groupCode,
            String route, int memberCount, int targetMembers) {
        try {
            String htmlContent = String.format(
                    """
                            <html>
                            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                    <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                                        <h1 style="margin: 0;">🎉 Group Buy Ready!</h1>
                                        <p style="margin: 10px 0 0;">Time to Assign Pickup Agent</p>
                                    </div>

                                    <h2 style="color: #333;">Dear %s Admin,</h2>

                                    <p>Great news! A group buy has reached its deadline with sufficient members. It's ready for pickup agent assignment!</p>

                                    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                                        <h3 style="margin-top: 0; color: #059669;">Group Details:</h3>
                                        <table style="width: 100%%; border-collapse: collapse;">
                                            <tr><td style="padding: 5px 0; color: #666;">Group Code:</td><td style="padding: 5px 0; font-weight: bold;">%s</td></tr>
                                            <tr><td style="padding: 5px 0; color: #666;">Route:</td><td style="padding: 5px 0; font-weight: bold;">%s</td></tr>
                                            <tr><td style="padding: 5px 0; color: #666;">Members Joined:</td><td style="padding: 5px 0; font-weight: bold; color: #10b981;">%d / %d</td></tr>
                                            <tr><td style="padding: 5px 0; color: #666;">Status:</td><td style="padding: 5px 0; font-weight: bold; color: #10b981;">✅ Ready for Pickup</td></tr>
                                        </table>
                                    </div>

                                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                                        <h3 style="margin-top: 0; color: #d97706;">⚡ Action Required:</h3>
                                        <p style="margin: 0;">Please assign a pickup agent to collect all %d parcels from customers.</p>
                                    </div>

                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="%s/company/shipments" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                            Assign Pickup Agent →
                                        </a>
                                    </div>

                                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

                                    <p style="color: #999; font-size: 12px; text-align: center;">
                                        © 2024 %s. All rights reserved.
                                    </p>
                                </div>
                            </body>
                            </html>
                            """,
                    companyName, groupCode, route, memberCount, targetMembers, memberCount, appUrl, appName);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Group Buy Ready - Assign Pickup Agent for %s", appName, groupCode),
                    htmlContent);

            log.info("Group buy ready email sent to company {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send group buy ready email to company", e);
        }
    }

    /**
     * Send Balance Due Email to Customer
     * Sent when group is partially filled and discount is pro-rated
     */
    public void sendBalanceDueEmail(String toEmail, String customerName, String trackingNumber,
            String groupCode, BigDecimal originalDiscount, BigDecimal effectiveDiscount,
            BigDecimal balanceAmount, BigDecimal fillPercentage) {
        try {
            String htmlContent = String.format(
                    """
                            <html>
                            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                                        <h1 style="margin: 0;">⚠️ Group Discount Adjusted</h1>
                                        <p style="margin: 10px 0 0;">Balance Payment Required</p>
                                    </div>

                                    <h2 style="color: #333;">Hi %s,</h2>

                                    <p>Your group buy <strong>%s</strong> reached its deadline with <strong>%s%% fill</strong>. The discount has been adjusted based on the number of members who joined.</p>

                                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                                        <h3 style="margin-top: 0; color: #d97706;">Discount Adjustment:</h3>
                                        <table style="width: 100%%; border-collapse: collapse;">
                                            <tr><td style="padding: 5px 0; color: #666;">Tracking Number:</td><td style="padding: 5px 0; font-weight: bold;">%s</td></tr>
                                            <tr><td style="padding: 5px 0; color: #666;">Original Discount:</td><td style="padding: 5px 0; font-weight: bold; text-decoration: line-through;">%s%%</td></tr>
                                            <tr><td style="padding: 5px 0; color: #666;">Adjusted Discount:</td><td style="padding: 5px 0; font-weight: bold; color: #f59e0b;">%s%%</td></tr>
                                        </table>
                                    </div>

                                    <div style="background: #fef2f2; border: 2px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                                        <h3 style="margin-top: 0; color: #dc2626;">💰 Balance Due</h3>
                                        <p style="font-size: 32px; font-weight: bold; color: #dc2626; margin: 10px 0;">₹%s</p>
                                        <p style="color: #666; margin: 0;">Pay now or at delivery</p>
                                    </div>

                                    <div style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
                                        <h3 style="margin-top: 0; color: #0284c7;">How to Pay:</h3>
                                        <ul style="margin: 0; padding-left: 20px; color: #64748b;">
                                            <li>Log in to your account and pay online via Razorpay</li>
                                            <li>Or pay cash to the delivery agent at time of delivery</li>
                                        </ul>
                                    </div>

                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="%s/customer/groups" style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                            Pay Balance Now →
                                        </a>
                                    </div>

                                    <p style="color: #666; font-size: 14px;">
                                        <strong>Note:</strong> Your parcel will still be delivered. However, the agent will request payment before handing over the package.
                                    </p>

                                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

                                    <p style="color: #999; font-size: 12px; text-align: center;">
                                        © 2024 %s. All rights reserved.
                                    </p>
                                </div>
                            </body>
                            </html>
                            """,
                    customerName, groupCode, fillPercentage, trackingNumber,
                    originalDiscount, effectiveDiscount, balanceAmount, appUrl, appName);

            sendHtmlEmail(
                    toEmail,
                    String.format("[%s] Balance Due ₹%s - Group Buy %s", appName, balanceAmount, groupCode),
                    htmlContent);

            log.info("Balance due email sent to {}", maskEmail(toEmail));

        } catch (Exception e) {
            log.error("Failed to send balance due email", e);
        }
    }

    /**
     * Send Bulk Admin Email
     * Generic email template for admin/company bulk messaging
     */
    public void sendBulkAdminEmail(String toEmail, String recipientName, String subject, String messageContent) {
        try {
            String htmlContent = String.format(
                    """
                            <html>
                            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                    <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                                        <h1 style="margin: 0;">%s</h1>
                                        <p style="margin: 10px 0 0;">Message from %s</p>
                                    </div>

                                    <h2 style="color: #333;">Dear %s,</h2>

                                    <div style="background: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #6366f1;">
                                        %s
                                    </div>

                                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

                                    <p style="color: #666; font-size: 14px;">
                                        This is an automated message from %s. If you have questions, please contact our support team at <a href="mailto:support@tpts.in">support@tpts.in</a>
                                    </p>

                                    <p style="color: #999; font-size: 12px; text-align: center;">
                                        © 2024 %s. All rights reserved.
                                    </p>
                                </div>
                            </body>
                            </html>
                            """,
                    subject, appName, recipientName, messageContent, appName, appName);

            sendHtmlEmail(toEmail, String.format("[%s] %s", appName, subject), htmlContent);
            log.info("Bulk admin email sent to {} - Subject: {}", maskEmail(toEmail), subject);

        } catch (Exception e) {
            log.error("Failed to send bulk admin email to {}: {}", maskEmail(toEmail), e.getMessage());
            throw new TptsExceptions.EmailSendFailedException("Failed to send email: " + e.getMessage());
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
