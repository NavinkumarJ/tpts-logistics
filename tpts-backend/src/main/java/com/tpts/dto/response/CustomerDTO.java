package com.tpts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for Customer response
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerDTO {

    private Long id;
    private Long userId;
    private String email;
    private String phone;
    private String fullName;
    private String profileImageUrl;
    private String city;
    private String pincode;
    private Long defaultAddressId;
    private Boolean isVerified;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Nested address if needed
    private AddressDTO defaultAddress;

    // Profile stats
    private Integer totalOrders;
    private Integer completedOrders;
    private Integer activeOrders;
    private Integer savedAddressesCount;
}