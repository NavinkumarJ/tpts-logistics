import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllDeliveries } from "../../services/agentService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaBox, FaMapMarkerAlt, FaSearch, FaCheck, FaTimes, FaEye, FaTruck, FaChartLine, FaSort, FaArrowDown, FaUsers, FaRupeeSign } from "react-icons/fa";
import Pagination from "../../components/common/Pagination";

const ITEMS_PER_PAGE = 8;

export default function AgentHistoryPage() {
    const navigate = useNavigate();
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortOrder, setSortOrder] = useState("newest");

    useEffect(() => {
        fetchDeliveries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchQuery, sortOrder]);

    const fetchDeliveries = async () => {
        setLoading(true);
        try {
            const data = await getAllDeliveries();
            setDeliveries(data || []);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load delivery history");
            }
        } finally {
            setLoading(false);
        }
    };

    // Agent earnings = 20% of totalAmount for regular deliveries, 10% for group buy
    const AGENT_COMMISSION_RATE = 0.20;
    const GROUP_COMMISSION_RATE = 0.10; // 10% for group buy pickup/delivery

    const calculateAgentEarnings = (delivery) => {
        const price = delivery.finalPrice || delivery.totalAmount || delivery.amount || 0;
        // Use 10% for group shipments, 20% for regular deliveries
        const rate = delivery.groupShipmentId ? GROUP_COMMISSION_RATE : AGENT_COMMISSION_RATE;
        return price * rate;
    };

    const getOrderAmount = (delivery) => {
        return delivery.finalPrice || delivery.totalAmount || delivery.amount || 0;
    };

    // Filter and search - exclude group buy orders (they're shown in Group Orders)
    const filteredDeliveries = deliveries
        .filter((d) => {
            // Exclude group buy orders - they're shown in Group Orders page
            if (d.groupShipmentId) return false;

            const matchesSearch =
                d.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.receiverName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.deliveryCity?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesFilter =
                filter === "all" ||
                (filter === "completed" && d.status === "DELIVERED") ||
                (filter === "cancelled" && d.status === "CANCELLED");

            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            const dateA = new Date(a.deliveredAt || a.updatedAt || a.createdAt);
            const dateB = new Date(b.deliveredAt || b.updatedAt || b.createdAt);
            if (sortOrder === "newest") return dateB - dateA;
            if (sortOrder === "oldest") return dateA - dateB;
            if (sortOrder === "highest") return calculateAgentEarnings(b) - calculateAgentEarnings(a);
            if (sortOrder === "lowest") return calculateAgentEarnings(a) - calculateAgentEarnings(b);
            return dateB - dateA;
        });

    // Pagination
    const totalItems = filteredDeliveries.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedDeliveries = filteredDeliveries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Stats - exclude group buy orders (they're shown in Group Orders)
    const regularDeliveries = deliveries.filter(d => !d.groupShipmentId);
    const totalDeliveriesCount = regularDeliveries.length;
    const completedCount = regularDeliveries.filter(d => d.status === "DELIVERED").length;
    const cancelledCount = regularDeliveries.filter(d => d.status === "CANCELLED").length;
    const totalEarnings = regularDeliveries
        .filter(d => d.status === "DELIVERED")
        .reduce((sum, d) => sum + calculateAgentEarnings(d), 0);

    const getStatusBadge = (status) => {
        const styles = {
            DELIVERED: "bg-green-500/20 text-green-400 border-green-500/30",
            CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
            IN_TRANSIT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
            OUT_FOR_DELIVERY: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || "bg-white/10 text-white/70 border-white/20"}`}>
                {status === "DELIVERED" && <FaCheck className="text-green-400" />}
                {status === "CANCELLED" && <FaTimes className="text-red-400" />}
                {status?.replace(/_/g, " ")}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                    <p className="mt-4 text-white/70 font-medium">Loading history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Delivery History</h1>
                    <p className="text-sm text-white/60 mt-1">Your past deliveries and performance</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="newest" className="bg-slate-800">Newest First</option>
                        <option value="oldest" className="bg-slate-800">Oldest First</option>
                        <option value="highest" className="bg-slate-800">Highest Earning</option>
                        <option value="lowest" className="bg-slate-800">Lowest Earning</option>
                    </select>
                </div>
            </div>

            {/* Stats Summary Banner */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => setFilter("all")}
                        className={`p-4 rounded-xl transition ${filter === "all" ? "bg-indigo-500/30 border border-indigo-500/30" : "bg-white/10 hover:bg-white/15 border border-white/10"}`}
                    >
                        <FaTruck className="text-2xl mb-2 text-indigo-400" />
                        <p className="text-3xl font-bold text-white">{totalDeliveriesCount}</p>
                        <p className="text-sm text-white/60">Total Deliveries</p>
                    </button>
                    <button
                        onClick={() => setFilter("completed")}
                        className={`p-4 rounded-xl transition ${filter === "completed" ? "bg-green-500/30 border border-green-500/30" : "bg-white/10 hover:bg-white/15 border border-white/10"}`}
                    >
                        <FaCheck className="text-2xl mb-2 text-green-400" />
                        <p className="text-3xl font-bold text-white">{completedCount}</p>
                        <p className="text-sm text-white/60">Completed</p>
                    </button>
                    <button
                        onClick={() => setFilter("cancelled")}
                        className={`p-4 rounded-xl transition ${filter === "cancelled" ? "bg-red-500/30 border border-red-500/30" : "bg-white/10 hover:bg-white/15 border border-white/10"}`}
                    >
                        <FaTimes className="text-2xl mb-2 text-red-400" />
                        <p className="text-3xl font-bold text-white">{cancelledCount}</p>
                        <p className="text-sm text-white/60">Cancelled</p>
                    </button>
                    <div className="p-4 rounded-xl bg-white/10 border border-white/10">
                        <FaChartLine className="text-2xl mb-2 text-green-400" />
                        <p className="text-3xl font-bold text-green-400">₹{totalEarnings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                        <p className="text-sm text-white/60">Total Earnings</p>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                <div className="relative">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search by tracking #, receiver name, city..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Deliveries List */}
            {filteredDeliveries.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-12 border border-white/20 text-center">
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                        <FaBox className="text-4xl text-white/30" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Deliveries Found</h3>
                    <p className="text-sm text-white/50">
                        {searchQuery ? "No deliveries match your search" : "No delivery history yet"}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {paginatedDeliveries.map((delivery) => (
                        <div
                            key={delivery.id}
                            className={`bg-white/10 backdrop-blur-xl rounded-xl p-5 border-l-4 border border-white/20 transition hover:bg-white/15 ${delivery.status === "DELIVERED"
                                ? "border-l-green-500"
                                : delivery.status === "CANCELLED"
                                    ? "border-l-red-500"
                                    : "border-l-orange-500"
                                }`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${delivery.status === "DELIVERED"
                                        ? "bg-green-500/20 text-green-400"
                                        : delivery.status === "CANCELLED"
                                            ? "bg-red-500/20 text-red-400"
                                            : "bg-orange-500/20 text-orange-400"
                                        }`}>
                                        {delivery.status === "DELIVERED" ? (
                                            <FaArrowDown className="text-xl" />
                                        ) : (
                                            <FaBox className="text-xl" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-white">{delivery.trackingNumber}</p>
                                        <p className="text-sm text-white/60 flex items-center gap-1 mt-1">
                                            <span className="text-orange-400">{delivery.pickupCity}</span>
                                            <span className="text-white/40">→</span>
                                            <span className="text-green-400">{delivery.deliveryCity}</span>
                                        </p>
                                        {delivery.receiverName && (
                                            <p className="text-xs text-white/40 mt-1">
                                                To: {delivery.receiverName}
                                            </p>
                                        )}
                                        {/* Group Buy Badge */}
                                        {delivery.groupShipmentId && (
                                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium border border-purple-500/30">
                                                <FaUsers className="text-xs" /> Group Buy
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        {getStatusBadge(delivery.status)}
                                        <p className="text-lg font-bold text-white mt-2">
                                            ₹{getOrderAmount(delivery).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs text-white/50">Order Total (incl. GST)</p>
                                        {(delivery.status === "DELIVERED" || delivery.status === "AT_WAREHOUSE") && (
                                            <p className="text-sm font-semibold text-green-400 mt-1">
                                                Your Earning ({delivery.groupShipmentId ? "10%" : "20%"}): ₹{calculateAgentEarnings(delivery).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                            </p>
                                        )}
                                        <p className="text-xs text-white/40 mt-1">
                                            {new Date(delivery.deliveredAt || delivery.updatedAt || delivery.createdAt).toLocaleDateString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric"
                                            })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/agent/deliveries/${delivery.id}`)}
                                        className="px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-xl text-sm font-medium hover:bg-indigo-500/30 transition flex items-center gap-2 border border-indigo-500/30"
                                    >
                                        <FaEye /> View
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
            )}
        </div>
    );
}
