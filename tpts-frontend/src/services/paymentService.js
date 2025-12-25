import apiClient from "../utils/api";

/**
 * Payment API Service
 * Handles Razorpay payment integration
 */

// Initiate payment - creates Razorpay order
export const initiatePayment = async (data) => {
    const response = await apiClient.post("/payments/initiate", data);
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
