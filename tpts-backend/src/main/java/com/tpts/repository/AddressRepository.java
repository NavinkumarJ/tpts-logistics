package com.tpts.repository;

import com.tpts.entity.Address;
import com.tpts.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for Address entity
 */
@Repository
public interface AddressRepository extends JpaRepository<Address, Long> {

    // Find all addresses by customer
    List<Address> findByCustomer(Customer customer);

    // Find all addresses by customer ID
    List<Address> findByCustomerId(Long customerId);

    // Find all addresses by customer ID ordered by default first
    List<Address> findByCustomerIdOrderByIsDefaultDesc(Long customerId);

    // Find default address for customer
    Optional<Address> findByCustomerIdAndIsDefaultTrue(Long customerId);

    // Find address by ID and customer ID (security check)
    Optional<Address> findByIdAndCustomerId(Long id, Long customerId);

    // Count addresses by customer
    long countByCustomerId(Long customerId);

    // Check if address belongs to customer
    boolean existsByIdAndCustomerId(Long id, Long customerId);

    // Reset all default flags for a customer (before setting new default)
    @Modifying
    @Query("UPDATE Address a SET a.isDefault = false WHERE a.customer.id = :customerId")
    void resetDefaultForCustomer(@Param("customerId") Long customerId);

    // Find addresses by city and pincode
    List<Address> findByCustomerIdAndCity(Long customerId, String city);

    // Delete all addresses for a customer
    void deleteByCustomerId(Long customerId);
}