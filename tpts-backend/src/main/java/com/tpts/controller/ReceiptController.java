package com.tpts.controller;

import com.tpts.entity.Parcel;
import com.tpts.entity.Payment;
import com.tpts.entity.User;
import com.tpts.repository.ParcelRepository;
import com.tpts.repository.PaymentRepository;
import com.tpts.service.PdfReceiptService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Receipt Controller
 * Provides PDF receipt download functionality
 * 
 * Customer Endpoints:
 * - GET /api/receipts/{parcelId} - Download PDF receipt for a parcel
 */
@RestController
@RequestMapping("/api/receipts")
@RequiredArgsConstructor
@Slf4j
public class ReceiptController {

        private final PdfReceiptService pdfReceiptService;
        private final ParcelRepository parcelRepository;
        private final PaymentRepository paymentRepository;

        /**
         * Download PDF receipt for a parcel
         * GET /api/receipts/{parcelId}
         */
        @GetMapping("/{parcelId}")
        @PreAuthorize("hasAnyRole('CUSTOMER', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
        public ResponseEntity<byte[]> downloadReceipt(
                        @PathVariable Long parcelId,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Downloading receipt for parcel {} by user: {}", parcelId, currentUser.getEmail());

                // Find parcel
                Parcel parcel = parcelRepository.findById(parcelId)
                                .orElseThrow(() -> new RuntimeException("Parcel not found"));

                // Verify access - customer can only download their own receipts
                if (currentUser.getUserType().name().equals("CUSTOMER") &&
                                !parcel.getCustomer().getUser().getId().equals(currentUser.getId())) {
                        throw new RuntimeException("Access denied");
                }

                // Find payment for this parcel
                Payment payment = paymentRepository.findByParcelId(parcelId)
                                .orElseThrow(() -> new RuntimeException("Payment not found for this parcel"));

                // Generate PDF
                byte[] pdfBytes = pdfReceiptService.generateBookingReceipt(parcel, payment);

                // Set headers for PDF download
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_PDF);
                headers.setContentDispositionFormData("attachment",
                                "Receipt_" + parcel.getTrackingNumber() + ".pdf");
                headers.setContentLength(pdfBytes.length);

                log.info("Receipt generated successfully for parcel: {}", parcel.getTrackingNumber());

                return ResponseEntity.ok()
                                .headers(headers)
                                .body(pdfBytes);
        }

        /**
         * View PDF receipt inline (in browser)
         * GET /api/receipts/{parcelId}/view
         */
        @GetMapping("/{parcelId}/view")
        @PreAuthorize("hasAnyRole('CUSTOMER', 'COMPANY_ADMIN', 'SUPER_ADMIN')")
        public ResponseEntity<byte[]> viewReceipt(
                        @PathVariable Long parcelId,
                        @AuthenticationPrincipal User currentUser) {

                log.info("Viewing receipt for parcel {} by user: {}", parcelId, currentUser.getEmail());

                // Find parcel
                Parcel parcel = parcelRepository.findById(parcelId)
                                .orElseThrow(() -> new RuntimeException("Parcel not found"));

                // Verify access
                if (currentUser.getUserType().name().equals("CUSTOMER") &&
                                !parcel.getCustomer().getUser().getId().equals(currentUser.getId())) {
                        throw new RuntimeException("Access denied");
                }

                // Find payment
                Payment payment = paymentRepository.findByParcelId(parcelId)
                                .orElseThrow(() -> new RuntimeException("Payment not found for this parcel"));

                // Generate PDF
                byte[] pdfBytes = pdfReceiptService.generateBookingReceipt(parcel, payment);

                // Set headers for inline viewing
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_PDF);
                headers.add(HttpHeaders.CONTENT_DISPOSITION,
                                "inline; filename=Receipt_" + parcel.getTrackingNumber() + ".pdf");
                headers.setContentLength(pdfBytes.length);

                return ResponseEntity.ok()
                                .headers(headers)
                                .body(pdfBytes);
        }
}
