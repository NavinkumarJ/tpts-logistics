import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyParcels } from "../../services/parcelService";
import { logout } from "../../utils/auth";
import Pagination from "../../components/common/Pagination";
import { FaBox, FaSearch, FaEye, FaSync, FaCheckCircle, FaTimesCircle, FaArrowRight } from "react-icons/fa";

const STATUS_FILTERS = [
    { value: "all", label: "All Orders", emoji: "📋" },
    { value: "DELIVERED", label: "Delivered", emoji: "✅" },
    { value: "CANCELLED", label: "Cancelled", emoji: "❌" },
];

const ITEMS_PER_PAGE = 8;

export default function OrderHistoryPage() {
    const navigate = useNavigate();
    const [parcels, setParcels] = useState([]);
    const [filteredParcels, setFilteredParcels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        fetchParcels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        applyFilters();
        setCurrentPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parcels, searchQuery, statusFilter]);

    const fetchParcels = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getMyParcels();
            // Filter out group parcels (have their own pages) and keep only completed/cancelled
            const historyParcels = (data || []).filter(p =>
                !p.groupShipmentId && ["DELIVERED", "CANCELLED"].includes(p.status)
            );
            setParcels(historyParcels);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                setError("Failed to load order history");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchParcels();
        setIsRefreshing(false);
    };

    const applyFilters = () => {
        let filtered = [...parcels];

        if (statusFilter !== "all") {
            filtered = filtered.filter(p => p.status === statusFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.trackingNumber?.toLowerCase().includes(query) ||
                p.deliveryCity?.toLowerCase().includes(query) ||
                p.deliveryName?.toLowerCase().includes(query)
            );
        }

        setFilteredParcels(filtered);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    // Pagination
    const totalPages = Math.ceil(filteredParcels.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedParcels = filteredParcels.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Stats
    const deliveredCount = parcels.filter(p => p.status === "DELIVERED").length;
    const cancelledCount = parcels.filter(p => p.status === "CANCELLED").length;
    const totalSpent = parcels.filter(p => p.status === "DELIVERED").reduce((sum, p) => sum + (p.finalPrice || 0), 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                    <p className="mt-4 text-white/70 font-medium">Loading order history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Gradient */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 text-white shadow-lg border border-white/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                            <FaBox className="text-3xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Order History</h1>
                            <p className="text-white/80 mt-1">View your completed and cancelled orders</p>
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl flex items-center gap-2 font-medium transition"
                    >
                        <FaSync className={isRefreshing ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-white/10 rounded-xl p-4">
                        <p className="text-white/70 text-sm">Total Spent</p>
                        <p className="text-2xl font-bold">₹{totalSpent.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4">
                        <p className="text-white/70 text-sm">Delivered</p>
                        <p className="text-2xl font-bold">{deliveredCount}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4">
                        <p className="text-white/70 text-sm">Cancelled</p>
                        <p className="text-2xl font-bold">{cancelledCount}</p>
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search by tracking number, city, or name..."
                            className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        {STATUS_FILTERS.map((filter) => (
                            <button
                                key={filter.value}
                                onClick={() => setStatusFilter(filter.value)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${statusFilter === filter.value
                                    ? "bg-indigo-600 text-white"
                                    : "bg-white/10 text-white/70 hover:bg-white/20 border border-white/20"
                                    }`}
                            >
                                <span>{filter.emoji}</span> {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                    <p className="text-sm text-red-400">⚠️ {error}</p>
                </div>
            )}

            {/* Results */}
            {filteredParcels.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 border border-white/20 text-center">
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                        <FaBox className="text-4xl text-white/30" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Orders Found</h3>
                    <p className="text-white/60">
                        {searchQuery || statusFilter !== "all"
                            ? "Try adjusting your filters"
                            : "Your completed orders will appear here"}
                    </p>
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        {paginatedParcels.map((parcel) => (
                            <div
                                key={parcel.id}
                                className={`bg-white/10 backdrop-blur-xl rounded-xl border-l-4 overflow-hidden transition hover:bg-white/15 border border-white/20 ${parcel.status === "DELIVERED" ? "border-l-green-500" : "border-l-red-500"
                                    }`}
                            >
                                <div className="p-5">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        {/* Left: Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                <span className="font-mono font-bold text-indigo-400 text-lg">
                                                    {parcel.trackingNumber}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border ${parcel.status === "DELIVERED"
                                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                                    : "bg-red-500/20 text-red-400 border-red-500/30"
                                                    }`}>
                                                    {parcel.status === "DELIVERED" ? <FaCheckCircle /> : <FaTimesCircle />}
                                                    {parcel.status}
                                                </span>
                                                {/* Refund badge for cancelled paid orders */}
                                                {parcel.status === "CANCELLED" && parcel.paymentStatus === "PAID" && (
                                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                                                        💰 Refunded
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-white/70">
                                                <span className="font-medium">{parcel.pickupCity}</span>
                                                <FaArrowRight className="text-white/40 text-xs" />
                                                <span className="font-medium">{parcel.deliveryCity}</span>
                                            </div>
                                            <p className="text-xs text-white/40 mt-1">
                                                {parcel.status === "DELIVERED" ? "Delivered on " : "Cancelled on "}
                                                {formatDate(parcel.status === "DELIVERED" ? parcel.deliveredAt : parcel.cancelledAt)}
                                            </p>
                                            {/* Cancellation reason */}
                                            {parcel.status === "CANCELLED" && parcel.cancellationReason && (
                                                <p className="text-xs text-red-400 mt-1">
                                                    <strong>Reason:</strong> {parcel.cancellationReason}
                                                </p>
                                            )}
                                        </div>

                                        {/* Right: Price */}
                                        <div className="text-right">
                                            <p className={`text-2xl font-bold ${parcel.status === "CANCELLED" ? "text-white/40 line-through" : "text-white"}`}>
                                                ₹{(parcel.finalPrice || 0).toFixed(2)}
                                            </p>
                                            {parcel.status === "CANCELLED" && parcel.paymentStatus === "PAID" && (
                                                <p className="text-sm text-green-400 font-semibold">
                                                    Refund processed
                                                </p>
                                            )}
                                            <p className="text-xs text-white/50">
                                                (₹{parcel.basePrice?.toFixed(2)} + 18% GST)
                                            </p>
                                            <p className="text-xs text-white/40 mt-1">
                                                {parcel.packageType} • {parcel.weightKg}kg
                                            </p>
                                        </div>

                                        {/* Action */}
                                        <button
                                            onClick={() => navigate(`/customer/shipments?id=${parcel.id}`)}
                                            className="px-5 py-2.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-xl font-medium transition flex items-center gap-2 border border-indigo-500/30"
                                        >
                                            <FaEye /> View
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={filteredParcels.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                        />
                    )}
                </>
            )}
        </div>
    );
}
