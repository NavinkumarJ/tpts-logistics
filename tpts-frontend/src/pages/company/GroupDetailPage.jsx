import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    getGroupById,
    getGroupParcels,
    getAvailableAgents,
    assignPickupAgent,
    assignDeliveryAgent,
    completeGroupPickup,
    completeGroupDelivery,
    reopenGroup,
    closeGroupEarly
} from "../../services/companyService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaBox, FaArrowLeft, FaTruck, FaUsers, FaCheckCircle, FaStar,
    FaMapMarkerAlt, FaClock, FaPercent, FaTimes, FaUserTie, FaRoute, FaRupeeSign, FaImage
} from "react-icons/fa";

const STATUS_CONFIG = {
    OPEN: { label: "Open", bg: "bg-green-100", text: "text-green-800", color: "green" },
    FULL: { label: "Full", bg: "bg-blue-100", text: "text-blue-800", color: "blue" },
    IN_PROGRESS: { label: "In Progress", bg: "bg-purple-100", text: "text-purple-800", color: "purple" },
    PICKUP_COMPLETE: { label: "Pickup Complete", bg: "bg-orange-100", text: "text-orange-800", color: "orange" },
    COMPLETED: { label: "Completed", bg: "bg-green-100", text: "text-green-800", color: "green" },
    CANCELLED: { label: "Cancelled", bg: "bg-red-100", text: "text-red-800", color: "red" },
};

