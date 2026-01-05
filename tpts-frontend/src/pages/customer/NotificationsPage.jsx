import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getInAppNotifications, markAsRead, markAllAsRead, getUnreadCount } from "../../services/notificationService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import Pagination from "../../components/common/Pagination";
import {
    FaBell, FaCheck, FaCheckDouble, FaBox, FaTruck,
    FaCreditCard, FaInfoCircle, FaExclamationTriangle, FaSync
} from "react-icons/fa";

const NOTIFICATION_TYPES = {
    PARCEL_CREATED: { icon: FaBox, color: "text-blue-400", bg: "bg-blue-500/20", emoji: "📦" },
    PARCEL_PICKED_UP: { icon: FaTruck, color: "text-orange-400", bg: "bg-orange-500/20", emoji: "🚚" },
    PARCEL_IN_TRANSIT: { icon: FaTruck, color: "text-indigo-400", bg: "bg-indigo-500/20", emoji: "🛣️" },
    PARCEL_OUT_FOR_DELIVERY: { icon: FaTruck, color: "text-purple-400", bg: "bg-purple-500/20", emoji: "📍" },
    PARCEL_DELIVERED: { icon: FaCheck, color: "text-green-400", bg: "bg-green-500/20", emoji: "✅" },
    PAYMENT_SUCCESS: { icon: FaCreditCard, color: "text-green-400", bg: "bg-green-500/20", emoji: "💳" },
    PAYMENT_FAILED: { icon: FaExclamationTriangle, color: "text-red-400", bg: "bg-red-500/20", emoji: "⚠️" },
    INFO: { icon: FaInfoCircle, color: "text-white/60", bg: "bg-white/10", emoji: "ℹ️" },
};

const ITEMS_PER_PAGE = 8;

export default function NotificationsPage() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchNotifications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await getInAppNotifications();
            setNotifications(data || []);

            const count = await getUnreadCount();
            setUnreadCount(count || 0);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load notifications");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchNotifications();
        setIsRefreshing(false);
        toast.success("Notifications refreshed");
    };

    const handleMarkRead = async (id) => {
        try {
            await markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch {
            toast.error("Failed to mark as read");
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllAsRead();
            setNotifications(prev =>
                prev.map(n => ({ ...n, isRead: true }))
            );
            setUnreadCount(0);
            toast.success("All notifications marked as read");
        } catch {
            toast.error("Failed to mark all as read");
        }
    };

    const getNotificationConfig = (type) => {
        return NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.INFO;
    };

    const formatTime = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return "Just now";
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

        return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    };

    const filteredNotifications = filter === "unread"
        ? notifications.filter(n => !n.isRead)
        : notifications;

    // Pagination
    const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                    <p className="mt-4 text-white/70 font-medium">Loading notifications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Gradient */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 text-white shadow-lg border border-white/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                            <FaBell className="text-3xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Notifications</h1>
                            <p className="text-white/80 mt-1">
                                {notifications.length} total • {unreadCount} unread
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl flex items-center gap-2 font-medium transition"
                        >
                            <FaSync className={isRefreshing ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl flex items-center gap-2 font-medium transition"
                            >
                                <FaCheckDouble />
                                Mark All Read
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Cards as Filters */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => setFilter("all")}
                    className={`p-5 rounded-xl border-2 transition text-left ${filter === "all"
                        ? "bg-indigo-500/20 border-indigo-500"
                        : "bg-white/10 border-white/20 hover:border-indigo-400/50"
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${filter === "all" ? "bg-primary-500/30" : "bg-white/10"}`}>
                            <span className="text-2xl">📬</span>
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${filter === "all" ? "text-primary-400" : "text-white"}`}>
                                {notifications.length}
                            </p>
                            <p className="text-sm text-white/60">All Notifications</p>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setFilter("unread")}
                    className={`p-5 rounded-xl border-2 transition text-left ${filter === "unread"
                        ? "bg-orange-500/20 border-orange-500"
                        : "bg-white/10 border-white/20 hover:border-orange-400/50"
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${filter === "unread" ? "bg-orange-500/30" : "bg-white/10"}`}>
                            <span className="text-2xl">🔔</span>
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${filter === "unread" ? "text-orange-400" : "text-white"}`}>
                                {unreadCount}
                            </p>
                            <p className="text-sm text-white/60">Unread</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 border border-white/20 text-center">
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                        <FaBell className="text-4xl text-white/40" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Notifications</h3>
                    <p className="text-white/60">
                        {filter === "unread" ? "You have no unread notifications" : "You're all caught up!"}
                    </p>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {paginatedNotifications.map((notification) => {
                            const config = getNotificationConfig(notification.type);
                            return (
                                <div
                                    key={notification.id}
                                    onClick={() => !notification.isRead && handleMarkRead(notification.id)}
                                    className={`bg-white/10 backdrop-blur-xl rounded-xl border overflow-hidden cursor-pointer transition hover:bg-white/15 group ${notification.isRead
                                        ? "border-white/10"
                                        : "border-l-4 border-l-indigo-500 border-t-white/10 border-r-white/10 border-b-white/10"
                                        }`}
                                >
                                    <div className="p-4">
                                        <div className="flex items-start gap-4">
                                            {/* Icon */}
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.bg} flex-shrink-0`}>
                                                <span className="text-xl">{config.emoji}</span>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={`font-semibold ${notification.isRead ? "text-white/70" : "text-white"}`}>
                                                            {notification.title}
                                                        </h4>
                                                        {!notification.isRead && (
                                                            <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-400 text-xs font-medium rounded-full border border-indigo-500/30">
                                                                New
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-white/40 whitespace-nowrap ml-2 flex-shrink-0">
                                                        {formatTime(notification.createdAt)}
                                                    </span>
                                                </div>
                                                <p className={`text-sm ${notification.isRead ? "text-white/50" : "text-white/70"}`}>
                                                    {notification.message}
                                                </p>
                                                {notification.link && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(notification.link);
                                                        }}
                                                        className="text-sm text-indigo-400 hover:text-indigo-300 font-medium mt-2 inline-flex items-center gap-1 group-hover:underline"
                                                    >
                                                        View details →
                                                    </button>
                                                )}
                                            </div>

                                            {/* Status indicator */}
                                            {!notification.isRead && (
                                                <div className="w-3 h-3 rounded-full bg-indigo-500 flex-shrink-0 mt-1 animate-pulse"></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={filteredNotifications.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                        />
                    )}
                </>
            )}
        </div>
    );
}
