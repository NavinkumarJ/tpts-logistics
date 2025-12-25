package com.tpts.service;

import com.tpts.dto.request.ChangePasswordRequest;
import com.tpts.dto.request.UpdateCustomerRequest;
import com.tpts.dto.response.AddressDTO;
import com.tpts.dto.response.CustomerDTO;
import com.tpts.dto.response.CustomerDashboardDTO;
import com.tpts.entity.Address;
import com.tpts.entity.Customer;
import com.tpts.entity.User;
import com.tpts.entity.Parcel;
import com.tpts.entity.ParcelStatus;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.AddressRepository;
import com.tpts.repository.CustomerRepository;
import com.tpts.repository.ParcelRepository;
import com.tpts.repository.RatingRepository;
import com.tpts.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for Customer operations
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final AddressRepository addressRepository;
    private final UserRepository userRepository;
    private final ParcelRepository parcelRepository;
    private final RatingRepository ratingRepository;
    private final PasswordEncoder passwordEncoder;

    // ==========================================
    // Get Customer Profile
    // ==========================================

    /**
     * Get customer by ID
     */
    public CustomerDTO getCustomerById(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));

        return mapToDTO(customer);
    }

    /**
     * Get customer by User ID
     */
    public CustomerDTO getCustomerByUserId(Long userId) {
        Customer customer = customerRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "userId", userId));

        return mapToDTO(customer);
    }

    /**
     * Get customer by User
     */
    public CustomerDTO getCustomerByUser(User user) {
        Customer customer = customerRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        return mapToDTO(customer);
    }

    // ==========================================
    // Update Customer Profile
    // ==========================================

    /**
     * Update customer profile
     */
    @Transactional
    public CustomerDTO updateCustomer(Long customerId, UpdateCustomerRequest request, User currentUser) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));

        // Security check: User can only update their own profile
        if (!customer.getUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You can only update your own profile");
        }

        // Update fields if provided
        if (request.getFullName() != null) {
            customer.setFullName(request.getFullName());
        }
        if (request.getProfileImageUrl() != null) {
            customer.setProfileImageUrl(request.getProfileImageUrl());
        }
        if (request.getCity() != null) {
            customer.setCity(request.getCity());
        }
        if (request.getPincode() != null) {
            customer.setPincode(request.getPincode());
        }
        if (request.getDefaultAddressId() != null) {
            // Verify address belongs to customer
            if (!addressRepository.existsByIdAndCustomerId(request.getDefaultAddressId(), customerId)) {
                throw new BadRequestException("Invalid address ID");
            }
            customer.setDefaultAddressId(request.getDefaultAddressId());
        }

        customer = customerRepository.save(customer);
        log.info("Customer {} updated profile", customerId);

        return mapToDTO(customer);
    }

    // ==========================================
    // Customer Dashboard
    // ==========================================

    /**
     * Get customer dashboard data
     */
    public CustomerDashboardDTO getCustomerDashboard(Long customerId, User currentUser) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));

        // Security check
        if (!customer.getUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You can only access your own dashboard");
        }

        // Get addresses
        List<Address> addresses = addressRepository.findByCustomerIdOrderByIsDefaultDesc(customerId);
        List<AddressDTO> addressDTOs = addresses.stream()
                .map(this::mapAddressToDTO)
                .collect(Collectors.toList());

        // Get parcels for stats and recent list
        List<Parcel> allParcels = parcelRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);

        int totalShipments = allParcels.size();
        int activeShipments = (int) allParcels.stream()
                .filter(p -> List.of(ParcelStatus.CONFIRMED, ParcelStatus.ASSIGNED,
                        ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT, ParcelStatus.OUT_FOR_DELIVERY)
                        .contains(p.getStatus()))
                .count();
        int completedShipments = (int) allParcels.stream()
                .filter(p -> p.getStatus() == ParcelStatus.DELIVERED)
                .count();
        int pendingShipments = (int) allParcels.stream()
                .filter(p -> p.getStatus() == ParcelStatus.PENDING)
                .count();

        CustomerDashboardDTO.DashboardStats stats = CustomerDashboardDTO.DashboardStats.builder()
                .totalShipments(totalShipments)
                .activeShipments(activeShipments)
                .completedShipments(completedShipments)
                .pendingShipments(pendingShipments)
                .totalAddresses(addresses.size())
                .build();

        // Get recent parcels (limit to 10)
        List<com.tpts.dto.response.ParcelDTO> recentParcels = allParcels.stream()
                .limit(10)
                .map(this::mapParcelToDTO)
                .collect(Collectors.toList());

        return CustomerDashboardDTO.builder()
                .customer(mapToDTO(customer))
                .stats(stats)
                .savedAddresses(addressDTOs)
                .recentParcels(recentParcels)
                .build();
    }

    @Transactional
    public void changePassword(Long customerId, ChangePasswordRequest request, User currentUser) {
        log.info("Changing password for customer: {}", customerId);

        // Get customer and verify ownership
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));

        // Security check
        if (!customer.getUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You can only change your own password");
        }

        // Verify current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), currentUser.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        // Validate new password is different
        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new BadRequestException("New password must be different from current password");
        }

        // Update password
        currentUser.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(currentUser);

        log.info("Password changed successfully for customer: {}", customerId);
    }

    /**
     * Update customer profile image
     */
    @Transactional
    public void updateProfileImage(Long customerId, String imageUrl) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));

        customer.setProfileImageUrl(imageUrl);
        customerRepository.save(customer);

        log.info("Updated profile image for customer: {}", customerId);
    }

    /**
     * Verify customer ownership
     */
    public void verifyCustomerOwnership(Long customerId, User currentUser) {
        Customer customer = customerRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        if (!customer.getId().equals(customerId)) {
            throw new ForbiddenException("You can only access your own profile");
        }
    }

    /**
     * Get Customer entity by ID (internal use)
     */
    public Customer getCustomerEntity(Long customerId) {
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
    }

    /**
     * Delete customer account
     */
    @Transactional
    public void deleteAccount(Long customerId, String password, User currentUser) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));

        // Security check
        if (!customer.getUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You can only delete your own account");
        }

        // Verify password
        if (!passwordEncoder.matches(password, currentUser.getPassword())) {
            throw new BadRequestException("Incorrect password");
        }

        // Delete addresses
        addressRepository.deleteByCustomerId(customerId);

        // Delete customer record
        customerRepository.delete(customer);

        // Deactivate user account (soft delete)
        currentUser.setIsActive(false);
        userRepository.save(currentUser);

        log.info("Account deleted for customer: {}", customerId);
    }

    // ==========================================
    // Mapper Methods
    // ==========================================

    /**
     * Map Customer entity to DTO
     */
    public CustomerDTO mapToDTO(Customer customer) {
        Long customerId = customer.getId();

        // Calculate order stats
        List<Parcel> parcels = parcelRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        int totalOrders = parcels.size();
        int completedOrders = (int) parcels.stream()
                .filter(p -> p.getStatus() == ParcelStatus.DELIVERED)
                .count();
        int activeOrders = (int) parcels.stream()
                .filter(p -> List.of(ParcelStatus.CONFIRMED, ParcelStatus.ASSIGNED,
                        ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT, ParcelStatus.OUT_FOR_DELIVERY)
                        .contains(p.getStatus()))
                .count();
        int savedAddressesCount = (int) addressRepository.countByCustomerId(customerId);

        CustomerDTO dto = CustomerDTO.builder()
                .id(customer.getId())
                .userId(customer.getUser().getId())
                .email(customer.getUser().getEmail())
                .phone(customer.getUser().getPhone())
                .fullName(customer.getFullName())
                .profileImageUrl(customer.getProfileImageUrl())
                .city(customer.getCity())
                .pincode(customer.getPincode())
                .defaultAddressId(customer.getDefaultAddressId())
                .isVerified(customer.getUser().getIsVerified())
                .createdAt(customer.getCreatedAt())
                .updatedAt(customer.getUpdatedAt())
                // Stats
                .totalOrders(totalOrders)
                .completedOrders(completedOrders)
                .activeOrders(activeOrders)
                .savedAddressesCount(savedAddressesCount)
                .build();

        // Add default address if exists
        if (customer.getDefaultAddressId() != null) {
            addressRepository.findById(customer.getDefaultAddressId())
                    .ifPresent(address -> dto.setDefaultAddress(mapAddressToDTO(address)));
        }

        return dto;
    }

    /**
     * Map Address entity to DTO
     */
    public AddressDTO mapAddressToDTO(Address address) {
        String fullAddress = buildFullAddress(address);

        return AddressDTO.builder()
                .id(address.getId())
                .customerId(address.getCustomer().getId())
                .label(address.getLabel())
                .fullName(address.getFullName())
                .phone(address.getPhone())
                .addressLine1(address.getAddressLine1())
                .addressLine2(address.getAddressLine2())
                .landmark(address.getLandmark())
                .city(address.getCity())
                .state(address.getState())
                .pincode(address.getPincode())
                .latitude(address.getLatitude())
                .longitude(address.getLongitude())
                .isDefault(address.getIsDefault())
                .fullAddress(fullAddress)
                .createdAt(address.getCreatedAt())
                .updatedAt(address.getUpdatedAt())
                .build();
    }

    /**
     * Build formatted full address string
     */
    private String buildFullAddress(Address address) {
        StringBuilder sb = new StringBuilder();
        sb.append(address.getAddressLine1());

        if (address.getAddressLine2() != null && !address.getAddressLine2().isEmpty()) {
            sb.append(", ").append(address.getAddressLine2());
        }
        if (address.getLandmark() != null && !address.getLandmark().isEmpty()) {
            sb.append(", Near ").append(address.getLandmark());
        }
        sb.append(", ").append(address.getCity());
        sb.append(", ").append(address.getState());
        sb.append(" - ").append(address.getPincode());

        return sb.toString();
    }

    /**
     * Map Parcel entity to DTO for dashboard
     */
    private com.tpts.dto.response.ParcelDTO mapParcelToDTO(Parcel parcel) {
        return com.tpts.dto.response.ParcelDTO.builder()
                .id(parcel.getId())
                .trackingNumber(parcel.getTrackingNumber())
                .pickupName(parcel.getPickupName())
                .pickupPhone(parcel.getPickupPhone())
                .pickupAddress(parcel.getPickupAddress())
                .pickupCity(parcel.getPickupCity())
                .pickupPincode(parcel.getPickupPincode())
                .deliveryName(parcel.getDeliveryName())
                .deliveryPhone(parcel.getDeliveryPhone())
                .deliveryAddress(parcel.getDeliveryAddress())
                .deliveryCity(parcel.getDeliveryCity())
                .deliveryPincode(parcel.getDeliveryPincode())
                .packageType(parcel.getPackageType())
                .weightKg(parcel.getWeightKg())
                .status(parcel.getStatus())
                .basePrice(parcel.getBasePrice())
                .finalPrice(parcel.getFinalPrice())
                .createdAt(parcel.getCreatedAt())
                .companyName(parcel.getCompany() != null ? parcel.getCompany().getCompanyName() : null)
                .agentName(parcel.getAgent() != null ? parcel.getAgent().getFullName() : null)
                .hasRated(ratingRepository.existsByParcelId(parcel.getId()))
                .build();
    }
}