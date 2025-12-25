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

    // Filter and sort parcels
    const filteredParcels = parcels
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

    // Calculate summary
    const summary = {
        total: parcels.length,
        pending: parcels.filter(p => ["PENDING", "CONFIRMED", "ASSIGNED"].includes(p.status)).length,
        inTransit: parcels.filter(p => ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(p.status)).length,
        delivered: parcels.filter(p => p.status === "DELIVERED").length,
        cancelled: parcels.filter(p => p.status === "CANCELLED").length,
        totalAmount: parcels.reduce((sum, p) => sum + (p.finalPrice || p.totalAmount || 0), 0),
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading parcels...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">All Parcels</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage individual shipments • Total Value: ₹{summary.totalAmount.toLocaleString('en-IN')}
                    </p>
                </div>
                <button
                    onClick={fetchParcels}
                    disabled={loading}
                    className="btn-outline flex items-center gap-2 self-start"
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
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by tracking #, sender, or receiver..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-10"
                        />
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <FaSort className="text-gray-400" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="input w-40"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="amount">Highest Amount</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Parcels List */}
            {paginatedParcels.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-md border border-gray-200 text-center">
                    <FaBox className="text-5xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Parcels Found</h3>
                    <p className="text-sm text-gray-500">
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
        gray: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", activeBg: "bg-gray-100" },
        yellow: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", activeBg: "bg-yellow-100" },
        orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", activeBg: "bg-orange-100" },
        green: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", activeBg: "bg-green-100" },
        red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", activeBg: "bg-red-100" },
    };
    const c = colors[color];

    return (
        <button
            onClick={onClick}
            className={`rounded-xl p-4 text-center transition cursor-pointer border-2 ${active ? `${c.activeBg} ${c.border} ring-2 ring-offset-1 ring-primary-500` : `${c.bg} ${c.border} hover:shadow-md`
                }`}
        >
            <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
            <p className={`text-xs ${c.text} opacity-80`}>{label}</p>
        </button>
    );
}

function ParcelCard({ parcel, getStatusBadge, onAssign }) {
    const agentDisplayName = parcel.agentName || parcel.assignedAgentName;
    const needsAssignment = ["PENDING", "CONFIRMED"].includes(parcel.status) && !agentDisplayName;
    const isInTransit = ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(parcel.status);

    return (
        <div className={`bg-white rounded-xl shadow-md border overflow-hidden transition hover:shadow-lg ${needsAssignment ? "border-yellow-300 border-l-4" : "border-gray-200"
            }`}>
            <div className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Main Info */}
                    <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${parcel.status === "DELIVERED" ? "bg-green-100 text-green-600" :
                                needsAssignment ? "bg-yellow-100 text-yellow-600" :
                                    "bg-indigo-100 text-indigo-600"
                                }`}>
                                <FaBox className="text-xl" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">{parcel.trackingNumber}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {getStatusBadge(parcel.status)}
                                    {needsAssignment && (
                                        <span className="text-xs text-yellow-600 font-medium animate-pulse">
                                            ⚠️ Needs Agent
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Route */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex-1 bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-0.5">From</p>
                                <p className="font-semibold text-gray-900">{parcel.pickupName}</p>
                                <p className="text-sm text-gray-600">{parcel.pickupCity}</p>
                            </div>
                            <FaArrowRight className="text-gray-400 flex-shrink-0" />
                            <div className="flex-1 bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-0.5">To</p>
                                <p className="font-semibold text-gray-900">{parcel.deliveryName}</p>
                                <p className="text-sm text-gray-600">{parcel.deliveryCity}</p>
                            </div>
                        </div>

                        {/* Details Row */}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                                <span className="text-gray-400">Weight:</span> {parcel.weightKg} kg
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="text-gray-400">Amount:</span>
                                <strong className="text-gray-900">₹{(parcel.finalPrice || parcel.totalAmount || 0).toLocaleString()}</strong>
                            </span>
                            {agentDisplayName && (
                                <span className="flex items-center gap-1 text-green-600">
                                    <FaTruck /> {agentDisplayName}
                                </span>
                            )}
                            <span className="text-gray-400">
                                {new Date(parcel.createdAt).toLocaleDateString("en-IN", {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                })}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 lg:w-40">
                        {needsAssignment ? (
                            <button
                                onClick={onAssign}
                                className="bg-gray-900 hover:bg-gray-800 text-white text-sm px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-semibold"
                            >
                                ASSIGN AGENT
                            </button>
                        ) : isInTransit ? (
                            <div className="flex flex-col gap-2">
                                <Link
                                    to={`/company/track/${parcel.trackingNumber}`}
                                    className="btn-outline text-sm px-3 py-2 flex items-center justify-center gap-1"
                                >
                                    <FaMapMarkerAlt /> Track
                                </Link>
                                {parcel.agentPhone && (
                                    <a
                                        href={`tel:${parcel.agentPhone}`}
                                        className="btn-outline text-sm px-3 py-2 flex items-center justify-center gap-1"
                                    >
                                        <FaPhone /> Call Agent
                                    </a>
                                )}
                            </div>
                        ) : null}
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
                const scoreA = (a.rating || 0) * 10 + (a.totalDeliveries || 0) / 10 - (a.activeOrders || 0) * 2;
                const scoreB = (b.rating || 0) * 10 + (b.totalDeliveries || 0) / 10 - (b.activeOrders || 0) * 2;
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl">
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
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="font-medium text-gray-900">
                                {parcel.pickupCity} → {parcel.deliveryCity}
                            </p>
                            <p className="text-gray-500">{parcel.pickupName} to {parcel.deliveryName}</p>
                        </div>
                        <div className="text-right">
                            <p><strong>{parcel.weightKg} kg</strong> • ₹{parcel.finalPrice || parcel.totalAmount || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Agent List */}
                <div className="p-4 overflow-y-auto max-h-[400px]">
                    {loading ? (
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
                            {agents.map((agent) => {
                                const isBest = agent.id === bestMatchId;
                                return (
                                    <div
                                        key={agent.id}
                                        className={`p-4 rounded-xl border-2 transition ${isBest ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${isBest ? "bg-green-500" : "bg-gray-400"
                                                }`}>
                                                {agent.fullName?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold">{agent.fullName}</p>
                                                    {isBest && (
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                                            BEST MATCH
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1">
                                                        <FaStar className="text-yellow-400" />
                                                        {agent.rating?.toFixed(1) || "5.0"}
                                                    </span>
                                                    <span>{agent.totalDeliveries || 0} deliveries</span>
                                                    <span className={agent.activeOrders === 0 ? "text-green-600" : "text-orange-600"}>
                                                        {agent.activeOrders || 0} active
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAssign(agent.id)}
                                                disabled={assigning === agent.id}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${isBest ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-200 hover:bg-gray-300"
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
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <button onClick={onClose} className="btn-outline w-full">Cancel</button>
                </div>
            </div>
        </div>
    );
}
