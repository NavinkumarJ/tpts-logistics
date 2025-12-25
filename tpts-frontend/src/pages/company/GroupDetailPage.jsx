import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    getGroupById,
    getGroupParcels,
    getAvailableAgents,
    assignPickupAgent,
    assignDeliveryAgent,
    completeGroupPickup,
    completeGroupDelivery
} from "../../services/companyService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaBox, FaArrowLeft, FaTruck, FaUsers, FaCheckCircle, FaStar,
    FaMapMarkerAlt, FaClock, FaPercent, FaTimes, FaUserTie
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
            </div>

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
                            <p className="text-2xl font-bold text-gray-900">{group.deadlineHours}h</p>
                            <p className="text-xs text-gray-500">Deadline</p>
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

            {/* Agent Assignments & Actions */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaTruck className="text-indigo-500" /> Agent Assignments
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pickup Agent */}
                    <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                        <h4 className="font-medium text-green-800 mb-3">📦 Pickup Agent</h4>
                        {group.pickupAgentName ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {group.pickupAgentName.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{group.pickupAgentName}</p>
                                    <p className="text-xs text-gray-500">Assigned</p>
                                </div>
                            </div>
                        ) : (
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
                    <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                        <h4 className="font-medium text-blue-800 mb-3">🏠 Delivery Agent</h4>
                        {group.deliveryAgentName ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {group.deliveryAgentName.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{group.deliveryAgentName}</p>
                                    <p className="text-xs text-gray-500">Assigned</p>
                                </div>
                            </div>
                        ) : (
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
                                            ₹{parcel.amount}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Assign Agent Modal */}
            {showAssignModal && (
                <AssignAgentModal
                    type={showAssignModal}
                    onClose={() => setShowAssignModal(null)}
                    onAssign={handleAssignAgent}
                    loading={actionLoading}
                />
            )}
        </div>
    );
}

// Agent Assignment Modal Component
function AssignAgentModal({ type, onClose, onAssign, loading }) {
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
            setAgents(data || []);
        } catch (err) {
            toast.error("Failed to load agents");
        } finally {
            setLoadingAgents(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl">
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
                            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="text-center py-8">
                            <FaUserTie className="text-4xl text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-600">No available agents</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {agents.map((agent) => (
                                <div
                                    key={agent.id}
                                    onClick={() => setSelectedAgentId(agent.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition ${selectedAgentId === agent.id
                                        ? (type === "pickup" ? "border-green-500 bg-green-50" : "border-blue-500 bg-blue-50")
                                        : "border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 ${type === "pickup" ? "bg-green-500" : "bg-blue-500"} rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                                            {agent.name?.charAt(0) || "A"}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{agent.name}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <FaStar className="text-yellow-400" />
                                                    {agent.rating?.toFixed(1) || "N/A"}
                                                </span>
                                                <span>{agent.vehicleType}</span>
                                            </div>
                                        </div>
                                        {selectedAgentId === agent.id && (
                                            <FaCheckCircle className={type === "pickup" ? "text-green-600" : "text-blue-600"} />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end">
                    <button onClick={onClose} className="btn-outline">Cancel</button>
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
