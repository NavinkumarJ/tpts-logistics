package com.tpts.service;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.*;
import com.itextpdf.text.pdf.draw.LineSeparator;
import com.tpts.entity.Parcel;
import com.tpts.entity.Payment;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

/**
 * PDF Receipt Generator using iText
 */
@Service
@Slf4j
public class PdfReceiptService {

    private static final Font TITLE_FONT = new Font(Font.FontFamily.HELVETICA, 20, Font.BOLD, BaseColor.BLACK);
    private static final Font HEADER_FONT = new Font(Font.FontFamily.HELVETICA, 14, Font.BOLD, BaseColor.BLACK);
    private static final Font NORMAL_FONT = new Font(Font.FontFamily.HELVETICA, 11, Font.NORMAL, BaseColor.BLACK);
    private static final Font SMALL_FONT = new Font(Font.FontFamily.HELVETICA, 9, Font.NORMAL, BaseColor.GRAY);

    /**
     * Generate booking receipt PDF
     */
    public byte[] generateBookingReceipt(Parcel parcel, Payment payment) {
        try {
            Document document = new Document(PageSize.A4);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter.getInstance(document, baos);

            document.open();

            // Header
            addHeader(document);
            addSpace(document, 2);

            // Title
            Paragraph title = new Paragraph("BOOKING RECEIPT", TITLE_FONT);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);
            addSpace(document, 1);

            // Receipt Details
            PdfPTable receiptTable = new PdfPTable(2);
            receiptTable.setWidthPercentage(100);
            addReceiptRow(receiptTable, "Receipt Date:", formatDate(payment.getCreatedAt()));
            addReceiptRow(receiptTable, "Transaction ID:", payment.getTransactionId() != null ? payment.getTransactionId() : payment.getRazorpayPaymentId());
            addReceiptRow(receiptTable, "Tracking Number:", parcel.getTrackingNumber());
            document.add(receiptTable);
            addSpace(document, 1);

            // Customer Details
            document.add(new Paragraph("Customer Details", HEADER_FONT));
            addLine(document);
            PdfPTable customerTable = new PdfPTable(2);
            customerTable.setWidthPercentage(100);
            addRow(customerTable, "Name:", parcel.getCustomer().getFullName());
            addRow(customerTable, "Email:", parcel.getCustomer().getEmail());
            addRow(customerTable, "Phone:", parcel.getCustomer().getPhone());
            document.add(customerTable);
            addSpace(document, 1);

            // Shipment Details
            document.add(new Paragraph("Shipment Details", HEADER_FONT));
            addLine(document);
            PdfPTable shipmentTable = new PdfPTable(2);
            shipmentTable.setWidthPercentage(100);
            addRow(shipmentTable, "From:", parcel.getPickupCity());
            addRow(shipmentTable, "To:", parcel.getDeliveryCity());
            addRow(shipmentTable, "Weight:", parcel.getWeightKg() + " kg");
            addRow(shipmentTable, "Company:", parcel.getCompany().getCompanyName());
            document.add(shipmentTable);
            addSpace(document, 1);

            // Payment Summary
            document.add(new Paragraph("Payment Summary", HEADER_FONT));
            addLine(document);
            PdfPTable paymentTable = new PdfPTable(2);
            paymentTable.setWidthPercentage(100);
            addRow(paymentTable, "Base Amount:", "₹" + payment.getBaseAmount());

            if (payment.getDiscountAmount() != null && payment.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
                addRow(paymentTable, "Discount:", "-₹" + payment.getDiscountAmount());
            }

            if (payment.getTaxAmount() != null && payment.getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
                addRow(paymentTable, "Tax (GST):", "₹" + payment.getTaxAmount());
            }

            if (payment.getConvenienceFee() != null && payment.getConvenienceFee().compareTo(BigDecimal.ZERO) > 0) {
                addRow(paymentTable, "Convenience Fee:", "₹" + payment.getConvenienceFee());
            }

            addTotalRow(paymentTable, "Total Amount:", "₹" + payment.getTotalAmount());
            document.add(paymentTable);
            addSpace(document, 2);

            // Footer
            addFooter(document);

            document.close();
            return baos.toByteArray();

        } catch (DocumentException e) {
            log.error("Failed to generate PDF receipt", e);
            throw new RuntimeException("PDF generation failed", e);
        }
    }

    private void addHeader(Document document) throws DocumentException {
        PdfPTable headerTable = new PdfPTable(1);
        headerTable.setWidthPercentage(100);
        PdfPCell cell = new PdfPCell(new Phrase("TPTS - Trail Parcel Tracking System", HEADER_FONT));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(10);
        headerTable.addCell(cell);
        document.add(headerTable);
    }

    private void addFooter(Document document) throws DocumentException {
        Paragraph footer = new Paragraph(
                "Thank you for choosing TPTS!\nFor support: support@tpts.in | 1800-TPTS-000\nwww.tpts.in",
                SMALL_FONT
        );
        footer.setAlignment(Element.ALIGN_CENTER);
        document.add(footer);
    }

    private void addReceiptRow(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, NORMAL_FONT));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setPadding(5);

        PdfPCell valueCell = new PdfPCell(new Phrase(value != null ? value : "N/A", NORMAL_FONT));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setPadding(5);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private void addRow(PdfPTable table, String label, String value) {
        table.addCell(new Phrase(label, NORMAL_FONT));
        table.addCell(new Phrase(value != null ? value : "N/A", NORMAL_FONT));
    }

    private void addTotalRow(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, HEADER_FONT));
        labelCell.setPadding(8);
        PdfPCell valueCell = new PdfPCell(new Phrase(value, HEADER_FONT));
        valueCell.setPadding(8);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private void addLine(Document document) throws DocumentException {
        LineSeparator line = new LineSeparator();
        line.setLineColor(BaseColor.LIGHT_GRAY);
        document.add(new Chunk(line));
    }

    private void addSpace(Document document, int lines) throws DocumentException {
        for (int i = 0; i < lines; i++) {
            document.add(new Paragraph(" "));
        }
    }

    private String formatDate(java.time.LocalDateTime dateTime) {
        if (dateTime == null) return "N/A";
        return dateTime.format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
    }
}
