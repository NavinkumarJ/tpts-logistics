import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPlatformStats, getApprovedCompanies } from "../../services/adminService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaBox, FaCheckCircle, FaTruck, FaClock, FaTimesCircle, FaChartBar,
    FaSync, FaBuilding, FaMapMarkerAlt, FaArrowRight, FaPercentage
} from "react-icons/fa";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const STATUS_CONFIG = {
    pending: { label: "Pending", color: "#f59e0b", bgColor: "bg-yellow-500/20", textColor: "text-yellow-400", icon: FaClock },
    confirmed: { label: "Confirmed", color: "#3b82f6", bgColor: "bg-blue-500/20", textColor: "text-blue-400", icon: FaCheckCircle },
    inTransit: { label: "In Transit", color: "#f97316", bgColor: "bg-orange-500/20", textColor: "text-orange-400", icon: FaTruck },
    delivered: { label: "Delivered", color: "#22c55e", bgColor: "bg-green-500/20", textColor: "text-green-400", icon: FaCheckCircle },
    cancelled: { label: "Cancelled", color: "#ef4444", bgColor: "bg-red-500/20", textColor: "text-red-400", icon: FaTimesCircle },
};

export default function AdminParcelsPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsData, companiesData] = await Promise.all([
                getPlatformStats(),
                getApprovedCompanies()
            ]);
            setStats(statsData);
            setCompanies(companiesData || []);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load parcel data");
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                <p className="mt-3 text-sm text-white/60">Loading parcel data...</p>
            </div>
        );
    }

    // Use REAL data from backend - Order counting (groups = 1 order)
    const totalOrders = stats?.totalOrders || 0;
    const completedOrders = stats?.completedOrders || 0;
    const cancelledOrders = stats?.cancelledOrders || 0;
    const regularOrders = stats?.regularOrders || 0;
    const groupBuyOrders = stats?.groupBuyOrders || 0;

    // Raw parcel counts (for detailed breakdown)
    const totalParcels = stats?.totalParcels || 0;
    const deliveredParcels = stats?.deliveredParcels || 0;
    const pendingParcels = stats?.pendingParcels || 0;
    const inTransitParcels = stats?.inTransitParcels || 0;
    const cancelledParcels = stats?.cancelledParcels || 0;

    // Calculate real completion rate (excluding cancelled from denominator)
    const activeOrders = totalOrders - cancelledOrders;
    const completionRate = activeOrders > 0 ? Math.round((completedOrders / activeOrders) * 100) : 0;
    const inProgressCount = totalOrders - completedOrders - cancelledOrders;

    // Status data for pie chart (using ORDER counts, not raw parcels)
    const statusData = [
        { name: "In Progress", value: inProgressCount, color: STATUS_CONFIG.inTransit.color },
        { name: "Completed", value: completedOrders, color: STATUS_CONFIG.delivered.color },
        { name: "Cancelled", value: cancelledOrders, color: STATUS_CONFIG.cancelled.color },
    ].filter(item => item.value > 0);

    // Company parcels data (with real deliveries)
    const companyParcels = companies
        .map(c => ({
            name: c.companyName.length > 15 ? c.companyName.substring(0, 12) + "..." : c.companyName,
            fullName: c.companyName,
            deliveries: c.totalDeliveries || 0,
        }))
        .filter(c => c.deliveries > 0)
        .sort((a, b) => b.deliveries - a.deliveries);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Platform Orders</h1>
                    <p className="text-sm text-white/60 mt-1">Real-time overview of all orders across the platform</p>
                </div>
                <button
                    onClick={fetchData}
                    className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition flex items-center gap-2 self-start"
                >
                    <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    title="Total Orders"
                    value={totalOrders}
                    icon={FaBox}
                    gradient="from-indigo-500 to-indigo-600"
                    subtitle={`${regularOrders} regular, ${groupBuyOrders} group`}
                />
                <StatCard
                    title="Completed"
                    value={completedOrders}
                    icon={FaCheckCircle}
                    gradient="from-emerald-500 to-emerald-600"
                    subtitle="Successfully delivered"
                />
                <StatCard
                    title="In Progress"
                    value={inProgressCount}
                    icon={FaTruck}
                    gradient="from-orange-500 to-orange-600"
                    subtitle={`${pendingParcels} pending, ${inTransitParcels} in transit`}
                />
                <StatCard
                    title="Cancelled"
                    value={cancelledOrders}
                    icon={FaTimesCircle}
                    gradient="from-red-500 to-red-600"
                    subtitle={`${cancelledOrders} orders cancelled`}
                />
                <StatCard
                    title="Completion Rate"
                    value={`${completionRate}%`}
                    icon={FaPercentage}
                    gradient="from-purple-500 to-purple-600"
                    subtitle={activeOrders > 0 ? `${completedOrders}/${activeOrders} active` : "No active orders"}
                    highlight={completionRate >= 80}
                />
            </div>


            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution Pie Chart */}
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4">Order Status Distribution</h3>
                    {statusData.length > 0 ? (
                        <>
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [value, "Parcels"]} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-6 mt-4">
                                {statusData.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                        <span className="text-sm text-white/60">{item.name}: <strong className="text-white">{item.value}</strong></span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-56 flex items-center justify-center text-white/40">
                            <div className="text-center">
                                <FaBox className="text-4xl mx-auto mb-2" />
                                <p>No parcels data yet</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Company Deliveries Bar Chart */}
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4">Deliveries by Company</h3>
                    {companyParcels.length > 0 ? (
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={companyParcels} layout="vertical" margin={{ left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                                    <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.5)" fontSize={11} width={100} />
                                    <Tooltip
                                        formatter={(value, name, props) => [value, "Deliveries"]}
                                        labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Bar dataKey="deliveries" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-56 flex items-center justify-center text-white/40">
                            <div className="text-center">
                                <FaBuilding className="text-4xl mx-auto mb-2" />
                                <p>No deliveries recorded yet</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Order Status Breakdown */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-6">Order Status Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatusCard
                        label="In Progress"
                        count={inProgressCount}
                        icon={FaTruck}
                        config={STATUS_CONFIG.inTransit}
                    />
                    <StatusCard
                        label="Completed"
                        count={completedOrders}
                        icon={FaCheckCircle}
                        config={STATUS_CONFIG.delivered}
                    />
                    <StatusCard
                        label="Cancelled"
                        count={cancelledOrders}
                        icon={FaTimesCircle}
                        config={STATUS_CONFIG.cancelled}
                    />
                    <StatusCard
                        label="Total"
                        count={totalOrders}
                        icon={FaBox}
                        config={{ bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-400' }}
                    />
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/60">Overall Progress</span>
                        <span className="font-medium text-white">{completionRate}% Complete</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                            style={{ width: `${completionRate}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-white/50 mt-1">
                        <span>{completedOrders} completed</span>
                        <span>{inProgressCount} in progress</span>
                    </div>
                </div>
            </div>

            {/* Companies with Active Parcels */}
            {companies.length > 0 && (
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4">Active Companies</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">Company</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">City</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase">Total Deliveries</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {companies.slice(0, 5).map((company, idx) => (
                                    <tr key={idx} className="hover:bg-white/5 transition">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                                    <FaBuilding className="text-indigo-400 text-sm" />
                                                </div>
                                                <span className="font-medium text-white">{company.companyName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-white/60">
                                            <div className="flex items-center gap-1">
                                                <FaMapMarkerAlt className="text-white/40 text-xs" />
                                                {company.city || "N/A"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="font-semibold text-white">{company.totalDeliveries || 0}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-green-400 font-medium">₹{(Number(company.totalRevenue) || 0).toLocaleString()}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Info Note */}
            <div className="bg-indigo-500/20 backdrop-blur-xl rounded-xl p-5 border border-indigo-500/30">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FaChartBar className="text-indigo-400" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-white mb-1">Parcel Analytics</h4>
                        <p className="text-sm text-white/70">
                            This dashboard shows aggregate parcel statistics across all companies. For detailed tracking and
                            individual parcel management, companies can access their respective dashboards.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, gradient, subtitle, highlight = false }) {
    return (
        <div className={`bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/20 relative overflow-hidden hover:bg-white/15 transition`}>
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-20 rounded-bl-full`}></div>
            <div className="relative">
                <div className="flex items-center justify-between mb-2">
                    <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center shadow-lg`}>
                        <Icon className="text-lg text-white" />
                    </div>
                    {highlight && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-medium border border-green-500/30">
                            ✓ Good
                        </span>
                    )}
                </div>
                <p className="text-3xl font-bold text-white mt-2">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                <p className="text-sm text-white/70 mt-1">{title}</p>
                {subtitle && <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}

function StatusCard({ label, count, icon: Icon, config, isPercentage = false }) {
    return (
        <div className={`${config.bgColor} backdrop-blur-xl rounded-xl p-5 text-center transition hover:bg-opacity-30 border border-white/10`}>
            <div className={`w-12 h-12 rounded-full ${config.bgColor} border-2 ${config.textColor} flex items-center justify-center mx-auto mb-3`}>
                <Icon className="text-xl" />
            </div>
            <p className={`text-2xl font-bold ${config.textColor}`}>
                {isPercentage ? count : (typeof count === 'number' ? count.toLocaleString() : count)}
            </p>
            <p className="text-xs text-white/60 mt-1 font-medium">{label}</p>
        </div>
    );
}
