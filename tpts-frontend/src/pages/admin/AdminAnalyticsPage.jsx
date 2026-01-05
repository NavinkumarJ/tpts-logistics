import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPlatformStats } from "../../services/adminService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaChartLine, FaBuilding, FaUsers, FaTruck, FaBox, FaArrowUp, FaArrowDown, FaChartBar, FaChartPie, FaBan, FaSync } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const STATUS_COLORS = {
    pending: "#f59e0b",
    inTransit: "#3b82f6",
    delivered: "#22c55e",
    cancelled: "#ef4444",
};

export default function AdminAnalyticsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const data = await getPlatformStats();
            setStats(data);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load analytics");
            }
        } finally {
            setLoading(false);
        }
    };

    // Order Status Distribution (using ORDER counts, not raw parcels)
    const inProgressOrders = (stats?.totalOrders || 0) - (stats?.completedOrders || 0) - (stats?.cancelledOrders || 0);
    const orderStatusData = [
        { name: "In Progress", value: inProgressOrders, fill: STATUS_COLORS.inTransit },
        { name: "Completed", value: stats?.completedOrders || 0, fill: STATUS_COLORS.delivered },
        { name: "Cancelled", value: stats?.cancelledOrders || 0, fill: STATUS_COLORS.cancelled },
    ];

    // Revenue Comparison (Today vs Week vs Month)
    const revenueComparisonData = [
        { name: "Today", revenue: Number(stats?.todayRevenue) || 0, commission: (Number(stats?.todayRevenue) || 0) * 0.10 },
        { name: "This Week", revenue: Number(stats?.weeklyRevenue) || 0, commission: (Number(stats?.weeklyRevenue) || 0) * 0.10 },
        { name: "This Month", revenue: Number(stats?.monthlyRevenue) || 0, commission: (Number(stats?.monthlyRevenue) || 0) * 0.10 },
    ];

    // User Distribution (Customers, Companies, Agents)
    const userDistribution = [
        { name: "Customers", value: stats?.totalCustomers || 0 },
        { name: "Companies", value: stats?.totalCompanies || 0 },
        { name: "Agents", value: stats?.totalAgents || 0 },
    ].filter(item => item.value > 0);

    // Platform Health Metrics
    const platformMetrics = [
        { name: "Companies", active: stats?.approvedCompanies || 0, pending: stats?.pendingCompanyApprovals || 0 },
        { name: "Agents", active: stats?.activeAgents || 0, available: stats?.availableAgents || 0 },
        { name: "Orders", completed: stats?.completedOrders || 0, cancelled: stats?.cancelledOrders || 0 },
    ];

    // Calculate completion rate based on orders (not raw parcels)
    const totalOrders = stats?.totalOrders || 0;
    const completedOrders = stats?.completedOrders || 0;
    const cancelledOrders = stats?.cancelledOrders || 0;
    const activeOrders = totalOrders - cancelledOrders;
    const completionRate = activeOrders > 0 ? Math.round((completedOrders / activeOrders) * 100) : 0;

    // Cancellation breakdown by who cancelled
    const cancellationBreakdown = [
        { name: "Customer", value: stats?.cancelledByCustomer || 0 },
        { name: "Company", value: stats?.cancelledByCompany || 0 },
        { name: "Agent", value: stats?.cancelledByAgent || 0 },
        { name: "Admin", value: stats?.cancelledByAdmin || 0 },
    ].filter(item => item.value > 0);

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                <p className="mt-3 text-sm text-white/60">Loading analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Platform Analytics</h1>
                    <p className="text-sm text-white/60 mt-1">Real-time performance metrics and insights</p>
                </div>
                <button
                    onClick={fetchStats}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition text-sm font-medium text-white disabled:opacity-50"
                >
                    <FaSync className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {/* Key Metrics - Using correct field names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Orders"
                    value={stats?.totalOrders || 0}
                    subtitle={`${stats?.completedOrders || 0} completed, ${stats?.cancelledOrders || 0} cancelled`}
                    icon={FaBox}
                    color="bg-indigo-500"
                />
                <MetricCard
                    title="Active Companies"
                    value={stats?.approvedCompanies || 0}
                    subtitle={`${stats?.pendingCompanyApprovals || 0} pending`}
                    icon={FaBuilding}
                    color="bg-green-500"
                />
                <MetricCard
                    title="Active Agents"
                    value={stats?.activeAgents || 0}
                    subtitle={`${stats?.availableAgents || 0} available`}
                    icon={FaTruck}
                    color="bg-orange-500"
                />
                <MetricCard
                    title="Total Users"
                    value={(stats?.totalCustomers || 0) + (stats?.totalCompanies || 0) + (stats?.totalAgents || 0)}
                    subtitle={`${stats?.activeUsersToday || 0} active today`}
                    icon={FaUsers}
                    color="bg-purple-500"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order Status Distribution - Horizontal Bar Chart */}
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <FaChartBar className="text-indigo-400" /> Order Status Breakdown
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={orderStatusData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.5)" fontSize={12} width={80} />
                                <Tooltip
                                    formatter={(value) => [value, "Orders"]}
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {orderStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        {orderStatusData.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></div>
                                <span className="text-sm text-white/70">{item.name}: <strong className="text-white">{item.value}</strong></span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Revenue Comparison - Area Chart */}
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <FaChartLine className="text-green-400" /> Revenue Overview
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueComparisonData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                                <Tooltip
                                    formatter={(value) => [`₹${Number(value).toLocaleString()}`, ""]}
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }}
                                />
                                <Legend wrapperStyle={{ color: '#fff' }} />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    name="Total Revenue"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="commission"
                                    name="Platform Commission (10%)"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorCommission)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User Distribution - Donut Chart */}
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <FaChartPie className="text-purple-400" /> User Distribution
                    </h3>
                    <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={userDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={65}
                                    dataKey="value"
                                    paddingAngle={3}
                                >
                                    {userDistribution.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name, props) => {
                                        const total = userDistribution.reduce((sum, item) => sum + item.value, 0);
                                        const percent = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                                        return [`${value} (${percent}%)`, "Users"];
                                    }}
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-3">
                        {(() => {
                            const total = userDistribution.reduce((sum, item) => sum + item.value, 0);
                            return userDistribution.map((item, index) => {
                                const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                                return (
                                    <div key={index} className="text-center">
                                        <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: CHART_COLORS[index] }}></div>
                                        <p className="text-lg font-bold text-white">{item.value}</p>
                                        <p className="text-xs text-white/50">{item.name} ({percent}%)</p>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* Platform Summary - Grid Stats */}
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-white mb-4">Platform Health</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            label="Completion Rate"
                            value={`${completionRate}%`}
                            color={completionRate >= 80 ? "text-green-400" : completionRate >= 50 ? "text-yellow-400" : "text-red-400"}
                        />
                        <StatCard
                            label="Completed Orders"
                            value={completedOrders}
                            color="text-green-400"
                        />
                        <StatCard
                            label="Pending Approvals"
                            value={stats?.pendingCompanyApprovals || 0}
                            color={stats?.pendingCompanyApprovals > 0 ? "text-orange-400" : "text-white/60"}
                        />
                        <StatCard
                            label="Total Revenue"
                            value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`}
                            color="text-indigo-400"
                        />
                    </div>

                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/10">
                        <QuickStat label="Open Groups" value={stats?.openGroups || 0} />
                        <QuickStat label="Total Ratings" value={stats?.totalRatings || 0} />
                        <QuickStat label="Flagged Reviews" value={stats?.flaggedRatings || 0} warn={stats?.flaggedRatings > 0} />
                        <QuickStat label="Hiring Companies" value={stats?.hiringCompanies || 0} />
                    </div>
                </div>
            </div>

            {/* Job Applications & Payments Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4">Job Applications</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
                            <span className="text-sm text-white/70">Total Applications</span>
                            <span className="text-lg font-bold text-white">{stats?.totalApplications || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-500/20 rounded-lg border border-orange-500/30">
                            <span className="text-sm text-orange-400">Pending Review</span>
                            <span className="text-lg font-bold text-orange-400">{stats?.pendingApplications || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                            <span className="text-sm text-green-400">Hired</span>
                            <span className="text-lg font-bold text-green-400">{stats?.hiredApplications || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4">Payment Stats</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                            <span className="text-sm text-green-400">Successful Payments</span>
                            <span className="text-lg font-bold text-green-400">{stats?.successfulPayments || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-500/20 rounded-lg border border-orange-500/30">
                            <span className="text-sm text-orange-400">Pending Payments</span>
                            <span className="text-lg font-bold text-orange-400">{stats?.pendingPayments || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                            <span className="text-sm text-indigo-400">Platform Commission (10%)</span>
                            <span className="text-lg font-bold text-indigo-400">₹{((Number(stats?.totalRevenue) || 0) * 0.10).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cancellation Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <FaBan className="text-red-400" /> Cancellation Overview
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                            <div>
                                <span className="text-sm text-red-400">Total Cancelled Orders</span>
                                <p className="text-xs text-red-400/60">(includes expired groups)</p>
                            </div>
                            <span className="text-lg font-bold text-red-400">{cancelledOrders}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-500/20 rounded-lg border border-orange-500/30">
                            <span className="text-sm text-orange-400">Cancellation Rate</span>
                            <span className="text-lg font-bold text-orange-400">{stats?.cancellationRate?.toFixed(2) || 0}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="p-3 bg-white/5 rounded-lg text-center border border-white/10">
                                <p className="text-xl font-bold text-white">{stats?.cancelledByCustomer || 0}</p>
                                <p className="text-xs text-white/50">By Customer</p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-lg text-center border border-white/10">
                                <p className="text-xl font-bold text-white">{stats?.cancelledByCompany || 0}</p>
                                <p className="text-xs text-white/50">By Company</p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-lg text-center border border-white/10">
                                <p className="text-xl font-bold text-white">{stats?.cancelledByAgent || 0}</p>
                                <p className="text-xs text-white/50">By Agent</p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-lg text-center border border-white/10">
                                <p className="text-xl font-bold text-white">{stats?.cancelledByAdmin || 0}</p>
                                <p className="text-xs text-white/50">By Admin</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cancellation Breakdown Pie Chart */}
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <FaChartPie className="text-red-400" /> Cancellation Breakdown
                    </h3>
                    {cancellationBreakdown.length > 0 ? (
                        <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={cancellationBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        labelLine={false}
                                    >
                                        {cancellationBreakdown.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [value, "Cancelled"]}
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-52 flex items-center justify-center text-white/40">
                            <p>No cancellations recorded</p>
                        </div>
                    )}
                    <div className="flex justify-center gap-4 mt-2">
                        {cancellationBreakdown.map((item, index) => (
                            <div key={index} className="text-center">
                                <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: CHART_COLORS[index] }}></div>
                                <p className="text-sm font-semibold text-white">{item.value}</p>
                                <p className="text-xs text-white/50">{item.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, subtitle, icon: Icon, color }) {
    return (
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/20">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white shadow-lg`}>
                    <Icon className="text-xl" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                    <p className="text-sm text-white/70">{title}</p>
                    {subtitle && <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, color = "text-white" }) {
    return (
        <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-white/50 mt-1">{label}</p>
        </div>
    );
}

function QuickStat({ label, value, warn = false }) {
    return (
        <div className={`flex justify-between items-center p-2 rounded border ${warn ? 'bg-red-500/20 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
            <span className={`text-xs ${warn ? 'text-red-400' : 'text-white/60'}`}>{label}</span>
            <span className={`text-sm font-semibold ${warn ? 'text-red-400' : 'text-white'}`}>{value}</span>
        </div>
    );
}
