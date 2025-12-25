import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaBell, FaCheckCircle, FaBuilding, FaExclamationTriangle, FaInfoCircle,
    FaCheck, FaChevronLeft, FaChevronRight, FaTruck, FaCreditCard,
    FaCheckDouble, FaFilter, FaClock, FaEye
} from "react-icons/fa";
import { getAdminNotifications, markNotificationRead } from "../../services/adminService";

const TYPE_CONFIG = {
    COMPANY: { icon: FaBuilding, color: "bg-purple-100 text-purple-600", borderColor: "border-l-purple-500", bgHover: "hover:bg-purple-50" },
    ALERT: { icon: FaExclamationTriangle, color: "bg-red-100 text-red-600", borderColor: "border-l-red-500", bgHover: "hover:bg-red-50" },
    MODERATION: { icon: FaExclamationTriangle, color: "bg-orange-100 text-orange-600", borderColor: "border-l-orange-500", bgHover: "hover:bg-orange-50" },
    INFO: { icon: FaInfoCircle, color: "bg-blue-100 text-blue-600", borderColor: "border-l-blue-500", bgHover: "hover:bg-blue-50" },
    SUCCESS: { icon: FaCheckCircle, color: "bg-green-100 text-green-600", borderColor: "border-l-green-500", bgHover: "hover:bg-green-50" },
    PARCEL_CREATED: { icon: FaTruck, color: "bg-indigo-100 text-indigo-600", borderColor: "border-l-indigo-500", bgHover: "hover:bg-indigo-50" },
    PARCEL_STATUS: { icon: FaTruck, color: "bg-teal-100 text-teal-600", borderColor: "border-l-teal-500", bgHover: "hover:bg-teal-50" },
    PAYMENT: { icon: FaCreditCard, color: "bg-emerald-100 text-emerald-600", borderColor: "border-l-emerald-500", bgHover: "hover:bg-emerald-50" },
    SYSTEM_ALERT: { icon: FaBell, color: "bg-gray-100 text-gray-600", borderColor: "border-l-gray-400", bgHover: "hover:bg-gray-50" },
};

const ITEMS_PER_PAGE = 15;

export default function AdminNotificationsPage() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [markingAll, setMarkingAll] = useState(false);

    useEffect(() => {
        fetchNotifications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await getAdminNotifications(200);
            const mapped = (data || []).map(n => ({
                id: n.id,
                type: n.type || "INFO",
                title: n.title,
                message: n.message,
                isRead: n.isRead,
                timestamp: n.createdAt,
            }));
            setNotifications(mapped);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                console.error("Failed to load notifications:", err);
                setNotifications([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await markNotificationRead(id);
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, isRead: true } : n
            ));
            toast.success("Marked as read");
        } catch {
            toast.error("Failed to mark as read");
        }
    };

    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        const unread = notifications.filter(n => !n.isRead);
        let successCount = 0;

        for (const n of unread) {
            try {
                await markNotificationRead(n.id);
                successCount++;
            } catch {
                // Continue with others
            }
        }

        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        toast.success(`${successCount} notifications marked as read`);
        setMarkingAll(false);
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === "unread") return !n.isRead;
        return true;
    });

    const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const totalCount = notifications.length;

    // Group notifications by date
    const groupedByDate = paginatedNotifications.reduce((groups, notification) => {
        const date = new Date(notification.timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let dateKey;
        if (date.toDateString() === today.toDateString()) {
            dateKey = "Today";
        } else if (date.toDateString() === yesterday.toDateString()) {
            dateKey = "Yesterday";
        } else {
            dateKey = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        }

        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(notification);
        return groups;
    }, {});

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading notifications...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Stats */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl p-6 text-white shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
                            <FaBell className="text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Notifications</h1>
                            <p className="text-sm text-slate-300 mt-0.5">
                                {unreadCount > 0
                                    ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                                    : "All caught up! No unread notifications."}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Stats badges */}
                        <div className="flex gap-2">
                            <span className="px-3 py-1.5 bg-white/10 rounded-full text-sm">
                                <FaEye className="inline mr-1.5" />{totalCount - unreadCount} read
                            </span>
                            {unreadCount > 0 && (
                                <span className="px-3 py-1.5 bg-blue-500 rounded-full text-sm font-medium animate-pulse">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                disabled={markingAll}
                                className="px-4 py-2 bg-white text-slate-800 rounded-lg text-sm font-medium hover:bg-gray-100 transition flex items-center gap-2 disabled:opacity-50"
                            >
                                <FaCheckDouble className={markingAll ? "animate-pulse" : ""} />
                                {markingAll ? "Marking..." : "Mark all read"}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
                <div className="flex items-center gap-3">
                    <FaFilter className="text-gray-400" />
                    <div className="flex gap-2">
                        {[
                            { key: "all", label: "All", count: totalCount },
                            { key: "unread", label: "Unread", count: unreadCount }
                        ].map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${filter === f.key
                                        ? "bg-slate-700 text-white shadow-md"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                            >
                                {f.label}
                                <span className={`px-1.5 py-0.5 rounded text-xs ${filter === f.key ? "bg-white/20" : "bg-gray-200"
                                    }`}>
                                    {f.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-md border border-gray-200 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaBell className="text-3xl text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h3>
                    <p className="text-sm text-gray-500">
                        {filter === "unread" ? "You're all caught up! No unread notifications." : "No notifications yet."}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(groupedByDate).map(([dateKey, dateNotifications]) => (
                        <div key={dateKey}>
                            {/* Date Header */}
                            <div className="flex items-center gap-2 mb-3">
                                <FaClock className="text-gray-400 text-xs" />
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{dateKey}</span>
                                <div className="flex-1 h-px bg-gray-200"></div>
                            </div>

                            {/* Notifications for this date */}
                            <div className="space-y-2">
                                {dateNotifications.map((notification) => {
                                    const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.INFO;
                                    const TypeIcon = config.icon;

                                    return (
                                        <div
                                            key={notification.id}
                                            className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 border-l-4 ${config.borderColor} ${config.bgHover} transition-all ${!notification.isRead ? "ring-1 ring-blue-100" : ""
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                                    <TypeIcon className="text-sm" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1">
                                                            <p className={`text-sm ${!notification.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                                                                {notification.title}
                                                            </p>
                                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                                                        </div>
                                                        {!notification.isRead && (
                                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5 animate-pulse"></span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between mt-3">
                                                        <span className="text-xs text-gray-400">{formatTime(notification.timestamp)}</span>
                                                        {!notification.isRead && (
                                                            <button
                                                                onClick={() => handleMarkRead(notification.id)}
                                                                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:underline"
                                                            >
                                                                <FaCheck className="text-[10px]" /> Mark as read
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-gray-600">
                            Showing <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(startIndex + ITEMS_PER_PAGE, filteredNotifications.length)}</span> of <span className="font-medium">{filteredNotifications.length}</span>
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
        </div>
    );
}
