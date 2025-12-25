import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyNotifications, markAsRead, markAllAsRead, getUnreadCount } from "../../services/notificationService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import Pagination from "../../components/common/Pagination";
import {
    FaBell, FaCheck, FaCheckDouble, FaBox, FaTruck,
    FaCreditCard, FaInfoCircle, FaExclamationTriangle, FaSync
} from "react-icons/fa";

const NOTIFICATION_TYPES = {
    PARCEL_CREATED: { icon: FaBox, color: "text-blue-600", bg: "bg-blue-100", emoji: "📦" },
    PARCEL_PICKED_UP: { icon: FaTruck, color: "text-orange-600", bg: "bg-orange-100", emoji: "🚚" },
    PARCEL_IN_TRANSIT: { icon: FaTruck, color: "text-indigo-600", bg: "bg-indigo-100", emoji: "🛣️" },
    PARCEL_OUT_FOR_DELIVERY: { icon: FaTruck, color: "text-purple-600", bg: "bg-purple-100", emoji: "📍" },
    PARCEL_DELIVERED: { icon: FaCheck, color: "text-green-600", bg: "bg-green-100", emoji: "✅" },
    PAYMENT_SUCCESS: { icon: FaCreditCard, color: "text-green-600", bg: "bg-green-100", emoji: "💳" },
    PAYMENT_FAILED: { icon: FaExclamationTriangle, color: "text-red-600", bg: "bg-red-100", emoji: "⚠️" },
    INFO: { icon: FaInfoCircle, color: "text-gray-600", bg: "bg-gray-100", emoji: "ℹ️" },
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
            const data = await getMyNotifications();
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
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading notifications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-primary-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
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
                                className="px-4 py-2 bg-white text-primary-600 hover:bg-white/90 rounded-xl flex items-center gap-2 font-medium transition"
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
                        ? "bg-primary-50 border-primary-500 shadow-md"
                        : "bg-white border-gray-200 hover:border-primary-300"
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${filter === "all" ? "bg-primary-100" : "bg-gray-100"}`}>
                            <span className="text-2xl">📬</span>
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${filter === "all" ? "text-primary-700" : "text-gray-900"}`}>
                                {notifications.length}
                            </p>
                            <p className="text-sm text-gray-500">All Notifications</p>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setFilter("unread")}
                    className={`p-5 rounded-xl border-2 transition text-left ${filter === "unread"
                        ? "bg-orange-50 border-orange-500 shadow-md"
                        : "bg-white border-gray-200 hover:border-orange-300"
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${filter === "unread" ? "bg-orange-100" : "bg-gray-100"}`}>
                            <span className="text-2xl">🔔</span>
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${filter === "unread" ? "text-orange-700" : "text-gray-900"}`}>
                                {unreadCount}
                            </p>
                            <p className="text-sm text-gray-500">Unread</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 shadow-md border border-gray-200 text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <FaBell className="text-4xl text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Notifications</h3>
                    <p className="text-gray-500">
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
                                    className={`bg-white rounded-xl shadow-sm border overflow-hidden cursor-pointer transition hover:shadow-md group ${notification.isRead
                                        ? "border-gray-200"
                                        : "border-l-4 border-l-primary-500 border-t-gray-200 border-r-gray-200 border-b-gray-200"
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
                                                        <h4 className={`font-semibold ${notification.isRead ? "text-gray-700" : "text-gray-900"}`}>
                                                            {notification.title}
                                                        </h4>
                                                        {!notification.isRead && (
                                                            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                                                                New
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2 flex-shrink-0">
                                                        {formatTime(notification.createdAt)}
                                                    </span>
                                                </div>
                                                <p className={`text-sm ${notification.isRead ? "text-gray-500" : "text-gray-600"}`}>
                                                    {notification.message}
                                                </p>
                                                {notification.link && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(notification.link);
                                                        }}
                                                        className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-2 inline-flex items-center gap-1 group-hover:underline"
                                                    >
                                                        View details →
                                                    </button>
                                                )}
                                            </div>

                                            {/* Status indicator */}
                                            {!notification.isRead && (
                                                <div className="w-3 h-3 rounded-full bg-primary-500 flex-shrink-0 mt-1 animate-pulse"></div>
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
