package com.tpts.controller;

import com.tpts.dto.request.CreateBankAccountRequest;
import com.tpts.dto.request.CreatePayoutRequest;
import com.tpts.dto.request.ProcessPayoutRequest;
import com.tpts.dto.response.*;
import com.tpts.entity.PayoutStatus;
import com.tpts.entity.User;
import com.tpts.repository.UserRepository;
import com.tpts.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;
    private final UserRepository userRepository;

    // ==========================================
    // Wallet Endpoints
    // ==========================================

    /**
     * Get my wallet
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<WalletDTO>> getMyWallet(
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        WalletDTO wallet = walletService.getWallet(currentUser);
        return ResponseEntity.ok(ApiResponse.success(wallet, "Wallet retrieved successfully"));
    }

    /**
     * Get wallet by user ID (Admin)
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<WalletDTO>> getWalletByUserId(@PathVariable Long userId) {
        WalletDTO wallet = walletService.getWalletByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(wallet, "Wallet retrieved successfully"));
    }

    /**
     * Get earnings summary
     */
    @GetMapping("/earnings/summary")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<EarningsSummaryDTO>> getEarningsSummary(
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        EarningsSummaryDTO summary = walletService.getEarningsSummary(currentUser);
        return ResponseEntity.ok(ApiResponse.success(summary, "Earnings summary retrieved"));
    }

    /**
     * Get my earnings list
     */
    @GetMapping("/earnings")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<List<EarningDTO>>> getMyEarnings(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "20") int limit) {
        User currentUser = getCurrentUser(userDetails);
        List<EarningDTO> earnings = walletService.getMyEarnings(currentUser, limit);
        return ResponseEntity.ok(ApiResponse.success(earnings, "Earnings retrieved successfully"));
    }

    /**
     * Get my transactions
     */
    @GetMapping("/transactions")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<TransactionDTO>>> getMyTransactions(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "20") int limit) {
        User currentUser = getCurrentUser(userDetails);
        List<TransactionDTO> transactions = walletService.getMyTransactions(currentUser, limit);
        return ResponseEntity.ok(ApiResponse.success(transactions, "Transactions retrieved successfully"));
    }

    // ==========================================
    // Payout Endpoints
    // ==========================================

    /**
     * Request payout
     */
    @PostMapping("/payouts")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<PayoutDTO>> requestPayout(
            @Valid @RequestBody CreatePayoutRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        PayoutDTO payout = walletService.requestPayout(request, currentUser);
        return ResponseEntity.ok(ApiResponse.success(payout, "Payout request submitted successfully"));
    }

    /**
     * Get my payouts
     */
    @GetMapping("/payouts")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<List<PayoutDTO>>> getMyPayouts(
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        List<PayoutDTO> payouts = walletService.getMyPayouts(currentUser);
        return ResponseEntity.ok(ApiResponse.success(payouts, "Payouts retrieved successfully"));
    }

    /**
     * Cancel my payout
     */
    @PostMapping("/payouts/{payoutId}/cancel")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<PayoutDTO>> cancelPayout(
            @PathVariable Long payoutId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        PayoutDTO payout = walletService.cancelPayout(payoutId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(payout, "Payout cancelled successfully"));
    }

    /**
     * Get pending payouts (Admin)
     */
    @GetMapping("/payouts/pending")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<PayoutDTO>>> getPendingPayouts() {
        List<PayoutDTO> payouts = walletService.getPendingPayouts();
        return ResponseEntity.ok(ApiResponse.success(payouts, "Pending payouts retrieved"));
    }

    /**
     * Get all payouts with filter (Admin)
     */
    @GetMapping("/payouts/all")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Page<PayoutDTO>>> getAllPayouts(
            @RequestParam(required = false) PayoutStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<PayoutDTO> payouts = walletService.getAllPayouts(status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(payouts, "Payouts retrieved successfully"));
    }

    /**
     * Process payout (Admin)
     */
    @PostMapping("/payouts/{payoutId}/process")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<PayoutDTO>> processPayout(
            @PathVariable Long payoutId,
            @Valid @RequestBody ProcessPayoutRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User admin = getCurrentUser(userDetails);
        PayoutDTO payout = walletService.processPayout(payoutId, request, admin);
        return ResponseEntity.ok(ApiResponse.success(payout, "Payout processed successfully"));
    }

    /**
     * Clear pending earnings (Admin - Manual trigger)
     */
    @PostMapping("/earnings/clear")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> clearPendingEarnings() {
        int cleared = walletService.clearPendingEarnings();
        return ResponseEntity.ok(ApiResponse.success(cleared, cleared + " earnings cleared successfully"));
    }

    /**
     * Backfill earnings for delivered parcels that don't have Earning records
     * This is a one-time fix for parcels delivered before earnings processing was
     * added
     */
    @PostMapping("/earnings/backfill")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> backfillMissingEarnings() {
        int processed = walletService.backfillMissingEarnings();
        return ResponseEntity.ok(ApiResponse.success(processed, processed + " earnings backfilled successfully"));
    }

    // ==========================================
    // Bank Account Endpoints
    // ==========================================

    /**
     * Add bank account
     */
    @PostMapping("/bank-accounts")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<BankAccountDTO>> addBankAccount(
            @Valid @RequestBody CreateBankAccountRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        BankAccountDTO bankAccount = walletService.addBankAccount(request, currentUser);
        return ResponseEntity.ok(ApiResponse.success(bankAccount, "Bank account added successfully"));
    }

    /**
     * Get my bank accounts
     */
    @GetMapping("/bank-accounts")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<List<BankAccountDTO>>> getMyBankAccounts(
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        List<BankAccountDTO> accounts = walletService.getMyBankAccounts(currentUser);
        return ResponseEntity.ok(ApiResponse.success(accounts, "Bank accounts retrieved successfully"));
    }

    /**
     * Delete bank account
     */
    @DeleteMapping("/bank-accounts/{accountId}")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<Void>> deleteBankAccount(
            @PathVariable Long accountId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        walletService.deleteBankAccount(accountId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(null, "Bank account deleted successfully"));
    }

    /**
     * Set primary bank account
     */
    @PostMapping("/bank-accounts/{accountId}/primary")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'DELIVERY_AGENT')")
    public ResponseEntity<ApiResponse<BankAccountDTO>> setPrimaryBankAccount(
            @PathVariable Long accountId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        BankAccountDTO account = walletService.setPrimaryBankAccount(accountId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(account, "Primary bank account set successfully"));
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private User getCurrentUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}