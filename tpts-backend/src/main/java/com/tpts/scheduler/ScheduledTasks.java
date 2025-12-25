package com.tpts.scheduler;

import com.tpts.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ScheduledTasks {

    private final WalletService walletService;

    /**
     * Clear pending earnings older than 24 hours
     * Runs daily at 2:00 AM
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void clearPendingEarnings() {
        log.info("Starting scheduled earnings clearance...");
        try {
            int cleared = walletService.clearPendingEarnings();
            log.info("Successfully cleared {} pending earnings", cleared);
        } catch (Exception e) {
            log.error("Failed to clear pending earnings: {}", e.getMessage(), e);
        }
    }
}
