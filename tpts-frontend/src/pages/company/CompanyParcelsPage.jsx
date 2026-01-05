import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCompanyParcels, getAvailableAgents, assignAgentToParcel } from "../../services/companyService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaBox, FaSearch, FaEye, FaTruck, FaTimes, FaStar, FaUserTie, FaPhone, FaMapMarkerAlt, FaSync, FaSort, FaArrowRight } from "react-icons/fa";
import Pagination from "../../components/common/Pagination";

const STATUS_CONFIG = {
    PENDING: { label: "Pending", bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
    CONFIRMED: { label: "Confirmed", bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
    ASSIGNED: { label: "Assigned", bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
    PICKED_UP: { label: "Picked Up", bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200" },
    IN_TRANSIT: { label: "In Transit", bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
    OUT_FOR_DELIVERY: { label: "Out for Delivery", bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-200" },
    DELIVERED: { label: "Delivered", bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
    CANCELLED: { label: "Cancelled", bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
};

const ITEMS_PER_PAGE = 10;

export default function CompanyParcelsPage() {
    const navigate = useNavigate();
    const [parcels, setParcels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedParcel, setSelectedParcel] = useState(null);

    useEffect(() => {
        fetchParcels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset to page 1 when filter or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchQuery]);

    const fetchParcels = async () => {
        setLoading(true);
        try {
            const data = await getCompanyParcels();
            setParcels(data || []);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load parcels");
            }
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}>
                {config.label}
            </span>
        );
    };

    const handleOpenAssignModal = (parcel) => {
        setSelectedParcel(parcel);
        setShowAssignModal(true);
    };

    const handleAssignAgent = async (agentId) => {
        try {
            await assignAgentToParcel(selectedParcel.id, agentId);
            toast.success("Agent assigned successfully!");
            setShowAssignModal(false);
            setSelectedParcel(null);
            fetchParcels();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to assign agent");
        }
    };

    // Filter and sort parcels - EXCLUDE group buy parcels (they have separate page)
    const regularParcels = parcels.filter(p => !p.groupShipmentId);

    const filteredParcels = regularParcels
        .filter(parcel => {
            const matchesSearch =
                parcel.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                parcel.pickupName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                parcel.deliveryName?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesFilter =
                filter === "all" ||
                (filter === "pending" && ["PENDING", "CONFIRMED", "ASSIGNED"].includes(parcel.status)) ||
                (filter === "inTransit" && ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(parcel.status)) ||
                (filter === "delivered" && parcel.status === "DELIVERED") ||
                (filter === "cancelled" && parcel.status === "CANCELLED");

            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
            if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
            if (sortBy === "amount") return (b.finalPrice || b.totalAmount || 0) - (a.finalPrice || a.totalAmount || 0);
            return 0;
        });

    // Pagination
    const totalPages = Math.ceil(filteredParcels.length / ITEMS_PER_PAGE);
    const paginatedParcels = filteredParcels.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Calculate summary (only for regular parcels)
    const summary = {
        total: regularParcels.length,
        pending: regularParcels.filter(p => ["PENDING", "CONFIRMED", "ASSIGNED"].includes(p.status)).length,
        inTransit: regularParcels.filter(p => ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(p.status)).length,
        delivered: regularParcels.filter(p => p.status === "DELIVERED").length,
        cancelled: regularParcels.filter(p => p.status === "CANCELLED").length,
        totalAmount: regularParcels.reduce((sum, p) => sum + (p.finalPrice || p.totalAmount || 0), 0),
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                <p className="mt-3 text-sm text-white/60">Loading parcels...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">All Parcels</h1>
                    <p className="text-sm text-white/60 mt-1">
                        Manage individual shipments • Total Value: ₹{summary.totalAmount.toLocaleString('en-IN')}
                    </p>
                </div>
                <button
                    onClick={fetchParcels}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/15 transition text-sm font-medium text-white"
                >
                    <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <SummaryCard
                    label="Total"
                    value={summary.total}
                    color="gray"
                    active={filter === "all"}
                    onClick={() => setFilter("all")}
                />
                <SummaryCard
                    label="Pending"
                    value={summary.pending}
                    color="yellow"
                    active={filter === "pending"}
                    onClick={() => setFilter("pending")}
                />
                <SummaryCard
                    label="In Transit"
                    value={summary.inTransit}
                    color="orange"
                    active={filter === "inTransit"}
                    onClick={() => setFilter("inTransit")}
                />
                <SummaryCard
                    label="Delivered"
                    value={summary.delivered}
                    color="green"
                    active={filter === "delivered"}
                    onClick={() => setFilter("delivered")}
                />
                <SummaryCard
                    label="Cancelled"
                    value={summary.cancelled}
                    color="red"
                    active={filter === "cancelled"}
                    onClick={() => setFilter("cancelled")}
                />
            </div>

            {/* Search & Sort */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search by tracking #, sender, or receiver..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-3 pl-10 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <FaSort className="text-white/40" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="newest" className="bg-slate-800">Newest First</option>
                            <option value="oldest" className="bg-slate-800">Oldest First</option>
                            <option value="amount" className="bg-slate-800">Highest Amount</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Parcels List */}
            {paginatedParcels.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-12 border border-white/20 text-center">
                    <FaBox className="text-5xl text-white/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Parcels Found</h3>
                    <p className="text-sm text-white/50">
                        {searchQuery ? "No parcels match your search" : "No parcels booked yet"}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {paginatedParcels.map((parcel) => (
                        <ParcelCard
                            key={parcel.id}
                            parcel={parcel}
                            getStatusBadge={getStatusBadge}
                            onAssign={() => handleOpenAssignModal(parcel)}
                        />
                    ))}

                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredParcels.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                    />
                </div>
            )}

            {/* Agent Assignment Modal */}
            {showAssignModal && selectedParcel && (
                <AssignAgentModal
                    parcel={selectedParcel}
                    onClose={() => {
                        setShowAssignModal(false);
                        setSelectedParcel(null);
                    }}
                    onAssign={handleAssignAgent}
                />
            )}
        </div>
    );
}

function SummaryCard({ label, value, color, active, onClick }) {
    const colors = {
        gray: { bg: "bg-indigo-500/20", text: "text-white", border: "border-indigo-500/30", activeBorder: "border-indigo-500" },
        yellow: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", activeBorder: "border-yellow-500" },
        orange: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30", activeBorder: "border-orange-500" },
        green: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30", activeBorder: "border-green-500" },
        red: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", activeBorder: "border-red-500" },
    };
    const c = colors[color];

    return (
        <button
            onClick={onClick}
            className={`rounded-xl p-4 text-center transition cursor-pointer border-2 backdrop-blur-xl ${active ? `${c.bg} ${c.activeBorder} ring-2 ring-offset-1 ring-offset-transparent ring-white/30` : `${c.bg} ${c.border} hover:bg-white/10`
                }`}
        >
            <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
            <p className={`text-xs ${c.text} opacity-80`}>{label}</p>
        </button>
    );
}

function ParcelCard({ parcel, getStatusBadge, onAssign }) {
    const agentDisplayName = parcel.agentName || parcel.assignedAgentName;
    // Don't show assign button for group parcels (they're assigned via group page)
    const belongsToGroup = parcel.groupShipmentId != null;
    const needsAssignment = !belongsToGroup && ["PENDING", "CONFIRMED"].includes(parcel.status) && !agentDisplayName;
    const isInTransit = ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(parcel.status);

    return (
        <div className={`bg-white/10 backdrop-blur-xl rounded-xl border overflow-hidden transition hover:bg-white/15 ${needsAssignment ? "border-yellow-500/50 border-l-4" : "border-white/20"
            }`}>
            <div className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Main Info */}
                    <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${parcel.status === "DELIVERED" ? "bg-green-500/20 text-green-400" :
                                needsAssignment ? "bg-yellow-500/20 text-yellow-400" :
                                    "bg-indigo-500/20 text-indigo-400"
                                }`}>
                                <FaBox className="text-xl" />
                            </div>
                            <div>
                                <p className="font-bold text-white">{parcel.trackingNumber}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {getStatusBadge(parcel.status)}
                                    {belongsToGroup && (
                                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">
                                            🔗 Group
                                        </span>
                                    )}
                                    {needsAssignment && (
                                        <span className="text-xs text-yellow-400 font-medium animate-pulse">
                                            ⚠️ Needs Agent
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Route */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex-1 bg-white/5 rounded-lg p-3 border border-white/10">
                                <p className="text-xs text-white/50 mb-0.5">From</p>
                                <p className="font-semibold text-white">{parcel.pickupName}</p>
                                <p className="text-sm text-white/60">{parcel.pickupCity}</p>
                            </div>
                            <FaArrowRight className="text-white/40 flex-shrink-0" />
                            <div className="flex-1 bg-white/5 rounded-lg p-3 border border-white/10">
                                <p className="text-xs text-white/50 mb-0.5">To</p>
                                <p className="font-semibold text-white">{parcel.deliveryName}</p>
                                <p className="text-sm text-white/60">{parcel.deliveryCity}</p>
                            </div>
                        </div>

                        {/* Details Row */}
                        <div className="flex flex-wrap gap-4 text-sm text-white/60">
                            <span className="flex items-center gap-1">
                                <span className="text-white/40">Weight:</span> {parcel.weightKg} kg
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="text-white/40">Amount:</span>
                                <strong className="text-white">₹{(parcel.finalPrice || parcel.totalAmount || 0).toLocaleString()}</strong>
                            </span>
                            {agentDisplayName && (
                                <span className="flex items-center gap-1 text-green-400">
                                    <FaTruck /> {agentDisplayName}
                                </span>
                            )}
                            <span className="text-white/40">
                                {new Date(parcel.createdAt).toLocaleDateString("en-IN", {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                })}
                            </span>
                        </div>

                        {/* Cancellation Info - Show for cancelled orders */}
                        {parcel.status === "CANCELLED" && (
                            <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                                <div className="flex flex-wrap gap-4 text-sm">
                                    {parcel.cancelledBy && (
                                        <span className="flex items-center gap-1">
                                            <span className="text-red-400 font-medium">Cancelled by:</span>
                                            <span className="text-red-300 font-semibold capitalize">{parcel.cancelledBy.toLowerCase()}</span>
                                        </span>
                                    )}
                                    {parcel.cancelledAt && (
                                        <span className="text-red-400">
                                            {new Date(parcel.cancelledAt).toLocaleDateString("en-IN", {
                                                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    )}
                                </div>
                                {parcel.cancellationReason && (
                                    <p className="text-red-300 mt-1">
                                        <span className="font-medium">Reason:</span> {parcel.cancellationReason}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 lg:w-40">
                        {needsAssignment && (
                            <button
                                onClick={onAssign}
                                className="bg-gray-900 hover:bg-gray-800 text-white text-sm px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-semibold"
                            >
                                ASSIGN AGENT
                            </button>
                        )}
                        <Link
                            to={`/company/parcels/${parcel.id}`}
                            className="btn-primary text-sm px-4 py-2 flex items-center justify-center gap-2"
                        >
                            <FaEye /> View Details
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Agent Assignment Modal Component
function AssignAgentModal({ parcel, onClose, onAssign }) {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(null);

    useEffect(() => {
        fetchAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAgents = async () => {
        setLoading(true);
        try {
            const data = await getAvailableAgents();
            const sortedAgents = (data || []).sort((a, b) => {
                const scoreA = (a.ratingAvg || 0) * 10 + (a.totalDeliveries || 0) / 10 - (a.currentOrdersCount || 0) * 2;
                const scoreB = (b.ratingAvg || 0) * 10 + (b.totalDeliveries || 0) / 10 - (b.currentOrdersCount || 0) * 2;
                return scoreB - scoreA;
            });
            setAgents(sortedAgents);
        } catch (err) {
            toast.error("Failed to load agents");
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (agentId) => {
        setAssigning(agentId);
        await onAssign(agentId);
        setAssigning(null);
    };

    const bestMatchId = agents.length > 0 ? agents[0].id : null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-white/10">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Assign Delivery Agent</h2>
                        <p className="text-sm text-indigo-200">{parcel.trackingNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">
                        <FaTimes />
                    </button>
                </div>

                {/* Order Details */}
                <div className="px-6 py-4 bg-slate-700/50 border-b border-white/10">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="font-medium text-white">
                                {parcel.pickupCity} → {parcel.deliveryCity}
                            </p>
                            <p className="text-white/60">{parcel.pickupName} to {parcel.deliveryName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-white"><strong>{parcel.weightKg} kg</strong> • <span className="text-green-400">₹{parcel.finalPrice || parcel.totalAmount || 0}</span></p>
                        </div>
                    </div>
                </div>

                {/* Agent List */}
                <div className="p-4 overflow-y-auto max-h-[400px] bg-slate-800">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="text-center py-8">
                            <FaUserTie className="text-4xl text-white/30 mx-auto mb-3" />
                            <p className="text-white/60">No available agents</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {agents.map((agent) => {
                                const isBest = agent.id === bestMatchId;
                                return (
                                    <div
                                        key={agent.id}
                                        className={`p-4 rounded-xl border-2 transition ${isBest ? "border-green-500 bg-green-500/20" : "border-white/20 bg-white/5 hover:border-white/40"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${isBest ? "bg-green-500" : "bg-indigo-500"
                                                }`}>
                                                {agent.fullName?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-white">{agent.fullName}</p>
                                                    {isBest && (
                                                        <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full font-bold border border-green-500/50">
                                                            BEST MATCH
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-white/70">
                                                    <span className="flex items-center gap-1">
                                                        <FaStar className="text-yellow-400" />
                                                        <span className="text-white">{(agent.ratingAvg != null && !isNaN(agent.ratingAvg) && agent.ratingAvg !== "") ? Number(agent.ratingAvg).toFixed(1) : "New"}</span>
                                                    </span>
                                                    <span className="text-white/60">{agent.totalDeliveries || 0} deliveries</span>
                                                    <span className={agent.currentOrdersCount === 0 ? "text-green-400" : "text-orange-400"}>
                                                        {agent.currentOrdersCount || 0} active
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAssign(agent.id)}
                                                disabled={assigning === agent.id}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${isBest ? "bg-green-600 hover:bg-green-700 text-white" : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                                                    }`}
                                            >
                                                {assigning === agent.id ? "..." : isBest ? "Assign" : "Select"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-700/50 border-t border-white/10">
                    <button onClick={onClose} className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition font-medium">Cancel</button>
                </div>
            </div>
        </div>
    );
}