export default function GroupDetailPage() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const [group, setGroup] = useState(null);
    const [parcels, setParcels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAssignModal, setShowAssignModal] = useState(null); // 'pickup' or 'delivery'
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchGroupData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupId]);

    const fetchGroupData = async () => {
        setLoading(true);
        try {
            const [groupData, parcelsData] = await Promise.all([
                getGroupById(groupId),
                getGroupParcels(groupId)
            ]);
            setGroup(groupData);
            setParcels(parcelsData || []);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load group details");
                navigate("/company/shipments");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleMarkPickupComplete = async () => {
        if (!window.confirm("Mark all parcels as picked up?")) return;
        setActionLoading(true);
        try {
            await completeGroupPickup(groupId);
            toast.success("Pickup phase completed!");
            fetchGroupData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to mark pickup complete");
        } finally {
            setActionLoading(false);
        }
    };

    const handleMarkDeliveryComplete = async () => {
        if (!window.confirm("Mark all parcels as delivered?")) return;
        setActionLoading(true);
        try {
            await completeGroupDelivery(groupId);
            toast.success("Group delivery completed!");
            fetchGroupData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to mark delivery complete");
        } finally {
            setActionLoading(false);
        }
    };

    const handleReopenGroup = async () => {
        if (!window.confirm("Reopen this group? All members will be notified that they can now cancel if they wish.")) return;
        setActionLoading(true);
        try {
            await reopenGroup(groupId);
            toast.success("Group reopened - members notified!");
            fetchGroupData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to reopen group");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCloseGroupEarly = async () => {
        const minMembers = Math.ceil(group.targetMembers / 2);
        if (!window.confirm(`Close this group early with ${group.currentMembers}/${group.targetMembers} members and proceed? This will allow you to assign agents and start delivery.`)) return;
        setActionLoading(true);
        try {
            await closeGroupEarly(groupId);
            toast.success("Group closed! You can now assign agents.");
            fetchGroupData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to close group");
        } finally {
            setActionLoading(false);
        }
    };

    const handleAssignAgent = async (agentId) => {
        setActionLoading(true);
        try {
            if (showAssignModal === "pickup") {
                await assignPickupAgent(groupId, agentId);
                toast.success("Pickup agent assigned!");
            } else {
                await assignDeliveryAgent(groupId, agentId);
                toast.success("Delivery agent assigned!");
            }
            setShowAssignModal(null);
            fetchGroupData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to assign agent");
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.OPEN;
        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading group details...</p>
            </div>
        );
    }

    if (!group) return null;

    const progressPercent = group.targetMembers > 0
        ? Math.round((group.currentMembers / group.targetMembers) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/company/shipments" className="p-2 hover:bg-gray-100 rounded-lg">
                    <FaArrowLeft className="text-gray-600" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">Group #{group.id}</h1>
                        {getStatusBadge(group.status)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        {group.sourceCity} → {group.targetCity}
                    </p>
                </div>
                {/* Reopen Group Button - Show only when FULL */}
                {group.status === "FULL" && (
                    <button
                        onClick={handleReopenGroup}
                        disabled={actionLoading}
                        className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition disabled:opacity-50 flex items-center gap-2"
                    >
                        🔓 Reopen Group
                    </button>
                )}
                {/* Close Group Early Button - Show when OPEN and 50%+ members */}
                {group.status === "OPEN" && group.currentMembers >= Math.ceil(group.targetMembers / 2) && (
                    <button
                        onClick={handleCloseGroupEarly}
                        disabled={actionLoading}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                    >
                        ✅ Close & Proceed ({group.currentMembers}/{group.targetMembers})
                    </button>
                )}
            </div>

            {/* Tracking Button - Show when in progress or completed */}
            {(group.status === "PICKUP_IN_PROGRESS" || group.status === "DELIVERY_IN_PROGRESS" || group.status === "FULL" || group.status === "PICKUP_COMPLETE" || group.status === "COMPLETED") && (
                <div className={`bg-gradient-to-r ${group.status === "COMPLETED" ? "from-green-50 to-emerald-50 border-green-200" : "from-blue-50 to-indigo-50 border-blue-200"} border rounded-xl p-4`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${group.status === "COMPLETED" ? "bg-green-500" : "bg-blue-500"} rounded-lg flex items-center justify-center`}>
                                {group.status === "COMPLETED" ? <FaCheckCircle className="text-white" /> : <FaRoute className="text-white" />}
                            </div>
                            <div>
                                <p className={`font-medium ${group.status === "COMPLETED" ? "text-green-900" : "text-blue-900"}`}>
                                    {group.status === "COMPLETED" ? "All deliveries completed" :
                                        group.status === "PICKUP_IN_PROGRESS" ? "Agent 1 collecting parcels" :
                                            group.status === "DELIVERY_IN_PROGRESS" ? "Agent 2 delivering parcels" :
                                                "Group ready for processing"}
                                </p>
                                <p className={`text-sm ${group.status === "COMPLETED" ? "text-green-600" : "text-blue-600"}`}>
                                    {group.status === "COMPLETED" ? "Shipment delivered successfully" : "View live tracking and status updates"}
                                </p>
                            </div>
                        </div>
                        {group.status === "COMPLETED" ? (
                            <Link
                                to={`/company/shipments/${groupId}/tracking`}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition"
                            >
                                <FaCheckCircle />
                                View Summary
                            </Link>
                        ) : (
                            <Link
                                to={`/company/shipments/${groupId}/tracking`}
                                className="btn-primary flex items-center gap-2"
                            >
                                <FaRoute />
                                Track on Map
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* Progress & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FaUsers className="text-xl text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{group.currentMembers}/{group.targetMembers}</p>
                            <p className="text-xs text-gray-500">Members</p>
                        </div>
                    </div>
                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{progressPercent}% filled</p>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                            <FaPercent className="text-xl text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{group.discountPercentage}%</p>
                            <p className="text-xs text-gray-500">Discount</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                            <FaClock className="text-xl text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {group.timeRemainingMinutes !== null && group.timeRemainingMinutes >= 0
                                    ? group.timeRemainingMinutes >= 60
                                        ? `${Math.floor(group.timeRemainingMinutes / 60)}h`
                                        : `${group.timeRemainingMinutes}m`
                                    : group.deadline
                                        ? new Date(group.deadline).toLocaleDateString()
                                        : "—"}
                            </p>
                            <p className="text-xs text-gray-500">
                                {group.timeRemainingMinutes !== null && group.timeRemainingMinutes >= 0
                                    ? "Time Left"
                                    : "Deadline"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                            <FaBox className="text-xl text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{parcels.length}</p>
                            <p className="text-xs text-gray-500">Parcels</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Total Group Amount & Agent Earnings */}
            <div className="bg-gradient-to-r from-slate-800/90 to-indigo-900/90 border border-indigo-500/30 rounded-xl p-5 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <FaRupeeSign className="text-indigo-400" />
                    Group Financial Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Total Group Value */}
                    <div className="bg-indigo-500/20 backdrop-blur-sm rounded-lg p-4 border border-indigo-400/30">
                        <p className="text-sm text-indigo-200 mb-1 font-medium">Total Group Value</p>
                        <p className="text-2xl font-bold text-indigo-300">
                            ₹{parcels.reduce((sum, p) => sum + parseFloat(p.finalPrice || p.basePrice || 0), 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-indigo-300/70 mt-1">Sum of all {parcels.length} parcels</p>
                    </div>

                    {/* Company Earnings (70%) */}
                    <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg p-4 border border-blue-400/30">
                        <p className="text-sm text-blue-200 mb-1 font-medium">Company Share (70%)</p>
                        <p className="text-2xl font-bold text-blue-300">
                            ₹{(parcels.reduce((sum, p) => sum + parseFloat(p.finalPrice || p.basePrice || 0), 0) * 0.70).toFixed(2)}
                        </p>
                        <p className="text-xs text-blue-300/70 mt-1">Your company earnings</p>
                    </div>

                    {/* Pickup Agent Earnings (10%) */}
                    <div className="bg-orange-500/20 backdrop-blur-sm rounded-lg p-4 border border-orange-400/30">
                        <p className="text-sm text-orange-200 mb-1 font-medium">Pickup Agent (10%)</p>
                        <p className="text-2xl font-bold text-orange-300">
                            ₹{(parcels.reduce((sum, p) => sum + parseFloat(p.finalPrice || p.basePrice || 0), 0) * 0.10).toFixed(2)}
                        </p>
                        <p className="text-xs text-orange-300/70 mt-1">
                            {group.pickupAgentName ? `For ${group.pickupAgentName}` : "Not assigned yet"}
                        </p>
                    </div>

                    {/* Delivery Agent Earnings (10%) */}
                    <div className="bg-green-500/20 backdrop-blur-sm rounded-lg p-4 border border-green-400/30">
                        <p className="text-sm text-green-200 mb-1 font-medium">Delivery Agent (10%)</p>
                        <p className="text-2xl font-bold text-green-300">
                            ₹{(parcels.reduce((sum, p) => sum + parseFloat(p.finalPrice || p.basePrice || 0), 0) * 0.10).toFixed(2)}
                        </p>
                        <p className="text-xs text-green-300/70 mt-1">
                            {group.deliveryAgentName ? `For ${group.deliveryAgentName}` : "Not assigned yet"}
                        </p>
                    </div>

                    {/* Platform Fee (10%) */}
                    <div className="bg-purple-500/20 backdrop-blur-sm rounded-lg p-4 border border-purple-400/30">
                        <p className="text-sm text-purple-200 mb-1 font-medium">Platform Fee (10%)</p>
                        <p className="text-2xl font-bold text-purple-300">
                            ₹{(parcels.reduce((sum, p) => sum + parseFloat(p.finalPrice || p.basePrice || 0), 0) * 0.10).toFixed(2)}
                        </p>
                        <p className="text-xs text-purple-300/70 mt-1">TPTS service charge</p>
                    </div>
                </div>
            </div>

            {/* Agent Assignments & Actions */}
            <div className="bg-gradient-to-r from-slate-800/90 to-slate-900/90 rounded-xl p-6 shadow-lg border border-slate-600/30">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FaTruck className="text-indigo-400" /> Agent Assignments
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pickup Agent */}
                    <div className="bg-green-500/20 backdrop-blur-sm rounded-xl p-5 border border-green-400/30">
                        <h4 className="font-medium text-green-300 mb-3">📦 Pickup Agent</h4>
                        {group.pickupAgentName ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {group.pickupAgentName.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold text-white">{group.pickupAgentName}</p>
                                    <p className="text-xs text-green-300/70">Assigned</p>
                                </div>
                            </div>
                        ) : group.status !== "CANCELLED" && (
                            <button
                                onClick={() => setShowAssignModal("pickup")}
                                disabled={group.status === "OPEN" || group.status === "COMPLETED"}
                                className="w-full btn-primary disabled:opacity-50"
                            >
                                <FaUserTie className="inline mr-2" /> Assign Pickup Agent
                            </button>
                        )}
                        {group.pickupAgentName && group.status === "IN_PROGRESS" && (
                            <button
                                onClick={handleMarkPickupComplete}
                                disabled={actionLoading}
                                className="w-full mt-3 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                <FaCheckCircle className="inline mr-2" /> Mark Pickup Complete
                            </button>
                        )}
                    </div>

                    {/* Delivery Agent */}
                    <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-5 border border-blue-400/30">
                        <h4 className="font-medium text-blue-300 mb-3">🏠 Delivery Agent</h4>
                        {group.deliveryAgentName ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {group.deliveryAgentName.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold text-white">{group.deliveryAgentName}</p>
                                    <p className="text-xs text-blue-300/70">Assigned</p>
                                </div>
                            </div>
                        ) : group.status !== "CANCELLED" && (
                            <button
                                onClick={() => setShowAssignModal("delivery")}
                                disabled={group.status !== "PICKUP_COMPLETE"}
                                className="w-full btn-primary disabled:opacity-50"
                            >
                                <FaUserTie className="inline mr-2" /> Assign Delivery Agent
                            </button>
                        )}
                        {group.deliveryAgentName && group.status === "PICKUP_COMPLETE" && (
                            <button
                                onClick={handleMarkDeliveryComplete}
                                disabled={actionLoading}
                                className="w-full mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                <FaCheckCircle className="inline mr-2" /> Mark Delivery Complete
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Parcels List */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaBox className="text-purple-500" /> Group Parcels ({parcels.length})
                </h3>

                {parcels.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No parcels in this group yet</p>
                ) : (
                    <div className="space-y-3">
                        {parcels.map((parcel) => (
                            <div key={parcel.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-900">{parcel.trackingNumber}</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            <FaMapMarkerAlt className="inline text-green-500 mr-1" />
                                            {parcel.pickupCity} → {parcel.deliveryCity}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {parcel.pickupName} → {parcel.deliveryName}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs px-2 py-1 rounded-full ${parcel.status === "DELIVERED" ? "bg-green-100 text-green-800" :
                                            parcel.status === "PICKED_UP" ? "bg-blue-100 text-blue-800" :
                                                "bg-yellow-100 text-yellow-800"
                                            }`}>
                                            {parcel.status?.replace(/_/g, " ")}
                                        </span>
                                        <p className="text-sm font-medium text-gray-900 mt-1">
                                            ₹{(parcel.finalPrice || parcel.totalAmount || 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Proof Photos Section - Show when any parcel has photos */}
            {parcels.some(p => p.pickupPhotoUrl || p.deliveryPhotoUrl) && (
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FaImage className="text-purple-500" /> Proof Photos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {parcels.filter(p => p.pickupPhotoUrl || p.deliveryPhotoUrl).map((parcel) => (
                            <div key={parcel.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                <div className="p-3 bg-gray-100 border-b">
                                    <p className="font-medium text-gray-900 text-sm">{parcel.trackingNumber}</p>
                                    <p className="text-xs text-gray-500">{parcel.deliveryName}</p>
                                </div>
                                <div className="p-3 grid grid-cols-2 gap-3">
                                    {/* Pickup Photo */}
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-gray-500 uppercase">Pickup</p>
                                        {parcel.pickupPhotoUrl ? (
                                            <div
                                                className="relative cursor-pointer group"
                                                onClick={() => window.open(parcel.pickupPhotoUrl, '_blank')}
                                            >
                                                <img
                                                    src={parcel.pickupPhotoUrl}
                                                    alt="Pickup proof"
                                                    className="w-full h-20 object-cover rounded border-2 border-orange-200 group-hover:opacity-80 transition"
                                                />
                                                <div className="absolute bottom-1 left-1 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                                                    📦
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full h-20 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center">
                                                <span className="text-gray-400 text-xs">No photo</span>
                                            </div>
                                        )}
                                    </div>
                                    {/* Delivery Photo */}
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-gray-500 uppercase">Delivery</p>
                                        {parcel.deliveryPhotoUrl ? (
                                            <div
                                                className="relative cursor-pointer group"
                                                onClick={() => window.open(parcel.deliveryPhotoUrl, '_blank')}
                                            >
                                                <img
                                                    src={parcel.deliveryPhotoUrl}
                                                    alt="Delivery proof"
                                                    className="w-full h-20 object-cover rounded border-2 border-green-200 group-hover:opacity-80 transition"
                                                />
                                                <div className="absolute bottom-1 left-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                                                    ✅
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full h-20 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center">
                                                <span className="text-gray-400 text-xs">{parcel.status === "DELIVERED" ? 'No photo' : 'Pending'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Assign Agent Modal */}
            {showAssignModal && (
                <AssignAgentModal
                    type={showAssignModal}
                    onClose={() => setShowAssignModal(null)}
                    onAssign={handleAssignAgent}
                    loading={actionLoading}
                    groupData={group}
                />
            )}
        </div>
    );
}

// Agent Assignment Modal Component
function AssignAgentModal({ type, onClose, onAssign, loading, groupData }) {
    const [agents, setAgents] = useState([]);
    const [loadingAgents, setLoadingAgents] = useState(true);
    const [selectedAgentId, setSelectedAgentId] = useState(null);

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        setLoadingAgents(true);
        try {
            const data = await getAvailableAgents();
            // Sort agents by best match score
            const targetPincode = type === "pickup" ? groupData?.pickupPincode : groupData?.deliveryPincode;
            const sortedAgents = (data || []).sort((a, b) => {
                // Calculate score: rating * 10 + deliveries/10 - activeOrders * 2
                // Add pincode match bonus
                const getPincodeScore = (agent) => {
                    if (!targetPincode || !agent.pincode) return 0;
                    const targetPrefix = targetPincode.substring(0, 3);
                    const agentPrefix = agent.pincode?.substring(0, 3) || "";
                    return agentPrefix === targetPrefix ? 50 : 0; // Bonus for same area
                };
                const scoreA = (a.rating || 0) * 10 + (a.totalDeliveries || 0) / 10 - (a.activeOrders || 0) * 2 + getPincodeScore(a);
                const scoreB = (b.rating || 0) * 10 + (b.totalDeliveries || 0) / 10 - (b.activeOrders || 0) * 2 + getPincodeScore(b);
                return scoreB - scoreA;
            });
            setAgents(sortedAgents);
        } catch (err) {
            toast.error("Failed to load agents");
        } finally {
            setLoadingAgents(false);
        }
    };

    const bestMatchId = agents.length > 0 ? agents[0].id : null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl border border-slate-600/30">
                <div className={`${type === "pickup" ? "bg-gradient-to-r from-green-600 to-emerald-600" : "bg-gradient-to-r from-blue-600 to-indigo-600"} text-white px-6 py-4 flex items-center justify-between`}>
                    <div>
                        <h2 className="text-lg font-semibold">
                            Assign {type === "pickup" ? "Pickup" : "Delivery"} Agent
                        </h2>
                        <p className="text-sm text-white/80">Select an available agent</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">
                        <FaTimes />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[400px]">
                    {loadingAgents ? (
                        <div className="text-center py-8">
                            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="text-center py-8">
                            <FaUserTie className="text-4xl text-slate-500 mx-auto mb-3" />
                            <p className="text-slate-400">No available agents</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {agents.map((agent) => {
                                const isBest = agent.id === bestMatchId;
                                const isSelected = selectedAgentId === agent.id;
                                return (
                                    <div
                                        key={agent.id}
                                        onClick={() => setSelectedAgentId(agent.id)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition ${isSelected
                                            ? (type === "pickup" ? "border-green-500 bg-green-500/20" : "border-blue-500 bg-blue-500/20")
                                            : isBest
                                                ? "border-yellow-400 bg-yellow-500/20 hover:border-yellow-500"
                                                : "border-slate-600 bg-slate-700/50 hover:border-slate-500"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 ${isSelected
                                                ? (type === "pickup" ? "bg-green-500" : "bg-blue-500")
                                                : isBest ? "bg-yellow-500" : "bg-slate-500"
                                                } rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                                                {(agent.fullName || agent.name)?.substring(0, 2).toUpperCase() || "A"}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-white">{agent.fullName || agent.name || "Agent"}</p>
                                                    {isBest && (
                                                        <span className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded-full font-bold border border-yellow-400/50">
                                                            BEST MATCH
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-slate-300 mt-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <FaStar className="text-yellow-400" />
                                                        {agent.rating?.toFixed(1) || "5.0"}
                                                    </span>
                                                    <span>{agent.totalDeliveries || 0} deliveries</span>
                                                    <span className={agent.activeOrders === 0 ? "text-green-400" : "text-orange-400"}>
                                                        {agent.activeOrders || 0} active
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {agent.vehicleType} • {agent.phone || "N/A"}
                                                </p>
                                            </div>
                                            {isSelected && (
                                                <FaCheckCircle className={type === "pickup" ? "text-green-400" : "text-blue-400"} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-slate-900/80 border-t border-slate-600/30 flex gap-3 justify-end">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-500 text-slate-300 hover:bg-slate-700 transition">Cancel</button>
                    <button
                        onClick={() => onAssign(selectedAgentId)}
                        disabled={!selectedAgentId || loading}
                        className="btn-primary disabled:opacity-50"
                    >
                        {loading ? "Assigning..." : `Assign ${type === "pickup" ? "Pickup" : "Delivery"} Agent`}
                    </button>
                </div>
            </div>
        </div>
    );
}
