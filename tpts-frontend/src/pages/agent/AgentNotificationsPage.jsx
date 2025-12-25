import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAgentNotifications, markNotificationRead, markAllNotificationsRead } from "../../services/agentService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaBell, FaBox, FaTruck, FaCheck, FaCheckDouble, FaStar, FaWallet, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Pagination from "../../components/common/Pagination";

const NOTIFICATION_ICONS = {
    DELIVERY: FaTruck,
    PARCEL: FaBox,
    RATING: FaStar,
    PAYMENT: FaWallet,
    DEFAULT: FaBell,
};

const NOTIFICATION_COLORS = {
    DELIVERY: "bg-orange-100 text-orange-600",
    PARCEL: "bg-indigo-100 text-indigo-600",
    RATING: "bg-yellow-100 text-yellow-600",
    PAYMENT: "bg-green-100 text-green-600",
    DEFAULT: "bg-gray-100 text-gray-600",
};

const ITEMS_PER_PAGE = 8;

export default function AgentNotificationsPage() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchNotifications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await getAgentNotifications();
            setNotifications(data || []);
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

    const handleMarkRead = async (notificationId) => {
        try {
            await markNotificationRead(notificationId);
            setNotifications(notifications.map(n =>
                n.id === notificationId ? { ...n, isRead: true } : n
            ));
        } catch {
            toast.error("Failed to mark as read");
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            toast.success("All notifications marked as read");
        } catch {
            toast.error("Failed to mark all as read");
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === "all") return true;
        if (filter === "unread") return !n.isRead;
        return true;
    });

    // Pagination calculations
    const totalItems = filteredNotifications.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading notifications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium flex items-center gap-2 transition shadow-sm"
                    >
                        <FaCheckDouble className="text-orange-500" /> Mark All Read
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => setFilter("all")}
                    className={`p-4 rounded-xl border-2 transition-all ${filter === "all"
                        ? "border-orange-500 bg-orange-50 shadow-md"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${filter === "all" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
                            }`}>
                            <FaBell className="text-xl" />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
                            <p className="text-sm text-gray-500">All Notifications</p>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setFilter("unread")}
                    className={`p-4 rounded-xl border-2 transition-all ${filter === "unread"
                        ? "border-orange-500 bg-orange-50 shadow-md"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${filter === "unread" ? "bg-orange-500 text-white" : "bg-blue-100 text-blue-600"
                            }`}>
                            <FaCheckDouble className="text-xl" />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">{unreadCount}</p>
                            <p className="text-sm text-gray-500">Unread</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-md border border-gray-200 text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <FaBell className="text-4xl text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h3>
                    <p className="text-sm text-gray-500">
                        {filter === "unread" ? "No unread notifications" : "You're all caught up!"}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {paginatedNotifications.map((notification) => {
                        const IconComponent = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.DEFAULT;
                        const colorClass = NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.DEFAULT;

                        return (
                            <div
                                key={notification.id}
                                className={`bg-white rounded-xl p-5 shadow-md border transition hover:shadow-lg ${notification.isRead
                                    ? "border-gray-200"
                                    : "border-l-4 border-l-orange-500 border-t border-r border-b border-gray-200 bg-orange-50/30"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                            <IconComponent className="text-xl" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={`font-semibold ${notification.isRead ? "text-gray-700" : "text-gray-900"}`}>
                                                {notification.title}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                                <span className={`w-2 h-2 rounded-full ${notification.isRead ? "bg-gray-300" : "bg-orange-500"}`}></span>
                                                {new Date(notification.createdAt).toLocaleString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    {!notification.isRead && (
                                        <button
                                            onClick={() => handleMarkRead(notification.id)}
                                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 p-2 rounded-lg transition"
                                            title="Mark as read"
                                        >
                                            <FaCheck />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
            )}
        </div>
    );
}
