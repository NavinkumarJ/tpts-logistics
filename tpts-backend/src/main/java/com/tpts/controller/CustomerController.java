package com.tpts.controller;

import com.tpts.dto.request.ChangePasswordRequest;
import com.tpts.dto.request.CreateAddressRequest;
import com.tpts.dto.request.UpdateAddressRequest;
import com.tpts.dto.request.UpdateCustomerRequest;
import com.tpts.dto.response.AddressDTO;
import com.tpts.dto.response.ApiResponse;
import com.tpts.dto.response.CustomerDTO;
import com.tpts.dto.response.CustomerDashboardDTO;
import com.tpts.entity.User;
import com.tpts.service.AddressService;
import com.tpts.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile; // ← Add this
import com.tpts.service.CloudinaryService; // ← Add this
import java.util.Map; // ← Add this
import java.util.List;

/**
 * Customer Controller
 * Handles all customer-related endpoints
 *
 * Endpoints:
 * - GET /api/customers/me - Get current customer profile
 * - GET /api/customers/{id} - Get customer by ID
 * - PUT /api/customers/{id} - Update customer profile
 * - GET /api/customers/{id}/dashboard - Get customer dashboard
 *
 * Address Endpoints:
 * - GET /api/customers/{customerId}/addresses - Get all addresses
 * - POST /api/customers/{customerId}/addresses - Create new address
 * - GET /api/customers/{customerId}/addresses/{id} - Get address by ID
 * - PUT /api/customers/{customerId}/addresses/{id} - Update address
 * - DELETE /api/customers/{customerId}/addresses/{id} - Delete address
 * - PATCH /api/customers/{customerId}/addresses/{id}/default - Set as default
 */
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerController {

    private final CustomerService customerService;
    private final AddressService addressService;
    private final CloudinaryService cloudinaryService; // ← Add this

    // ==========================================
    // Customer Profile Endpoints
    // ==========================================

    /**
     * Get current logged-in customer profile
     * GET /api/customers/me
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<CustomerDTO>> getCurrentCustomer(
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting profile for current user: {}", currentUser.getEmail());

        CustomerDTO customer = customerService.getCustomerByUser(currentUser);

        return ResponseEntity.ok(ApiResponse.success(customer, "Customer profile retrieved"));
    }

    /**
     * Get customer by ID
     * GET /api/customers/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerDTO>> getCustomerById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting customer by ID: {}", id);

        // Verify ownership
        customerService.verifyCustomerOwnership(id, currentUser);

        CustomerDTO customer = customerService.getCustomerById(id);

        return ResponseEntity.ok(ApiResponse.success(customer, "Customer retrieved"));
    }

    /**
     * Update customer profile
     * PUT /api/customers/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerDTO>> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCustomerRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Updating customer: {}", id);

        CustomerDTO customer = customerService.updateCustomer(id, request, currentUser);

        return ResponseEntity.ok(ApiResponse.success(customer, "Customer profile updated"));
    }

    @PutMapping("/{id}/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @PathVariable Long id,
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Changing password for customer: {}", id);

        customerService.changePassword(id, request, currentUser);

        return ResponseEntity.ok(ApiResponse.success("Password changed successfully"));
    }

    /**
     * Get customer dashboard
     * GET /api/customers/{id}/dashboard
     */
    @GetMapping("/{id}/dashboard")
    public ResponseEntity<ApiResponse<CustomerDashboardDTO>> getCustomerDashboard(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting dashboard for customer: {}", id);

        CustomerDashboardDTO dashboard = customerService.getCustomerDashboard(id, currentUser);

        return ResponseEntity.ok(ApiResponse.success(dashboard, "Dashboard retrieved"));
    }

    // ==========================================
    // Address Endpoints
    // ==========================================

    /**
     * Get all addresses for a customer
     * GET /api/customers/{customerId}/addresses
     */
    @GetMapping("/{customerId}/addresses")
    public ResponseEntity<ApiResponse<List<AddressDTO>>> getAddresses(
            @PathVariable Long customerId,
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting addresses for customer: {}", customerId);

        List<AddressDTO> addresses = addressService.getAddressesByCustomerId(customerId, currentUser);

        return ResponseEntity.ok(ApiResponse.success(addresses, "Addresses retrieved"));
    }

    /**
     * Create a new address
     * POST /api/customers/{customerId}/addresses
     */
    @PostMapping("/{customerId}/addresses")
    public ResponseEntity<ApiResponse<AddressDTO>> createAddress(
            @PathVariable Long customerId,
            @Valid @RequestBody CreateAddressRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Creating address for customer: {}", customerId);

        AddressDTO address = addressService.createAddress(customerId, request, currentUser);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(address, "Address created successfully"));
    }

    /**
     * Get address by ID
     * GET /api/customers/{customerId}/addresses/{addressId}
     */
    @GetMapping("/{customerId}/addresses/{addressId}")
    public ResponseEntity<ApiResponse<AddressDTO>> getAddressById(
            @PathVariable Long customerId,
            @PathVariable Long addressId,
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting address {} for customer {}", addressId, customerId);

        AddressDTO address = addressService.getAddressById(customerId, addressId, currentUser);

        return ResponseEntity.ok(ApiResponse.success(address, "Address retrieved"));
    }

    /**
     * Update an address
     * PUT /api/customers/{customerId}/addresses/{addressId}
     */
    @PutMapping("/{customerId}/addresses/{addressId}")
    public ResponseEntity<ApiResponse<AddressDTO>> updateAddress(
            @PathVariable Long customerId,
            @PathVariable Long addressId,
            @Valid @RequestBody UpdateAddressRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Updating address {} for customer {}", addressId, customerId);

        AddressDTO address = addressService.updateAddress(customerId, addressId, request, currentUser);

        return ResponseEntity.ok(ApiResponse.success(address, "Address updated successfully"));
    }

    /**
     * Delete an address
     * DELETE /api/customers/{customerId}/addresses/{addressId}
     */
    @DeleteMapping("/{customerId}/addresses/{addressId}")
    public ResponseEntity<ApiResponse<Void>> deleteAddress(
            @PathVariable Long customerId,
            @PathVariable Long addressId,
            @AuthenticationPrincipal User currentUser) {

        log.info("Deleting address {} for customer {}", addressId, customerId);

        addressService.deleteAddress(customerId, addressId, currentUser);

        return ResponseEntity.ok(ApiResponse.success("Address deleted successfully"));
    }

    /**
     * Set address as default
     * PATCH /api/customers/{customerId}/addresses/{addressId}/default
     */
    @PatchMapping("/{customerId}/addresses/{addressId}/default")
    public ResponseEntity<ApiResponse<AddressDTO>> setDefaultAddress(
            @PathVariable Long customerId,
            @PathVariable Long addressId,
            @AuthenticationPrincipal User currentUser) {

        log.info("Setting address {} as default for customer {}", addressId, customerId);

        AddressDTO address = addressService.setDefaultAddress(customerId, addressId, currentUser);

        return ResponseEntity.ok(ApiResponse.success(address, "Default address updated"));
    }

    /**
     * Get default address
     * GET /api/customers/{customerId}/addresses/default
     */
    @GetMapping("/{customerId}/addresses/default")
    public ResponseEntity<ApiResponse<AddressDTO>> getDefaultAddress(
            @PathVariable Long customerId,
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting default address for customer: {}", customerId);

        AddressDTO address = addressService.getDefaultAddress(customerId, currentUser);

        return ResponseEntity.ok(ApiResponse.success(address, "Default address retrieved"));
    }

    /**
     * Upload profile image
     * POST /api/customers/{id}/upload-image
     */
    @PostMapping("/{id}/upload-image")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadProfileImage(
            @PathVariable Long id,
            @RequestParam("image") MultipartFile image,
            @AuthenticationPrincipal User currentUser) {

        log.info("Uploading profile image for customer: {}", id);

        try {
            // Verify ownership
            customerService.verifyCustomerOwnership(id, currentUser);

            // Upload to Cloudinary
            String imageUrl = cloudinaryService.uploadImage(image, "customer_profiles");

            // Update customer profile with image URL
            customerService.updateProfileImage(id, imageUrl);

            return ResponseEntity.ok(ApiResponse.success(
                    Map.of("profileImageUrl", imageUrl), // ✅ Key name matters!
                    "Profile image uploaded successfully"));
        } catch (Exception e) {
            log.error("Error uploading profile image", e);
            throw new RuntimeException("Failed to upload profile image");
        }
    }

    /**
     * Remove profile image
     * DELETE /api/customers/{id}/profile-image
     */
    @DeleteMapping("/{id}/profile-image")
    public ResponseEntity<ApiResponse<Void>> removeProfileImage(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        log.info("Removing profile image for customer: {}", id);

        // Verify ownership
        customerService.verifyCustomerOwnership(id, currentUser);

        // Remove image URL from customer profile
        customerService.updateProfileImage(id, null);

        return ResponseEntity.ok(ApiResponse.success("Profile image removed successfully"));
    }

    /**
     * Delete customer account
     * DELETE /api/customers/{id}/account
     */
    @DeleteMapping("/{id}/account")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(
            @PathVariable Long id,
            @RequestParam String password,
            @AuthenticationPrincipal User currentUser) {

        log.info("Deleting account for customer: {}", id);

        customerService.deleteAccount(id, password, currentUser);

        return ResponseEntity.ok(ApiResponse.success("Account deleted successfully"));
    }
}