package com.tpts.util;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import lombok.extern.slf4j.Slf4j;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * QR Code Generator Utility
 * Generates QR codes for UPI payments
 */
@Slf4j
public class QRCodeGenerator {

    private static final int QR_CODE_SIZE = 300; // 300x300 pixels

    /**
     * Generate QR code for UPI payment
     *
     * @param upiString UPI payment string (upi://pay?...)
     * @return Base64 encoded PNG image
     */
    public static String generateQRCodeBase64(String upiString) {
        try {
            // QR Code configuration
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 1);

            // Generate QR code matrix
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(
                    upiString,
                    BarcodeFormat.QR_CODE,
                    QR_CODE_SIZE,
                    QR_CODE_SIZE,
                    hints
            );

            // Convert to PNG image
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

            // Encode to Base64
            byte[] imageBytes = outputStream.toByteArray();
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);

            log.info("QR code generated successfully for UPI payment");
            return base64Image;

        } catch (WriterException | IOException e) {
            log.error("Failed to generate QR code: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Build UPI payment string
     * Format: upi://pay?pa=merchant@upi&pn=MerchantName&am=100.00&tr=TRK123&tn=Payment
     *
     * @param merchantUPI Merchant UPI ID (e.g., merchant@upi)
     * @param merchantName Merchant business name
     * @param amount Payment amount
     * @param transactionRef Transaction reference/tracking number
     * @param transactionNote Payment description
     * @return UPI payment string
     */
    public static String buildUpiPaymentString(
            String merchantUPI,
            String merchantName,
            String amount,
            String transactionRef,
            String transactionNote) {

        return String.format(
                "upi://pay?pa=%s&pn=%s&am=%s&tr=%s&tn=%s&cu=INR",
                merchantUPI,
                merchantName.replace(" ", "+"),
                amount,
                transactionRef,
                transactionNote.replace(" ", "+")
        );
    }
}
