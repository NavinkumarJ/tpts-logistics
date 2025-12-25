import { useState } from "react";
import { FaTimes, FaExclamationTriangle, FaCheckCircle, FaBan, FaPlay } from "react-icons/fa";

/**
 * Reusable Confirmation Modal
 * Replaces browser's native confirm() dialog with a styled modal
 */
export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "default", // default, danger, success
    icon // custom icon component
}) {
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsProcessing(true);
        await new Promise(resolve => setTimeout(resolve, 200));
        onConfirm();
        setIsProcessing(false);
    };

    const variants = {
        default: {
            headerBg: "bg-gradient-to-r from-slate-600 to-slate-700",
            btnBg: "bg-slate-600 hover:bg-slate-700",
            icon: icon || FaExclamationTriangle,
            iconBg: "bg-slate-100",
            iconColor: "text-slate-600"
        },
        danger: {
            headerBg: "bg-gradient-to-r from-red-500 to-rose-600",
            btnBg: "bg-red-600 hover:bg-red-700",
            icon: icon || FaBan,
            iconBg: "bg-red-100",
            iconColor: "text-red-600"
        },
        success: {
            headerBg: "bg-gradient-to-r from-green-500 to-emerald-600",
            btnBg: "bg-green-600 hover:bg-green-700",
            icon: icon || FaCheckCircle,
            iconBg: "bg-green-100",
            iconColor: "text-green-600"
        },
        reactivate: {
            headerBg: "bg-gradient-to-r from-indigo-500 to-purple-600",
            btnBg: "bg-indigo-600 hover:bg-indigo-700",
            icon: icon || FaPlay,
            iconBg: "bg-indigo-100",
            iconColor: "text-indigo-600"
        }
    };

    const v = variants[variant] || variants.default;
    const IconComponent = v.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                {/* Header */}
                <div className={`${v.headerBg} p-5 text-white`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <IconComponent className="text-lg" />
                            </div>
                            <h3 className="text-lg font-bold">{title}</h3>
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
                        <div className={`w-12 h-12 rounded-full ${v.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <IconComponent className={`text-xl ${v.iconColor}`} />
                        </div>
                        <div>
                            <p className="text-gray-700">{message}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isProcessing}
                            className={`flex-1 px-4 py-3 rounded-xl font-medium ${v.btnBg} text-white transition flex items-center justify-center gap-2 disabled:opacity-70`}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                confirmText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
