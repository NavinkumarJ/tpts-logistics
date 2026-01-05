import { useState } from "react";
import { FaSignOutAlt, FaExclamationTriangle, FaTimes } from "react-icons/fa";

/**
 * Professional Logout Confirmation Modal
 * Replaces browser's native confirm() dialog with a styled modal
 */
export default function LogoutConfirmModal({ isOpen, onClose, onConfirm, userName }) {
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsLoggingOut(true);
        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
        await onConfirm();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                <FaSignOutAlt className="text-xl" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Confirm Logout</h3>
                                <p className="text-white/80 text-sm">You're about to sign out</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <FaExclamationTriangle className="text-xl text-amber-600" />
                        </div>
                        <div>
                            <p className="text-gray-900 font-medium">
                                Are you sure you want to logout{userName ? `, ${userName.split(' ')[0]}` : ''}?
                            </p>
                            <p className="text-gray-500 text-sm mt-1">
                                You will be redirected to the login page. Any unsaved changes may be lost.
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isLoggingOut}
                            className="flex-1 px-4 py-3 rounded-xl font-medium bg-red-600 text-white hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isLoggingOut ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Logging out...
                                </>
                            ) : (
                                <>
                                    <FaSignOutAlt /> Yes, Logout
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
