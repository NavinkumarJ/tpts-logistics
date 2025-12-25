import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllDeliveries } from "../../services/agentService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaBox, FaMapMarkerAlt, FaSearch, FaCheck, FaTimes, FaEye, FaTruck, FaChartLine, FaSort, FaArrowDown } from "react-icons/fa";
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

    // Agent earnings = 20% of totalAmount (which includes GST)
    const AGENT_COMMISSION_RATE = 0.20;

    const calculateAgentEarnings = (delivery) => {
        const price = delivery.finalPrice || delivery.totalAmount || delivery.amount || 0;
        return price * AGENT_COMMISSION_RATE;
    };

    const getOrderAmount = (delivery) => {
        return delivery.finalPrice || delivery.totalAmount || delivery.amount || 0;
    };

    // Filter and search
    const filteredDeliveries = deliveries
        .filter((d) => {
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

    // Stats
    const totalDeliveriesCount = deliveries.length;
    const completedCount = deliveries.filter(d => d.status === "DELIVERED").length;
    const cancelledCount = deliveries.filter(d => d.status === "CANCELLED").length;
    const totalEarnings = deliveries
        .filter(d => d.status === "DELIVERED")
        .reduce((sum, d) => sum + calculateAgentEarnings(d), 0);

    const getStatusBadge = (status) => {
        const styles = {
            DELIVERED: "bg-green-100 text-green-700 border-green-200",
            CANCELLED: "bg-red-100 text-red-700 border-red-200",
            IN_TRANSIT: "bg-purple-100 text-purple-700 border-purple-200",
            OUT_FOR_DELIVERY: "bg-orange-100 text-orange-700 border-orange-200",
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                {status === "DELIVERED" && <FaCheck className="text-green-600" />}
                {status === "CANCELLED" && <FaTimes className="text-red-600" />}
                {status?.replace(/_/g, " ")}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Delivery History</h1>
                    <p className="text-sm text-gray-500 mt-1">Your past deliveries and performance</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Earning</option>
                        <option value="lowest">Lowest Earning</option>
                    </select>
                </div>
            </div>

            {/* Stats Summary Banner */}
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => setFilter("all")}
                        className={`p-4 rounded-xl transition ${filter === "all" ? "bg-white/30" : "bg-white/10 hover:bg-white/20"}`}
                    >
                        <FaTruck className="text-2xl mb-2" />
                        <p className="text-3xl font-bold">{totalDeliveriesCount}</p>
                        <p className="text-sm text-white/80">Total Deliveries</p>
                    </button>
                    <button
                        onClick={() => setFilter("completed")}
                        className={`p-4 rounded-xl transition ${filter === "completed" ? "bg-white/30" : "bg-white/10 hover:bg-white/20"}`}
                    >
                        <FaCheck className="text-2xl mb-2 text-green-300" />
                        <p className="text-3xl font-bold">{completedCount}</p>
                        <p className="text-sm text-white/80">Completed</p>
                    </button>
                    <button
                        onClick={() => setFilter("cancelled")}
                        className={`p-4 rounded-xl transition ${filter === "cancelled" ? "bg-white/30" : "bg-white/10 hover:bg-white/20"}`}
                    >
                        <FaTimes className="text-2xl mb-2 text-red-300" />
                        <p className="text-3xl font-bold">{cancelledCount}</p>
                        <p className="text-sm text-white/80">Cancelled</p>
                    </button>
                    <div className="p-4 rounded-xl bg-white/10">
                        <FaChartLine className="text-2xl mb-2 text-green-300" />
                        <p className="text-3xl font-bold">₹{totalEarnings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                        <p className="text-sm text-white/80">Total Earnings</p>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
                <div className="relative">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by tracking #, receiver name, city..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>
            </div>

            {/* Deliveries List */}
            {filteredDeliveries.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-md border border-gray-200 text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <FaBox className="text-4xl text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Deliveries Found</h3>
                    <p className="text-sm text-gray-500">
                        {searchQuery ? "No deliveries match your search" : "No delivery history yet"}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {paginatedDeliveries.map((delivery) => (
                        <div
                            key={delivery.id}
                            className={`bg-white rounded-xl p-5 shadow-md border-l-4 border transition hover:shadow-lg ${delivery.status === "DELIVERED"
                                    ? "border-l-green-500 border-gray-200"
                                    : delivery.status === "CANCELLED"
                                        ? "border-l-red-500 border-gray-200"
                                        : "border-l-orange-500 border-gray-200"
                                }`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${delivery.status === "DELIVERED"
                                            ? "bg-green-100 text-green-600"
                                            : delivery.status === "CANCELLED"
                                                ? "bg-red-100 text-red-600"
                                                : "bg-orange-100 text-orange-600"
                                        }`}>
                                        {delivery.status === "DELIVERED" ? (
                                            <FaArrowDown className="text-xl" />
                                        ) : (
                                            <FaBox className="text-xl" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900">{delivery.trackingNumber}</p>
                                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                            <span className="text-orange-500">{delivery.pickupCity}</span>
                                            <span className="text-gray-400">→</span>
                                            <span className="text-green-500">{delivery.deliveryCity}</span>
                                        </p>
                                        {delivery.receiverName && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                To: {delivery.receiverName}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        {getStatusBadge(delivery.status)}
                                        <p className="text-lg font-bold text-gray-900 mt-2">
                                            ₹{getOrderAmount(delivery).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs text-gray-500">Order Total (incl. GST)</p>
                                        {delivery.status === "DELIVERED" && (
                                            <p className="text-sm font-semibold text-green-600 mt-1">
                                                Your Earning: ₹{calculateAgentEarnings(delivery).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(delivery.deliveredAt || delivery.updatedAt || delivery.createdAt).toLocaleDateString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric"
                                            })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/agent/deliveries/${delivery.id}`)}
                                        className="px-4 py-2 bg-orange-100 text-orange-600 rounded-xl text-sm font-medium hover:bg-orange-200 transition flex items-center gap-2"
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
