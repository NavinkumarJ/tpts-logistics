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
            const historyParcels = (data || []).filter(p =>
                ["DELIVERED", "CANCELLED"].includes(p.status)
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
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading order history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
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
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by tracking number, city, or name..."
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                                    ? "bg-primary-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-600">⚠️ {error}</p>
                </div>
            )}

            {/* Results */}
            {filteredParcels.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 shadow-md border border-gray-200 text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <FaBox className="text-4xl text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Orders Found</h3>
                    <p className="text-gray-500">
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
                                className={`bg-white rounded-xl shadow-sm border-l-4 overflow-hidden transition hover:shadow-md ${parcel.status === "DELIVERED" ? "border-l-green-500" : "border-l-red-500"
                                    }`}
                            >
                                <div className="p-5">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        {/* Left: Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-mono font-bold text-primary-600 text-lg">
                                                    {parcel.trackingNumber}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${parcel.status === "DELIVERED"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                                    }`}>
                                                    {parcel.status === "DELIVERED" ? <FaCheckCircle /> : <FaTimesCircle />}
                                                    {parcel.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <span className="font-medium">{parcel.pickupCity}</span>
                                                <FaArrowRight className="text-gray-400 text-xs" />
                                                <span className="font-medium">{parcel.deliveryCity}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {parcel.status === "DELIVERED" ? "Delivered on " : "Cancelled on "}
                                                {formatDate(parcel.status === "DELIVERED" ? parcel.deliveredAt : parcel.cancelledAt)}
                                            </p>
                                        </div>

                                        {/* Right: Price */}
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-gray-900">
                                                ₹{(parcel.finalPrice || 0).toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                (₹{parcel.basePrice?.toFixed(2)} + 18% GST)
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {parcel.packageType} • {parcel.weightKg}kg
                                            </p>
                                        </div>

                                        {/* Action */}
                                        <button
                                            onClick={() => navigate(`/customer/shipments?id=${parcel.id}`)}
                                            className="px-5 py-2.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-xl font-medium transition flex items-center gap-2"
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
