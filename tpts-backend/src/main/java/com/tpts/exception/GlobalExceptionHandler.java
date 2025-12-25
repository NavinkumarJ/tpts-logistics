package com.tpts.exception;

import com.tpts.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.HashMap;
import java.util.Map;

/**
 * Global Exception Handler
 * Handles all exceptions and returns consistent API responses
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // ==========================================
    // Validation Exceptions
    // ==========================================

    /**
     * Handle validation errors from @Valid
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidationExceptions(
            MethodArgumentNotValidException ex, WebRequest request) {

        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        log.warn("Validation failed: {}", errors);

        ApiResponse<Object> response = ApiResponse.error(
                "Validation failed",
                "VALIDATION_ERROR",
                errors
        );
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handle missing request parameters
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Object>> handleMissingParams(
            MissingServletRequestParameterException ex, WebRequest request) {

        log.warn("Missing parameter: {}", ex.getParameterName());

        ApiResponse<Object> response = ApiResponse.error(
                String.format("Required parameter '%s' is missing", ex.getParameterName()),
                "MISSING_PARAMETER",
                null
        );
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handle type mismatch (e.g., string instead of number)
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Object>> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, WebRequest request) {

        log.warn("Type mismatch for parameter: {}", ex.getName());

        ApiResponse<Object> response = ApiResponse.error(
                String.format("Invalid value '%s' for parameter '%s'", ex.getValue(), ex.getName()),
                "TYPE_MISMATCH",
                null
        );
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handle malformed JSON
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Object>> handleMessageNotReadable(
            HttpMessageNotReadableException ex, WebRequest request) {

        log.warn("Malformed JSON request: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(
                "Malformed JSON request body",
                "INVALID_JSON",
                null
        );
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    // ==========================================
    // Resource Exceptions
    // ==========================================

    /**
     * Handle Resource Not Found
     */
    @ExceptionHandler(TptsExceptions.ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleResourceNotFoundException(
            TptsExceptions.ResourceNotFoundException ex, WebRequest request) {

        log.warn("Resource not found: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "NOT_FOUND", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    /**
     * Handle Duplicate Resource
     */
    @ExceptionHandler(TptsExceptions.DuplicateResourceException.class)
    public ResponseEntity<ApiResponse<Object>> handleDuplicateResourceException(
            TptsExceptions.DuplicateResourceException ex, WebRequest request) {

        log.warn("Duplicate resource: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "DUPLICATE_RESOURCE", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    /**
     * Handle Bad Request
     */
    @ExceptionHandler(TptsExceptions.BadRequestException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadRequestException(
            TptsExceptions.BadRequestException ex, WebRequest request) {

        log.warn("Bad request: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "BAD_REQUEST", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    // ==========================================
    // Authentication & Authorization Exceptions
    // ==========================================

    /**
     * Handle Unauthorized
     */
    @ExceptionHandler(TptsExceptions.UnauthorizedException.class)
    public ResponseEntity<ApiResponse<Object>> handleUnauthorizedException(
            TptsExceptions.UnauthorizedException ex, WebRequest request) {

        log.warn("Unauthorized: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "UNAUTHORIZED", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    /**
     * Handle Forbidden
     */
    @ExceptionHandler(TptsExceptions.ForbiddenException.class)
    public ResponseEntity<ApiResponse<Object>> handleForbiddenException(
            TptsExceptions.ForbiddenException ex, WebRequest request) {

        log.warn("Forbidden: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "FORBIDDEN", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    /**
     * Handle Spring Security Access Denied
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDeniedException(
            AccessDeniedException ex, WebRequest request) {

        log.warn("Access denied: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(
                "You don't have permission to access this resource",
                "ACCESS_DENIED",
                null
        );
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    /**
     * Handle Invalid OTP
     */
    @ExceptionHandler({TptsExceptions.InvalidOtpException.class, TptsExceptions.OtpExpiredException.class})
    public ResponseEntity<ApiResponse<Object>> handleOtpExceptions(
            RuntimeException ex, WebRequest request) {

        log.warn("OTP error: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "OTP_ERROR", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handle Invalid Token
     */
    @ExceptionHandler({TptsExceptions.InvalidTokenException.class, TptsExceptions.TokenExpiredException.class})
    public ResponseEntity<ApiResponse<Object>> handleTokenExceptions(
            RuntimeException ex, WebRequest request) {

        log.warn("Token error: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "TOKEN_ERROR", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    /**
     * Handle Account Status Exceptions
     */
    @ExceptionHandler({
            TptsExceptions.AccountNotVerifiedException.class,
            TptsExceptions.AccountInactiveException.class,
            TptsExceptions.AccountNotApprovedException.class
    })
    public ResponseEntity<ApiResponse<Object>> handleAccountStatusExceptions(
            RuntimeException ex, WebRequest request) {

        log.warn("Account status error: {}", ex.getMessage());

        String errorCode = "ACCOUNT_ERROR";
        if (ex instanceof TptsExceptions.AccountNotVerifiedException) {
            errorCode = "ACCOUNT_NOT_VERIFIED";
        } else if (ex instanceof TptsExceptions.AccountInactiveException) {
            errorCode = "ACCOUNT_INACTIVE";
        } else if (ex instanceof TptsExceptions.AccountNotApprovedException) {
            errorCode = "ACCOUNT_NOT_APPROVED";
        }

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), errorCode, null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    /**
     * Handle Bad Credentials (wrong password)
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadCredentialsException(
            BadCredentialsException ex, WebRequest request) {

        log.warn("Bad credentials: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error("Invalid email or password", "BAD_CREDENTIALS", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    /**
     * Handle Authentication Exception
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Object>> handleAuthenticationException(
            AuthenticationException ex, WebRequest request) {

        log.warn("Authentication failed: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error("Authentication failed", "AUTHENTICATION_FAILED", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    // ==========================================
    // Payment Exceptions
    // ==========================================

    /**
     * Handle Payment Exceptions
     */
    @ExceptionHandler({
            TptsExceptions.PaymentFailedException.class,
            TptsExceptions.InsufficientFundsException.class
    })
    public ResponseEntity<ApiResponse<Object>> handlePaymentExceptions(
            RuntimeException ex, WebRequest request) {

        log.error("Payment error: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "PAYMENT_ERROR", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.PAYMENT_REQUIRED);
    }

    /**
     * Handle Payment Already Processed
     */
    @ExceptionHandler(TptsExceptions.PaymentAlreadyProcessedException.class)
    public ResponseEntity<ApiResponse<Object>> handlePaymentAlreadyProcessedException(
            TptsExceptions.PaymentAlreadyProcessedException ex, WebRequest request) {

        log.warn("Payment already processed: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "PAYMENT_ALREADY_PROCESSED", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    /**
     * Handle Invalid Payment Signature
     */
    @ExceptionHandler(TptsExceptions.InvalidPaymentSignatureException.class)
    public ResponseEntity<ApiResponse<Object>> handleInvalidPaymentSignatureException(
            TptsExceptions.InvalidPaymentSignatureException ex, WebRequest request) {

        log.error("Invalid payment signature: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "INVALID_SIGNATURE", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handle Refund Failed
     */
    @ExceptionHandler(TptsExceptions.RefundFailedException.class)
    public ResponseEntity<ApiResponse<Object>> handleRefundFailedException(
            TptsExceptions.RefundFailedException ex, WebRequest request) {

        log.error("Refund failed: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "REFUND_FAILED", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    // ==========================================
    // Group Shipment Exceptions
    // ==========================================

    /**
     * Handle Group Exceptions
     */
    @ExceptionHandler({
            TptsExceptions.GroupFullException.class,
            TptsExceptions.GroupClosedException.class,
            TptsExceptions.AlreadyJoinedGroupException.class
    })
    public ResponseEntity<ApiResponse<Object>> handleGroupConflictExceptions(
            RuntimeException ex, WebRequest request) {

        log.warn("Group conflict: {}", ex.getMessage());

        String errorCode = "GROUP_ERROR";
        if (ex instanceof TptsExceptions.GroupFullException) {
            errorCode = "GROUP_FULL";
        } else if (ex instanceof TptsExceptions.GroupClosedException) {
            errorCode = "GROUP_CLOSED";
        } else if (ex instanceof TptsExceptions.AlreadyJoinedGroupException) {
            errorCode = "ALREADY_JOINED";
        }

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), errorCode, null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    /**
     * Handle Group Deadline Passed
     */
    @ExceptionHandler(TptsExceptions.GroupDeadlinePassedException.class)
    public ResponseEntity<ApiResponse<Object>> handleGroupDeadlinePassedException(
            TptsExceptions.GroupDeadlinePassedException ex, WebRequest request) {

        log.warn("Group deadline passed: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "GROUP_DEADLINE_PASSED", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.GONE);
    }

    /**
     * Handle Route Mismatch
     */
    @ExceptionHandler(TptsExceptions.RouteMismatchException.class)
    public ResponseEntity<ApiResponse<Object>> handleRouteMismatchException(
            TptsExceptions.RouteMismatchException ex, WebRequest request) {

        log.warn("Route mismatch: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "ROUTE_MISMATCH", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    // ==========================================
    // Agent Exceptions
    // ==========================================

    /**
     * Handle Agent Exceptions
     */
    @ExceptionHandler({
            TptsExceptions.AgentNotAvailableException.class,
            TptsExceptions.AgentAlreadyAssignedException.class
    })
    public ResponseEntity<ApiResponse<Object>> handleAgentConflictExceptions(
            RuntimeException ex, WebRequest request) {

        log.warn("Agent conflict: {}", ex.getMessage());

        String errorCode = ex instanceof TptsExceptions.AgentNotAvailableException
                ? "AGENT_NOT_AVAILABLE" : "AGENT_ALREADY_ASSIGNED";

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), errorCode, null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    /**
     * Handle Agent Not Active
     */
    @ExceptionHandler(TptsExceptions.AgentNotActiveException.class)
    public ResponseEntity<ApiResponse<Object>> handleAgentNotActiveException(
            TptsExceptions.AgentNotActiveException ex, WebRequest request) {

        log.warn("Agent not active: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "AGENT_NOT_ACTIVE", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    /**
     * Handle No Agents Available
     */
    @ExceptionHandler(TptsExceptions.NoAgentsAvailableException.class)
    public ResponseEntity<ApiResponse<Object>> handleNoAgentsAvailableException(
            TptsExceptions.NoAgentsAvailableException ex, WebRequest request) {

        log.warn("No agents available: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "NO_AGENTS_AVAILABLE", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.SERVICE_UNAVAILABLE);
    }

    // ==========================================
    // Parcel & Delivery Exceptions
    // ==========================================

    /**
     * Handle Parcel Status Exceptions
     */
    @ExceptionHandler({
            TptsExceptions.InvalidStatusTransitionException.class,
            TptsExceptions.ParcelAlreadyDeliveredException.class
    })
    public ResponseEntity<ApiResponse<Object>> handleParcelStatusExceptions(
            RuntimeException ex, WebRequest request) {

        log.warn("Parcel status error: {}", ex.getMessage());

        String errorCode = ex instanceof TptsExceptions.InvalidStatusTransitionException
                ? "INVALID_STATUS_TRANSITION" : "PARCEL_ALREADY_DELIVERED";

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), errorCode, null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    /**
     * Handle Parcel Cancelled
     */
    @ExceptionHandler(TptsExceptions.ParcelCancelledException.class)
    public ResponseEntity<ApiResponse<Object>> handleParcelCancelledException(
            TptsExceptions.ParcelCancelledException ex, WebRequest request) {

        log.warn("Parcel cancelled: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "PARCEL_CANCELLED", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.GONE);
    }

    /**
     * Handle Invalid Delivery OTP
     */
    @ExceptionHandler(TptsExceptions.InvalidDeliveryOtpException.class)
    public ResponseEntity<ApiResponse<Object>> handleInvalidDeliveryOtpException(
            TptsExceptions.InvalidDeliveryOtpException ex, WebRequest request) {

        log.warn("Invalid delivery OTP: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "INVALID_DELIVERY_OTP", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    // ==========================================
    // Assignment Exceptions
    // ==========================================

    /**
     * Handle Assignment Exceptions
     */
    @ExceptionHandler(TptsExceptions.AssignmentAlreadyRespondedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAssignmentAlreadyRespondedException(
            TptsExceptions.AssignmentAlreadyRespondedException ex, WebRequest request) {

        log.warn("Assignment already responded: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "ASSIGNMENT_ALREADY_RESPONDED", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    /**
     * Handle Assignment Expired
     */
    @ExceptionHandler(TptsExceptions.AssignmentExpiredException.class)
    public ResponseEntity<ApiResponse<Object>> handleAssignmentExpiredException(
            TptsExceptions.AssignmentExpiredException ex, WebRequest request) {

        log.warn("Assignment expired: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "ASSIGNMENT_EXPIRED", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.GONE);
    }

    // ==========================================
    // Job Application Exceptions
    // ==========================================

    /**
     * Handle Job Application Exceptions
     */
    @ExceptionHandler({
            TptsExceptions.AlreadyAppliedException.class,
            TptsExceptions.CompanyNotHiringException.class,
            TptsExceptions.ApplicationAlreadyProcessedException.class
    })
    public ResponseEntity<ApiResponse<Object>> handleJobApplicationExceptions(
            RuntimeException ex, WebRequest request) {

        log.warn("Job application error: {}", ex.getMessage());

        String errorCode = "JOB_APPLICATION_ERROR";
        if (ex instanceof TptsExceptions.AlreadyAppliedException) {
            errorCode = "ALREADY_APPLIED";
        } else if (ex instanceof TptsExceptions.CompanyNotHiringException) {
            errorCode = "COMPANY_NOT_HIRING";
        } else if (ex instanceof TptsExceptions.ApplicationAlreadyProcessedException) {
            errorCode = "APPLICATION_ALREADY_PROCESSED";
        }

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), errorCode, null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    // ==========================================
    // Rating Exceptions
    // ==========================================

    /**
     * Handle Rating Exceptions
     */
    @ExceptionHandler({
            TptsExceptions.AlreadyRatedException.class,
            TptsExceptions.CannotRateYetException.class
    })
    public ResponseEntity<ApiResponse<Object>> handleRatingExceptions(
            RuntimeException ex, WebRequest request) {

        log.warn("Rating error: {}", ex.getMessage());

        String errorCode = ex instanceof TptsExceptions.AlreadyRatedException
                ? "ALREADY_RATED" : "CANNOT_RATE_YET";

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), errorCode, null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    // ==========================================
    // Notification Exceptions
    // ==========================================

    /**
     * Handle Notification Exceptions
     */
    @ExceptionHandler({
            TptsExceptions.NotificationSendFailedException.class,
            TptsExceptions.SmsSendFailedException.class,
            TptsExceptions.EmailSendFailedException.class
    })
    public ResponseEntity<ApiResponse<Object>> handleNotificationExceptions(
            RuntimeException ex, WebRequest request) {

        log.error("Notification error: {}", ex.getMessage());

        String errorCode = "NOTIFICATION_ERROR";
        if (ex instanceof TptsExceptions.SmsSendFailedException) {
            errorCode = "SMS_SEND_FAILED";
        } else if (ex instanceof TptsExceptions.EmailSendFailedException) {
            errorCode = "EMAIL_SEND_FAILED";
        }

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), errorCode, null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.SERVICE_UNAVAILABLE);
    }

    // ==========================================
    // File Upload Exceptions
    // ==========================================

    /**
     * Handle File Upload Exceptions
     */
    @ExceptionHandler({
            TptsExceptions.FileUploadException.class,
            TptsExceptions.InvalidFileTypeException.class
    })
    public ResponseEntity<ApiResponse<Object>> handleFileExceptions(
            RuntimeException ex, WebRequest request) {

        log.error("File error: {}", ex.getMessage());

        String errorCode = ex instanceof TptsExceptions.InvalidFileTypeException
                ? "INVALID_FILE_TYPE" : "FILE_UPLOAD_ERROR";
        HttpStatus status = ex instanceof TptsExceptions.InvalidFileTypeException
                ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR;

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), errorCode, null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, status);
    }

    /**
     * Handle File Too Large
     */
    @ExceptionHandler({TptsExceptions.FileTooLargeException.class, MaxUploadSizeExceededException.class})
    public ResponseEntity<ApiResponse<Object>> handleFileTooLargeException(
            Exception ex, WebRequest request) {

        log.warn("File too large: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(
                "File size exceeds the maximum allowed limit",
                "FILE_TOO_LARGE",
                null
        );
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.PAYLOAD_TOO_LARGE);
    }

    // ==========================================
    // Service & Rate Limit Exceptions
    // ==========================================

    /**
     * Handle External Service Exception
     */
    @ExceptionHandler(TptsExceptions.ExternalServiceException.class)
    public ResponseEntity<ApiResponse<Object>> handleExternalServiceException(
            TptsExceptions.ExternalServiceException ex, WebRequest request) {

        log.error("External service error: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(
                "External service is temporarily unavailable. Please try again later.",
                "EXTERNAL_SERVICE_ERROR",
                null
        );
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.SERVICE_UNAVAILABLE);
    }

    /**
     * Handle Rate Limit Exceeded
     */
    @ExceptionHandler(TptsExceptions.RateLimitExceededException.class)
    public ResponseEntity<ApiResponse<Object>> handleRateLimitExceededException(
            TptsExceptions.RateLimitExceededException ex, WebRequest request) {

        log.warn("Rate limit exceeded: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(
                "Too many requests. Please try again later.",
                "RATE_LIMIT_EXCEEDED",
                null
        );
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.TOO_MANY_REQUESTS);
    }

    // ==========================================
    // Data Integrity Exceptions
    // ==========================================

    /**
     * Handle Data Integrity Exception
     */
    @ExceptionHandler({TptsExceptions.DataIntegrityException.class, DataIntegrityViolationException.class})
    public ResponseEntity<ApiResponse<Object>> handleDataIntegrityException(
            Exception ex, WebRequest request) {

        log.error("Data integrity error: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(
                "Data integrity violation. The operation could not be completed.",
                "DATA_INTEGRITY_ERROR",
                null
        );
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    /**
     * Handle Operation Not Allowed
     */
    @ExceptionHandler(TptsExceptions.OperationNotAllowedException.class)
    public ResponseEntity<ApiResponse<Object>> handleOperationNotAllowedException(
            TptsExceptions.OperationNotAllowedException ex, WebRequest request) {

        log.warn("Operation not allowed: {}", ex.getMessage());

        ApiResponse<Object> response = ApiResponse.error(ex.getMessage(), "OPERATION_NOT_ALLOWED", null);
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.METHOD_NOT_ALLOWED);
    }

    // ==========================================
    // HTTP Method & Media Type Exceptions
    // ==========================================

    /**
     * Handle Method Not Supported
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Object>> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex, WebRequest request) {

        log.warn("Method not supported: {}", ex.getMethod());

        ApiResponse<Object> response = ApiResponse.error(
                String.format("HTTP method '%s' is not supported for this endpoint", ex.getMethod()),
                "METHOD_NOT_ALLOWED",
                null
        );
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.METHOD_NOT_ALLOWED);
    }

    /**
     * Handle Media Type Not Supported
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Object>> handleMediaTypeNotSupported(
            HttpMediaTypeNotSupportedException ex, WebRequest request) {

        log.warn("Media type not supported: {}", ex.getContentType());

        ApiResponse<Object> response = ApiResponse.error(
                String.format("Media type '%s' is not supported", ex.getContentType()),
                "UNSUPPORTED_MEDIA_TYPE",
                null
        );
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    /**
     * Handle No Handler Found (404 for endpoints)
     */
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleNoHandlerFound(
            NoHandlerFoundException ex, WebRequest request) {

        log.warn("No handler found: {} {}", ex.getHttpMethod(), ex.getRequestURL());

        ApiResponse<Object> response = ApiResponse.error(
                String.format("No endpoint found for %s %s", ex.getHttpMethod(), ex.getRequestURL()),
                "ENDPOINT_NOT_FOUND",
                null
        );
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    // ==========================================
    // Catch-all Exception Handler
    // ==========================================

    /**
     * Handle all other exceptions
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGlobalException(
            Exception ex, WebRequest request) {

        log.error("Unexpected error: ", ex);

        ApiResponse<Object> response = ApiResponse.error(
                "An unexpected error occurred. Please try again later.",
                "INTERNAL_ERROR",
                null
        );
        response.setPath(getPath(request));

        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private String getPath(WebRequest request) {
        return request.getDescription(false).replace("uri=", "");
    }
}