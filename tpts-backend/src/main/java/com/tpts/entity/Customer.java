package com.tpts.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Customer Entity - Additional profile info for customers
 * Links to User entity via user_id foreign key
 */
@Entity
@Table(name = "customers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Column(name = "default_address_id")
    private Long defaultAddressId;

    @Column(length = 100)
    private String city;

    @Column(length = 10)
    private String pincode;

    // Timestamps
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Helper methods
    public String getEmail() {
        return this.user != null ? this.user.getEmail() : null;
    }

    public String getPhone() {
        return this.user != null ? this.user.getPhone() : null;
    }
}
