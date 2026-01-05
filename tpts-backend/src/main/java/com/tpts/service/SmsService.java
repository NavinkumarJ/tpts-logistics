package com.tpts.service;

import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import com.tpts.config.TwilioConfig;
import com.tpts.exception.TptsExceptions;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * SMS Service using Twilio
 * Sends OTP, notifications, and alerts
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class SmsService {

    private final TwilioConfig twilioConfig;

    /**
     * Send OTP SMS
     */
    public void sendOtp(String toPhoneNumber, String otp, String purpose) {
        String messageText = String.format(
                "[TPTS] Your OTP for %s is: %s. Valid for 60 minutes. Do not share with anyone.",
                purpose, otp);

        sendSms(toPhoneNumber, messageText);
        log.info("OTP SMS sent to {} for {}", maskPhone(toPhoneNumber), purpose);
    }

    /**
     * Send booking confirmation SMS
     */
    public void sendBookingConfirmation(String toPhoneNumber, String trackingNumber, String customerName) {
        String messageText = String.format(
                "[TPTS] Hi %s! Your parcel booking is confirmed. Tracking Number: %s. Track at: https://tpts.in/track/%s",
                customerName, trackingNumber, trackingNumber);

        sendSms(toPhoneNumber, messageText);
        log.info("Booking confirmation sent to {}", maskPhone(toPhoneNumber));
    }

    /**
     * Send parcel status update SMS
     */
    public void sendStatusUpdate(String toPhoneNumber, String trackingNumber, String status, String message) {
        String messageText = String.format(
                "[TPTS] Parcel %s - %s. %s Track: https://tpts.in/track/%s",
                trackingNumber, status, message, trackingNumber);

        sendSms(toPhoneNumber, messageText);
        log.info("Status update sent to {}: {}", maskPhone(toPhoneNumber), status);
    }

    /**
     * Send delivery notification to receiver (out for delivery with OTP)
     */
    public void sendDeliveryNotification(String toPhoneNumber, String trackingNumber,
            String receiverName, String deliveryOtp) {
        String messageText = String.format(
                "[TPTS] Hi %s! Your parcel %s is out for delivery. Your OTP is: %s. Share with delivery agent.",
                receiverName, trackingNumber, deliveryOtp);

        sendSms(toPhoneNumber, messageText);
        log.info("Delivery notification sent to {}", maskPhone(toPhoneNumber));
    }

    /**
     * Send picked up notification to receiver
     */
    public void sendPickedUpToReceiver(String toPhoneNumber, String trackingNumber,
            String receiverName, String agentName) {
        String messageText = String.format(
                "[TPTS] Hi %s! Your parcel %s has been picked up by %s and is on its way! Track: https://tpts.in/track/%s",
                receiverName, trackingNumber, agentName, trackingNumber);

        sendSms(toPhoneNumber, messageText);
        log.info("Picked up notification sent to receiver {}", maskPhone(toPhoneNumber));
    }

    /**
     * Send picked up notification to sender
     */
    public void sendPickedUpToSender(String toPhoneNumber, String trackingNumber,
            String senderName, String agentName) {
        String messageText = String.format(
                "[TPTS] Hi %s! Your parcel %s has been picked up by %s. Track delivery: https://tpts.in/track/%s",
                senderName, trackingNumber, agentName, trackingNumber);

        sendSms(toPhoneNumber, messageText);
        log.info("Picked up notification sent to sender {}", maskPhone(toPhoneNumber));
    }

    /**
     * Send in-transit notification to receiver
     */
    public void sendInTransitToReceiver(String toPhoneNumber, String trackingNumber,
            String receiverName) {
        String messageText = String.format(
                "[TPTS] Hi %s! Your parcel %s is now in transit. We'll notify you when it's out for delivery. Track: https://tpts.in/track/%s",
                receiverName, trackingNumber, trackingNumber);

        sendSms(toPhoneNumber, messageText);
        log.info("In-transit notification sent to receiver {}", maskPhone(toPhoneNumber));
    }

    /**
     * Send agent assignment notification
     */
    public void sendAgentAssignment(String toPhoneNumber, String agentName,
            String pickupAddress, String deliveryAddress, String earnings) {
        String messageText = String.format(
                "[TPTS] Hi %s! New delivery assigned. Pickup: %s → Drop: %s. Earnings: ₹%s. Check app for details.",
                agentName, pickupAddress, deliveryAddress, earnings);

        sendSms(toPhoneNumber, messageText);
        log.info("Assignment notification sent to agent {}", maskPhone(toPhoneNumber));
    }

    /**
     * Send group buy alert
     */
    public void sendGroupBuyAlert(String toPhoneNumber, String groupCode,
            String route, int membersNeeded, String deadline) {
        String messageText = String.format(
                "[TPTS] Group Buy Alert! %s - %s. Only %d members needed! Deadline: %s. Save 40%%!",
                groupCode, route, membersNeeded, deadline);

        sendSms(toPhoneNumber, messageText);
        log.info("Group buy alert sent to {}", maskPhone(toPhoneNumber));
    }

    /**
     * Send group completion notification
     */
    public void sendGroupComplete(String toPhoneNumber, String groupCode, String discount) {
        String messageText = String.format(
                "[TPTS] Great news! Group %s is complete! You saved %s. Your parcel will be picked up soon.",
                groupCode, discount);

        sendSms(toPhoneNumber, messageText);
        log.info("Group completion notification sent to {}", maskPhone(toPhoneNumber));
    }

    /**
     * Send job application status
     */
    public void sendJobApplicationStatus(String toPhoneNumber, String applicantName,
            String companyName, String status, String message) {
        String messageText = String.format(
                "[TPTS] Hi %s! Your application to %s - %s. %s",
                applicantName, companyName, status, message);

        sendSms(toPhoneNumber, messageText);
        log.info("Job application status sent to {}", maskPhone(toPhoneNumber));
    }

    /**
     * Send payment receipt
     */
    public void sendPaymentReceipt(String toPhoneNumber, String trackingNumber,
            String amount, String transactionId) {
        String messageText = String.format(
                "[TPTS] Payment received! ₹%s paid for %s. Transaction ID: %s. Receipt sent to your email.",
                amount, trackingNumber, transactionId);

        sendSms(toPhoneNumber, messageText);
        log.info("Payment receipt sent to {}", maskPhone(toPhoneNumber));
    }

    /**
     * Core SMS sending method
     */
    private void sendSms(String toPhoneNumber, String messageText) {
        try {
            // Ensure phone number has country code
            if (!toPhoneNumber.startsWith("+")) {
                toPhoneNumber = "+91" + toPhoneNumber;
            }

            Message message = Message.creator(
                    new PhoneNumber(toPhoneNumber),
                    new PhoneNumber(twilioConfig.getFromPhoneNumber()),
                    messageText).create();

            log.info("SMS sent successfully. SID: {}", message.getSid());

        } catch (Exception e) {
            log.error("Failed to send SMS to {}: {}", maskPhone(toPhoneNumber), e.getMessage());
            throw new TptsExceptions.SmsSendFailedException(
                    "Failed to send SMS: " + e.getMessage());
        }
    }

    /**
     * Mask phone number for logging (privacy)
     */
    private String maskPhone(String phone) {
        if (phone.length() > 4) {
            return "****" + phone.substring(phone.length() - 4);
        }
        return "****";
    }
}
