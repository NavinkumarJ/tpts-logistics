package com.tpts.scheduler;

import com.tpts.entity.GroupShipment;
import com.tpts.entity.GroupStatus;
import com.tpts.entity.Parcel;
import com.tpts.entity.User;
import com.tpts.repository.GroupShipmentRepository;
import com.tpts.repository.ParcelRepository;
import com.tpts.service.NotificationService;
import com.tpts.controller.TrackingWebSocketController;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class GroupShipmentScheduler {

    private final GroupShipmentRepository groupRepository;
    private final ParcelRepository parcelRepository;
    private final NotificationService notificationService;
    private final TrackingWebSocketController wsController;

    /**
     * Check group deadlines every 5 minutes
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional
    public void checkGroupDeadlines() {
        List<GroupShipment> expiredGroups = groupRepository
                .findByStatusAndDeadlineBefore(GroupStatus.OPEN, LocalDateTime.now());

        log.info("Found {} expired groups", expiredGroups.size());

        expiredGroups.forEach(group -> {
            try {
                // Get parcels for this group
                List<Parcel> groupParcels = parcelRepository.findByGroupShipmentId(group.getId());
                int currentMembers = groupParcels.size();
                int targetMembers = group.getTargetMembers();

                if (currentMembers >= targetMembers) {
                    closeGroup(group, groupParcels);
                } else if (currentMembers >= (targetMembers * 0.7)) {
                    processPartialGroup(group, groupParcels);
                } else {
                    cancelGroup(group, groupParcels);
                }
            } catch (Exception e) {
                log.error("Failed to process expired group {}: {}",
                        group.getGroupCode(), e.getMessage());
            }
        });
    }

    /**
     * Send group alerts 1 hour before deadline
     */
    @Scheduled(fixedRate = 600000) // 10 minutes
    @Transactional
    public void sendGroupAlerts() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneHourLater = now.plusHours(1);

        List<GroupShipment> urgentGroups = groupRepository
                .findByStatusAndDeadlineBetween(GroupStatus.OPEN, now, oneHourLater);

        urgentGroups.forEach(group -> {
            try {
                List<Parcel> groupParcels = parcelRepository.findByGroupShipmentId(group.getId());
                int currentMembers = groupParcels.size();
                int membersNeeded = group.getTargetMembers() - currentMembers;

                if (membersNeeded > 0 && membersNeeded <= 3) {
                    sendUrgentAlertToMembers(group, groupParcels, membersNeeded);

                    Map<String, Object> alertData = new HashMap<>();
                    alertData.put("membersNeeded", membersNeeded);
                    alertData.put("timeLeft", "Less than 1 hour");
                    alertData.put("status", "URGENT");
                    wsController.broadcastGroupUpdate(group.getGroupCode(), alertData);
                }
            } catch (Exception e) {
                log.error("Failed to send alert for group {}: {}",
                        group.getGroupCode(), e.getMessage());
            }
        });
    }

    private void closeGroup(GroupShipment group, List<Parcel> parcels) {
        group.setStatus(GroupStatus.FULL);
        groupRepository.save(group);

        sendGroupFullNotifications(group, parcels);

        // Notify company admin to assign pickup agent
        try {
            User companyUser = group.getCompany().getUser();
            String companyName = group.getCompany().getCompanyName();
            String route = group.getSourceCity() + " → " + group.getTargetCity();
            notificationService.sendGroupReadyToCompany(
                    companyUser,
                    group.getGroupCode(),
                    route,
                    parcels.size(),
                    group.getTargetMembers(),
                    companyName);
        } catch (Exception e) {
            log.error("Failed to notify company about group ready: {}", e.getMessage());
        }

        log.info("Group {} closed successfully with {} members",
                group.getGroupCode(), parcels.size());
    }

    private void processPartialGroup(GroupShipment group, List<Parcel> parcels) {
        // Calculate fill percentage
        BigDecimal fillPercentage = new BigDecimal(parcels.size() * 100)
                .divide(new BigDecimal(group.getTargetMembers()), 2, java.math.RoundingMode.HALF_UP);

        // Calculate effective (pro-rated) discount
        // Effective Discount = Original Discount × Fill Percentage / 100
        BigDecimal originalDiscount = group.getDiscountPercentage();
        BigDecimal effectiveDiscount = originalDiscount.multiply(fillPercentage)
                .divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);

        // Update group with effective discount and fill percentage
        group.setStatus(GroupStatus.PARTIAL);
        group.setEffectiveDiscountPercentage(effectiveDiscount);
        group.setFillPercentage(fillPercentage);
        groupRepository.save(group);

        log.info("Group {} partial fill: {}%. Original discount: {}%, Effective discount: {}%",
                group.getGroupCode(), fillPercentage, originalDiscount, effectiveDiscount);

        // Calculate and update balance for each parcel
        for (Parcel parcel : parcels) {
            try {
                BigDecimal basePrice = parcel.getBasePrice();

                // Original discount amount (what customer paid expecting)
                BigDecimal originalDiscountAmount = basePrice.multiply(originalDiscount)
                        .divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);

                // Effective discount amount (what discount they actually get)
                BigDecimal effectiveDiscountAmount = basePrice.multiply(effectiveDiscount)
                        .divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);

                // Balance = difference between original and effective discount
                BigDecimal balanceAmount = originalDiscountAmount.subtract(effectiveDiscountAmount);

                // Update parcel with balance info
                parcel.setOriginalDiscountPercentage(originalDiscount);
                parcel.setEffectiveDiscountPercentage(effectiveDiscount);
                parcel.setBalanceAmount(balanceAmount);
                parcel.setBalancePaid(false);

                // Update discount amount to effective amount
                parcel.setDiscountAmount(effectiveDiscountAmount);

                // Recalculate final price with effective discount
                BigDecimal priceAfterDiscount = basePrice.subtract(effectiveDiscountAmount);
                BigDecimal gstAmount = priceAfterDiscount.multiply(new BigDecimal("0.18"))
                        .setScale(2, java.math.RoundingMode.HALF_UP);
                BigDecimal newFinalPrice = priceAfterDiscount.add(gstAmount)
                        .setScale(2, java.math.RoundingMode.HALF_UP);
                parcel.setFinalPrice(newFinalPrice);

                parcelRepository.save(parcel);

                log.info("Parcel {} balance due: ₹{} (base: {}, original: {}%, effective: {}%)",
                        parcel.getTrackingNumber(), balanceAmount, basePrice, originalDiscount, effectiveDiscount);

                // Notify customer about balance due
                if (balanceAmount.compareTo(BigDecimal.ZERO) > 0) {
                    try {
                        notificationService.sendBalanceDueToCustomer(
                                parcel.getCustomer().getUser(),
                                parcel.getTrackingNumber(),
                                group.getGroupCode(),
                                originalDiscount,
                                effectiveDiscount,
                                balanceAmount,
                                fillPercentage);
                    } catch (Exception e) {
                        log.error("Failed to send balance notification to customer: {}", e.getMessage());
                    }
                }
            } catch (Exception e) {
                log.error("Failed to update balance for parcel {}: {}",
                        parcel.getTrackingNumber(), e.getMessage());
            }
        }

        // Notify company admin to assign pickup agent (partial groups still proceed)
        try {
            User companyUser = group.getCompany().getUser();
            String companyName = group.getCompany().getCompanyName();
            String route = group.getSourceCity() + " → " + group.getTargetCity();
            notificationService.sendGroupReadyToCompany(
                    companyUser,
                    group.getGroupCode(),
                    route,
                    parcels.size(),
                    group.getTargetMembers(),
                    companyName);
        } catch (Exception e) {
            log.error("Failed to notify company about partial group ready: {}", e.getMessage());
        }

        log.info("Group {} processed partially with {}% fill. {} parcels with balance due.",
                group.getGroupCode(), fillPercentage, parcels.size());
    }

    private void cancelGroup(GroupShipment group, List<Parcel> parcels) {
        group.setStatus(GroupStatus.CANCELLED);
        groupRepository.save(group);

        sendGroupCancelledNotifications(group, parcels);

        // Notify company admin about cancellation
        try {
            User companyUser = group.getCompany().getUser();
            String companyName = group.getCompany().getCompanyName();
            String route = group.getSourceCity() + " → " + group.getTargetCity();
            notificationService.sendGroupCancelledToCompany(
                    companyUser,
                    group.getGroupCode(),
                    route,
                    parcels.size(),
                    group.getTargetMembers(),
                    companyName);
        } catch (Exception e) {
            log.error("Failed to notify company about group cancellation: {}", e.getMessage());
        }

        log.info("Group {} cancelled due to insufficient members. Had {} members, needed {}",
                group.getGroupCode(), parcels.size(), group.getTargetMembers());
    }

    private void sendUrgentAlertToMembers(GroupShipment group, List<Parcel> parcels, int membersNeeded) {
        if (!parcels.isEmpty()) {
            // Calculate exact time remaining
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime deadline = group.getDeadline();
            long minutesRemaining = java.time.Duration.between(now, deadline).toMinutes();

            parcels.forEach(parcel -> {
                try {
                    notificationService.sendGroupDeadlineReminderWithMinutes(
                            parcel.getCustomer().getUser(),
                            group.getGroupCode(),
                            membersNeeded,
                            minutesRemaining, // ✅ Pass exact minutes
                            parcels.size(),
                            group.getTargetMembers());
                } catch (Exception e) {
                    log.error("Failed to send urgent alert to customer: {}", e.getMessage());
                }
            });
        }
    }

    private void sendGroupFullNotifications(GroupShipment group, List<Parcel> parcels) {
        parcels.forEach(parcel -> {
            try {
                notificationService.sendGroupFullNotification(
                        parcel.getCustomer().getUser(),
                        group.getGroupCode(),
                        parcel.getTrackingNumber());
            } catch (Exception e) {
                log.error("Failed to send group full notification: {}", e.getMessage());
            }
        });
    }

    private void sendGroupCancelledNotifications(GroupShipment group, List<Parcel> parcels) {
        parcels.forEach(parcel -> {
            try {
                notificationService.sendGroupCancelled(
                        parcel.getCustomer().getUser(),
                        group.getGroupCode(),
                        parcel.getTrackingNumber(),
                        parcel.getFinalPrice().toString());
            } catch (Exception e) {
                log.error("Failed to send group cancelled notification: {}", e.getMessage());
            }
        });
    }
}
