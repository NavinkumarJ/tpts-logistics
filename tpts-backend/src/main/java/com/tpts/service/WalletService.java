package com.tpts.service;

import com.tpts.dto.request.CreateBankAccountRequest;
import com.tpts.dto.request.CreatePayoutRequest;
import com.tpts.dto.request.ProcessPayoutRequest;
import com.tpts.dto.response.*;
import com.tpts.entity.*;
import com.tpts.exception.TptsExceptions.*;
import com.tpts.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletService {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final EarningRepository earningRepository;
    private final PayoutRepository payoutRepository;
    private final BankAccountRepository bankAccountRepository;
    private final UserRepository userRepository;
    private final CompanyAdminRepository companyRepository;
    private final DeliveryAgentRepository agentRepository;
    private final ParcelRepository parcelRepository;

    // Default commission rates
    private static final BigDecimal DEFAULT_PLATFORM_COMMISSION = new BigDecimal("10.00");
    private static final BigDecimal DEFAULT_AGENT_COMMISSION = new BigDecimal("20.00");
    private static final BigDecimal MINIMUM_PAYOUT = new BigDecimal("100.00");
    private static final int EARNING_CLEARANCE_HOURS = 24;

    // ==========================================
    // Wallet Management
    // ==========================================

    @Transactional
    public Wallet createWallet(User user, WalletType walletType) {
        if (walletRepository.existsByUserId(user.getId())) {
            throw new DuplicateResourceException("Wallet already exists for user");
        }

        Wallet wallet = Wallet.builder()
                .user(user)
                .walletType(walletType)
                .availableBalance(BigDecimal.ZERO)
                .pendingBalance(BigDecimal.ZERO)
                .totalEarnings(BigDecimal.ZERO)
                .totalWithdrawn(BigDecimal.ZERO)
                .currency("INR")
                .isActive(true)
                .build();

        wallet = walletRepository.save(wallet);
        log.info("Created {} wallet for user {}", walletType, user.getId());
        return wallet;
    }

    @Transactional
    public Wallet getOrCreateWallet(User user) {
        return walletRepository.findByUser(user)
                .orElseGet(() -> {
                    WalletType type = switch (user.getUserType()) {
                        case SUPER_ADMIN -> WalletType.PLATFORM;
                        case COMPANY_ADMIN -> WalletType.COMPANY;
                        case DELIVERY_AGENT -> WalletType.AGENT;
                        default -> WalletType.AGENT;
                    };
                    return createWallet(user, type);
                });
    }

    public WalletDTO getWallet(User currentUser) {
        Wallet wallet = walletRepository.findByUser(currentUser)
                .orElseGet(() -> {
                    // Auto-create wallet if not found
                    WalletType type = switch (currentUser.getUserType()) {
                        case COMPANY_ADMIN -> WalletType.COMPANY;
                        default -> WalletType.AGENT;
                    };
                    return createWallet(currentUser, type);
                });
        return mapToWalletDTO(wallet);
    }

    public WalletDTO getWalletByUserId(Long userId) {
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));
        return mapToWalletDTO(wallet);
    }

    // ==========================================
    // Earnings Processing
    // ==========================================

    @Transactional
    public Earning processDeliveryEarnings(Parcel parcel) {
        if (earningRepository.findByParcelId(parcel.getId()).isPresent()) {
            log.warn("Earnings already processed for parcel {}", parcel.getTrackingNumber());
            return earningRepository.findByParcelId(parcel.getId()).get();
        }

        CompanyAdmin company = parcel.getCompany();
        DeliveryAgent agent = parcel.getAgent();

        BigDecimal platformRate = company.getCommissionRate() != null
                ? company.getCommissionRate()
                : DEFAULT_PLATFORM_COMMISSION;

        // ✅ NEW (Use company's rate, fallback to 30%)
        BigDecimal agentRate = company.getAgentCommissionRate() != null
                ? company.getAgentCommissionRate()
                : DEFAULT_AGENT_COMMISSION;
        Earning earning = Earning.builder()
                .parcel(parcel)
                .company(company)
                .agent(agent)
                .orderAmount(parcel.getFinalPrice())
                .platformCommissionRate(platformRate)
                .agentCommissionRate(agentRate)
                .status(EarningStatus.PENDING)
                .build();

        earning.calculateEarnings();
        earning = earningRepository.save(earning);

        // Add to pending balances
        addToPendingBalance(company.getUser(), earning.getCompanyNetEarning(),
                "PARCEL", parcel.getId(), "Earning from delivery " + parcel.getTrackingNumber());

        if (agent != null) {
            addToPendingBalance(agent.getUser(), earning.getTotalAgentEarning(),
                    "PARCEL", parcel.getId(), "Earning from delivery " + parcel.getTrackingNumber());
        }

        // Add platform commission
        addPlatformCommission(earning.getPlatformCommission(), parcel.getId(),
                "Commission from " + parcel.getTrackingNumber());

        log.info("Processed earnings for parcel {}: Platform={}, Company={}, Agent={}",
                parcel.getTrackingNumber(),
                earning.getPlatformCommission(),
                earning.getCompanyNetEarning(),
                earning.getAgentEarning());

        return earning;
    }

    /**
     * Backfill missing earnings for delivered parcels that don't have Earning
     * records
     * This is a one-time fix for parcels delivered before earnings processing was
     * added
     */
    @Transactional
    public int backfillMissingEarnings() {
        // Find all delivered parcels
        List<Parcel> deliveredParcels = parcelRepository.findByAgentIdAndStatus(null, ParcelStatus.DELIVERED);
        // Actually we need all delivered parcels regardless of agent
        deliveredParcels = parcelRepository.findAll()
                .stream()
                .filter(p -> p.getStatus() == ParcelStatus.DELIVERED)
                .toList();

        int processed = 0;
        for (Parcel parcel : deliveredParcels) {
            // Check if earning already exists for this parcel
            if (earningRepository.findByParcelId(parcel.getId()).isEmpty()) {
                try {
                    processDeliveryEarnings(parcel);
                    processed++;
                    log.info("Backfilled earnings for parcel {}", parcel.getTrackingNumber());
                } catch (Exception e) {
                    log.warn("Failed to backfill earnings for parcel {}: {}",
                            parcel.getTrackingNumber(), e.getMessage());
                }
            }
        }

        log.info("Backfilled {} missing earnings", processed);
        return processed;
    }

    @Transactional
    public void addToPendingBalance(User user, BigDecimal amount, String refType, Long refId, String description) {
        Wallet wallet = getOrCreateWallet(user);
        wallet.addPendingAmount(amount);
        walletRepository.save(wallet);

        createTransaction(wallet, TransactionType.EARNING, amount,
                description, refType, refId, TransactionStatus.PENDING);
    }

    @Transactional
    public void addPlatformCommission(BigDecimal amount, Long parcelId, String description) {
        User platformUser = userRepository.findByUserType(UserType.SUPER_ADMIN)
                .stream().findFirst().orElse(null);

        if (platformUser == null) {
            log.warn("No platform admin found, skipping platform commission");
            return;
        }

        Wallet platformWallet = getOrCreateWallet(platformUser);
        platformWallet.addPendingAmount(amount);
        walletRepository.save(platformWallet);

        createTransaction(platformWallet, TransactionType.PLATFORM_COMMISSION, amount,
                description, "PARCEL", parcelId, TransactionStatus.PENDING);
    }

    @Transactional
    public int clearPendingEarnings() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusHours(EARNING_CLEARANCE_HOURS);
        List<Earning> pendingEarnings = earningRepository.findPendingEarningsToBeCleared(cutoffTime);

        int cleared = 0;
        for (Earning earning : pendingEarnings) {
            try {
                clearEarning(earning);
                cleared++;
            } catch (Exception e) {
                log.error("Failed to clear earning {}: {}", earning.getId(), e.getMessage());
            }
        }

        log.info("Cleared {} pending earnings", cleared);
        return cleared;
    }

    @Transactional
    public void clearEarning(Earning earning) {
        // Move company pending to available
        Wallet companyWallet = walletRepository.findByUser(earning.getCompany().getUser())
                .orElseThrow(() -> new ResourceNotFoundException("Company wallet not found"));
        companyWallet.clearPendingToAvailable(earning.getCompanyNetEarning());
        walletRepository.save(companyWallet);

        // Move agent pending to available
        if (earning.getAgent() != null) {
            Wallet agentWallet = walletRepository.findByUser(earning.getAgent().getUser())
                    .orElseThrow(() -> new ResourceNotFoundException("Agent wallet not found"));
            agentWallet.clearPendingToAvailable(earning.getTotalAgentEarning());
            walletRepository.save(agentWallet);
        }

        // Move platform pending to available
        User platformUser = userRepository.findByUserType(UserType.SUPER_ADMIN)
                .stream().findFirst().orElse(null);
        if (platformUser != null) {
            Wallet platformWallet = walletRepository.findByUser(platformUser).orElse(null);
            if (platformWallet != null) {
                platformWallet.clearPendingToAvailable(earning.getPlatformCommission());
                walletRepository.save(platformWallet);
            }
        }

        earning.markAsCleared();
        earningRepository.save(earning);

        List<Transaction> transactions = transactionRepository
                .findByReferenceTypeAndReferenceId("PARCEL", earning.getParcel().getId());
        for (Transaction txn : transactions) {
            if (txn.getStatus() == TransactionStatus.PENDING) {
                txn.setStatus(TransactionStatus.COMPLETED);
                transactionRepository.save(txn);
            }
        }
    }

    /**
     * Reverse earnings when an order is cancelled
     * Subtracts amounts from agent, company, and platform wallets
     */
    @Transactional
    public void reverseEarningsForParcel(Parcel parcel) {
        // Find earning record for this parcel
        var earningOpt = earningRepository.findByParcelId(parcel.getId());

        if (earningOpt.isEmpty()) {
            log.info("No earning record found for parcel {} - nothing to reverse", parcel.getTrackingNumber());
            return;
        }

        Earning earning = earningOpt.get();

        // Skip if already cancelled
        if (earning.getStatus() == EarningStatus.CANCELLED) {
            log.info("Earning for parcel {} already cancelled", parcel.getTrackingNumber());
            return;
        }

        boolean wasCleared = earning.getStatus() == EarningStatus.CLEARED;

        // Reverse company wallet
        Wallet companyWallet = walletRepository.findByUser(earning.getCompany().getUser()).orElse(null);
        if (companyWallet != null) {
            if (wasCleared) {
                // Subtract from available balance
                companyWallet.setAvailableBalance(
                        companyWallet.getAvailableBalance().subtract(earning.getCompanyNetEarning()));
            } else {
                // Subtract from pending balance
                companyWallet.setPendingBalance(
                        companyWallet.getPendingBalance().subtract(earning.getCompanyNetEarning()));
            }
            companyWallet.setTotalEarnings(
                    companyWallet.getTotalEarnings().subtract(earning.getCompanyNetEarning()));
            walletRepository.save(companyWallet);
            log.info("Reversed company earning: -{}", earning.getCompanyNetEarning());
        }

        // Reverse agent wallet
        if (earning.getAgent() != null) {
            Wallet agentWallet = walletRepository.findByUser(earning.getAgent().getUser()).orElse(null);
            if (agentWallet != null) {
                if (wasCleared) {
                    agentWallet.setAvailableBalance(
                            agentWallet.getAvailableBalance().subtract(earning.getTotalAgentEarning()));
                } else {
                    agentWallet.setPendingBalance(
                            agentWallet.getPendingBalance().subtract(earning.getTotalAgentEarning()));
                }
                agentWallet.setTotalEarnings(
                        agentWallet.getTotalEarnings().subtract(earning.getTotalAgentEarning()));
                walletRepository.save(agentWallet);
                log.info("Reversed agent earning: -{}", earning.getTotalAgentEarning());
            }
        }

        // Reverse platform wallet
        User platformUser = userRepository.findByUserType(UserType.SUPER_ADMIN)
                .stream().findFirst().orElse(null);
        if (platformUser != null) {
            Wallet platformWallet = walletRepository.findByUser(platformUser).orElse(null);
            if (platformWallet != null) {
                if (wasCleared) {
                    platformWallet.setAvailableBalance(
                            platformWallet.getAvailableBalance().subtract(earning.getPlatformCommission()));
                } else {
                    platformWallet.setPendingBalance(
                            platformWallet.getPendingBalance().subtract(earning.getPlatformCommission()));
                }
                platformWallet.setTotalEarnings(
                        platformWallet.getTotalEarnings().subtract(earning.getPlatformCommission()));
                walletRepository.save(platformWallet);
                log.info("Reversed platform commission: -{}", earning.getPlatformCommission());
            }
        }

        // Mark earning as cancelled
        earning.setStatus(EarningStatus.CANCELLED);
        earning.setNotes("Cancelled due to order cancellation: " + parcel.getCancellationReason());
        earningRepository.save(earning);

        // Mark related transactions as reversed
        List<Transaction> transactions = transactionRepository
                .findByReferenceTypeAndReferenceId("PARCEL", parcel.getId());
        for (Transaction txn : transactions) {
            txn.setStatus(TransactionStatus.REVERSED);
            transactionRepository.save(txn);
        }

        log.info("Reversed all earnings for cancelled parcel {}: Platform={}, Company={}, Agent={}",
                parcel.getTrackingNumber(),
                earning.getPlatformCommission(),
                earning.getCompanyNetEarning(),
                earning.getTotalAgentEarning());
    }

    // ==========================================
    // Payout Management
    // ==========================================

    @Transactional
    public PayoutDTO requestPayout(CreatePayoutRequest request, User currentUser) {
        Wallet wallet = walletRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));

        if (request.getAmount().compareTo(MINIMUM_PAYOUT) < 0) {
            throw new BadRequestException("Minimum payout amount is ₹" + MINIMUM_PAYOUT);
        }

        if (!wallet.canWithdraw(request.getAmount())) {
            throw new BadRequestException("Insufficient available balance");
        }

        if (payoutRepository.existsByUserIdAndStatusIn(currentUser.getId(),
                Arrays.asList(PayoutStatus.REQUESTED, PayoutStatus.PROCESSING))) {
            throw new BadRequestException("You already have a pending payout request");
        }

        String bankName, accountNumber, ifscCode, accountHolderName, upiId;

        if (request.getBankAccountId() != null) {
            BankAccount bankAccount = bankAccountRepository.findByIdAndUserId(
                    request.getBankAccountId(), currentUser.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Bank account not found"));

            bankName = bankAccount.getBankName();
            accountNumber = bankAccount.getAccountNumber();
            ifscCode = bankAccount.getIfscCode();
            accountHolderName = bankAccount.getAccountHolderName();
            upiId = bankAccount.getUpiId();
        } else {
            bankName = request.getBankName();
            accountNumber = request.getAccountNumber();
            ifscCode = request.getIfscCode();
            accountHolderName = request.getAccountHolderName();
            upiId = request.getUpiId();
        }

        Payout payout = Payout.builder()
                .payoutId(Payout.generatePayoutId())
                .user(currentUser)
                .wallet(wallet)
                .amount(request.getAmount())
                .status(PayoutStatus.REQUESTED)
                .payoutMethod(request.getPayoutMethod())
                .bankName(bankName)
                .accountNumber(accountNumber)
                .ifscCode(ifscCode)
                .accountHolderName(accountHolderName)
                .upiId(upiId)
                .notes(request.getNotes())
                .build();

        payout = payoutRepository.save(payout);

        wallet.withdraw(request.getAmount());
        walletRepository.save(wallet);

        createTransaction(wallet, TransactionType.WITHDRAWAL, request.getAmount(),
                "Payout request " + payout.getPayoutId(), "PAYOUT", payout.getId(),
                TransactionStatus.PENDING);

        log.info("Payout requested: {} for amount {}", payout.getPayoutId(), request.getAmount());

        return mapToPayoutDTO(payout);
    }

    @Transactional
    public PayoutDTO processPayout(Long payoutId, ProcessPayoutRequest request, User admin) {
        Payout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Payout not found"));

        switch (request.getAction()) {
            case APPROVE -> {
                payout.markAsProcessing(admin.getId());
            }
            case COMPLETE -> {
                if (request.getTransactionReference() == null || request.getTransactionReference().isBlank()) {
                    throw new BadRequestException("Transaction reference is required");
                }
                payout.markAsCompleted(request.getTransactionReference());
                updatePayoutTransaction(payout, TransactionStatus.COMPLETED);
            }
            case REJECT -> {
                if (request.getRejectionReason() == null || request.getRejectionReason().isBlank()) {
                    throw new BadRequestException("Rejection reason is required");
                }
                payout.markAsRejected(request.getRejectionReason(), admin.getId());

                Wallet wallet = payout.getWallet();
                wallet.setAvailableBalance(wallet.getAvailableBalance().add(payout.getAmount()));
                wallet.setTotalWithdrawn(wallet.getTotalWithdrawn().subtract(payout.getAmount()));
                walletRepository.save(wallet);

                updatePayoutTransaction(payout, TransactionStatus.REVERSED);
            }
        }

        payout = payoutRepository.save(payout);
        log.info("Payout {} processed with action {}", payoutId, request.getAction());

        return mapToPayoutDTO(payout);
    }

    @Transactional
    public PayoutDTO cancelPayout(Long payoutId, User currentUser) {
        Payout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Payout not found"));

        if (!payout.getUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You can only cancel your own payout requests");
        }

        if (!payout.canBeCancelled()) {
            throw new BadRequestException("This payout cannot be cancelled");
        }

        payout.setStatus(PayoutStatus.CANCELLED);
        payoutRepository.save(payout);

        Wallet wallet = payout.getWallet();
        wallet.setAvailableBalance(wallet.getAvailableBalance().add(payout.getAmount()));
        wallet.setTotalWithdrawn(wallet.getTotalWithdrawn().subtract(payout.getAmount()));
        walletRepository.save(wallet);

        updatePayoutTransaction(payout, TransactionStatus.CANCELLED);

        return mapToPayoutDTO(payout);
    }

    public List<PayoutDTO> getMyPayouts(User currentUser) {
        return payoutRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId())
                .stream()
                .map(this::mapToPayoutDTO)
                .collect(Collectors.toList());
    }

    public List<PayoutDTO> getPendingPayouts() {
        return payoutRepository.findPendingPayouts()
                .stream()
                .map(this::mapToPayoutDTO)
                .collect(Collectors.toList());
    }

    public Page<PayoutDTO> getAllPayouts(PayoutStatus status, Pageable pageable) {
        Page<Payout> payouts;
        if (status != null) {
            payouts = payoutRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else {
            payouts = payoutRepository.findAll(pageable);
        }
        return payouts.map(this::mapToPayoutDTO);
    }

    // ==========================================
    // Bank Account Management
    // ==========================================

    @Transactional
    public BankAccountDTO addBankAccount(CreateBankAccountRequest request, User currentUser) {
        if (bankAccountRepository.existsByUserIdAndAccountNumber(
                currentUser.getId(), request.getAccountNumber())) {
            throw new DuplicateResourceException("Bank account already exists");
        }

        if (Boolean.TRUE.equals(request.getIsPrimary())) {
            bankAccountRepository.clearPrimaryForUser(currentUser.getId());
        }

        boolean isFirst = bankAccountRepository.countByUserIdAndIsActiveTrue(currentUser.getId()) == 0;

        BankAccount bankAccount = BankAccount.builder()
                .user(currentUser)
                .bankName(request.getBankName())
                .branchName(request.getBranchName())
                .accountNumber(request.getAccountNumber())
                .ifscCode(request.getIfscCode().toUpperCase())
                .accountHolderName(request.getAccountHolderName())
                .accountType(request.getAccountType())
                .upiId(request.getUpiId())
                .label(request.getLabel())
                .isPrimary(isFirst || Boolean.TRUE.equals(request.getIsPrimary()))
                .isVerified(false)
                .isActive(true)
                .build();

        bankAccount = bankAccountRepository.save(bankAccount);
        return mapToBankAccountDTO(bankAccount);
    }

    public List<BankAccountDTO> getMyBankAccounts(User currentUser) {
        return bankAccountRepository.findByUserIdAndIsActiveTrue(currentUser.getId())
                .stream()
                .map(this::mapToBankAccountDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteBankAccount(Long accountId, User currentUser) {
        BankAccount account = bankAccountRepository.findByIdAndUserId(accountId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found"));
        bankAccountRepository.deactivate(accountId);
    }

    @Transactional
    public BankAccountDTO setPrimaryBankAccount(Long accountId, User currentUser) {
        BankAccount account = bankAccountRepository.findByIdAndUserId(accountId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found"));

        bankAccountRepository.clearPrimaryForUser(currentUser.getId());
        account.setIsPrimary(true);
        account = bankAccountRepository.save(account);

        return mapToBankAccountDTO(account);
    }

    // ==========================================
    // Transactions & History
    // ==========================================

    public List<TransactionDTO> getMyTransactions(User currentUser, int limit) {
        Wallet wallet = walletRepository.findByUser(currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));

        return transactionRepository.findRecentByWalletId(
                wallet.getId(), PageRequest.of(0, limit))
                .stream()
                .map(this::mapToTransactionDTO)
                .collect(Collectors.toList());
    }

    public List<EarningDTO> getMyEarnings(User currentUser, int limit) {
        if (currentUser.getUserType() == UserType.COMPANY_ADMIN) {
            CompanyAdmin company = companyRepository.findByUser(currentUser)
                    .orElseThrow(() -> new ResourceNotFoundException("Company not found"));
            return earningRepository.findByCompanyOrderByCreatedAtDesc(
                    company, PageRequest.of(0, limit))
                    .stream()
                    .map(this::mapToEarningDTO)
                    .collect(Collectors.toList());
        } else if (currentUser.getUserType() == UserType.DELIVERY_AGENT) {
            DeliveryAgent agent = agentRepository.findByUser(currentUser)
                    .orElseThrow(() -> new ResourceNotFoundException("Agent not found"));
            return earningRepository.findByAgentOrderByCreatedAtDesc(
                    agent, PageRequest.of(0, limit))
                    .stream()
                    .map(this::mapToEarningDTO)
                    .collect(Collectors.toList());
        }
        return List.of();
    }

    public EarningsSummaryDTO getEarningsSummary(User currentUser) {
        Wallet wallet = walletRepository.findByUser(currentUser).orElse(null);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        LocalDateTime startOfWeek = now.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).toLocalDate()
                .atStartOfDay();
        LocalDateTime startOfMonth = now.with(TemporalAdjusters.firstDayOfMonth()).toLocalDate().atStartOfDay();

        EarningsSummaryDTO.EarningsSummaryDTOBuilder builder = EarningsSummaryDTO.builder();

        if (wallet != null) {
            builder.availableBalance(wallet.getAvailableBalance())
                    .pendingBalance(wallet.getPendingBalance())
                    .totalBalance(wallet.getTotalBalance())
                    .totalEarnings(wallet.getTotalEarnings())
                    .totalWithdrawn(wallet.getTotalWithdrawn());
        }

        if (currentUser.getUserType() == UserType.DELIVERY_AGENT) {
            DeliveryAgent agent = agentRepository.findByUser(currentUser)
                    .orElseThrow(() -> new ResourceNotFoundException("Agent profile not found"));
            builder.todayEarnings(earningRepository.sumAgentEarningsToday(agent.getId()))
                    .todayDeliveries(earningRepository.countAgentDeliveriesToday(agent.getId()))
                    .thisWeekEarnings(earningRepository.sumAgentEarningsInPeriod(
                            agent.getId(), startOfWeek, now))
                    .thisMonthEarnings(earningRepository.sumAgentEarningsInPeriod(
                            agent.getId(), startOfMonth, now));
        } else if (currentUser.getUserType() == UserType.COMPANY_ADMIN) {
            CompanyAdmin company = companyRepository.findByUser(currentUser)
                    .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));
            builder.todayEarnings(earningRepository.sumCompanyEarningsInPeriod(
                    company.getId(), startOfDay, now))
                    .thisWeekEarnings(earningRepository.sumCompanyEarningsInPeriod(
                            company.getId(), startOfWeek, now))
                    .thisMonthEarnings(earningRepository.sumCompanyEarningsInPeriod(
                            company.getId(), startOfMonth, now));
        }

        BigDecimal pendingPayout = payoutRepository.sumByStatus(PayoutStatus.REQUESTED)
                .add(payoutRepository.sumByStatus(PayoutStatus.PROCESSING));
        builder.pendingPayout(pendingPayout);

        return builder.build();
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private Transaction createTransaction(Wallet wallet, TransactionType type, BigDecimal amount,
            String description, String refType, Long refId,
            TransactionStatus status) {
        Transaction transaction = Transaction.builder()
                .transactionId(Transaction.generateTransactionId())
                .wallet(wallet)
                .transactionType(type)
                .amount(amount)
                .balanceAfter(wallet.getTotalBalance())
                .description(description)
                .referenceType(refType)
                .referenceId(refId)
                .status(status)
                .build();

        return transactionRepository.save(transaction);
    }

    private void updatePayoutTransaction(Payout payout, TransactionStatus status) {
        List<Transaction> transactions = transactionRepository
                .findByReferenceTypeAndReferenceId("PAYOUT", payout.getId());
        for (Transaction txn : transactions) {
            txn.setStatus(status);
            transactionRepository.save(txn);
        }
    }

    private WalletDTO mapToWalletDTO(Wallet wallet) {
        return WalletDTO.builder()
                .id(wallet.getId())
                .userId(wallet.getUser().getId())
                .walletType(wallet.getWalletType())
                .availableBalance(wallet.getAvailableBalance())
                .pendingBalance(wallet.getPendingBalance())
                .totalBalance(wallet.getTotalBalance())
                .totalEarnings(wallet.getTotalEarnings())
                .totalWithdrawn(wallet.getTotalWithdrawn())
                .currency(wallet.getCurrency())
                .isActive(wallet.getIsActive())
                .createdAt(wallet.getCreatedAt())
                .totalTransactions(transactionRepository.countByWalletId(wallet.getId()))
                .build();
    }

    private TransactionDTO mapToTransactionDTO(Transaction txn) {
        return TransactionDTO.builder()
                .id(txn.getId())
                .transactionId(txn.getTransactionId())
                .walletId(txn.getWallet().getId())
                .transactionType(txn.getTransactionType())
                .amount(txn.getAmount())
                .balanceAfter(txn.getBalanceAfter())
                .description(txn.getDescription())
                .referenceType(txn.getReferenceType())
                .referenceId(txn.getReferenceId())
                .status(txn.getStatus())
                .createdAt(txn.getCreatedAt())
                .isCredit(txn.isCredit())
                .formattedAmount((txn.isCredit() ? "+" : "-") + "₹" + txn.getAmount())
                .timeAgo(calculateTimeAgo(txn.getCreatedAt()))
                .build();
    }

    private EarningDTO mapToEarningDTO(Earning earning) {
        return EarningDTO.builder()
                .id(earning.getId())
                .parcelId(earning.getParcel().getId())
                .trackingNumber(earning.getParcel().getTrackingNumber())
                .companyId(earning.getCompany().getId())
                .companyName(earning.getCompany().getCompanyName())
                .agentId(earning.getAgent() != null ? earning.getAgent().getId() : null)
                .agentName(earning.getAgent() != null ? earning.getAgent().getFullName() : null)
                .orderAmount(earning.getOrderAmount())
                .platformCommissionRate(earning.getPlatformCommissionRate())
                .platformCommission(earning.getPlatformCommission())
                .companyEarning(earning.getCompanyEarning())
                .agentCommissionRate(earning.getAgentCommissionRate())
                .agentEarning(earning.getAgentEarning())
                .companyNetEarning(earning.getCompanyNetEarning())
                .agentBonus(earning.getAgentBonus())
                .customerTip(earning.getCustomerTip())
                .totalAgentEarning(earning.getTotalAgentEarning())
                .status(earning.getStatus())
                .clearedAt(earning.getClearedAt())
                .createdAt(earning.getCreatedAt())
                .pickupCity(earning.getParcel().getPickupCity())
                .deliveryCity(earning.getParcel().getDeliveryCity())
                .build();
    }

    private PayoutDTO mapToPayoutDTO(Payout payout) {
        String statusLabel = switch (payout.getStatus()) {
            case REQUESTED -> "Pending Review";
            case PROCESSING -> "Processing";
            case COMPLETED -> "Completed";
            case REJECTED -> "Rejected";
            case CANCELLED -> "Cancelled";
            case FAILED -> "Failed";
        };

        String statusColor = switch (payout.getStatus()) {
            case REQUESTED -> "yellow";
            case PROCESSING -> "blue";
            case COMPLETED -> "green";
            case REJECTED, FAILED -> "red";
            case CANCELLED -> "gray";
        };

        return PayoutDTO.builder()
                .id(payout.getId())
                .payoutId(payout.getPayoutId())
                .userId(payout.getUser().getId())
                .userName(getUserName(payout.getUser()))
                .userType(payout.getUser().getUserType().name())
                .amount(payout.getAmount())
                .status(payout.getStatus())
                .payoutMethod(payout.getPayoutMethod())
                .bankName(payout.getBankName())
                .maskedAccountNumber(payout.getMaskedAccountNumber())
                .ifscCode(payout.getIfscCode())
                .accountHolderName(payout.getAccountHolderName())
                .upiId(payout.getUpiId())
                .processedAt(payout.getProcessedAt())
                .transactionReference(payout.getTransactionReference())
                .rejectionReason(payout.getRejectionReason())
                .createdAt(payout.getCreatedAt())
                .statusLabel(statusLabel)
                .statusColor(statusColor)
                .build();
    }

    private BankAccountDTO mapToBankAccountDTO(BankAccount account) {
        return BankAccountDTO.builder()
                .id(account.getId())
                .bankName(account.getBankName())
                .branchName(account.getBranchName())
                .maskedAccountNumber(account.getMaskedAccountNumber())
                .ifscCode(account.getIfscCode())
                .accountHolderName(account.getAccountHolderName())
                .accountType(account.getAccountType())
                .upiId(account.getUpiId())
                .isVerified(account.getIsVerified())
                .isPrimary(account.getIsPrimary())
                .isActive(account.getIsActive())
                .label(account.getLabel())
                .displayName(account.getDisplayName())
                .createdAt(account.getCreatedAt())
                .build();
    }

    private String getUserName(User user) {
        if (user.getUserType() == UserType.COMPANY_ADMIN) {
            return companyRepository.findByUser(user)
                    .map(CompanyAdmin::getCompanyName)
                    .orElse(user.getEmail());
        } else if (user.getUserType() == UserType.DELIVERY_AGENT) {
            return agentRepository.findByUser(user)
                    .map(DeliveryAgent::getFullName)
                    .orElse(user.getEmail());
        }
        return user.getEmail();
    }

    private String calculateTimeAgo(LocalDateTime dateTime) {
        if (dateTime == null)
            return "";

        long minutes = ChronoUnit.MINUTES.between(dateTime, LocalDateTime.now());

        if (minutes < 1)
            return "Just now";
        if (minutes < 60)
            return minutes + "m ago";

        long hours = minutes / 60;
        if (hours < 24)
            return hours + "h ago";

        long days = hours / 24;
        if (days < 7)
            return days + "d ago";

        long weeks = days / 7;
        if (weeks < 4)
            return weeks + "w ago";

        long months = days / 30;
        return months + "mo ago";
    }
}