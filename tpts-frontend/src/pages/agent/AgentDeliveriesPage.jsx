import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getActiveDeliveries, updateParcelStatus } from "../../services/agentService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaBox, FaMapMarkerAlt, FaPhone, FaCheck, FaRoute, FaTruck,
    FaArrowRight, FaClock, FaBoxOpen, FaWeightHanging, FaSync
} from "react-icons/fa";

const STATUS_FLOW = [
    { value: "ASSIGNED", label: "Assigned", color: "bg-purple-500", bgLight: "bg-purple-100", text: "text-purple-700", icon: "📋" },
    { value: "PICKED_UP", label: "Picked Up", color: "bg-blue-500", bgLight: "bg-blue-100", text: "text-blue-700", icon: "📦" },
    { value: "IN_TRANSIT", label: "In Transit", color: "bg-orange-500", bgLight: "bg-orange-100", text: "text-orange-700", icon: "🚛" },
    { value: "OUT_FOR_DELIVERY", label: "Out for Delivery", color: "bg-cyan-500", bgLight: "bg-cyan-100", text: "text-cyan-700", icon: "🏃" },
    { value: "DELIVERED", label: "Delivered", color: "bg-green-500", bgLight: "bg-green-100", text: "text-green-700", icon: "✅" },
];

export default function AgentDeliveriesPage() {
    const navigate = useNavigate();
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchDeliveries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchDeliveries = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        try {
            const data = await getActiveDeliveries();
            setDeliveries(data || []);
            if (isRefresh) toast.success("Deliveries refreshed");
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load deliveries");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleStatusUpdate = async (parcelId, newStatus) => {
        setUpdatingId(parcelId);
        try {
            await updateParcelStatus(parcelId, { status: newStatus });
            toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
            fetchDeliveries();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update status");
        } finally {
            setUpdatingId(null);
        }
    };

    const getStatusInfo = (status) => {
        return STATUS_FLOW.find(s => s.value === status) || STATUS_FLOW[0];
    };

    const getNextStatus = (currentStatus) => {
        const currentIdx = STATUS_FLOW.findIndex(s => s.value === currentStatus);
        if (currentIdx < STATUS_FLOW.length - 1) {
            return STATUS_FLOW[currentIdx + 1];
        }
        return null;
    };

    // Group deliveries by status for better organization
    const groupedDeliveries = STATUS_FLOW.slice(0, -1).reduce((acc, status) => {
        acc[status.value] = deliveries.filter(d => d.status === status.value);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading deliveries...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Active Deliveries</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {deliveries.length} {deliveries.length === 1 ? "delivery" : "deliveries"} in progress
                    </p>
                </div>
                <button
                    onClick={() => fetchDeliveries(true)}
                    disabled={refreshing}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
                >
                    <FaSync className={refreshing ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {STATUS_FLOW.slice(0, -1).map(status => {
                    const count = groupedDeliveries[status.value]?.length || 0;
                    return (
                        <div
                            key={status.value}
                            className={`p-4 rounded-xl border-2 ${count > 0 ? 'border-gray-200' : 'border-dashed border-gray-200'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.bgLight}`}>
                                    <span className="text-lg">{status.icon}</span>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-gray-900">{count}</p>
                                    <p className="text-xs text-gray-500">{status.label}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Deliveries List */}
            {deliveries.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 shadow-md border border-gray-200 text-center">
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <FaBoxOpen className="text-4xl text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Deliveries</h3>
                    <p className="text-sm text-gray-500 mb-4">You don't have any active deliveries at the moment.</p>
                    <button
                        onClick={() => navigate('/agent/dashboard')}
                        className="px-4 py-2 bg-orange-100 text-orange-600 rounded-lg font-medium hover:bg-orange-200 transition"
                    >
                        Back to Dashboard
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {deliveries.map((delivery) => {
                        const statusInfo = getStatusInfo(delivery.status);
                        const nextStatus = getNextStatus(delivery.status);
                        const orderAmount = delivery.finalPrice || delivery.totalAmount || 0;

                        return (
                            <div
                                key={delivery.id}
                                className={`bg-white rounded-2xl shadow-md border-l-4 ${statusInfo.color} border border-gray-200 overflow-hidden hover:shadow-lg transition`}
                            >
                                {/* Card Header */}
                                <div className="p-5 border-b border-gray-100">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${statusInfo.bgLight}`}>
                                                <FaTruck className={`text-2xl ${statusInfo.text}`} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-lg">{delivery.trackingNumber}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bgLight} ${statusInfo.text}`}>
                                                        {statusInfo.icon} {statusInfo.label}
                                                    </span>
                                                    {delivery.weightKg && (
                                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                                            <FaWeightHanging /> {delivery.weightKg} kg
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-gray-900">₹{orderAmount.toLocaleString('en-IN')}</p>
                                            <p className="text-xs text-gray-500">Order Value</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Route Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                                    {/* Pickup */}
                                    <div className="p-5 bg-gradient-to-r from-green-50 to-transparent border-b md:border-b-0 md:border-r border-gray-100">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                                <FaMapMarkerAlt className="text-green-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Pickup</p>
                                                <p className="font-semibold text-gray-900 truncate">{delivery.pickupName || 'Sender'}</p>
                                                <p className="text-sm text-gray-600 line-clamp-2">{delivery.pickupAddress}</p>
                                                <p className="text-sm text-gray-500">{delivery.pickupCity}</p>
                                                {delivery.pickupPhone && (
                                                    <a href={`tel:${delivery.pickupPhone}`} className="mt-2 inline-flex items-center gap-1 text-sm text-green-600 hover:underline">
                                                        <FaPhone className="text-xs" /> {delivery.pickupPhone}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delivery */}
                                    <div className="p-5 bg-gradient-to-l from-blue-50 to-transparent">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                <FaMapMarkerAlt className="text-blue-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Delivery</p>
                                                <p className="font-semibold text-gray-900 truncate">{delivery.deliveryName || delivery.receiverName || 'Receiver'}</p>
                                                <p className="text-sm text-gray-600 line-clamp-2">{delivery.deliveryAddress}</p>
                                                <p className="text-sm text-gray-500">{delivery.deliveryCity}</p>
                                                {(delivery.deliveryPhone || delivery.receiverPhone) && (
                                                    <a href={`tel:${delivery.deliveryPhone || delivery.receiverPhone}`} className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                                                        <FaPhone className="text-xs" /> {delivery.deliveryPhone || delivery.receiverPhone}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-4 bg-gray-50 flex flex-wrap items-center gap-3">
                                    <Link
                                        to={`/agent/deliveries/${delivery.id}`}
                                        className="px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 transition"
                                    >
                                        <FaRoute /> View & Navigate
                                    </Link>

                                    {nextStatus && (
                                        <button
                                            onClick={() => handleStatusUpdate(delivery.id, nextStatus.value)}
                                            disabled={updatingId === delivery.id}
                                            className={`px-4 py-2.5 rounded-xl text-sm font-medium text-white ${nextStatus.color} hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition`}
                                        >
                                            {updatingId === delivery.id ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <FaCheck />
                                            )}
                                            Mark as {nextStatus.label}
                                        </button>
                                    )}

                                    <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                                        <FaClock />
                                        {new Date(delivery.createdAt).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
