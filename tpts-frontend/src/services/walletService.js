import apiClient from "../utils/api";

/**
 * Wallet Service
 * Handles all wallet and payment-related API calls
 */

// Get my wallet
export const getMyWallet = async () => {
    const response = await apiClient.get("/wallet");
    return response.data.data;
};

// Get earnings summary
export const getEarningsSummary = async () => {
    const response = await apiClient.get("/wallet/earnings/summary");
    return response.data.data;
};

// Get my earnings list
export const getMyEarnings = async (limit = 20) => {
    const response = await apiClient.get("/wallet/earnings", { params: { limit } });
    return response.data.data;
};

// Get my transactions
export const getMyTransactions = async (limit = 20) => {
    const response = await apiClient.get("/wallet/transactions", { params: { limit } });
    return response.data.data;
};

// Request payout
export const requestPayout = async (data) => {
    const response = await apiClient.post("/wallet/payouts", data);
    return response.data.data;
};

// Get my payouts
export const getMyPayouts = async () => {
    const response = await apiClient.get("/wallet/payouts");
    return response.data.data;
};

// Cancel payout
export const cancelPayout = async (payoutId) => {
    const response = await apiClient.post(`/wallet/payouts/${payoutId}/cancel`);
    return response.data.data;
};

// Get my bank accounts
export const getMyBankAccounts = async () => {
    const response = await apiClient.get("/wallet/bank-accounts");
    return response.data.data;
};

// Add bank account
export const addBankAccount = async (data) => {
    const response = await apiClient.post("/wallet/bank-accounts", data);
    return response.data.data;
};

// Delete bank account
export const deleteBankAccount = async (accountId) => {
    const response = await apiClient.delete(`/wallet/bank-accounts/${accountId}`);
    return response.data;
};

// Set primary bank account
export const setPrimaryBankAccount = async (accountId) => {
    const response = await apiClient.post(`/wallet/bank-accounts/${accountId}/primary`);
    return response.data.data;
};
