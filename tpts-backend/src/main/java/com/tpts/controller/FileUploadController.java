package com.tpts.controller;

import com.tpts.dto.response.ApiResponse;
import com.tpts.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

/**
 * File Upload Controller
 * Handles all file uploads to Cloudinary
 * No authentication required for these endpoints
 */
@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@Slf4j
public class FileUploadController {

    private final CloudinaryService cloudinaryService;

    /**
     * Upload profile image
     */
    @PostMapping("/profile")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadProfileImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "userId", required = false) Long userId) {

        log.info("Uploading profile image for userId: {}", userId);

        String folder = userId != null ? "profiles/" + userId : "profiles/temp";
        String imageUrl = cloudinaryService.uploadImage(file, folder);

        Map<String, String> response = new HashMap<>();
        response.put("url", imageUrl);
        response.put("message", "Profile image uploaded successfully");

        return ResponseEntity.ok(ApiResponse.success(response, "Profile image uploaded successfully"));
    }

    /**
     * Upload delivery proof (pickup/delivery photos)
     */
    @PostMapping("/delivery-proof")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadDeliveryProof(
            @RequestParam("file") MultipartFile file,
            @RequestParam("trackingNumber") String trackingNumber,
            @RequestParam("type") String type) {

        log.info("Uploading delivery proof - Tracking: {}, Type: {}", trackingNumber, type);

        String folder = "delivery-proofs/" + trackingNumber;
        String imageUrl = cloudinaryService.uploadImage(file, folder);

        Map<String, String> response = new HashMap<>();
        response.put("url", imageUrl);
        response.put("type", type);
        response.put("trackingNumber", trackingNumber);
        response.put("message", "Delivery proof uploaded successfully");

        return ResponseEntity.ok(ApiResponse.success(response, "Delivery proof uploaded successfully"));
    }

    /**
     * Upload signature
     */
    @PostMapping("/signature")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadSignature(
            @RequestParam("file") MultipartFile file,
            @RequestParam("trackingNumber") String trackingNumber) {

        log.info("Uploading signature for tracking: {}", trackingNumber);

        String folder = "signatures/" + trackingNumber;
        String signatureUrl = cloudinaryService.uploadImage(file, folder);

        Map<String, String> response = new HashMap<>();
        response.put("url", signatureUrl);
        response.put("trackingNumber", trackingNumber);
        response.put("message", "Signature uploaded successfully");

        return ResponseEntity.ok(ApiResponse.success(response, "Signature uploaded successfully"));
    }

    /**
     * Upload job application document (supports images: PNG, JPG, JPEG + PDF, max
     * 10MB)
     */
    @PostMapping("/job-document")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadJobDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "applicationId", required = false) Long applicationId,
            @RequestParam(value = "docType", required = false, defaultValue = "document") String docType) {

        log.info("Uploading job document - ApplicationId: {}, DocType: {}, Size: {} bytes, Type: {}",
                applicationId, docType, file.getSize(), file.getContentType());

        // Use uploadJobDocument which accepts both images (JPG, PNG) and PDFs
        String documentUrl = cloudinaryService.uploadJobDocument(file, applicationId, docType);

        Map<String, String> response = new HashMap<>();
        response.put("url", documentUrl);
        response.put("docType", docType);
        response.put("message", "Document uploaded successfully");

        if (applicationId != null) {
            response.put("applicationId", String.valueOf(applicationId));
        }

        return ResponseEntity.ok(ApiResponse.success(response, "Document uploaded successfully"));
    }

    /**
     * Upload company logo (images only)
     */
    @PostMapping("/company-logo")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadCompanyLogo(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "companyId", required = false) Long companyId) {

        log.info("Uploading company logo for companyId: {}", companyId);

        String folder = companyId != null
                ? "company-logos/" + companyId
                : "company-logos/temp";
        String logoUrl = cloudinaryService.uploadImage(file, folder);

        Map<String, String> response = new HashMap<>();
        response.put("url", logoUrl);
        response.put("message", "Company logo uploaded successfully");

        if (companyId != null) {
            response.put("companyId", String.valueOf(companyId));
        }

        return ResponseEntity.ok(ApiResponse.success(response, "Logo uploaded successfully"));
    }

    /**
     * Upload company document (supports images: PNG, JPG, JPEG + PDF, max 10MB)
     * Used for GST Certificate, Registration Certificate, etc.
     */
    @PostMapping("/company-document")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadCompanyDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "companyId", required = false) Long companyId,
            @RequestParam(value = "docType", required = false, defaultValue = "document") String docType) {

        log.info("Uploading company document - CompanyId: {}, DocType: {}, Size: {} bytes, Type: {}",
                companyId, docType, file.getSize(), file.getContentType());

        // Use uploadJobDocument which accepts both images (JPG, PNG) and PDFs
        String documentUrl = cloudinaryService.uploadJobDocument(file, companyId, docType);

        Map<String, String> response = new HashMap<>();
        response.put("url", documentUrl);
        response.put("docType", docType);
        response.put("message", "Document uploaded successfully");

        if (companyId != null) {
            response.put("companyId", String.valueOf(companyId));
        }

        return ResponseEntity.ok(ApiResponse.success(response, "Document uploaded successfully"));
    }

    /**
     * Upload rating/review images
     */
    @PostMapping("/rating-image")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadRatingImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "parcelId", required = false) Long parcelId) {

        log.info("Uploading rating image for parcelId: {}", parcelId);

        String folder = parcelId != null
                ? "ratings/" + parcelId
                : "ratings/temp";
        String imageUrl = cloudinaryService.uploadImage(file, folder);

        Map<String, String> response = new HashMap<>();
        response.put("url", imageUrl);
        response.put("message", "Rating image uploaded successfully");

        return ResponseEntity.ok(ApiResponse.success(response, "Image uploaded successfully"));
    }

    /**
     * Upload agent vehicle photo
     */
    @PostMapping("/vehicle-photo")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadVehiclePhoto(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "agentId", required = false) Long agentId) {

        log.info("Uploading vehicle photo for agentId: {}", agentId);

        String folder = agentId != null
                ? "vehicles/" + agentId
                : "vehicles/temp";
        String photoUrl = cloudinaryService.uploadImage(file, folder);

        Map<String, String> response = new HashMap<>();
        response.put("url", photoUrl);
        response.put("message", "Vehicle photo uploaded successfully");

        return ResponseEntity.ok(ApiResponse.success(response, "Vehicle photo uploaded successfully"));
    }

    /**
     * Delete file from Cloudinary
     */
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteFile(
            @RequestParam("url") String cloudinaryUrl) {

        log.info("Deleting file from Cloudinary: {}", cloudinaryUrl);

        String publicId = cloudinaryService.extractPublicId(cloudinaryUrl);

        if (publicId != null && !publicId.isEmpty()) {
            cloudinaryService.deleteFile(cloudinaryUrl);
            log.info("File deleted successfully: {}", publicId);
            return ResponseEntity.ok(ApiResponse.success(null, "File deleted successfully"));
        } else {
            log.warn("Invalid Cloudinary URL: {}", cloudinaryUrl);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid Cloudinary URL", "INVALID_URL", null));
        }
    }

    /**
     * Get file info (for testing)
     */
    @GetMapping("/info")
    public ResponseEntity<ApiResponse<Map<String, String>>> getFileInfo(
            @RequestParam("url") String cloudinaryUrl) {

        String publicId = cloudinaryService.extractPublicId(cloudinaryUrl);

        Map<String, String> info = new HashMap<>();
        info.put("url", cloudinaryUrl);
        info.put("publicId", publicId);
        info.put("valid", publicId != null ? "true" : "false");

        return ResponseEntity.ok(ApiResponse.success(info, "File info retrieved"));
    }
}
