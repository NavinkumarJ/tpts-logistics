import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaHistory, FaUser, FaBuilding, FaShieldAlt, FaSearch, FaChevronLeft, FaChevronRight,
    FaCog, FaFlag, FaUserShield, FaCalendarAlt, FaDownload, FaSync, FaSignInAlt, FaSignOutAlt
} from "react-icons/fa";
import { getAdminLogs, getLoginActivity } from "../../services/adminService";

const TYPE_CONFIG = {
    COMPANY: { icon: FaBuilding, color: "bg-purple-500/20 text-purple-400", borderColor: "border-l-purple-500", label: "Company" },
    USER: { icon: FaUser, color: "bg-blue-500/20 text-blue-400", borderColor: "border-l-blue-500", label: "User" },
    SETTINGS: { icon: FaCog, color: "bg-orange-500/20 text-orange-400", borderColor: "border-l-orange-500", label: "Settings" },
    MODERATION: { icon: FaFlag, color: "bg-red-500/20 text-red-400", borderColor: "border-l-red-500", label: "Moderation" },
    ADMIN: { icon: FaUserShield, color: "bg-slate-500/20 text-slate-400", borderColor: "border-l-slate-500", label: "Admin" },
    SYSTEM: { icon: FaHistory, color: "bg-white/20 text-white/60", borderColor: "border-l-white/40", label: "System" },
};

const ITEMS_PER_PAGE = 10;

