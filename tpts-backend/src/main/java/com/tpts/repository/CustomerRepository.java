package com.tpts.repository;

import com.tpts.entity.Customer;
import com.tpts.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for Customer entity
 */
@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    // Find by user
    Optional<Customer> findByUser(User user);

    // Find by user id
    Optional<Customer> findByUserId(Long userId);

    // Check if customer exists for user
    boolean existsByUserId(Long userId);
}
