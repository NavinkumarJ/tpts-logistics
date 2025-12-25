package com.tpts.controller;

import com.tpts.dto.response.ApiResponse;
import com.tpts.entity.DeliveryAgent;
import com.tpts.entity.Parcel;
import com.tpts.entity.ParcelStatus;
import com.tpts.entity.User;
import com.tpts.exception.TptsExceptions.ResourceNotFoundException;
import com.tpts.repository.DeliveryAgentRepository;
import com.tpts.repository.ParcelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Direct Agent Earnings Controller
 * Calculates earnings directly from delivered parcels - no wallet dependency
 */
@RestController
@RequestMapping("/api/agent-earnings")
@RequiredArgsConstructor
@Slf4j
public class AgentEarningsController {

        private final ParcelRepository parcelRepository;
        private final DeliveryAgentRepository agentRepository;

        // Default agent commission rate (20% of delivery price)
        private static final BigDecimal DEFAULT_AGENT_RATE = new BigDecimal("20.00");

        /**
         * Get agent earnings summary
         * Calculates directly from delivered parcels
         */
        @GetMapping("/summary")
        @PreAuthorize("hasRole('DELIVERY_AGENT')")
        public ResponseEntity<ApiResponse<Map<String, Object>>> getEarningsSummary(
                        @AuthenticationPrincipal User currentUser) {

                DeliveryAgent agent = agentRepository.findByUser(currentUser)
                                .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));

                log.info("Fetching earnings for agent: {} (ID: {})", agent.getFullName(), agent.getId());

                LocalDateTime now = LocalDateTime.now();
                LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
                LocalDateTime startOfWeek = now.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY))
                                .toLocalDate().atStartOfDay();
                LocalDateTime startOfMonth = now.with(TemporalAdjusters.firstDayOfMonth())
                                .toLocalDate().atStartOfDay();

                // Get all delivered parcels for this agent
                List<Parcel> allDelivered = parcelRepository.findByAgentIdAndStatus(agent.getId(),
                                ParcelStatus.DELIVERED);

                log.info("Found {} delivered parcels for agent {}", allDelivered.size(), agent.getId());

                // Calculate commission rate from company
                BigDecimal agentRate = agent.getCompany().getAgentCommissionRate() != null
                                ? agent.getCompany().getAgentCommissionRate()
                                : DEFAULT_AGENT_RATE;

                // Calculate earnings for different periods
                BigDecimal todayEarnings = calculateEarnings(allDelivered.stream()
                                .filter(p -> p.getDeliveredAt() != null && p.getDeliveredAt().isAfter(startOfDay))
                                .collect(Collectors.toList()), agentRate);

                BigDecimal weekEarnings = calculateEarnings(allDelivered.stream()
                                .filter(p -> p.getDeliveredAt() != null && p.getDeliveredAt().isAfter(startOfWeek))
                                .collect(Collectors.toList()), agentRate);

                BigDecimal monthEarnings = calculateEarnings(allDelivered.stream()
                                .filter(p -> p.getDeliveredAt() != null && p.getDeliveredAt().isAfter(startOfMonth))
                                .collect(Collectors.toList()), agentRate);

                BigDecimal totalEarnings = calculateEarnings(allDelivered, agentRate);

                long todayDeliveries = allDelivered.stream()
                                .filter(p -> p.getDeliveredAt() != null && p.getDeliveredAt().isAfter(startOfDay))
                                .count();

                Map<String, Object> summary = new LinkedHashMap<>();
                summary.put("todayEarnings", todayEarnings);
                summary.put("thisWeekEarnings", weekEarnings);
                summary.put("thisMonthEarnings", monthEarnings);
                summary.put("totalEarnings", totalEarnings);
                summary.put("todayDeliveries", todayDeliveries);
                summary.put("totalDeliveries", allDelivered.size());
                summary.put("commissionRate", agentRate.setScale(0, RoundingMode.HALF_UP) + "%");

                return ResponseEntity.ok(ApiResponse.success(summary, "Earnings summary retrieved"));
        }

        /**
         * Get recent earnings (list of delivered parcels with earnings)
         */
        @GetMapping("/recent")
        @PreAuthorize("hasRole('DELIVERY_AGENT')")
        public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRecentEarnings(
                        @AuthenticationPrincipal User currentUser,
                        @RequestParam(defaultValue = "20") int limit) {

                DeliveryAgent agent = agentRepository.findByUser(currentUser)
                                .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));

                BigDecimal agentRate = agent.getCompany().getAgentCommissionRate() != null
                                ? agent.getCompany().getAgentCommissionRate()
                                : DEFAULT_AGENT_RATE;

                // Get delivered parcels sorted by delivery date
                List<Parcel> deliveredParcels = parcelRepository
                                .findByAgentIdAndStatus(agent.getId(), ParcelStatus.DELIVERED)
                                .stream()
                                .sorted((a, b) -> {
                                        if (a.getDeliveredAt() == null)
                                                return 1;
                                        if (b.getDeliveredAt() == null)
                                                return -1;
                                        return b.getDeliveredAt().compareTo(a.getDeliveredAt());
                                })
                                .limit(limit)
                                .collect(Collectors.toList());

                List<Map<String, Object>> earnings = new ArrayList<>();
                for (Parcel parcel : deliveredParcels) {
                        BigDecimal earning = calculateParcelEarning(parcel, agentRate);

                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("id", parcel.getId());
                        item.put("parcelId", parcel.getId());
                        item.put("trackingNumber", parcel.getTrackingNumber());
                        item.put("amount", earning);
                        item.put("orderAmount", parcel.getFinalPrice());
                        item.put("description",
                                        "Delivery: " + parcel.getPickupCity() + " → " + parcel.getDeliveryCity());
                        item.put("createdAt", parcel.getDeliveredAt());
                        item.put("status", "COMPLETED");
                        earnings.add(item);
                }

                return ResponseEntity.ok(ApiResponse.success(earnings, "Recent earnings retrieved"));
        }

        /**
         * Calculate total earnings from list of parcels
         */
        private BigDecimal calculateEarnings(List<Parcel> parcels, BigDecimal agentRate) {
                return parcels.stream()
                                .map(p -> calculateParcelEarning(p, agentRate))
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        /**
         * Calculate agent earning for a single parcel
         * Agent gets agentRate% of the final price (rate is percentage like 20.00)
         */
        private BigDecimal calculateParcelEarning(Parcel parcel, BigDecimal agentRate) {
                if (parcel.getFinalPrice() == null) {
                        return BigDecimal.ZERO;
                }
                return parcel.getFinalPrice()
                                .multiply(agentRate)
                                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        }
}
