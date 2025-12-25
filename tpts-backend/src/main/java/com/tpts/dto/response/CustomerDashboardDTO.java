package com.tpts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for Customer Dashboard response
 * GET /api/customers/{id}/dashboard
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerDashboardDTO {

    private CustomerDTO customer;
    private DashboardStats stats;
    private List<AddressDTO> savedAddresses;
    private List<ParcelDTO> recentParcels;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DashboardStats {
        private Integer totalShipments;
        private Integer activeShipments;
        private Integer completedShipments;
        private Integer pendingShipments;
        private Integer totalAddresses;
    }
}