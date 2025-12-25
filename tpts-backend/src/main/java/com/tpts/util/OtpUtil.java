package com.tpts.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.UUID;

/**
 * Utility class for generating OTPs and tokens
 */
@Component
public class OtpUtil {

    private static final SecureRandom random = new SecureRandom();

    @Value("${otp.length:6}")
    private int otpLength;

    /**
     * Generate a random numeric OTP
     * @return 6-digit OTP string
     */
    public String generateOtp() {
        StringBuilder otp = new StringBuilder();
        for (int i = 0; i < otpLength; i++) {
            otp.append(random.nextInt(10));
        }
        return otp.toString();
    }

    /**
     * Generate a random reset token
     * @return UUID-based reset token
     */
    public String generateResetToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * Generate a unique tracking number
     * Format: TRK + timestamp(last 6 digits) + random(4 digits)
     * Example: TRK1234567890
     */
    public String generateTrackingNumber() {
        long timestamp = System.currentTimeMillis();
        String timestampPart = String.valueOf(timestamp).substring(7); // Last 6 digits
        int randomPart = 1000 + random.nextInt(9000); // 4-digit random
        return "TRK" + timestampPart + randomPart;
    }

    /**
     * Generate a unique group code
     * Format: GRP + random(6 digits)
     * Example: GRP123456
     */
    public String generateGroupCode() {
        int randomPart = 100000 + random.nextInt(900000); // 6-digit random
        return "GRP" + randomPart;
    }

    /**
     * Generate a temporary password
     * @return 8-character alphanumeric password
     */
    public String generateTempPassword() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        StringBuilder password = new StringBuilder();
        for (int i = 0; i < 8; i++) {
            password.append(chars.charAt(random.nextInt(chars.length())));
        }
        return password.toString();
    }
}
