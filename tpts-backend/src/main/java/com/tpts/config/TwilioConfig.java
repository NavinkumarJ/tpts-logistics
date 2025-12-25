package com.tpts.config;

import com.twilio.Twilio;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Twilio SMS Configuration
 * Initializes Twilio client with credentials
 */
@Configuration
@Slf4j
public class TwilioConfig {

    @Value("${twilio.account.sid}")
    private String accountSid;

    @Value("${twilio.auth.token}")
    private String authToken;

    @Value("${twilio.phone.number}")
    private String fromPhoneNumber;

    @PostConstruct
    public void initTwilio() {
        try {
            Twilio.init(accountSid, authToken);
            log.info("Twilio initialized successfully with number: {}", fromPhoneNumber);
        } catch (Exception e) {
            log.error("Failed to initialize Twilio", e);
        }
    }

    public String getFromPhoneNumber() {
        return fromPhoneNumber;
    }
}
