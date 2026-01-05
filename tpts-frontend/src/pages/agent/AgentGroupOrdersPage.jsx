import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyGroupAssignments } from "../../services/agentService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaUsers, FaTruck, FaWarehouse, FaArrowRight, FaBoxOpen,
    FaMapMarkerAlt, FaSync, FaClock, FaRupeeSign, FaCheckCircle, FaSpinner, FaChartLine
} from "react-icons/fa";

export default function AgentGroupOrdersPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pickupGroups, setPickupGroups] = useState([]);
    const [deliveryGroups, setDeliveryGroups] = useState([]);
    const [activeTab, setActiveTab] = useState("ongoing"); // ongoing or completed

    useEffect(() => {
        fetchGroupAssignments();
    }, []);

    const fetchGroupAssignments = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        try {
            const data = await getMyGroupAssignments();
            setPickupGroups(data.pickupGroups || []);
            setDeliveryGroups(data.deliveryGroups || []);
            if (isRefresh) toast.success("Refreshed");
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load group assignments");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Check if group pickup/delivery is complete
    const isPickupComplete = (status) => ["PICKUP_COMPLETE", "DELIVERY_IN_PROGRESS", "COMPLETED"].includes(status);
    const isDeliveryComplete = (status) => ["COMPLETED"].includes(status);

    // Split groups into ongoing and completed
    const ongoingPickups = pickupGroups.filter(g => !isPickupComplete(g.status));
    const completedPickups = pickupGroups.filter(g => isPickupComplete(g.status));
    const ongoingDeliveries = deliveryGroups.filter(g => !isDeliveryComplete(g.status));
    const completedDeliveries = deliveryGroups.filter(g => isDeliveryComplete(g.status));

    // Calculate total earnings
    const totalPickupEarnings = completedPickups.reduce((sum, g) => sum + parseFloat(getEarnings(g, 'pickup')), 0);
    const totalDeliveryEarnings = completedDeliveries.reduce((sum, g) => sum + parseFloat(getEarnings(g, 'delivery')), 0);
    const totalEarnings = totalPickupEarnings + totalDeliveryEarnings;

    const getStatusBadge = (status) => {
        const statusMap = {
            FULL: { label: "Ready", bg: "bg-blue-100", text: "text-blue-700" },
            PICKUP_IN_PROGRESS: { label: "Pickup in Progress", bg: "bg-orange-100", text: "text-orange-700" },
            PICKUP_COMPLETE: { label: "✓ Pickup Complete", bg: "bg-green-100", text: "text-green-700" },
            AT_WAREHOUSE: { label: "At Warehouse", bg: "bg-purple-100", text: "text-purple-700" },
            DELIVERY_IN_PROGRESS: { label: "Delivery in Progress", bg: "bg-cyan-100", text: "text-cyan-700" },
            COMPLETED: { label: "✓ Completed", bg: "bg-green-100", text: "text-green-700" },
        };
        return statusMap[status] || { label: status, bg: "bg-gray-100", text: "text-gray-700" };
    };

    // Calculate earnings (10% of total group value for pickup, 10% for delivery)
    function getEarnings(group, type = 'pickup') {
        if (type === 'pickup' && group.pickupAgentEarnings) {
            return parseFloat(group.pickupAgentEarnings).toFixed(2);
        }
        if (type === 'delivery' && group.deliveryAgentEarnings) {
            return parseFloat(group.deliveryAgentEarnings).toFixed(2);
        }
        // Fallback calculation from totalGroupValue
        const totalValue = parseFloat(group.totalGroupValue || 0);
        return (totalValue * 0.10).toFixed(2);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-purple-400 border-t-transparent"></div>
                    <p className="mt-4 text-white/70 font-medium">Loading group orders...</p>
                </div>
            </div>
        );
    }

    const hasNoGroups = pickupGroups.length === 0 && deliveryGroups.length === 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                            <FaUsers className="text-3xl text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Group Orders</h1>
                            <p className="text-white/60 mt-1">Manage your group shipment assignments</p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchGroupAssignments(true)}
                        disabled={refreshing}
                        className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-xl flex items-center gap-2 font-medium transition text-indigo-400"
                    >
                        <FaSync className={refreshing ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <FaTruck className="text-2xl text-indigo-400" />
                            <div>
                                <p className="text-white/50 text-sm">Pickups</p>
                                <p className="text-2xl font-bold text-white">{ongoingPickups.length} / {pickupGroups.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <FaWarehouse className="text-2xl text-green-400" />
                            <div>
                                <p className="text-white/50 text-sm">Deliveries</p>
                                <p className="text-2xl font-bold text-white">{ongoingDeliveries.length} / {deliveryGroups.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <FaCheckCircle className="text-2xl text-emerald-400" />
                            <div>
                                <p className="text-white/50 text-sm">Completed</p>
                                <p className="text-2xl font-bold text-white">{completedPickups.length + completedDeliveries.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <FaChartLine className="text-2xl text-yellow-400" />
                            <div>
                                <p className="text-white/50 text-sm">Group Earnings</p>
                                <p className="text-2xl font-bold text-green-400">₹{totalEarnings.toFixed(0)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-6">
                    <button
                        onClick={() => setActiveTab("ongoing")}
                        className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === "ongoing"
                            ? "bg-indigo-500 text-white"
                            : "bg-white/10 hover:bg-white/20 text-white/70"
                            }`}
                    >
                        Ongoing ({ongoingPickups.length + ongoingDeliveries.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("completed")}
                        className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === "completed"
                            ? "bg-indigo-500 text-white"
                            : "bg-white/10 hover:bg-white/20 text-white/70"
                            }`}
                    >
                        Completed ({completedPickups.length + completedDeliveries.length})
                    </button>
                </div>
            </div>

            {/* Empty State */}
            {hasNoGroups ? (
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 border border-white/20 text-center">
                    <div className="w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                        <FaBoxOpen className="text-4xl text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Group Orders Assigned</h3>
                    <p className="text-white/50 mb-4">
                        You don't have any group shipment assignments yet.<br />
                        Check back later for new group orders.
                    </p>
                    <button
                        onClick={() => navigate('/agent/dashboard')}
                        className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg font-medium hover:bg-purple-500/30 transition border border-purple-500/30"
                    >
                        Back to Dashboard
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Pickup Groups - show based on active tab */}
                    {((activeTab === "ongoing" ? ongoingPickups : completedPickups).length > 0) && (
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
                            <div className="bg-indigo-500/20 px-6 py-4 border-b border-white/10">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <FaTruck className="text-indigo-400" />
                                    {activeTab === "ongoing" ? "Ongoing Pickups" : "Completed Pickups"}
                                    <span className="ml-2 px-2 py-1 bg-indigo-500/30 text-indigo-300 text-xs rounded-full">
                                        {(activeTab === "ongoing" ? ongoingPickups : completedPickups).length} groups
                                    </span>
                                </h2>
                                <p className="text-sm text-white/60 mt-1">
                                    {activeTab === "ongoing" ? "Collect parcels from customers and deliver to warehouse" : "Your completed pickup assignments"}
                                </p>
                            </div>
                            <div className="p-4 space-y-3">
                                {(activeTab === "ongoing" ? ongoingPickups : completedPickups).map(group => {
                                    const status = getStatusBadge(group.status);
                                    return (
                                        <div
                                            key={group.id}
                                            onClick={() => navigate(`/agent/group-pickup/${group.id}`)}
                                            className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 hover:border-indigo-500/30 transition cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="font-bold text-white text-lg">{group.groupCode}</span>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-white/70">
                                                        <FaMapMarkerAlt className="text-indigo-400" />
                                                        <span className="font-medium">{group.sourceCity}</span>
                                                        <FaArrowRight className="text-white/40 mx-2" />
                                                        <FaWarehouse className="text-amber-400" />
                                                        <span className="font-medium">Warehouse</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
                                                        <span className="flex items-center gap-1">
                                                            <FaBoxOpen /> {group.currentMembers} parcels
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <FaClock /> {new Date(group.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {isPickupComplete(group.status) && (
                                                        <div className="text-right">
                                                            <p className="text-xs text-white/50">Your Earnings</p>
                                                            <p className="text-lg font-bold text-green-400 flex items-center gap-1">
                                                                <FaRupeeSign className="text-sm" />
                                                                {getEarnings(group, 'pickup')}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <button className={`px-4 py-2 ${isPickupComplete(group.status) ? "bg-indigo-600 hover:bg-indigo-700" : "bg-indigo-500 hover:bg-indigo-600"} text-white rounded-lg font-medium transition flex items-center gap-2`}>
                                                        {isPickupComplete(group.status) ? (
                                                            <>View Details →</>
                                                        ) : "Start Pickup →"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Delivery Groups - show based on active tab */}
                    {((activeTab === "ongoing" ? ongoingDeliveries : completedDeliveries).length > 0) && (
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
                            <div className="bg-green-500/20 px-6 py-4 border-b border-white/10">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <FaWarehouse className="text-green-400" />
                                    {activeTab === "ongoing" ? "Ongoing Deliveries" : "Completed Deliveries"}
                                    <span className="ml-2 px-2 py-1 bg-green-500/30 text-green-300 text-xs rounded-full">
                                        {(activeTab === "ongoing" ? ongoingDeliveries : completedDeliveries).length} groups
                                    </span>
                                </h2>
                                <p className="text-sm text-white/60 mt-1">
                                    {activeTab === "ongoing" ? "Pick up from warehouse and deliver to customers" : "Your completed delivery assignments"}
                                </p>
                            </div>
                            <div className="p-4 space-y-3">
                                {(activeTab === "ongoing" ? ongoingDeliveries : completedDeliveries).map(group => {
                                    const status = getStatusBadge(group.status);
                                    return (
                                        <div
                                            key={group.id}
                                            onClick={() => navigate(`/agent/group-delivery/${group.id}`)}
                                            className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 hover:border-green-500/30 transition cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="font-bold text-white text-lg">{group.groupCode}</span>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-white/70">
                                                        <FaWarehouse className="text-amber-400" />
                                                        <span className="font-medium">Warehouse</span>
                                                        <FaArrowRight className="text-white/40 mx-2" />
                                                        <FaMapMarkerAlt className="text-green-400" />
                                                        <span className="font-medium">{group.destinationCity}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
                                                        <span className="flex items-center gap-1">
                                                            <FaBoxOpen /> {group.currentMembers} parcels
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <FaClock /> {new Date(group.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {group.status === "COMPLETED" && (
                                                        <div className="text-right">
                                                            <p className="text-xs text-white/50">Your Earnings</p>
                                                            <p className="text-lg font-bold text-green-400 flex items-center gap-1">
                                                                <FaRupeeSign className="text-sm" />
                                                                {getEarnings(group, 'delivery')}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <button className={`px-4 py-2 ${group.status === "COMPLETED" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-green-500 hover:bg-green-600"} text-white rounded-lg font-medium transition flex items-center gap-2`}>
                                                        {group.status === "COMPLETED" ? (
                                                            <>View Details →</>
                                                        ) : "Start Delivery →"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
