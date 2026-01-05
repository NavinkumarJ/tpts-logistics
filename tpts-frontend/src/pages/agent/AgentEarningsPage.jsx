import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllDeliveries, getCurrentAgent, getMyGroupAssignments } from "../../services/agentService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaArrowDown, FaTruck, FaCalendarAlt, FaBox, FaWallet, FaChartLine, FaFilter, FaUsers } from "react-icons/fa";
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
    const [groupEarnings, setGroupEarnings] = useState({ pickup: 0, delivery: 0, total: 0 });

    // Agent commission rates
    const AGENT_COMMISSION_RATE = 0.20; // 20% for regular deliveries
    const GROUP_COMMISSION_RATE = 0.10; // 10% for group pickup/delivery

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
            // Fetch agent profile, all deliveries, and group assignments
            const [agentData, allDeliveries, groupData] = await Promise.all([
                getCurrentAgent(),
                getAllDeliveries(),
                getMyGroupAssignments()
            ]);

            setAgent(agentData);

            // Filter only DELIVERED parcels (exclude group buy - they're calculated separately)
            const delivered = (allDeliveries || []).filter(p => p.status === "DELIVERED" && !p.groupShipmentId);
            setDeliveredParcels(delivered);

            // Get completed groups with their completion timestamps
            const pickupGroups = groupData?.pickupGroups || [];
            const deliveryGroups = groupData?.deliveryGroups || [];

            // Completed pickups - status is PICKUP_COMPLETE or later
            const completedPickups = pickupGroups.filter(g =>
                ["PICKUP_COMPLETE", "DELIVERY_IN_PROGRESS", "COMPLETED"].includes(g.status)
            );

            // Completed deliveries - status is COMPLETED
            const completedDeliveries = deliveryGroups.filter(g => g.status === "COMPLETED");

            // Calculate total group earnings
            const completedPickupEarnings = completedPickups.reduce((sum, g) =>
                sum + parseFloat(g.pickupAgentEarnings || 0), 0);
            const completedDeliveryEarnings = completedDeliveries.reduce((sum, g) =>
                sum + parseFloat(g.deliveryAgentEarnings || 0), 0);

            setGroupEarnings({
                pickup: completedPickupEarnings,
                delivery: completedDeliveryEarnings,
                total: completedPickupEarnings + completedDeliveryEarnings,
                // Store groups for date filtering
                completedPickups,
                completedDeliveries
            });

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

    // Filter groups by completion date
    const filterGroupsByDate = (groups, startDate, dateField = 'pickupCompletedAt') => {
        return groups.filter(g => {
            const completedAt = new Date(g[dateField] || g.updatedAt || g.createdAt);
            return completedAt >= startDate;
        });
    };

    // Calculate earnings
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    // Fix week calculation: getDay() returns 0 for Sunday, 1 for Monday, etc.
    // We want Monday as start of week
    const dayOfWeek = startOfToday.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = go back 6 days, otherwise go back to Monday
    startOfWeek.setDate(startOfToday.getDate() - daysToSubtract);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Regular delivery filtering
    const todayParcels = filterByDate(deliveredParcels, startOfToday);
    const weekParcels = filterByDate(deliveredParcels, startOfWeek);
    const monthParcels = filterByDate(deliveredParcels, startOfMonth);

    // Group pickup/delivery filtering by date
    const completedPickups = groupEarnings.completedPickups || [];
    const completedDeliveries = groupEarnings.completedDeliveries || [];

    // Today's group completions
    const todayPickups = filterGroupsByDate(completedPickups, startOfToday, 'pickupCompletedAt');
    const todayDeliveries = filterGroupsByDate(completedDeliveries, startOfToday, 'deliveryCompletedAt');
    const todayGroupEarnings = todayPickups.reduce((sum, g) => sum + parseFloat(g.pickupAgentEarnings || 0), 0)
        + todayDeliveries.reduce((sum, g) => sum + parseFloat(g.deliveryAgentEarnings || 0), 0);

    // This week's group completions
    const weekPickups = filterGroupsByDate(completedPickups, startOfWeek, 'pickupCompletedAt');
    const weekDeliveries = filterGroupsByDate(completedDeliveries, startOfWeek, 'deliveryCompletedAt');
    const weekGroupEarnings = weekPickups.reduce((sum, g) => sum + parseFloat(g.pickupAgentEarnings || 0), 0)
        + weekDeliveries.reduce((sum, g) => sum + parseFloat(g.deliveryAgentEarnings || 0), 0);

    // This month's group completions
    const monthPickups = filterGroupsByDate(completedPickups, startOfMonth, 'pickupCompletedAt');
    const monthDeliveries = filterGroupsByDate(completedDeliveries, startOfMonth, 'deliveryCompletedAt');
    const monthGroupEarnings = monthPickups.reduce((sum, g) => sum + parseFloat(g.pickupAgentEarnings || 0), 0)
        + monthDeliveries.reduce((sum, g) => sum + parseFloat(g.deliveryAgentEarnings || 0), 0);

    // Combined earnings (regular + group)
    const todayEarnings = todayParcels.reduce((sum, p) => sum + calculateEarning(p), 0) + todayGroupEarnings;
    const weekEarnings = weekParcels.reduce((sum, p) => sum + calculateEarning(p), 0) + weekGroupEarnings;
    const monthEarnings = monthParcels.reduce((sum, p) => sum + calculateEarning(p), 0) + monthGroupEarnings;
    const regularEarnings = deliveredParcels.reduce((sum, p) => sum + calculateEarning(p), 0);
    const totalEarnings = regularEarnings + groupEarnings.total;

    // Count deliveries for display (regular + group pickups + group deliveries)
    const todayDeliveriesCount = todayParcels.length + todayPickups.length + todayDeliveries.length;
    const weekDeliveriesCount = weekParcels.length + weekPickups.length + weekDeliveries.length;
    const monthDeliveriesCount = monthParcels.length + monthPickups.length + monthDeliveries.length;
    const totalDeliveriesCount = deliveredParcels.length + completedPickups.length + completedDeliveries.length;

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
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                    <p className="mt-4 text-white/70 font-medium">Loading earnings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Earnings</h1>
                    <p className="text-sm text-white/60 mt-1">
                        Track your delivery earnings • {totalDeliveriesCount} total deliveries
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="newest" className="bg-slate-800">Newest First</option>
                        <option value="oldest" className="bg-slate-800">Oldest First</option>
                        <option value="highest" className="bg-slate-800">Highest Amount</option>
                        <option value="lowest" className="bg-slate-800">Lowest Amount</option>
                    </select>
                </div>
            </div>

            {/* Total Earnings Banner */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
                            <FaWallet className="text-3xl text-green-400" />
                        </div>
                        <div>
                            <p className="text-white/60 text-sm">Total Earnings</p>
                            <p className="text-4xl font-bold text-green-400">₹{totalEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                            <p className="text-white/50 text-sm mt-1">
                                {totalDeliveriesCount} deliveries • {groupEarnings.total > 0 ? `₹${groupEarnings.total.toFixed(0)} from Group Buy` : "No group earnings yet"}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-center bg-white/10 rounded-xl p-4 min-w-[100px] border border-white/10">
                            <FaChartLine className="text-xl mx-auto mb-1 text-indigo-400" />
                            <p className="text-2xl font-bold text-white">₹{monthEarnings.toLocaleString("en-IN")}</p>
                            <p className="text-xs text-white/50">This Month</p>
                        </div>
                        <div className="text-center bg-white/10 rounded-xl p-4 min-w-[100px] border border-white/10">
                            <FaCalendarAlt className="text-xl mx-auto mb-1 text-purple-400" />
                            <p className="text-2xl font-bold text-white">₹{weekEarnings.toLocaleString("en-IN")}</p>
                            <p className="text-xs text-white/50">This Week</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { key: "all", label: "All Time", amount: totalEarnings, count: totalDeliveriesCount, icon: FaTruck, color: "indigo" },
                    { key: "month", label: "This Month", amount: monthEarnings, count: monthDeliveriesCount, icon: FaCalendarAlt, color: "purple" },
                    { key: "week", label: "This Week", amount: weekEarnings, count: weekDeliveriesCount, icon: FaCalendarAlt, color: "blue" },
                    { key: "today", label: "Today", amount: todayEarnings, count: todayDeliveriesCount, icon: FaArrowDown, color: "green" },
                ].map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${filter === f.key
                            ? "border-indigo-500 bg-indigo-500/20"
                            : "border-white/20 bg-white/10 hover:border-white/30 hover:bg-white/15"
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${filter === f.key ? "bg-indigo-500 text-white" : `bg-white/10 text-white/70`
                                }`}>
                                <f.icon className="text-xl" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-green-400">₹{f.amount.toLocaleString("en-IN")}</p>
                                <p className="text-xs text-white/50">{f.label} • {f.count} deliveries</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Group Buy Earnings Section */}
            {groupEarnings.total > 0 && (
                <div className="bg-purple-500/20 backdrop-blur-xl border border-purple-500/30 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <FaUsers className="text-purple-400" />
                        Group Buy Earnings (10% Commission)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <p className="text-sm text-white/60">Pickup Earnings</p>
                            <p className="text-2xl font-bold text-orange-400">₹{groupEarnings.pickup.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <p className="text-sm text-white/60">Delivery Earnings</p>
                            <p className="text-2xl font-bold text-green-400">₹{groupEarnings.delivery.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <p className="text-sm text-white/60">Total Group Earnings</p>
                            <p className="text-2xl font-bold text-purple-400">₹{groupEarnings.total.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Earnings History */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden">
                <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FaFilter className="text-white/50" />
                        {filter === "all" ? "All Earnings" :
                            filter === "today" ? "Today's Earnings" :
                                filter === "week" ? "This Week's Earnings" : "This Month's Earnings"}
                    </h3>
                    <span className="text-sm text-white/50">{filteredParcels.length} transactions</span>
                </div>

                {filteredParcels.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                            <FaBox className="text-4xl text-white/30" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">No Earnings Yet</h3>
                        <p className="text-sm text-white/50">Complete deliveries to start earning</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/10">
                        {paginatedParcels.map((parcel, idx) => {
                            const earning = calculateEarning(parcel);
                            const orderAmount = parcel.finalPrice || parcel.totalAmount || parcel.basePrice || 0;
                            return (
                                <div
                                    key={parcel.id || idx}
                                    className="p-4 hover:bg-white/5 transition flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                            <FaArrowDown className="text-green-400 text-xl" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">
                                                {parcel.trackingNumber || `Delivery #${parcel.id}`}
                                            </p>
                                            <p className="text-sm text-white/60 flex items-center gap-1">
                                                <span className="text-orange-400">{parcel.pickupCity}</span>
                                                <span>→</span>
                                                <span className="text-green-400">{parcel.deliveryCity}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-green-400">+₹{earning.toLocaleString("en-IN")}</p>
                                        <p className="text-xs text-white/40">
                                            Order: ₹{Number(orderAmount).toLocaleString("en-IN")}
                                        </p>
                                        <p className="text-xs text-white/50">
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
            <div className="bg-blue-500/20 backdrop-blur-xl rounded-xl p-4 border border-blue-500/30">
                <p className="text-sm text-blue-300 flex items-center gap-2">
                    <span className="text-xl">💰</span>
                    <span>
                        <strong>Commission Rate:</strong> You earn {(AGENT_COMMISSION_RATE * 100).toFixed(0)}% of each delivery's total price
                    </span>
                </p>
            </div>
        </div>
    );
}
