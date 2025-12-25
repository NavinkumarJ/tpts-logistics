import { useState } from "react";
import { FaTimes, FaExclamationCircle } from "react-icons/fa";

/**
 * Reason Input Modal
 * Replaces browser's native prompt() dialog with a styled modal
 * Used for rejection reasons, suspension reasons, etc.
 */
export default function ReasonInputModal({
    isOpen,
    onClose,
    onSubmit,
    title = "Enter Reason",
    subtitle = "Please provide a reason",
    placeholder = "Enter your reason here...",
    submitText = "Submit",
    cancelText = "Cancel",
    variant = "danger", // danger, warning
    required = true,
    minLength = 5
}) {
    const [reason, setReason] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (required && !reason.trim()) {
            setError("Reason is required");
            return;
        }
        if (reason.trim().length < minLength) {
            setError(`Reason must be at least ${minLength} characters`);
            return;
        }

        setIsProcessing(true);
        setError("");
        await new Promise(resolve => setTimeout(resolve, 200));
        onSubmit(reason.trim());
        setReason("");
        setIsProcessing(false);
    };

    const handleClose = () => {
        setReason("");
        setError("");
        onClose();
    };

    const variants = {
        danger: {
            headerBg: "bg-gradient-to-r from-red-500 to-rose-600",
            btnBg: "bg-red-600 hover:bg-red-700",
            focusRing: "focus:ring-red-500 focus:border-red-500"
        },
        warning: {
            headerBg: "bg-gradient-to-r from-amber-500 to-orange-600",
            btnBg: "bg-amber-600 hover:bg-amber-700",
            focusRing: "focus:ring-amber-500 focus:border-amber-500"
        }
    };

    const v = variants[variant] || variants.danger;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                {/* Header */}
                <div className={`${v.headerBg} p-5 text-white`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <FaExclamationCircle className="text-lg" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">{title}</h3>
                                <p className="text-white/80 text-sm">{subtitle}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="mb-4">
                        <textarea
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError("");
                            }}
                            placeholder={placeholder}
                            rows={4}
                            className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-red-500' : 'border-gray-300'} ${v.focusRing} focus:ring-2 focus:outline-none transition resize-none`}
                            autoFocus
                        />
                        {error && (
                            <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                                <FaExclamationCircle className="text-xs" /> {error}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleClose}
                            className="flex-1 px-4 py-3 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isProcessing}
                            className={`flex-1 px-4 py-3 rounded-xl font-medium ${v.btnBg} text-white transition flex items-center justify-center gap-2 disabled:opacity-70`}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                submitText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
