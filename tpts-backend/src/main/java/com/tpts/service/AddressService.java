package com.tpts.service;

import com.tpts.dto.request.CreateAddressRequest;
import com.tpts.dto.request.UpdateAddressRequest;
import com.tpts.dto.response.AddressDTO;
import com.tpts.entity.Address;
import com.tpts.entity.Customer;
import com.tpts.entity.User;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.AddressRepository;
import com.tpts.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for Address operations
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AddressService {

    private final AddressRepository addressRepository;
    private final CustomerRepository customerRepository;
    private final CustomerService customerService;

    private static final int MAX_ADDRESSES_PER_CUSTOMER = 10;

    // ==========================================
    // Get Addresses
    // ==========================================

    /**
     * Get all addresses for a customer
     */
    public List<AddressDTO> getAddressesByCustomerId(Long customerId, User currentUser) {
        // Verify ownership
        customerService.verifyCustomerOwnership(customerId, currentUser);

        List<Address> addresses = addressRepository.findByCustomerIdOrderByIsDefaultDesc(customerId);

        return addresses.stream()
                .map(customerService::mapAddressToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific address
     */
    public AddressDTO getAddressById(Long customerId, Long addressId, User currentUser) {
        // Verify ownership
        customerService.verifyCustomerOwnership(customerId, currentUser);

        Address address = addressRepository.findByIdAndCustomerId(addressId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "id", addressId));

        return customerService.mapAddressToDTO(address);
    }

    /**
     * Get default address for a customer
     */
    public AddressDTO getDefaultAddress(Long customerId, User currentUser) {
        // Verify ownership
        customerService.verifyCustomerOwnership(customerId, currentUser);

        Address address = addressRepository.findByCustomerIdAndIsDefaultTrue(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("No default address found"));

        return customerService.mapAddressToDTO(address);
    }

    // ==========================================
    // Create Address
    // ==========================================

    /**
     * Create a new address for a customer
     */
    @Transactional
    public AddressDTO createAddress(Long customerId, CreateAddressRequest request, User currentUser) {
        // Verify ownership
        customerService.verifyCustomerOwnership(customerId, currentUser);

        // Check address limit
        long addressCount = addressRepository.countByCustomerId(customerId);
        if (addressCount >= MAX_ADDRESSES_PER_CUSTOMER) {
            throw new BadRequestException("Maximum " + MAX_ADDRESSES_PER_CUSTOMER + " addresses allowed per customer");
        }

        Customer customer = customerService.getCustomerEntity(customerId);

        // If this is the first address or explicitly set as default, handle default flag
        boolean shouldBeDefault = (addressCount == 0) ||
                (request.getIsDefault() != null && request.getIsDefault());

        if (shouldBeDefault) {
            // Reset existing default addresses
            addressRepository.resetDefaultForCustomer(customerId);
        }

        // Create address
        Address address = Address.builder()
                .customer(customer)
                .label(request.getLabel() != null ? request.getLabel() : "Home")
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .addressLine1(request.getAddressLine1())
                .addressLine2(request.getAddressLine2())
                .landmark(request.getLandmark())
                .city(request.getCity())
                .state(request.getState())
                .pincode(request.getPincode())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .isDefault(shouldBeDefault)
                .build();

        address = addressRepository.save(address);

        // Update customer's default address ID if this is default
        if (shouldBeDefault) {
            customer.setDefaultAddressId(address.getId());
            customerRepository.save(customer);
        }

        log.info("Created address {} for customer {}", address.getId(), customerId);

        return customerService.mapAddressToDTO(address);
    }

    // ==========================================
    // Update Address
    // ==========================================

    /**
     * Update an existing address
     */
    @Transactional
    public AddressDTO updateAddress(Long customerId, Long addressId, UpdateAddressRequest request, User currentUser) {
        // Verify ownership
        customerService.verifyCustomerOwnership(customerId, currentUser);

        Address address = addressRepository.findByIdAndCustomerId(addressId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "id", addressId));

        // Update fields if provided
        if (request.getLabel() != null) {
            address.setLabel(request.getLabel());
        }
        if (request.getFullName() != null) {
            address.setFullName(request.getFullName());
        }
        if (request.getPhone() != null) {
            address.setPhone(request.getPhone());
        }
        if (request.getAddressLine1() != null) {
            address.setAddressLine1(request.getAddressLine1());
        }
        if (request.getAddressLine2() != null) {
            address.setAddressLine2(request.getAddressLine2());
        }
        if (request.getLandmark() != null) {
            address.setLandmark(request.getLandmark());
        }
        if (request.getCity() != null) {
            address.setCity(request.getCity());
        }
        if (request.getState() != null) {
            address.setState(request.getState());
        }
        if (request.getPincode() != null) {
            address.setPincode(request.getPincode());
        }
        if (request.getLatitude() != null) {
            address.setLatitude(request.getLatitude());
        }
        if (request.getLongitude() != null) {
            address.setLongitude(request.getLongitude());
        }

        // Handle default flag change
        if (request.getIsDefault() != null && request.getIsDefault() && !address.getIsDefault()) {
            addressRepository.resetDefaultForCustomer(customerId);
            address.setIsDefault(true);

            // Update customer's default address ID
            Customer customer = customerService.getCustomerEntity(customerId);
            customer.setDefaultAddressId(addressId);
            customerRepository.save(customer);
        }

        address = addressRepository.save(address);
        log.info("Updated address {} for customer {}", addressId, customerId);

        return customerService.mapAddressToDTO(address);
    }

    // ==========================================
    // Set Default Address
    // ==========================================

    /**
     * Set an address as default
     */
    @Transactional
    public AddressDTO setDefaultAddress(Long customerId, Long addressId, User currentUser) {
        // Verify ownership
        customerService.verifyCustomerOwnership(customerId, currentUser);

        Address address = addressRepository.findByIdAndCustomerId(addressId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "id", addressId));

        // Reset all defaults and set this one
        addressRepository.resetDefaultForCustomer(customerId);
        address.setIsDefault(true);
        address = addressRepository.save(address);

        // Update customer's default address ID
        Customer customer = customerService.getCustomerEntity(customerId);
        customer.setDefaultAddressId(addressId);
        customerRepository.save(customer);

        log.info("Set address {} as default for customer {}", addressId, customerId);

        return customerService.mapAddressToDTO(address);
    }

    // ==========================================
    // Delete Address
    // ==========================================

    /**
     * Delete an address
     */
    @Transactional
    public void deleteAddress(Long customerId, Long addressId, User currentUser) {
        // Verify ownership
        customerService.verifyCustomerOwnership(customerId, currentUser);

        Address address = addressRepository.findByIdAndCustomerId(addressId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "id", addressId));

        boolean wasDefault = address.getIsDefault();

        addressRepository.delete(address);
        log.info("Deleted address {} for customer {}", addressId, customerId);

        // If deleted address was default, set another as default
        if (wasDefault) {
            Customer customer = customerService.getCustomerEntity(customerId);
            customer.setDefaultAddressId(null);

            // Find another address to set as default
            List<Address> remainingAddresses = addressRepository.findByCustomerId(customerId);
            if (!remainingAddresses.isEmpty()) {
                Address newDefault = remainingAddresses.get(0);
                newDefault.setIsDefault(true);
                addressRepository.save(newDefault);
                customer.setDefaultAddressId(newDefault.getId());
            }

            customerRepository.save(customer);
        }
    }
}