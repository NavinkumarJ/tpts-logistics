import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import apiClient from "../../utils/api";
import toast from "react-hot-toast";
import { FaArrowLeft, FaBox, FaTruck, FaMapMarkerAlt, FaPhone, FaUser, FaClock } from "react-icons/fa";

const STATUS_CONFIG = {
    PENDING: { label: "Pending", bg: "bg-yellow-100", text: "text-yellow-800" },
    CONFIRMED: { label: "Confirmed", bg: "bg-blue-100", text: "text-blue-800" },
    ASSIGNED: { label: "Assigned", bg: "bg-purple-100", text: "text-purple-800" },
    PICKED_UP: { label: "Picked Up", bg: "bg-indigo-100", text: "text-indigo-800" },
    IN_TRANSIT: { label: "In Transit", bg: "bg-orange-100", text: "text-orange-800" },
    OUT_FOR_DELIVERY: { label: "Out for Delivery", bg: "bg-cyan-100", text: "text-cyan-800" },
    DELIVERED: { label: "Delivered", bg: "bg-green-100", text: "text-green-800" },
    CANCELLED: { label: "Cancelled", bg: "bg-red-100", text: "text-red-800" },
};

export default function CompanyParcelDetailPage() {
    const { parcelId } = useParams();
    const navigate = useNavigate();
    const [parcel, setParcel] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchParcel();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parcelId]);

    const fetchParcel = async () => {
        try {
            const response = await apiClient.get(`/parcels/${parcelId}`);
            setParcel(response.data.data);
        } catch (err) {
            toast.error("Failed to load parcel details");
            navigate("/company/parcels");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading parcel details...</p>
            </div>
        );
    }

    if (!parcel) return null;

    const statusConfig = STATUS_CONFIG[parcel.status] || STATUS_CONFIG.PENDING;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    to="/company/parcels"
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                    <FaArrowLeft className="text-gray-600" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">Parcel Details</h1>
                    <p className="text-sm text-gray-500">{parcel.trackingNumber}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                    {statusConfig.label}
                </span>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Sender Info */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FaUser className="text-green-500" /> Sender Details
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Name:</span>
                            <span className="font-medium">{parcel.pickupName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Phone:</span>
                            <span className="font-medium">{parcel.pickupPhone}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Address:</span>
                            <span className="font-medium text-right max-w-[200px]">{parcel.pickupAddress}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">City:</span>
                            <span className="font-medium">{parcel.pickupCity} - {parcel.pickupPincode}</span>
                        </div>
                    </div>
                </div>

                {/* Receiver Info */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FaMapMarkerAlt className="text-red-500" /> Receiver Details
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Name:</span>
                            <span className="font-medium">{parcel.deliveryName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Phone:</span>
                            <span className="font-medium">{parcel.deliveryPhone}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Address:</span>
                            <span className="font-medium text-right max-w-[200px]">{parcel.deliveryAddress}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">City:</span>
                            <span className="font-medium">{parcel.deliveryCity} - {parcel.deliveryPincode}</span>
                        </div>
                    </div>
                </div>

                {/* Package Details */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FaBox className="text-indigo-500" /> Package Details
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Weight:</span>
                            <span className="font-medium">{parcel.weightKg} kg</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Dimensions:</span>
                            <span className="font-medium">{parcel.dimensions || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Package Type:</span>
                            <span className="font-medium">{parcel.packageType || "Standard"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Fragile:</span>
                            <span className={`font-medium ${parcel.isFragile ? "text-red-600" : "text-green-600"}`}>
                                {parcel.isFragile ? "Yes - Handle with care" : "No"}
                            </span>
                        </div>
                        {parcel.specialInstructions && (
                            <div className="pt-2 border-t">
                                <p className="text-gray-500 mb-1">Special Instructions:</p>
                                <p className="font-medium text-orange-600">{parcel.specialInstructions}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Agent & Payment */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FaTruck className="text-purple-500" /> Delivery Info
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Assigned Agent:</span>
                            <span className="font-medium">{parcel.agentName || parcel.assignedAgentName || "Not assigned"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Amount:</span>
                            <span className="font-medium text-green-600">₹{parcel.finalPrice || parcel.totalAmount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Payment Status:</span>
                            <span className={`font-medium ${["PAID", "SUCCESS"].includes(parcel.paymentStatus) ? "text-green-600" : "text-orange-600"}`}>
                                {["PAID", "SUCCESS"].includes(parcel.paymentStatus) ? "✓ Paid" : parcel.paymentStatus || "Pending"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Created:</span>
                            <span className="font-medium">{new Date(parcel.createdAt).toLocaleString("en-IN")}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Status Timeline */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <FaClock className="text-indigo-500" /> Delivery Timeline
                </h3>
                <div className="relative">
                    {/* Timeline Steps */}
                    {(() => {
                        const statusOrder = ["PENDING", "CONFIRMED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];
                        const currentIndex = statusOrder.indexOf(parcel.status);
                        const isCancelled = parcel.status === "CANCELLED";

                        const steps = [
                            { key: "CONFIRMED", label: "Order Confirmed", icon: "📋", time: parcel.createdAt },
                            { key: "ASSIGNED", label: "Agent Assigned", icon: "👤", time: parcel.assignedAt },
                            { key: "PICKED_UP", label: "Package Picked Up", icon: "📦", time: parcel.pickedUpAt },
                            { key: "IN_TRANSIT", label: "In Transit", icon: "🚚", time: parcel.inTransitAt },
                            { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: "🏍️", time: parcel.outForDeliveryAt },
                            { key: "DELIVERED", label: "Delivered", icon: "✅", time: parcel.deliveredAt },
                        ];

                        return (
                            <div className="flex flex-col md:flex-row md:justify-between gap-4 md:gap-0">
                                {steps.map((step, idx) => {
                                    const stepIndex = statusOrder.indexOf(step.key);
                                    const isCompleted = !isCancelled && currentIndex >= stepIndex;
                                    const isCurrent = !isCancelled && parcel.status === step.key;
                                    const isPending = !isCancelled && currentIndex < stepIndex;

                                    // Line should be green if THIS step is completed (meaning we've reached or passed this step)
                                    const lineBeforeIsGreen = !isCancelled && currentIndex >= stepIndex;

                                    return (
                                        <div key={step.key} className="flex md:flex-col items-center md:items-center relative flex-1">
                                            {/* Connector Line (hidden on mobile, shown on desktop) */}
                                            {idx > 0 && (
                                                <div
                                                    className={`hidden md:block absolute top-5 h-0.5 ${lineBeforeIsGreen ? "bg-green-500" : "bg-gray-200"}`}
                                                    style={{ right: '50%', width: '100%' }}
                                                />
                                            )}

                                            {/* Status Circle */}
                                            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg ${isCancelled ? "bg-red-100 text-red-500" :
                                                isCompleted ? "bg-green-500 text-white" :
                                                    isCurrent ? "bg-indigo-500 text-white animate-pulse" :
                                                        "bg-gray-200 text-gray-400"
                                                }`}>
                                                {step.icon}
                                            </div>

                                            {/* Label and Time */}
                                            <div className="ml-3 md:ml-0 md:mt-2 text-center">
                                                <p className={`text-sm font-medium ${isCompleted ? "text-green-600" :
                                                    isCurrent ? "text-indigo-600" :
                                                        "text-gray-400"
                                                    }`}>
                                                    {step.label}
                                                </p>
                                                {step.time && isCompleted && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {new Date(step.time).toLocaleString("en-IN", {
                                                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                                        })}
                                                    </p>
                                                )}
                                                {isCurrent && (
                                                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-600 rounded-full">
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* Cancelled Status */}
                    {parcel.status === "CANCELLED" && (
                        <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200 text-center">
                            <p className="text-red-600 font-medium">❌ Order Cancelled</p>
                            {parcel.cancelledAt && (
                                <p className="text-sm text-red-500 mt-1">
                                    {new Date(parcel.cancelledAt).toLocaleString("en-IN")}
                                </p>
                            )}
                            {parcel.cancellationReason && (
                                <p className="text-sm text-gray-600 mt-2">Reason: {parcel.cancellationReason}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                {(parcel.agentName || parcel.assignedAgentName) && ["IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(parcel.status) && (
                    <Link
                        to={`/company/track/${parcel.trackingNumber}`}
                        className="btn-primary flex items-center gap-2"
                    >
                        <FaMapMarkerAlt /> Track Live
                    </Link>
                )}
                <Link to="/company/parcels" className="btn-outline">
                    Back to Parcels
                </Link>
            </div>
        </div>
    );
}
