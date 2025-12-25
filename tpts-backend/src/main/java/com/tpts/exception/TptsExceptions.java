package com.tpts.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Custom exceptions for TPTS application
 */
public class TptsExceptions {

    // ==========================================
    // General Exceptions
    // ==========================================

    /**
     * Exception for resource not found (404)
     */
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public static class ResourceNotFoundException extends RuntimeException {
        public ResourceNotFoundException(String message) {
            super(message);
        }

        public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
            super(String.format("%s not found with %s: '%s'", resourceName, fieldName, fieldValue));
        }
    }

    /**
     * Exception for bad request (400)
     */
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public static class BadRequestException extends RuntimeException {
        public BadRequestException(String message) {
            super(message);
        }
    }

    /**
     * Exception for duplicate resource (409)
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class DuplicateResourceException extends RuntimeException {
        public DuplicateResourceException(String message) {
            super(message);
        }

        public DuplicateResourceException(String resourceName, String fieldName, Object fieldValue) {
            super(String.format("%s already exists with %s: '%s'", resourceName, fieldName, fieldValue));
        }
    }

    /**
     * Exception for unauthorized access (401)
     */
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public static class UnauthorizedException extends RuntimeException {
        public UnauthorizedException(String message) {
            super(message);
        }
    }

    /**
     * Exception for forbidden access (403)
     */
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public static class ForbiddenException extends RuntimeException {
        public ForbiddenException(String message) {
            super(message);
        }
    }

    // ==========================================
    // Authentication & OTP Exceptions
    // ==========================================

    /**
     * Exception for invalid OTP
     */
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public static class InvalidOtpException extends RuntimeException {
        public InvalidOtpException(String message) {
            super(message);
        }
    }

    /**
     * Exception for expired OTP
     */
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public static class OtpExpiredException extends RuntimeException {
        public OtpExpiredException(String message) {
            super(message);
        }
    }

    /**
     * Exception for invalid token
     */
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public static class InvalidTokenException extends RuntimeException {
        public InvalidTokenException(String message) {
            super(message);
        }
    }

    /**
     * Exception for expired token
     */
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public static class TokenExpiredException extends RuntimeException {
        public TokenExpiredException(String message) {
            super(message);
        }
    }

    /**
     * Exception for account not verified
     */
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public static class AccountNotVerifiedException extends RuntimeException {
        public AccountNotVerifiedException(String message) {
            super(message);
        }
    }

    /**
     * Exception for account suspended/inactive
     */
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public static class AccountInactiveException extends RuntimeException {
        public AccountInactiveException(String message) {
            super(message);
        }
    }

    /**
     * Exception for account not approved (Company)
     */
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public static class AccountNotApprovedException extends RuntimeException {
        public AccountNotApprovedException(String message) {
            super(message);
        }
    }

    // ==========================================
    // Payment Exceptions
    // ==========================================

    /**
     * Exception for payment failure
     */
    @ResponseStatus(HttpStatus.PAYMENT_REQUIRED)
    public static class PaymentFailedException extends RuntimeException {
        public PaymentFailedException(String message) {
            super(message);
        }
    }

    /**
     * Exception for payment already processed
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class PaymentAlreadyProcessedException extends RuntimeException {
        public PaymentAlreadyProcessedException(String message) {
            super(message);
        }
    }

    /**
     * Exception for invalid payment signature
     */
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public static class InvalidPaymentSignatureException extends RuntimeException {
        public InvalidPaymentSignatureException(String message) {
            super(message);
        }
    }

    /**
     * Exception for refund failure
     */
    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public static class RefundFailedException extends RuntimeException {
        public RefundFailedException(String message) {
            super(message);
        }
    }

    /**
     * Exception for insufficient funds
     */
    @ResponseStatus(HttpStatus.PAYMENT_REQUIRED)
    public static class InsufficientFundsException extends RuntimeException {
        public InsufficientFundsException(String message) {
            super(message);
        }
    }

    // ==========================================
    // Group Shipment Exceptions
    // ==========================================

    /**
     * Exception for group full
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class GroupFullException extends RuntimeException {
        public GroupFullException(String message) {
            super(message);
        }
    }

    /**
     * Exception for group closed
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class GroupClosedException extends RuntimeException {
        public GroupClosedException(String message) {
            super(message);
        }
    }

    /**
     * Exception for group deadline passed
     */
    @ResponseStatus(HttpStatus.GONE)
    public static class GroupDeadlinePassedException extends RuntimeException {
        public GroupDeadlinePassedException(String message) {
            super(message);
        }
    }

    /**
     * Exception for already joined group
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class AlreadyJoinedGroupException extends RuntimeException {
        public AlreadyJoinedGroupException(String message) {
            super(message);
        }
    }

    /**
     * Exception for route mismatch
     */
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public static class RouteMismatchException extends RuntimeException {
        public RouteMismatchException(String message) {
            super(message);
        }
    }

    // ==========================================
    // Agent Exceptions
    // ==========================================

    /**
     * Exception for agent not available
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class AgentNotAvailableException extends RuntimeException {
        public AgentNotAvailableException(String message) {
            super(message);
        }
    }

    /**
     * Exception for agent not active
     */
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public static class AgentNotActiveException extends RuntimeException {
        public AgentNotActiveException(String message) {
            super(message);
        }
    }

    /**
     * Exception for agent already assigned
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class AgentAlreadyAssignedException extends RuntimeException {
        public AgentAlreadyAssignedException(String message) {
            super(message);
        }
    }

    /**
     * Exception for no agents available
     */
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public static class NoAgentsAvailableException extends RuntimeException {
        public NoAgentsAvailableException(String message) {
            super(message);
        }
    }

    // ==========================================
    // Parcel & Delivery Exceptions
    // ==========================================

    /**
     * Exception for invalid parcel status transition
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class InvalidStatusTransitionException extends RuntimeException {
        public InvalidStatusTransitionException(String message) {
            super(message);
        }
    }

    /**
     * Exception for parcel already delivered
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class ParcelAlreadyDeliveredException extends RuntimeException {
        public ParcelAlreadyDeliveredException(String message) {
            super(message);
        }
    }

    /**
     * Exception for parcel cancelled
     */
    @ResponseStatus(HttpStatus.GONE)
    public static class ParcelCancelledException extends RuntimeException {
        public ParcelCancelledException(String message) {
            super(message);
        }
    }

    /**
     * Exception for invalid OTP verification
     */
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public static class InvalidDeliveryOtpException extends RuntimeException {
        public InvalidDeliveryOtpException(String message) {
            super(message);
        }
    }

    // ==========================================
    // Assignment Exceptions
    // ==========================================

    /**
     * Exception for assignment already responded
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class AssignmentAlreadyRespondedException extends RuntimeException {
        public AssignmentAlreadyRespondedException(String message) {
            super(message);
        }
    }

    /**
     * Exception for assignment expired
     */
    @ResponseStatus(HttpStatus.GONE)
    public static class AssignmentExpiredException extends RuntimeException {
        public AssignmentExpiredException(String message) {
            super(message);
        }
    }

    // ==========================================
    // Job Application Exceptions
    // ==========================================

    /**
     * Exception for already applied
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class AlreadyAppliedException extends RuntimeException {
        public AlreadyAppliedException(String message) {
            super(message);
        }
    }

    /**
     * Exception for company not hiring
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class CompanyNotHiringException extends RuntimeException {
        public CompanyNotHiringException(String message) {
            super(message);
        }
    }

    /**
     * Exception for application already processed
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class ApplicationAlreadyProcessedException extends RuntimeException {
        public ApplicationAlreadyProcessedException(String message) {
            super(message);
        }
    }

    // ==========================================
    // Rating Exceptions
    // ==========================================

    /**
     * Exception for already rated
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class AlreadyRatedException extends RuntimeException {
        public AlreadyRatedException(String message) {
            super(message);
        }
    }

    /**
     * Exception for cannot rate yet (parcel not delivered)
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class CannotRateYetException extends RuntimeException {
        public CannotRateYetException(String message) {
            super(message);
        }
    }

    // ==========================================
    // Notification Exceptions
    // ==========================================

    /**
     * Exception for notification send failure
     */
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public static class NotificationSendFailedException extends RuntimeException {
        public NotificationSendFailedException(String message) {
            super(message);
        }
    }

    /**
     * Exception for SMS send failure
     */
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public static class SmsSendFailedException extends RuntimeException {
        public SmsSendFailedException(String message) {
            super(message);
        }
    }

    /**
     * Exception for email send failure
     */
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public static class EmailSendFailedException extends RuntimeException {
        public EmailSendFailedException(String message) {
            super(message);
        }
    }

    // ==========================================
    // File & Upload Exceptions
    // ==========================================

    /**
     * Exception for file upload failure
     */
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public static class FileUploadException extends RuntimeException {
        public FileUploadException(String message) {
            super(message);
        }
    }

    /**
     * Exception for invalid file type
     */
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public static class InvalidFileTypeException extends RuntimeException {
        public InvalidFileTypeException(String message) {
            super(message);
        }
    }

    /**
     * Exception for file too large
     */
    @ResponseStatus(HttpStatus.PAYLOAD_TOO_LARGE)
    public static class FileTooLargeException extends RuntimeException {
        public FileTooLargeException(String message) {
            super(message);
        }
    }

    // ==========================================
    // Service Unavailable Exceptions
    // ==========================================

    /**
     * Exception for external service failure (Razorpay, Twilio, etc.)
     */
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public static class ExternalServiceException extends RuntimeException {
        public ExternalServiceException(String message) {
            super(message);
        }
    }

    /**
     * Exception for rate limit exceeded
     */
    @ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
    public static class RateLimitExceededException extends RuntimeException {
        public RateLimitExceededException(String message) {
            super(message);
        }
    }

    // ==========================================
    // Data Integrity Exceptions
    // ==========================================

    /**
     * Exception for data integrity violation
     */
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class DataIntegrityException extends RuntimeException {
        public DataIntegrityException(String message) {
            super(message);
        }
    }

    /**
     * Exception for operation not allowed
     */
    @ResponseStatus(HttpStatus.METHOD_NOT_ALLOWED)
    public static class OperationNotAllowedException extends RuntimeException {
        public OperationNotAllowedException(String message) {
            super(message);
        }
    }
}