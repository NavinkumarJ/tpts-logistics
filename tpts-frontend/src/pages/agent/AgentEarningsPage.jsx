import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllDeliveries, getCurrentAgent } from "../../services/agentService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaArrowDown, FaTruck, FaCalendarAlt, FaBox, FaWallet, FaChartLine, FaFilter } from "react-icons/fa";
import Pagination from "../../components/common/Pagination";

const ITEMS_PER_PAGE = 8;

/**
 * Agent Earnings Page
 * Calculates earnings directly from delivered parcels in the frontend
 * Agent earns 20% of the parcel's final price
 */
export default function AgentEarningsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [agent, setAgent] = useState(null);
    const [deliveredParcels, setDeliveredParcels] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [filter, setFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState("newest");

    // Agent commission rate (20%)
    const AGENT_COMMISSION_RATE = 0.20;

    useEffect(() => {
        fetchEarningsData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter, sortOrder]);

    const fetchEarningsData = async () => {
        setLoading(true);
        try {
            // Fetch agent profile and all deliveries
            const [agentData, allDeliveries] = await Promise.all([
                getCurrentAgent(),
                getAllDeliveries()
            ]);

            setAgent(agentData);

            // Filter only DELIVERED parcels
            const delivered = (allDeliveries || []).filter(p => p.status === "DELIVERED");
            setDeliveredParcels(delivered);

        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load earnings");
                console.error("Earnings error:", err);
            }
        } finally {
            setLoading(false);
        }
    };

    // Calculate agent earning for a single parcel (based on totalAmount which includes GST)
    const calculateEarning = (parcel) => {
        // Use totalAmount (includes GST) as the primary amount for commission calculation
        const price = parcel.finalPrice || parcel.totalAmount || parcel.basePrice || 0;
        return Number((price * AGENT_COMMISSION_RATE).toFixed(2));
    };

    // Filter delivered parcels by date range
    const filterByDate = (parcels, startDate) => {
        return parcels.filter(p => {
            const deliveredAt = new Date(p.deliveredAt || p.updatedAt);
            return deliveredAt >= startDate;
        });
    };

    // Calculate earnings
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay() + 1); // Monday
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayParcels = filterByDate(deliveredParcels, startOfToday);
    const weekParcels = filterByDate(deliveredParcels, startOfWeek);
    const monthParcels = filterByDate(deliveredParcels, startOfMonth);

    const todayEarnings = todayParcels.reduce((sum, p) => sum + calculateEarning(p), 0);
    const weekEarnings = weekParcels.reduce((sum, p) => sum + calculateEarning(p), 0);
    const monthEarnings = monthParcels.reduce((sum, p) => sum + calculateEarning(p), 0);
    const totalEarnings = deliveredParcels.reduce((sum, p) => sum + calculateEarning(p), 0);

    // Filter and sort parcels
    const getFilteredParcels = () => {
        let filtered = [...deliveredParcels];

        if (filter === "today") {
            filtered = filterByDate(filtered, startOfToday);
        } else if (filter === "week") {
            filtered = filterByDate(filtered, startOfWeek);
        } else if (filter === "month") {
            filtered = filterByDate(filtered, startOfMonth);
        }

        // Sort
        filtered.sort((a, b) => {
            const dateA = new Date(a.deliveredAt || a.updatedAt);
            const dateB = new Date(b.deliveredAt || b.updatedAt);
            if (sortOrder === "newest") return dateB - dateA;
            if (sortOrder === "oldest") return dateA - dateB;
            if (sortOrder === "highest") return calculateEarning(b) - calculateEarning(a);
            if (sortOrder === "lowest") return calculateEarning(a) - calculateEarning(b);
            return dateB - dateA;
        });

        return filtered;
    };

    const filteredParcels = getFilteredParcels();

    // Pagination
    const totalItems = filteredParcels.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedParcels = filteredParcels.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading earnings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Track your delivery earnings • {deliveredParcels.length} total deliveries
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Amount</option>
                        <option value="lowest">Lowest Amount</option>
                    </select>
                </div>
            </div>

            {/* Total Earnings Banner */}
            <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                            <FaWallet className="text-3xl" />
                        </div>
                        <div>
                            <p className="text-white/70 text-sm">Total Earnings</p>
                            <p className="text-4xl font-bold">₹{totalEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                            <p className="text-white/70 text-sm mt-1">From {deliveredParcels.length} deliveries</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-center bg-white/10 rounded-xl p-4 min-w-[100px]">
                            <FaChartLine className="text-xl mx-auto mb-1" />
                            <p className="text-2xl font-bold">₹{monthEarnings.toLocaleString("en-IN")}</p>
                            <p className="text-xs text-white/70">This Month</p>
                        </div>
                        <div className="text-center bg-white/10 rounded-xl p-4 min-w-[100px]">
                            <FaCalendarAlt className="text-xl mx-auto mb-1" />
                            <p className="text-2xl font-bold">₹{weekEarnings.toLocaleString("en-IN")}</p>
                            <p className="text-xs text-white/70">This Week</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { key: "all", label: "All Time", amount: totalEarnings, count: deliveredParcels.length, icon: FaTruck, color: "orange" },
                    { key: "month", label: "This Month", amount: monthEarnings, count: monthParcels.length, icon: FaCalendarAlt, color: "purple" },
                    { key: "week", label: "This Week", amount: weekEarnings, count: weekParcels.length, icon: FaCalendarAlt, color: "blue" },
                    { key: "today", label: "Today", amount: todayEarnings, count: todayParcels.length, icon: FaArrowDown, color: "green" },
                ].map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${filter === f.key
                                ? "border-orange-500 bg-orange-50 shadow-md"
                                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${filter === f.key ? "bg-orange-500 text-white" : `bg-${f.color}-100 text-${f.color}-600`
                                }`}>
                                <f.icon className="text-xl" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-green-600">₹{f.amount.toLocaleString("en-IN")}</p>
                                <p className="text-xs text-gray-500">{f.label} • {f.count} deliveries</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Earnings History */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FaFilter className="text-gray-400" />
                        {filter === "all" ? "All Earnings" :
                            filter === "today" ? "Today's Earnings" :
                                filter === "week" ? "This Week's Earnings" : "This Month's Earnings"}
                    </h3>
                    <span className="text-sm text-gray-500">{filteredParcels.length} transactions</span>
                </div>

                {filteredParcels.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <FaBox className="text-4xl text-gray-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Earnings Yet</h3>
                        <p className="text-sm text-gray-500">Complete deliveries to start earning</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {paginatedParcels.map((parcel, idx) => {
                            const earning = calculateEarning(parcel);
                            const orderAmount = parcel.finalPrice || parcel.totalAmount || parcel.basePrice || 0;
                            return (
                                <div
                                    key={parcel.id || idx}
                                    className="p-4 hover:bg-gray-50 transition flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <FaArrowDown className="text-green-600 text-xl" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {parcel.trackingNumber || `Delivery #${parcel.id}`}
                                            </p>
                                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                                <span className="text-orange-500">{parcel.pickupCity}</span>
                                                <span>→</span>
                                                <span className="text-green-500">{parcel.deliveryCity}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-green-600">+₹{earning.toLocaleString("en-IN")}</p>
                                        <p className="text-xs text-gray-400">
                                            Order: ₹{Number(orderAmount).toLocaleString("en-IN")}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(parcel.deliveredAt || parcel.updatedAt).toLocaleDateString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric"
                                            })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

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

            {/* Commission Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                    <span className="text-xl">💰</span>
                    <span>
                        <strong>Commission Rate:</strong> You earn {(AGENT_COMMISSION_RATE * 100).toFixed(0)}% of each delivery's total price
                    </span>
                </p>
            </div>
        </div>
    );
}
