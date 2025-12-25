import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPlatformStats } from "../../services/adminService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaChartLine, FaBuilding, FaUsers, FaTruck, FaBox, FaArrowUp, FaArrowDown, FaChartBar, FaChartPie } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const STATUS_COLORS = {
    pending: "#f59e0b",
    inTransit: "#3b82f6",
    delivered: "#22c55e",
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

    // Order Status Distribution (meaningful parcel breakdown)
    const orderStatusData = [
        { name: "Pending", value: stats?.pendingParcels || 0, fill: STATUS_COLORS.pending },
        { name: "In Transit", value: stats?.inTransitParcels || 0, fill: STATUS_COLORS.inTransit },
        { name: "Delivered", value: stats?.deliveredParcels || 0, fill: STATUS_COLORS.delivered },
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
        { name: "Companies", value: stats?.approvedCompanies || stats?.totalCompanies || 0 },
        { name: "Agents", value: stats?.totalAgents || 0 },
    ].filter(item => item.value > 0);

    // Platform Health Metrics
    const platformMetrics = [
        { name: "Companies", active: stats?.approvedCompanies || 0, pending: stats?.pendingCompanyApprovals || 0 },
        { name: "Agents", active: stats?.activeAgents || 0, available: stats?.availableAgents || 0 },
        { name: "Parcels", delivered: stats?.deliveredParcels || 0, pending: stats?.pendingParcels || 0 },
    ];

    // Calculate completion rate
    const totalParcels = stats?.totalParcels || 0;
    const deliveredParcels = stats?.deliveredParcels || 0;
    const completionRate = totalParcels > 0 ? Math.round((deliveredParcels / totalParcels) * 100) : 0;

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">Real-time performance metrics and insights</p>
            </div>

            {/* Key Metrics - Using correct field names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Orders"
                    value={stats?.totalParcels || 0}
                    subtitle={`${stats?.deliveredParcels || 0} delivered`}
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
                    value={stats?.totalUsers || 0}
                    subtitle={`${stats?.activeUsersToday || 0} active today`}
                    icon={FaUsers}
                    color="bg-purple-500"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order Status Distribution - Horizontal Bar Chart */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FaChartBar className="text-indigo-500" /> Order Status Breakdown
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={orderStatusData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={80} />
                                <Tooltip
                                    formatter={(value) => [value, "Orders"]}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
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
                                <span className="text-sm text-gray-600">{item.name}: <strong>{item.value}</strong></span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Revenue Comparison - Area Chart */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FaChartLine className="text-green-500" /> Revenue Overview
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
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                                <Tooltip
                                    formatter={(value) => [`₹${Number(value).toLocaleString()}`, ""]}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                />
                                <Legend />
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
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FaChartPie className="text-purple-500" /> User Distribution
                    </h3>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={userDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    labelLine={false}
                                >
                                    {userDistribution.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [value, "Users"]} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                        {userDistribution.map((item, index) => (
                            <div key={index} className="text-center">
                                <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: CHART_COLORS[index] }}></div>
                                <p className="text-lg font-bold text-gray-900">{item.value}</p>
                                <p className="text-xs text-gray-500">{item.name}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Platform Summary - Grid Stats */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Health</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            label="Completion Rate"
                            value={`${completionRate}%`}
                            color={completionRate >= 80 ? "text-green-600" : completionRate >= 50 ? "text-yellow-600" : "text-red-600"}
                        />
                        <StatCard
                            label="Delivered Orders"
                            value={stats?.deliveredParcels || 0}
                            color="text-green-600"
                        />
                        <StatCard
                            label="Pending Approvals"
                            value={stats?.pendingCompanyApprovals || 0}
                            color={stats?.pendingCompanyApprovals > 0 ? "text-orange-600" : "text-gray-600"}
                        />
                        <StatCard
                            label="Total Revenue"
                            value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`}
                            color="text-indigo-600"
                        />
                    </div>

                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                        <QuickStat label="Open Groups" value={stats?.openGroups || 0} />
                        <QuickStat label="Total Ratings" value={stats?.totalRatings || 0} />
                        <QuickStat label="Flagged Reviews" value={stats?.flaggedRatings || 0} warn={stats?.flaggedRatings > 0} />
                        <QuickStat label="Hiring Companies" value={stats?.hiringCompanies || 0} />
                    </div>
                </div>
            </div>

            {/* Job Applications & Payments Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Applications</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Total Applications</span>
                            <span className="text-lg font-bold text-gray-900">{stats?.totalApplications || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                            <span className="text-sm text-orange-700">Pending Review</span>
                            <span className="text-lg font-bold text-orange-600">{stats?.pendingApplications || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="text-sm text-green-700">Hired</span>
                            <span className="text-lg font-bold text-green-600">{stats?.hiredApplications || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Stats</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="text-sm text-green-700">Successful Payments</span>
                            <span className="text-lg font-bold text-green-600">{stats?.successfulPayments || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                            <span className="text-sm text-orange-700">Pending Payments</span>
                            <span className="text-lg font-bold text-orange-600">{stats?.pendingPayments || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                            <span className="text-sm text-indigo-700">Platform Commission</span>
                            <span className="text-lg font-bold text-indigo-600">₹{(stats?.commissionEarned || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, subtitle, icon: Icon, color }) {
    return (
        <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white shadow-lg`}>
                    <Icon className="text-xl" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                    <p className="text-sm text-gray-600">{title}</p>
                    {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, color = "text-gray-900" }) {
    return (
        <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
        </div>
    );
}

function QuickStat({ label, value, warn = false }) {
    return (
        <div className={`flex justify-between items-center p-2 rounded ${warn ? 'bg-red-50' : 'bg-gray-50'}`}>
            <span className={`text-xs ${warn ? 'text-red-600' : 'text-gray-600'}`}>{label}</span>
            <span className={`text-sm font-semibold ${warn ? 'text-red-600' : 'text-gray-900'}`}>{value}</span>
        </div>
    );
}
