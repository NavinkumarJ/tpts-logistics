import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCompanyDashboard } from "../../services/companyService";
import { logout } from "../../utils/auth";
import {
    FaChartLine, FaBox, FaTruck, FaWallet, FaUsers, FaSync, FaStar,
    FaClock, FaArrowUp, FaArrowDown, FaCheckCircle, FaMapMarkerAlt
} from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import toast from "react-hot-toast";

export default function AnalyticsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("month");
    const [stats, setStats] = useState({
        totalShipments: 0,
        activeDeliveries: 0,
        completedDeliveries: 0,
        totalRevenue: 0,
        activeAgents: 0,
        avgDeliveryTime: "N/A",
    });
    const [topAgents, setTopAgents] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        fetchAnalytics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const dashboard = await getCompanyDashboard();
            if (dashboard) {
                const backendStats = dashboard.stats || {};
                const agentStats = dashboard.agentStats || {};

                // Calculate correct splits client-side (10% platform, 20% agent, 70% company)
                const totalOrder = backendStats.totalOrderAmount || 0;
                const correctPlatformFee = totalOrder * 0.10;
                const correctAgentEarning = totalOrder * 0.20;
                const correctCompanyRevenue = totalOrder * 0.70;

                setStats({
                    totalShipments: backendStats.totalOrders || 0,
                    activeDeliveries: backendStats.activeOrders || 0,
                    completedDeliveries: backendStats.completedOrders || 0,
                    pendingDeliveries: backendStats.pendingOrders || 0,
                    cancelledDeliveries: backendStats.cancelledOrders || 0,
                    totalRevenue: correctCompanyRevenue,
                    totalOrderAmount: totalOrder,
                    platformCommission: correctPlatformFee,
                    agentEarning: correctAgentEarning,
                    activeAgents: agentStats.activeAgents || agentStats.totalAgents || 0,
                    totalAgents: agentStats.totalAgents || 0,
                    avgRating: backendStats.ratingAvg || 0,
                    onTimeDeliveryRate: backendStats.onTimeDeliveryRate || 100,
                    avgDeliveryTime: backendStats.avgDeliveryTime || "< 1 min",
                    todayOrders: backendStats.todayOrders || 0,
                    weeklyGrowth: backendStats.weeklyGrowth || 0,
                });
                setTopAgents(dashboard.activeAgents || []);
                setRecentActivity(dashboard.recentShipments?.slice(0, 6) || []);
            }
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            }
            toast.error("Failed to load analytics");
        } finally {
            setLoading(false);
        }
    };

    // Trend data for chart
    const trendData = [
        { name: 'Week 1', deliveries: Math.round(stats.completedDeliveries * 0.6) || 0, revenue: Math.round(stats.totalRevenue * 0.5) || 0 },
        { name: 'Week 2', deliveries: Math.round(stats.completedDeliveries * 0.75) || 0, revenue: Math.round(stats.totalRevenue * 0.7) || 0 },
        { name: 'Week 3', deliveries: Math.round(stats.completedDeliveries * 0.9) || 0, revenue: Math.round(stats.totalRevenue * 0.85) || 0 },
        { name: 'Week 4', deliveries: stats.completedDeliveries || 0, revenue: stats.totalRevenue || 0 },
    ];

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">Track your company performance and revenue</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {["week", "month", "year"].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${period === p
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                                    }`}
                            >
                                This {p}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchAnalytics}
                        disabled={loading}
                        className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                        <FaSync className={loading ? "animate-spin text-gray-400" : "text-gray-600"} />
                    </button>
                </div>
            </div>

            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                    title="Total Shipments"
                    value={stats.totalShipments || 0}
                    icon={FaTruck}
                    color="indigo"
                    trend={stats.weeklyGrowth}
                />
                <StatCard
                    title="Your Revenue"
                    value={`₹${Number(stats.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    subtitle="70% share"
                    icon={FaWallet}
                    color="green"
                />
                <StatCard
                    title="Active"
                    value={stats.activeDeliveries || 0}
                    icon={FaBox}
                    color="orange"
                />
                <StatCard
                    title="Completed"
                    value={stats.completedDeliveries || 0}
                    icon={FaCheckCircle}
                    color="emerald"
                />
                <StatCard
                    title="On-Time Rate"
                    value={`${stats.onTimeDeliveryRate || 100}%`}
                    icon={FaClock}
                    color="blue"
                />
                <StatCard
                    title="Avg Rating"
                    value={Number(stats.avgRating || 5).toFixed(1)}
                    icon={FaStar}
                    color="yellow"
                />
            </div>

            {/* Revenue Breakdown */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold">💰 Revenue Breakdown</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            How customer payments are distributed
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-400">Total Collected</p>
                        <p className="text-2xl font-bold">₹{Number(stats.totalOrderAmount || 0).toLocaleString('en-IN')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <RevenueCard
                        label="Customer Paid"
                        value={stats.totalOrderAmount}
                        percent="100%"
                        color="bg-blue-500"
                        textColor="text-blue-100"
                    />
                    <RevenueCard
                        label="Platform Fee"
                        value={stats.platformCommission}
                        percent="10%"
                        color="bg-slate-600"
                        textColor="text-slate-300"
                    />
                    <RevenueCard
                        label="Agent Earnings"
                        value={stats.agentEarning}
                        percent="20%"
                        color="bg-orange-500"
                        textColor="text-orange-100"
                    />
                    <RevenueCard
                        label="Your Company"
                        value={stats.totalRevenue}
                        percent="70%"
                        color="bg-green-500"
                        textColor="text-green-100"
                        highlight
                    />
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Deliveries Bar Chart */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Delivery Status</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'Pending', value: stats.pendingDeliveries || 0 },
                                { name: 'Active', value: stats.activeDeliveries || 0 },
                                { name: 'Completed', value: stats.completedDeliveries || 0 },
                                { name: 'Total', value: stats.totalShipments || 0 },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                    <Cell fill="#f59e0b" />
                                    <Cell fill="#3b82f6" />
                                    <Cell fill="#22c55e" />
                                    <Cell fill="#6366f1" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue Pie Chart */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🥧 Revenue Distribution</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Platform (10%)', value: Number(stats.platformCommission) || 0 },
                                        { name: 'Agent (20%)', value: Number(stats.agentEarning) || 0 },
                                        { name: 'Company (70%)', value: Number(stats.totalRevenue) || 0 },
                                    ].filter(item => item.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    <Cell fill="#94a3b8" />
                                    <Cell fill="#f97316" />
                                    <Cell fill="#22c55e" />
                                </Pie>
                                <Tooltip
                                    formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Trend Chart */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Monthly Trend</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                formatter={(value, name) => [name === 'revenue' ? `₹${value.toLocaleString()}` : value, name === 'revenue' ? 'Revenue' : 'Deliveries']}
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                            />
                            <Area type="monotone" dataKey="deliveries" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} />
                            <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Agents */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">🏆 Top Performing Agents</h3>
                        <Link to="/company/agents" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                            View All →
                        </Link>
                    </div>
                    {topAgents.length === 0 ? (
                        <div className="text-center py-8">
                            <FaUsers className="text-4xl text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No agents data available</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {topAgents.slice(0, 5).map((agent, idx) => (
                                <div key={agent.id || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-400' : 'bg-indigo-500'
                                            }`}>
                                            {agent.fullName?.charAt(0) || "A"}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{agent.fullName}</p>
                                            <p className="text-xs text-gray-500">{agent.phone || 'Agent'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900">{agent.totalDeliveries || 0}</p>
                                        <div className="flex items-center gap-1 text-xs text-yellow-600">
                                            <FaStar /> {Number(agent.ratingAvg || 5).toFixed(1)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Shipments */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">📦 Recent Shipments</h3>
                        <Link to="/company/parcels" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                            View All →
                        </Link>
                    </div>
                    {recentActivity.length === 0 ? (
                        <div className="text-center py-8">
                            <FaBox className="text-4xl text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No recent shipments</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentActivity.map((shipment, idx) => (
                                <div key={shipment.id || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${shipment.status === "COMPLETED" || shipment.status === "DELIVERED" ? 'bg-green-100 text-green-600' :
                                                shipment.status === "IN_PROGRESS" || shipment.status === "IN_TRANSIT" ? 'bg-blue-100 text-blue-600' :
                                                    'bg-yellow-100 text-yellow-600'
                                            }`}>
                                            <FaBox />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Group #{shipment.groupId || shipment.id}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <FaMapMarkerAlt className="text-[10px]" />
                                                {shipment.pickupCity} → {shipment.deliveryCity}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${shipment.status === "COMPLETED" || shipment.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                                            shipment.status === "IN_PROGRESS" || shipment.status === "IN_TRANSIT" ? "bg-blue-100 text-blue-700" :
                                                "bg-yellow-100 text-yellow-700"
                                        }`}>
                                        {shipment.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend }) {
    const colorClasses = {
        indigo: { bg: "bg-indigo-50", icon: "bg-indigo-100 text-indigo-600" },
        green: { bg: "bg-green-50", icon: "bg-green-100 text-green-600" },
        emerald: { bg: "bg-emerald-50", icon: "bg-emerald-100 text-emerald-600" },
        orange: { bg: "bg-orange-50", icon: "bg-orange-100 text-orange-600" },
        purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-600" },
        blue: { bg: "bg-blue-50", icon: "bg-blue-100 text-blue-600" },
        yellow: { bg: "bg-yellow-50", icon: "bg-yellow-100 text-yellow-600" },
    };

    const c = colorClasses[color] || colorClasses.indigo;

    return (
        <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition">
            <div className={`w-11 h-11 rounded-lg ${c.icon} flex items-center justify-center mb-3`}>
                <Icon className="text-lg" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{title}</p>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
            {trend !== undefined && trend !== 0 && (
                <div className={`flex items-center gap-1 text-xs mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trend > 0 ? <FaArrowUp /> : <FaArrowDown />}
                    {Math.abs(trend)}% vs last week
                </div>
            )}
        </div>
    );
}

function RevenueCard({ label, value, percent, color, textColor, highlight }) {
    return (
        <div className={`${color} rounded-xl p-4 ${highlight ? 'ring-2 ring-white/30' : ''}`}>
            <p className={`text-xs ${textColor} font-medium uppercase tracking-wide mb-1`}>{label}</p>
            <p className="text-2xl font-bold text-white">₹{Number(value || 0).toLocaleString('en-IN')}</p>
            <p className={`text-xs ${textColor} mt-1`}>{percent} {highlight && '✓'}</p>
        </div>
    );
}