export default function AdminLogsPage() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loginActivity, setLoginActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState("admin"); // 'admin' or 'login'

    useEffect(() => {
        fetchLogs();
        fetchLoginActivity();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchQuery, activeTab]);

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

    const fetchLoginActivity = async () => {
        try {
            const data = await getLoginActivity(0, 100);
            setLoginActivity(data || []);
        } catch (err) {
            console.error("Failed to load login activity:", err);
            setLoginActivity([]);
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
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                <p className="mt-3 text-sm text-white/60">Loading system logs...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">System Logs</h1>
                    <p className="text-sm text-white/60 mt-1">Audit trail of all administrative actions</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition text-sm font-medium text-white self-start"
                >
                    <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {/* Tab Selector */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab("admin")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeTab === "admin"
                            ? "bg-indigo-600 text-white"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                            }`}
                    >
                        <FaHistory /> Admin Action Logs
                    </button>
                    <button
                        onClick={() => setActiveTab("login")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeTab === "login"
                            ? "bg-green-600 text-white"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                            }`}
                    >
                        <FaSignInAlt /> Login/Logout Activity
                    </button>
                </div>
            </div>

            {/* Stats Cards - Only show for admin logs tab */}
            {activeTab === "admin" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Total Logs" value={stats.total} icon={FaHistory} color="bg-slate-500" />
                    <StatCard label="Today" value={stats.today} icon={FaCalendarAlt} color="bg-indigo-500" />
                    <StatCard label="Company" value={stats.byType.COMPANY || 0} icon={FaBuilding} color="bg-purple-500" />
                    <StatCard label="User" value={stats.byType.USER || 0} icon={FaUser} color="bg-blue-500" />
                </div>
            )}

            {/* Login Activity Stats */}
            {activeTab === "login" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Total Activity" value={loginActivity.length} icon={FaHistory} color="bg-green-500" />
                    <StatCard label="Logins Today" value={loginActivity.filter(a => a.activityType === "LOGIN" && new Date(a.timestamp).toDateString() === new Date().toDateString()).length} icon={FaSignInAlt} color="bg-blue-500" />
                    <StatCard label="Logouts Today" value={loginActivity.filter(a => a.activityType === "LOGOUT" && new Date(a.timestamp).toDateString() === new Date().toDateString()).length} icon={FaSignOutAlt} color="bg-orange-500" />
                    <StatCard label="Failed Logins" value={loginActivity.filter(a => a.activityType === "LOGIN_FAILED").length} icon={FaShieldAlt} color="bg-red-500" />
                </div>
            )}

            {/* Admin Action Logs Tab Content */}
            {activeTab === "admin" && (
                <>
                    {/* Filters */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="relative flex-1">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                <input
                                    type="text"
                                    placeholder="Search by action, target, or admin email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-white/40 text-sm"
                                />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {["all", "COMPANY", "USER"].map((f) => {
                                    const config = TYPE_CONFIG[f] || {};
                                    return (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={`px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${filter === f
                                                ? "bg-indigo-600 text-white"
                                                : "bg-white/10 text-white/70 hover:bg-white/20 border border-white/20"
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
                        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-12 border border-white/20 text-center">
                            <FaHistory className="text-5xl text-white/30 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-white mb-2">No Logs Found</h3>
                            <p className="text-sm text-white/50">
                                {searchQuery ? "No logs match your search criteria" : "No system activity recorded yet"}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden">
                            <div className="divide-y divide-white/10">
                                {paginatedLogs.map((log, index) => {
                                    const config = TYPE_CONFIG[log.type] || TYPE_CONFIG.SYSTEM;
                                    const TypeIcon = config.icon;
                                    return (
                                        <div key={log.id} className={`p-4 hover:bg-white/5 transition border-l-4 ${config.borderColor}`}>
                                            <div className="flex items-start gap-4">
                                                <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center flex-shrink-0`}>
                                                    <TypeIcon className="text-sm" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                                        <p className="font-medium text-white text-sm">{log.action}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
                                                                {config.label || log.type}
                                                            </span>
                                                            <span className="text-xs text-white/40" title={formatFullDate(log.timestamp)}>
                                                                {formatTimestamp(log.timestamp)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {log.target && log.target !== "-" && (
                                                        <p className="text-xs text-white/60 mt-1">
                                                            Target: <span className="font-medium text-white/80">{log.target}</span>
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-white/50 mt-1">
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
                </>
            )
            }

            {/* Login Activity Tab Content */}
            {
                activeTab === "login" && (
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <FaSignInAlt className="text-green-400" />
                                User Login/Logout Activity
                            </h3>
                            <p className="text-sm text-white/50 mt-1">Track all user login and logout events across the platform</p>
                        </div>
                        {loginActivity.length === 0 ? (
                            <div className="p-12 text-center">
                                <FaSignInAlt className="text-5xl text-white/30 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-white mb-2">No Login Activity</h3>
                                <p className="text-sm text-white/50">Login activity will appear here once users start logging in</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/10 max-h-[600px] overflow-y-auto">
                                {loginActivity.map((activity) => {
                                    const isLogin = activity.activityType === "LOGIN";
                                    const isLogout = activity.activityType === "LOGOUT";
                                    const isFailed = activity.activityType === "LOGIN_FAILED";

                                    const iconConfig = isFailed
                                        ? { icon: FaShieldAlt, color: "bg-red-500/20 text-red-400", borderColor: "border-l-red-500" }
                                        : isLogout
                                            ? { icon: FaSignOutAlt, color: "bg-orange-500/20 text-orange-400", borderColor: "border-l-orange-500" }
                                            : { icon: FaSignInAlt, color: "bg-green-500/20 text-green-400", borderColor: "border-l-green-500" };

                                    const ActivityIcon = iconConfig.icon;

                                    return (
                                        <div key={activity.id} className={`p-4 hover:bg-white/5 transition border-l-4 ${iconConfig.borderColor}`}>
                                            <div className="flex items-start gap-4">
                                                <div className={`w-10 h-10 rounded-full ${iconConfig.color} flex items-center justify-center flex-shrink-0`}>
                                                    <ActivityIcon className="text-sm" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <p className="font-medium text-white text-sm">
                                                                {activity.userName || activity.userEmail}
                                                            </p>
                                                            <p className="text-xs text-white/50">{activity.userEmail}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${isFailed ? "bg-red-500/20 text-red-400" :
                                                                isLogout ? "bg-orange-500/20 text-orange-400" :
                                                                    "bg-green-500/20 text-green-400"
                                                                }`}>
                                                                {activity.activityType?.replace("_", " ") || "UNKNOWN"}
                                                            </span>
                                                            {activity.userType && (
                                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/70">
                                                                    {activity.userType?.replace("_", " ")}
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-white/40" title={formatFullDate(activity.timestamp)}>
                                                                {formatTimestamp(activity.timestamp)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-white/50 mt-1">
                                                        {formatFullDate(activity.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )
            }

            {/* Pagination */}
            {
                totalPages > 1 && (
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-white/60">
                                Showing <span className="font-medium text-white">{startIndex + 1}</span> - <span className="font-medium text-white">{Math.min(startIndex + ITEMS_PER_PAGE, filteredLogs.length)}</span> of <span className="font-medium text-white">{filteredLogs.length}</span> logs
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="px-2 py-1.5 rounded text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 text-white/70 hover:bg-white/20 border border-white/20"
                                >
                                    First
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 text-white/70 hover:bg-white/20 border border-white/20"
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
                                                    ? "bg-indigo-600 text-white"
                                                    : "bg-white/10 text-white/70 hover:bg-white/20 border border-white/20"
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
                                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 text-white/70 hover:bg-white/20 border border-white/20"
                                >
                                    Next <FaChevronRight className="text-xs" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="px-2 py-1.5 rounded text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 text-white/70 hover:bg-white/20 border border-white/20"
                                >
                                    Last
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Info Note */}
            <div className="bg-yellow-500/20 backdrop-blur-xl rounded-xl p-4 border border-yellow-500/30">
                <div className="flex items-start gap-3">
                    <FaShieldAlt className="text-yellow-400 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-yellow-400">Security & Compliance</p>
                        <p className="text-xs text-white/70 mt-1">
                            All administrative actions are automatically recorded for audit purposes. Logs are retained for 90 days.
                        </p>
                    </div>
                </div>
            </div>
        </div >
    );
}

function StatCard({ label, value, icon: Icon, color }) {
    return (
        <div className="bg-white/10 backdrop-blur-xl rounded-lg p-3 border border-white/20">
            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-white`}>
                    <Icon className="text-sm" />
                </div>
                <div>
                    <p className="text-lg font-bold text-white">{value}</p>
                    <p className="text-xs text-white/50">{label}</p>
                </div>
            </div>
        </div>
    );
}
