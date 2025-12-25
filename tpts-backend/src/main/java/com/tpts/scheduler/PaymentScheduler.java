package com.tpts.scheduler;

import com.tpts.entity.Payment;
import com.tpts.entity.PaymentStatus;
import com.tpts.repository.PaymentRepository;
import com.tpts.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentScheduler {

    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;

    /**
     * Mark pending payments as failed after 30 minutes
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    public void checkPendingPayments() {
        LocalDateTime thirtyMinutesAgo = LocalDateTime.now().minusMinutes(30);

        List<Payment> stalePending = paymentRepository
                .findByStatusAndCreatedAtBefore(PaymentStatus.PENDING, thirtyMinutesAgo);

        stalePending.forEach(payment -> {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason("Payment timeout");
            paymentRepository.save(payment);
        });

        if (!stalePending.isEmpty()) {
            log.info("Marked {} stale payments as failed", stalePending.size());
        }
    }
}
