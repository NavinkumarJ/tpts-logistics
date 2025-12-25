package com.tpts.scheduler;

import com.tpts.entity.Parcel;
import com.tpts.entity.ParcelStatus;
import com.tpts.repository.NotificationRepository;
import com.tpts.repository.ParcelRepository;
import com.tpts.repository.RatingRepository;
import com.tpts.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationScheduler {

    private final ParcelRepository parcelRepository;
    private final NotificationRepository notificationRepository;
    private final RatingRepository ratingRepository;  // ✅ ADDED
    private final NotificationService notificationService;

    /**
     * Send rating reminders 24 hours after delivery
     */
    @Scheduled(cron = "0 0 10 * * ?") // Daily at 10 AM
    @Transactional
    public void sendRatingReminders() {
        LocalDateTime yesterday = LocalDateTime.now().minusDays(1);
        LocalDateTime yesterdayStart = yesterday.minusHours(1);
        LocalDateTime yesterdayEnd = yesterday.plusHours(1);

        // ✅ FIXED: Use new method without rating check
        List<Parcel> deliveredParcels = parcelRepository
                .findByStatusAndDeliveredAtBetween(
                        ParcelStatus.DELIVERED,
                        yesterdayStart,
                        yesterdayEnd
                );

        // ✅ Filter out parcels that already have ratings
        List<Parcel> parcelsWithoutRatings = deliveredParcels.stream()
                .filter(parcel -> !ratingRepository.existsByParcelId(parcel.getId()))
                .collect(Collectors.toList());

        parcelsWithoutRatings.forEach(parcel -> {
            try {
                notificationService.sendRatingReminder(
                        parcel.getCustomer().getUser(),
                        parcel.getTrackingNumber(),
                        parcel.getId()
                );
            } catch (Exception e) {
                log.error("Failed to send rating reminder for parcel {}: {}",
                        parcel.getTrackingNumber(), e.getMessage());
            }
        });

        log.info("Sent {} rating reminders", parcelsWithoutRatings.size());
    }

    /**
     * Clean up old notifications (older than 30 days)
     */
    @Scheduled(cron = "0 0 2 * * ?") // Daily at 2 AM
    @Transactional
    public void cleanupOldNotifications() {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);

        try {
            notificationRepository.deleteOldNotifications(thirtyDaysAgo);
            log.info("Cleaned up old notifications before {}", thirtyDaysAgo);
        } catch (Exception e) {
            log.error("Failed to clean up old notifications: {}", e.getMessage());
        }
    }
}
