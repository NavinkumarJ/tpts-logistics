import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaHistory, FaUser, FaBuilding, FaShieldAlt, FaSearch, FaChevronLeft, FaChevronRight,
    FaCog, FaFlag, FaUserShield, FaCalendarAlt, FaDownload, FaSync
} from "react-icons/fa";
import { getAdminLogs } from "../../services/adminService";

const TYPE_CONFIG = {
    COMPANY: { icon: FaBuilding, color: "bg-purple-100 text-purple-700", borderColor: "border-l-purple-500", label: "Company" },
    USER: { icon: FaUser, color: "bg-blue-100 text-blue-700", borderColor: "border-l-blue-500", label: "User" },
    SETTINGS: { icon: FaCog, color: "bg-orange-100 text-orange-700", borderColor: "border-l-orange-500", label: "Settings" },
    MODERATION: { icon: FaFlag, color: "bg-red-100 text-red-700", borderColor: "border-l-red-500", label: "Moderation" },
    ADMIN: { icon: FaUserShield, color: "bg-slate-100 text-slate-700", borderColor: "border-l-slate-500", label: "Admin" },
    SYSTEM: { icon: FaHistory, color: "bg-gray-100 text-gray-700", borderColor: "border-l-gray-400", label: "System" },
};

const ITEMS_PER_PAGE = 10;

export default function AdminLogsPage() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchQuery]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await getAdminLogs(filter !== "all" ? filter : null, 200, null);
            const mapped = (data || []).map(log => ({
                id: log.id,
                action: log.action,
                user: log.userEmail || "system",
                target: log.targetName || "-",
                type: log.actionType || "SYSTEM",
                timestamp: log.createdAt,
            }));
            setLogs(mapped);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                console.error("Failed to load logs:", err);
                setLogs([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.user.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedLogs = filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Calculate stats
    const stats = {
        total: logs.length,
        today: logs.filter(l => {
            const logDate = new Date(l.timestamp).toDateString();
            return logDate === new Date().toDateString();
        }).length,
        byType: Object.keys(TYPE_CONFIG).reduce((acc, type) => {
            acc[type] = logs.filter(l => l.type === type).length;
            return acc;
        }, {}),
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        if (diffMins < 2880) return "Yesterday";
        return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
    };

    const formatFullDate = (timestamp) => {
        return new Date(timestamp).toLocaleString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading system logs...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
                    <p className="text-sm text-gray-500 mt-1">Audit trail of all administrative actions</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="btn-outline flex items-center gap-2 self-start"
                >
                    <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard label="Total Logs" value={stats.total} icon={FaHistory} color="bg-slate-500" />
                <StatCard label="Today" value={stats.today} icon={FaCalendarAlt} color="bg-indigo-500" />
                <StatCard label="Company" value={stats.byType.COMPANY || 0} icon={FaBuilding} color="bg-purple-500" />
                <StatCard label="User" value={stats.byType.USER || 0} icon={FaUser} color="bg-blue-500" />
                <StatCard label="Settings" value={stats.byType.SETTINGS || 0} icon={FaCog} color="bg-orange-500" />
                <StatCard label="Moderation" value={stats.byType.MODERATION || 0} icon={FaFlag} color="bg-red-500" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by action, target, or admin email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {["all", "COMPANY", "USER", "SETTINGS", "MODERATION", "ADMIN"].map((f) => {
                            const config = TYPE_CONFIG[f] || {};
                            return (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${filter === f
                                            ? "bg-slate-700 text-white shadow-md"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                >
                                    {f === "all" ? <FaHistory /> : config.icon && <config.icon />}
                                    {f === "all" ? "All" : config.label || f}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Logs List */}
            {filteredLogs.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-md border border-gray-200 text-center">
                    <FaHistory className="text-5xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Logs Found</h3>
                    <p className="text-sm text-gray-500">
                        {searchQuery ? "No logs match your search criteria" : "No system activity recorded yet"}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    {/* Timeline-style logs */}
                    <div className="divide-y divide-gray-100">
                        {paginatedLogs.map((log, index) => {
                            const config = TYPE_CONFIG[log.type] || TYPE_CONFIG.SYSTEM;
                            const TypeIcon = config.icon;

                            return (
                                <div
                                    key={log.id}
                                    className={`p-4 hover:bg-gray-50 transition border-l-4 ${config.borderColor}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                            <TypeIcon className="text-sm" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <p className="font-medium text-gray-900 text-sm">{log.action}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
                                                        {config.label || log.type}
                                                    </span>
                                                    <span className="text-xs text-gray-400" title={formatFullDate(log.timestamp)}>
                                                        {formatTimestamp(log.timestamp)}
                                                    </span>
                                                </div>
                                            </div>
                                            {log.target && log.target !== "-" && (
                                                <p className="text-xs text-gray-600 mt-1">
                                                    Target: <span className="font-medium text-gray-700">{log.target}</span>
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-1">
                                                By: <span className="font-medium">{log.user}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-gray-600">
                            Showing <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(startIndex + ITEMS_PER_PAGE, filteredLogs.length)}</span> of <span className="font-medium">{filteredLogs.length}</span> logs
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="px-2 py-1.5 rounded text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                                First
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                                <FaChevronLeft className="text-xs" /> Prev
                            </button>

                            {/* Page numbers */}
                            <div className="flex gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 rounded text-sm font-medium transition ${currentPage === pageNum
                                                    ? "bg-slate-700 text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                                Next <FaChevronRight className="text-xs" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="px-2 py-1.5 rounded text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                                Last
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Note */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-start gap-3">
                    <FaShieldAlt className="text-amber-600 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">Security & Compliance</p>
                        <p className="text-xs text-amber-700 mt-1">
                            All administrative actions are automatically recorded for audit purposes. Logs are retained for 90 days.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color }) {
    return (
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-white`}>
                    <Icon className="text-sm" />
                </div>
                <div>
                    <p className="text-lg font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                </div>
            </div>
        </div>
    );
}
