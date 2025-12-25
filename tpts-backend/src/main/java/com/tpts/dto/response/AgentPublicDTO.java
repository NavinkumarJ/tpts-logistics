package com.tpts.dto.response;

import com.tpts.entity.VehicleType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for Agent public/limited information
 * Used when customers view agent info during tracking
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentPublicDTO {

    private Long id;
    private String fullName;
    private String phone;
    private VehicleType vehicleType;
    private String vehicleNumber;
    private BigDecimal ratingAvg;
    private Integer totalDeliveries;

    // Live location (for tracking)
    private BigDecimal currentLatitude;
    private BigDecimal currentLongitude;
}