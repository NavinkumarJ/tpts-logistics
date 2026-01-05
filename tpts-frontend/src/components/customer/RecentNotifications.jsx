import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../utils/api";
import { FaBell, FaCheck, FaBox, FaTruck, FaCreditCard, FaInfoCircle } from "react-icons/fa";

const NOTIFICATION_TYPES = {
  PARCEL_CREATED: { emoji: "📦", color: "text-blue-400", bg: "bg-blue-500/20" },
  PARCEL_PICKED_UP: { emoji: "🚚", color: "text-orange-400", bg: "bg-orange-500/20" },
  PARCEL_IN_TRANSIT: { emoji: "🛣️", color: "text-indigo-400", bg: "bg-indigo-500/20" },
  PARCEL_OUT_FOR_DELIVERY: { emoji: "📍", color: "text-purple-400", bg: "bg-purple-500/20" },
  PARCEL_DELIVERED: { emoji: "✅", color: "text-green-400", bg: "bg-green-500/20" },
  PAYMENT_SUCCESS: { emoji: "💳", color: "text-green-400", bg: "bg-green-500/20" },
  PAYMENT_FAILED: { emoji: "⚠️", color: "text-red-400", bg: "bg-red-500/20" },
  INFO: { emoji: "ℹ️", color: "text-white/60", bg: "bg-white/10" },
};

export default function RecentNotifications({ customerId, limit = 5 }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        apiClient.get(`/notifications/in-app?limit=${limit}`),
        apiClient.get("/notifications/unread/count"),
      ]);
      setNotifications(notifRes.data.data || []);
      setUnreadCount(countRes.data.data || 0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await apiClient.post(`/notifications/${notificationId}/read`);
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark as read:", err);
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
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
      <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <h3 className="text-sm font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <Link
          to="/customer/notifications"
          className="text-xs font-medium text-primary-400 hover:text-primary-300 transition"
        >
          View All
        </Link>
      </div>

      <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="text-center py-6">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary-400 border-t-transparent"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
              <FaBell className="text-xl text-white/40" />
            </div>
            <p className="text-xs text-white/50">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const config = getNotificationConfig(notification.type);
            return (
              <div
                key={notification.id}
                className={`rounded-xl p-3 cursor-pointer transition border ${!notification.isRead
                  ? "bg-white/10 border-white/20 hover:bg-white/15"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg} flex-shrink-0`}>
                    <span className="text-sm">{config.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-xs font-semibold truncate ${!notification.isRead ? "text-white" : "text-white/70"}`}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary-400 flex-shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-white/60 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      {formatTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
