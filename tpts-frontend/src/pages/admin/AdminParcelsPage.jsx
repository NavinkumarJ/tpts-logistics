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
    pending: { label: "Pending", color: "#f59e0b", bgColor: "bg-yellow-50", textColor: "text-yellow-600", icon: FaClock },
    confirmed: { label: "Confirmed", color: "#3b82f6", bgColor: "bg-blue-50", textColor: "text-blue-600", icon: FaCheckCircle },
    inTransit: { label: "In Transit", color: "#f97316", bgColor: "bg-orange-50", textColor: "text-orange-600", icon: FaTruck },
    delivered: { label: "Delivered", color: "#22c55e", bgColor: "bg-green-50", textColor: "text-green-600", icon: FaCheckCircle },
    cancelled: { label: "Cancelled", color: "#ef4444", bgColor: "bg-red-50", textColor: "text-red-600", icon: FaTimesCircle },
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
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading parcel data...</p>
            </div>
        );
    }

    // Use REAL data from backend
    const totalParcels = stats?.totalParcels || 0;
    const deliveredParcels = stats?.deliveredParcels || 0;
    const pendingParcels = stats?.pendingParcels || 0;
    const inTransitParcels = stats?.inTransitParcels || 0;
    const confirmedParcels = totalParcels - deliveredParcels - pendingParcels - inTransitParcels;

    // Calculate real completion rate
    const completionRate = totalParcels > 0 ? Math.round((deliveredParcels / totalParcels) * 100) : 0;
    const inProgressCount = pendingParcels + inTransitParcels + (confirmedParcels > 0 ? confirmedParcels : 0);

    // Status data for pie chart
    const statusData = [
        { name: "Pending", value: pendingParcels, color: STATUS_CONFIG.pending.color },
        { name: "In Transit", value: inTransitParcels, color: STATUS_CONFIG.inTransit.color },
        { name: "Delivered", value: deliveredParcels, color: STATUS_CONFIG.delivered.color },
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
                    <h1 className="text-3xl font-bold text-gray-900">Platform Parcels</h1>
                    <p className="text-sm text-gray-500 mt-1">Real-time overview of all parcels across the platform</p>
                </div>
                <button
                    onClick={fetchData}
                    className="btn-outline flex items-center gap-2 self-start"
                >
                    <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Parcels"
                    value={totalParcels}
                    icon={FaBox}
                    gradient="from-indigo-500 to-indigo-600"
                    subtitle={`Across ${companies.length} companies`}
                />
                <StatCard
                    title="Delivered"
                    value={deliveredParcels}
                    icon={FaCheckCircle}
                    gradient="from-emerald-500 to-emerald-600"
                    subtitle="Successfully completed"
                />
                <StatCard
                    title="In Progress"
                    value={inProgressCount}
                    icon={FaTruck}
                    gradient="from-orange-500 to-orange-600"
                    subtitle={`${pendingParcels} pending, ${inTransitParcels} in transit`}
                />
                <StatCard
                    title="Completion Rate"
                    value={`${completionRate}%`}
                    icon={FaPercentage}
                    gradient="from-purple-500 to-purple-600"
                    subtitle={totalParcels > 0 ? `${deliveredParcels}/${totalParcels} parcels` : "No parcels yet"}
                    highlight={completionRate >= 80}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution Pie Chart */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Parcel Status Distribution</h3>
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
                                        <Tooltip formatter={(value) => [value, "Parcels"]} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-6 mt-4">
                                {statusData.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                        <span className="text-sm text-gray-600">{item.name}: <strong>{item.value}</strong></span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-56 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <FaBox className="text-4xl mx-auto mb-2" />
                                <p>No parcels data yet</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Company Deliveries Bar Chart */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Deliveries by Company</h3>
                    {companyParcels.length > 0 ? (
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={companyParcels} layout="vertical" margin={{ left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis type="number" stroke="#9ca3af" fontSize={11} />
                                    <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={11} width={100} />
                                    <Tooltip
                                        formatter={(value, name, props) => [value, "Deliveries"]}
                                        labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
                                    />
                                    <Bar dataKey="deliveries" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-56 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <FaBuilding className="text-4xl mx-auto mb-2" />
                                <p>No deliveries recorded yet</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Status Breakdown */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Status Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatusCard
                        label="Pending"
                        count={pendingParcels}
                        icon={FaClock}
                        config={STATUS_CONFIG.pending}
                    />
                    <StatusCard
                        label="In Transit"
                        count={inTransitParcels}
                        icon={FaTruck}
                        config={STATUS_CONFIG.inTransit}
                    />
                    <StatusCard
                        label="Delivered"
                        count={deliveredParcels}
                        icon={FaCheckCircle}
                        config={STATUS_CONFIG.delivered}
                    />
                    <StatusCard
                        label="Success Rate"
                        count={`${completionRate}%`}
                        icon={FaChartBar}
                        config={{ bgColor: "bg-purple-50", textColor: "text-purple-600" }}
                        isPercentage
                    />
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Overall Progress</span>
                        <span className="font-medium text-gray-900">{completionRate}% Complete</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                            style={{ width: `${completionRate}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{deliveredParcels} delivered</span>
                        <span>{inProgressCount} in progress</span>
                    </div>
                </div>
            </div>

            {/* Companies with Active Parcels */}
            {companies.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Companies</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Deliveries</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {companies.slice(0, 5).map((company, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                                    <FaBuilding className="text-indigo-600 text-sm" />
                                                </div>
                                                <span className="font-medium text-gray-900">{company.companyName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <FaMapMarkerAlt className="text-gray-400 text-xs" />
                                                {company.city || "N/A"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="font-semibold text-gray-900">{company.totalDeliveries || 0}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-green-600 font-medium">₹{(Number(company.totalRevenue) || 0).toLocaleString()}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Info Note */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FaChartBar className="text-blue-600" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-blue-800 mb-1">Parcel Analytics</h4>
                        <p className="text-sm text-blue-700">
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
        <div className={`bg-gradient-to-r ${gradient} rounded-xl p-5 text-white shadow-lg relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-6 -mt-6"></div>
            <div className="relative">
                <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <Icon className="text-lg" />
                    </div>
                    {highlight && (
                        <span className="text-xs bg-white/30 px-2 py-1 rounded-full font-medium">
                            ✓ Good
                        </span>
                    )}
                </div>
                <p className="text-3xl font-bold mt-2">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                <p className="text-sm opacity-90 mt-1">{title}</p>
                {subtitle && <p className="text-xs opacity-70 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}

function StatusCard({ label, count, icon: Icon, config, isPercentage = false }) {
    return (
        <div className={`${config.bgColor} rounded-xl p-5 text-center transition hover:shadow-md`}>
            <div className={`w-12 h-12 rounded-full ${config.bgColor} border-2 border-current ${config.textColor} flex items-center justify-center mx-auto mb-3`}>
                <Icon className="text-xl" />
            </div>
            <p className={`text-2xl font-bold ${config.textColor}`}>
                {isPercentage ? count : (typeof count === 'number' ? count.toLocaleString() : count)}
            </p>
            <p className="text-xs text-gray-600 mt-1 font-medium">{label}</p>
        </div>
    );
}
