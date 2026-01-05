import apiClient from "../utils/api";

/**
 * Payment API Service
 * Handles Razorpay payment integration
 */

// Initiate payment - creates Razorpay order (requires existing parcel)
export const initiatePayment = async (data) => {
    const response = await apiClient.post("/payments/initiate", data);
    return response.data.data;
};

// Initiate order - creates Razorpay order WITHOUT creating parcel first
// Parcel is created only after successful payment verification
export const initiateOrder = async (data) => {
    const response = await apiClient.post("/payments/initiate-order", data);
    return response.data.data;
};

// Verify payment after Razorpay checkout
export const verifyPayment = async (data) => {
    const response = await apiClient.post("/payments/verify", data);
    return response.data.data;
};

// Mark payment as failed
export const markPaymentFailed = async (razorpayOrderId) => {
    const response = await apiClient.post("/payments/failed", {
        razorpayOrderId
    });
    return response.data.data;
};

// Get payment by ID
export const getPaymentById = async (id) => {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data.data;
};

// Get payment by parcel ID
export const getPaymentByParcelId = async (parcelId) => {
    const response = await apiClient.get(`/payments/parcel/${parcelId}`);
    return response.data.data;
};

// Get customer's payment history
export const getMyPayments = async () => {
    const response = await apiClient.get("/payments/my-payments");
    return response.data.data;
};

/**
 * Load Razorpay script dynamically
 * @returns {Promise<boolean>}
 */
export const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

/**
 * Open Razorpay checkout
 * @param {Object} options - Razorpay options
 * @returns {Promise<Object>} - Payment response
 */
export const openRazorpayCheckout = (options) => {
    return new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
            ...options,
            handler: function (response) {
                resolve(response);
            },
            modal: {
                ondismiss: function () {
                    reject(new Error("Payment cancelled by user"));
                }
            }
        });
        rzp.open();
    });
};

// ==========================================
// Balance Payment (for partial groups)
// ==========================================

// Create Razorpay order for balance payment
export const createBalancePaymentOrder = async (parcelId) => {
    const response = await apiClient.post(`/payments/balance/${parcelId}/create`);
    // BalancePaymentController returns data directly, not wrapped in ApiResponse
    return response.data;
};

// Verify balance payment after Razorpay checkout
export const verifyBalancePayment = async (parcelId, data) => {
    const response = await apiClient.post(`/payments/balance/${parcelId}/verify`, data);
    // BalancePaymentController returns data directly, not wrapped in ApiResponse
    return response.data;
};

// Record cash collection by agent (with photo proof)
export const recordCashCollection = async (parcelId, photoUrl) => {
    const response = await apiClient.post(`/payments/balance/${parcelId}/cash`, { photoUrl });
    return response.data.data;
};

// Get balance payment status
export const getBalanceStatus = async (parcelId) => {
    const response = await apiClient.get(`/payments/balance/${parcelId}/status`);
    return response.data.data;
};
