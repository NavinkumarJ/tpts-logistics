package com.tpts.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.tpts.exception.TptsExceptions;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

/**
 * Cloudinary Image Upload Service
 * Handles image/document uploads to Cloudinary
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CloudinaryService {

    private final Cloudinary cloudinary;

    // Allowed image types
    private static final String[] ALLOWED_IMAGE_TYPES = { "image/jpeg", "image/jpg", "image/png", "image/webp" };

    // Allowed document types
    private static final String[] ALLOWED_DOCUMENT_TYPES = { "application/pdf" };

    // Max file sizes (in bytes)
    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final long MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

    /**
     * Upload profile image
     */
    public String uploadProfileImage(MultipartFile file, Long userId) {
        validateImageFile(file);
        String folder = "tpts/profiles";
        String publicId = "profile_" + userId + "_" + UUID.randomUUID();
        return uploadFile(file, folder, publicId, true);
    }

    /**
     * Generic image upload method
     * Used by CustomerController and other generic uploads
     */
    public String uploadImage(MultipartFile file, String folderName) {
        validateImageFile(file);
        String folder = "tpts/" + folderName;
        String publicId = UUID.randomUUID().toString();
        return uploadFile(file, folder, publicId, true);
    }

    /**
     * Upload parcel pickup/delivery photo
     */
    public String uploadDeliveryProof(MultipartFile file, String trackingNumber, String type) {
        validateImageFile(file);
        String folder = "tpts/deliveries/" + trackingNumber;
        String publicId = type + "_" + System.currentTimeMillis();
        return uploadFile(file, folder, publicId, false);
    }

    /**
     * Upload digital signature
     */
    public String uploadSignature(MultipartFile file, String trackingNumber) {
        validateImageFile(file);
        String folder = "tpts/signatures";
        String publicId = "signature_" + trackingNumber + "_" + System.currentTimeMillis();
        return uploadFile(file, folder, publicId, false);
    }

    /**
     * Upload job application document
     */
    public String uploadJobDocument(MultipartFile file, Long applicationId, String docType) {
        // Allow both images and PDFs for documents
        if (!isValidImage(file) && !isValidDocument(file)) {
            throw new TptsExceptions.InvalidFileTypeException(
                    "File must be an image (JPG, PNG) or PDF");
        }

        if (file.getSize() > MAX_DOCUMENT_SIZE) {
            throw new TptsExceptions.FileTooLargeException(
                    "Document size cannot exceed 10MB");
        }

        String folder = "tpts/applications/" + applicationId;
        String publicId = docType + "_" + System.currentTimeMillis();
        return uploadFile(file, folder, publicId, false);
    }

    /**
     * Upload company logo
     */
    public String uploadCompanyLogo(MultipartFile file, Long companyId) {
        validateImageFile(file);
        String folder = "tpts/companies";
        String publicId = "logo_" + companyId + "_" + UUID.randomUUID();
        return uploadFile(file, folder, publicId, true);
    }

    /**
     * Core upload method
     * ✅ FIXED: Removed transformation parameters causing errors
     */
    private String uploadFile(MultipartFile file, String folder, String publicId, boolean optimize) {
        try {
            log.info("Uploading file: {} to folder: {}", file.getOriginalFilename(), folder);

            boolean isPdf = file.getContentType() != null &&
                    file.getContentType().equalsIgnoreCase("application/pdf");

            Map<String, Object> uploadParams;

            if (isPdf) {
                // ✅ For PDF files - upload as 'image' for inline viewing in browser
                // flags: "attachment:false" ensures PDFs open in browser, not download
                log.info("Uploading PDF file as 'image' for inline viewing");
                uploadParams = ObjectUtils.asMap(
                        "folder", folder,
                        "public_id", publicId,
                        "resource_type", "image",
                        "format", "pdf",
                        "overwrite", true,
                        "type", "upload",
                        "access_mode", "public",
                        "flags", "attachment:false");
            } else {
                // For images - can include optimization
                uploadParams = ObjectUtils.asMap(
                        "folder", folder,
                        "public_id", publicId,
                        "resource_type", "auto",
                        "overwrite", true,
                        "access_mode", "public",
                        "type", "upload");

                if (optimize && isValidImage(file)) {
                    uploadParams.put("quality", "auto:good");
                }
            }

            // Upload to Cloudinary
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), uploadParams);

            String secureUrl = (String) uploadResult.get("secure_url");
            log.info("✅ File uploaded successfully: {}", secureUrl);

            return secureUrl;

        } catch (IOException e) {
            log.error("❌ Failed to upload file to Cloudinary: {}", e.getMessage(), e);
            throw new TptsExceptions.FileUploadException("Failed to upload file: " + e.getMessage());
        } catch (Exception e) {
            log.error("❌ Unexpected error during upload: {}", e.getMessage(), e);
            throw new TptsExceptions.FileUploadException("Unexpected error during upload: " + e.getMessage());
        }
    }

    /**
     * Delete file from Cloudinary
     */
    public void deleteFile(String publicId) {
        try {
            log.info("Deleting file: {}", publicId);
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("✅ File deleted successfully");
        } catch (Exception e) {
            log.error("❌ Failed to delete file from Cloudinary: {}", e.getMessage());
            // Don't throw exception - deletion failure is not critical
        }
    }

    /**
     * Delete image by URL
     */
    public void deleteImage(String cloudinaryUrl) {
        String publicId = extractPublicId(cloudinaryUrl);
        if (publicId != null && !publicId.isEmpty()) {
            deleteFile(publicId);
        }
    }

    /**
     * Extract public ID from Cloudinary URL
     * Example URL:
     * https://res.cloudinary.com/cloud-name/image/upload/v1234567890/tpts/folder/file.jpg
     * Returns: tpts/folder/file
     */
    public String extractPublicId(String cloudinaryUrl) {
        if (cloudinaryUrl == null || !cloudinaryUrl.contains("cloudinary.com")) {
            log.warn("Invalid Cloudinary URL: {}", cloudinaryUrl);
            return null;
        }

        try {
            // URL format:
            // https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{format}
            String[] parts = cloudinaryUrl.split("/upload/");
            if (parts.length < 2) {
                log.warn("Cannot extract public ID from URL: {}", cloudinaryUrl);
                return null;
            }

            String path = parts[1];

            // Remove version number (v1234567890/)
            path = path.replaceFirst("v\\d+/", "");

            // Remove file extension
            int dotIndex = path.lastIndexOf('.');
            if (dotIndex > 0) {
                path = path.substring(0, dotIndex);
            }

            log.debug("Extracted public ID: {} from URL: {}", path, cloudinaryUrl);
            return path;

        } catch (Exception e) {
            log.error("Error extracting public ID from URL: {}", cloudinaryUrl, e);
            return null;
        }
    }

    /**
     * Validate image file
     */
    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            log.error("File validation failed: File is null or empty");
            throw new TptsExceptions.BadRequestException("File is required");
        }

        if (!isValidImage(file)) {
            log.error("File validation failed: Invalid image type - {}", file.getContentType());
            throw new TptsExceptions.InvalidFileTypeException(
                    "File must be an image (JPG, PNG, WEBP)");
        }

        if (file.getSize() > MAX_IMAGE_SIZE) {
            log.error("File validation failed: Size {} exceeds maximum {}",
                    file.getSize(), MAX_IMAGE_SIZE);
            throw new TptsExceptions.FileTooLargeException(
                    "Image size cannot exceed 5MB");
        }

        log.info("✅ File validation passed: {} ({} bytes)",
                file.getOriginalFilename(), file.getSize());
    }

    /**
     * Check if file is valid image
     * Uses startsWith to handle all image MIME types
     */
    private boolean isValidImage(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null) {
            return false;
        }

        // Accept any image MIME type (image/jpeg, image/png, image/webp, etc.)
        return contentType.toLowerCase().startsWith("image/");
    }

    /**
     * Check if file is valid document
     */
    private boolean isValidDocument(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null) {
            return false;
        }

        for (String allowedType : ALLOWED_DOCUMENT_TYPES) {
            if (contentType.equalsIgnoreCase(allowedType)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get human-readable file size
     */
    private String getReadableFileSize(long size) {
        if (size < 1024) {
            return size + " B";
        }
        int exp = (int) (Math.log(size) / Math.log(1024));
        char unit = "KMGTPE".charAt(exp - 1);
        return String.format("%.1f %sB", size / Math.pow(1024, exp), unit);
    }

    /**
     * Check if URL is valid Cloudinary URL
     */
    public boolean isCloudinaryUrl(String url) {
        return url != null && url.contains("cloudinary.com");
    }

    /**
     * Get file info from URL
     */
    public Map<String, String> getFileInfo(String cloudinaryUrl) {
        String publicId = extractPublicId(cloudinaryUrl);
        return ObjectUtils.asMap(
                "url", cloudinaryUrl,
                "publicId", publicId,
                "valid", String.valueOf(publicId != null));
    }
}
