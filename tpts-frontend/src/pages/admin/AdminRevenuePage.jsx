import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPlatformStats, getApprovedCompanies } from "../../services/adminService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaRupeeSign, FaBuilding, FaChartPie, FaPercent, FaArrowUp, FaChartLine, FaTrophy, FaExchangeAlt, FaSync } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart, Line } from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AdminRevenuePage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [companies, setCompanies] = useState([]);

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
                toast.error("Failed to load revenue data");
            }
        } finally {
            setLoading(false);
        }
    };

    // Build revenue trend with more context
    const buildRevenueTrend = () => {
        if (!stats) return [];
        const today = Number(stats.todayRevenue) || 0;
        const weekly = Number(stats.weeklyRevenue) || 0;
        const monthly = Number(stats.monthlyRevenue) || 0;

        return [
            { name: "Today", revenue: today, commission: today * 0.10, companyShare: today * 0.70, agentShare: today * 0.20 },
            { name: "This Week", revenue: weekly, commission: weekly * 0.10, companyShare: weekly * 0.70, agentShare: weekly * 0.20 },
            { name: "This Month", revenue: monthly, commission: monthly * 0.10, companyShare: monthly * 0.70, agentShare: monthly * 0.20 },
        ];
    };

    const revenueTrend = buildRevenueTrend();

    // Top companies by revenue
    const topCompanies = companies.map((c) => ({
        name: c.companyName,
        shortName: c.companyName.length > 15 ? c.companyName.substring(0, 12) + "..." : c.companyName,
        revenue: Number(c.totalRevenue) || 0,
        orders: c.totalDeliveries || 0,
        avgOrder: c.totalDeliveries > 0 ? (Number(c.totalRevenue) || 0) / c.totalDeliveries : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    // Companies with revenue > 0 for pie chart
    const companiesWithRevenue = topCompanies.filter(c => c.revenue > 0);

    const totalRevenue = Number(stats?.totalRevenue) || 0;
    const platformCommission = totalRevenue * 0.10; // 10% platform commission
    const avgOrderValue = stats?.totalParcels > 0 ? totalRevenue / stats.totalParcels : 0;
    const totalOrders = stats?.totalParcels || 0;
    const deliveredOrders = stats?.deliveredParcels || 0;

    // Commission split breakdown - 10% platform, 20% agent, 70% company
    const agentShare = totalRevenue * 0.20;
    const companyShare = totalRevenue * 0.70;
    const commissionSplit = [
        { name: "Platform (10%)", value: platformCommission, fill: "#6366f1" },
        { name: "Agent (20%)", value: agentShare, fill: "#f59e0b" },
        { name: "Company (70%)", value: companyShare, fill: "#22c55e" },
    ];

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading revenue...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Revenue & Financials</h1>
                    <p className="text-sm text-gray-500 mt-1">Platform financial overview and commission breakdown</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium shadow-sm disabled:opacity-50"
                    >
                        <FaSync className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg">
                        <FaExchangeAlt className="text-indigo-600" />
                        <span className="text-sm text-indigo-700 font-medium">Split: Platform 10% | Agent 20% | Company 70%</span>
                    </div>
                </div>
            </div>

            {/* Revenue Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <RevenueCard
                    icon={FaRupeeSign}
                    title="Total Revenue"
                    value={`₹${totalRevenue.toLocaleString()}`}
                    subtitle={`${totalOrders} orders processed`}
                    gradient="from-emerald-500 to-emerald-600"
                />
                <RevenueCard
                    icon={FaPercent}
                    title="Platform Commission"
                    value={`₹${platformCommission.toLocaleString()}`}
                    subtitle="10% of all transactions"
                    gradient="from-indigo-500 to-indigo-600"
                    badge="10%"
                />
                <RevenueCard
                    icon={FaChartPie}
                    title="Avg Order Value"
                    value={`₹${avgOrderValue.toFixed(0)}`}
                    subtitle={`${deliveredOrders} delivered`}
                    gradient="from-orange-500 to-orange-600"
                />
                <RevenueCard
                    icon={FaBuilding}
                    title="Active Companies"
                    value={companies.length}
                    subtitle={`${companiesWithRevenue.length} with revenue`}
                    gradient="from-purple-500 to-purple-600"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend - Composed Chart */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <FaChartLine className="text-emerald-500" /> Revenue Trend
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">Total revenue and commission over time</p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={revenueTrend}>
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
                                <Tooltip
                                    formatter={(value) => [`₹${Number(value).toLocaleString()}`, ""]}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    name="Total Revenue"
                                    fill="url(#revenueGradient)"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                />
                                <Bar dataKey="commission" name="Platform (10%)" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Commission Split - Donut Chart */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <FaChartPie className="text-indigo-500" /> Commission Split
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">How revenue is distributed (₹{totalRevenue.toLocaleString()} total)</p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={commissionSplit}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ₹${value.toLocaleString()}`}
                                    labelLine={true}
                                >
                                    {commissionSplit.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, ""]} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Legend below chart */}
                    <div className="flex justify-center gap-6 mt-2">
                        {commissionSplit.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></div>
                                <span className="text-xs text-gray-600">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Revenue by Company */}
            {companiesWithRevenue.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <FaBuilding className="text-purple-500" /> Revenue by Company
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">Comparison of company earnings</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={companiesWithRevenue} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis type="number" stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                                <YAxis dataKey="shortName" type="category" stroke="#9ca3af" fontSize={11} width={100} />
                                <Tooltip
                                    formatter={(value, name) => [`₹${Number(value).toLocaleString()}`, name === "revenue" ? "Revenue" : name]}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                />
                                <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                                    {companiesWithRevenue.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Top Companies Table */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaTrophy className="text-yellow-500" /> Top Performing Companies
                </h3>
                {topCompanies.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <FaBuilding className="text-4xl mx-auto mb-2 opacity-30" />
                        <p>No companies registered yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Order</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Platform Cut (10%)</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Company Gets (70%)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {topCompanies.map((company, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${idx === 0 ? "bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900" :
                                                idx === 1 ? "bg-gradient-to-br from-gray-200 to-gray-400 text-gray-700" :
                                                    idx === 2 ? "bg-gradient-to-br from-orange-200 to-orange-400 text-orange-800" :
                                                        "bg-gray-100 text-gray-600"
                                                }`}>
                                                {idx + 1}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{company.name}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right">
                                            <span className="text-lg font-bold text-gray-900">₹{company.revenue.toLocaleString()}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                                            {company.orders}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                                            ₹{company.avgOrder.toFixed(0)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-medium text-indigo-600">₹{(company.revenue * 0.10).toLocaleString()}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-medium text-green-600">₹{(company.revenue * 0.70).toLocaleString()}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {/* Table Footer with Totals */}
                            <tfoot className="bg-gray-100">
                                <tr className="font-semibold">
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3 text-gray-900">Total</td>
                                    <td className="px-4 py-3 text-right text-gray-900">₹{totalRevenue.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-gray-600">{topCompanies.reduce((sum, c) => sum + c.orders, 0)}</td>
                                    <td className="px-4 py-3 text-right text-gray-600">-</td>
                                    <td className="px-4 py-3 text-right text-indigo-600">₹{(totalRevenue * 0.10).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-green-600">₹{(totalRevenue * 0.70).toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function RevenueCard({ icon: Icon, title, value, subtitle, gradient, badge }) {
    return (
        <div className={`bg-gradient-to-r ${gradient} rounded-xl p-6 text-white shadow-lg relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-4 -mb-4"></div>
            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <Icon className="text-xl" />
                    </div>
                    {badge && (
                        <span className="text-xs bg-white/30 px-2 py-1 rounded-full font-medium">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="text-3xl font-bold">{value}</p>
                <p className="text-sm opacity-80 mt-1">{title}</p>
                {subtitle && <p className="text-xs opacity-60 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}
