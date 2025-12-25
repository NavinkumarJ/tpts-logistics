import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentAgent, getAgentDashboard, updateAvailability, respondToDeliveryRequest, getActiveDeliveries, getAllDeliveries } from "../../services/agentService";
import { logout } from "../../utils/auth";
import { useAgentLocationSharing } from "../../hooks/useAgentLocation";
import {
  FaTruck, FaCheckCircle, FaWallet, FaStar, FaToggleOn, FaToggleOff,
  FaMapMarkerAlt, FaArrowRight, FaBoxOpen, FaClock, FaChartLine, FaSync
} from "react-icons/fa";
import toast from "react-hot-toast";

export default function AgentDashboard() {
  const navigate = useNavigate();

  const [agent, setAgent] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggleLoading, setToggleLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Agent location sharing hook
  const {
    isSharing,
    accuracy,
    lastUpdate,
    toggleSharing,
  } = useAgentLocationSharing(agent?.id, {
    intervalMs: 15000, // Update every 15 seconds
  });

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const agentProfile = await getCurrentAgent();
      setAgent(agentProfile);

      // Fetch dashboard data, active deliveries, and all deliveries in parallel
      const [dashboard, activeDeliveriesData, allDeliveriesData] = await Promise.all([
        getAgentDashboard(),
        getActiveDeliveries(),
        getAllDeliveries()
      ]);

      // Calculate earnings directly from delivered parcels (same as earnings page)
      // Agent gets 20% commission on totalAmount (which includes GST)
      const AGENT_COMMISSION_RATE = 0.20;
      const deliveredParcels = (allDeliveriesData || []).filter(p => p.status === "DELIVERED");

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const todayDelivered = deliveredParcels.filter(p => {
        const deliveredAt = new Date(p.deliveredAt || p.updatedAt);
        return deliveredAt >= startOfDay;
      });

      const calculateEarning = (parcel) => {
        // Use totalAmount (includes GST) as the primary amount for commission calculation
        const price = parcel.finalPrice || parcel.totalAmount || parcel.basePrice || 0;
        return Number((price * AGENT_COMMISSION_RATE).toFixed(2));
      };

      const todayEarnings = todayDelivered.reduce((sum, p) => sum + calculateEarning(p), 0);
      const totalEarnings = deliveredParcels.reduce((sum, p) => sum + calculateEarning(p), 0);

      // Merge active deliveries and calculated earnings into dashboard data
      setDashboardData({
        ...dashboard,
        activeDeliveries: activeDeliveriesData || [],
        earnings: {
          todayEarnings,
          totalEarnings,
          todayDeliveries: todayDelivered.length,
          totalDeliveries: deliveredParcels.length
        },
        allDeliveries: allDeliveriesData || []
      });

      if (isRefresh) {
        toast.success("Dashboard refreshed");
      }

    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
      } else {
        setError(err.response?.data?.message || "Failed to load dashboard");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleAvailability = async () => {
    setToggleLoading(true);
    try {
      const updated = await updateAvailability(!agent.isAvailable);
      setAgent(updated);
      toast.success(agent.isAvailable ? "You are now offline" : "You are now available");
    } catch {
      toast.error("Failed to update availability");
    } finally {
      setToggleLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-md text-center">
        <p className="text-red-600 mb-4">⚠️ {error}</p>
        <button onClick={() => fetchDashboard()} className="btn-primary">Try Again</button>
      </div>
    );
  }

  const {
    stats = {},
    todayStats = {},
    earnings = {},
    activeDeliveries = [],
    pendingRequests = []
  } = dashboardData || {};

  // Map backend data to display values
  const activeDeliveriesCount = activeDeliveries?.length || stats?.pendingDeliveries || 0;
  const completedTodayCount = todayStats?.completedToday || 0;
  const todayEarningsValue = earnings?.todayEarnings || 0;
  const averageRating = stats?.ratingAvg ? parseFloat(stats.ratingAvg).toFixed(1) : (agent?.ratingAvg?.toFixed(1) || "5.0");

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
              {agent?.profilePhotoUrl ? (
                <img src={agent.profilePhotoUrl} alt={agent.fullName} className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <span className="text-3xl">🚴</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">Welcome back, {agent.fullName?.split(' ')[0]}!</h1>
              <p className="text-white/80 text-sm mt-1">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
              className="p-3 rounded-xl bg-white/20 hover:bg-white/30 transition"
            >
              <FaSync className={`${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Location Sharing Toggle */}
            <button
              onClick={toggleSharing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition ${isSharing
                ? "bg-white/30 text-white"
                : "bg-white/20 text-white/80 hover:bg-white/30"
                }`}
              title={isSharing ? `Sharing location (±${Math.round(accuracy || 0)}m)` : "Start sharing location"}
            >
              <FaMapMarkerAlt className={isSharing ? "animate-pulse" : ""} />
              <span className="hidden sm:inline">{isSharing ? "Sharing" : "Share Location"}</span>
            </button>

            {/* Availability Toggle */}
            <button
              onClick={handleToggleAvailability}
              disabled={toggleLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition ${agent.isAvailable
                ? "bg-green-400 text-green-900 hover:bg-green-300"
                : "bg-white/20 text-white hover:bg-white/30"
                }`}
            >
              {agent.isAvailable ? <FaToggleOn className="text-xl" /> : <FaToggleOff className="text-xl" />}
              {agent.isAvailable ? "Available" : "Offline"}
            </button>
          </div>
        </div>
      </div>

      {/* Location Sharing Status Bar */}
      {isSharing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <FaMapMarkerAlt className="text-blue-600 animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-blue-800">📍 Live location sharing active</p>
            <p className="text-xs text-blue-600">
              Accuracy: ±{Math.round(accuracy || 0)}m • Last update: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Starting...'}
            </p>
          </div>
          <button
            onClick={toggleSharing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Stop
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Deliveries"
          value={activeDeliveriesCount}
          icon={FaTruck}
          gradient="from-orange-400 to-orange-600"
          bgLight="bg-orange-100"
          textColor="text-orange-600"
          onClick={() => navigate('/agent/deliveries')}
        />
        <StatCard
          title="Completed Today"
          value={completedTodayCount}
          icon={FaCheckCircle}
          gradient="from-green-400 to-green-600"
          bgLight="bg-green-100"
          textColor="text-green-600"
          onClick={() => navigate('/agent/history')}
        />
        <StatCard
          title="Today's Earnings"
          value={`₹${todayEarningsValue.toLocaleString('en-IN')}`}
          icon={FaWallet}
          gradient="from-blue-400 to-blue-600"
          bgLight="bg-blue-100"
          textColor="text-blue-600"
          onClick={() => navigate('/agent/earnings')}
        />
        <StatCard
          title="Average Rating"
          value={averageRating}
          icon={FaStar}
          gradient="from-yellow-400 to-amber-500"
          bgLight="bg-yellow-100"
          textColor="text-yellow-600"
          onClick={() => navigate('/agent/ratings')}
          suffix={<FaStar className="text-yellow-400 ml-1" />}
        />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Deliveries", value: earnings?.totalDeliveries || 0, icon: FaBoxOpen, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Total Earnings", value: `₹${(earnings?.totalEarnings || 0).toLocaleString('en-IN')}`, icon: FaChartLine, color: "text-green-600", bg: "bg-green-50" },
          { label: "Total Ratings", value: agent?.totalRatings || 0, icon: FaStar, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Current Orders", value: agent?.currentOrdersCount || 0, icon: FaClock, color: "text-indigo-600", bg: "bg-indigo-50" },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} rounded-xl p-4 flex items-center gap-3`}>
            <stat.icon className={`text-xl ${stat.color}`} />
            <div>
              <p className={`font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active Deliveries & Pending Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveDeliveriesList deliveries={activeDeliveries} />
        <PendingRequestsList requests={pendingRequests} agentId={agent.id} onRefresh={() => fetchDashboard(true)} />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, gradient, bgLight, textColor, onClick, suffix }) {
  return (
    <div
      onClick={onClick}
      className="relative bg-white rounded-xl p-5 shadow-md border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg transition group"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full group-hover:opacity-20 transition`}></div>
      <div className="relative">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${bgLight} mb-3`}>
          <Icon className={`text-xl ${textColor}`} />
        </div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900 flex items-center">
          {value}
          {suffix}
        </p>
      </div>
      <FaArrowRight className="absolute bottom-4 right-4 text-gray-300 group-hover:text-gray-400 transition" />
    </div>
  );
}

function ActiveDeliveriesList({ deliveries }) {
  const navigate = useNavigate();

  const getStatusInfo = (status) => {
    const statusMap = {
      ASSIGNED: { label: "Assigned", bg: "bg-purple-100", text: "text-purple-700" },
      PICKED_UP: { label: "Picked Up", bg: "bg-indigo-100", text: "text-indigo-700" },
      IN_TRANSIT: { label: "In Transit", bg: "bg-orange-100", text: "text-orange-700" },
      OUT_FOR_DELIVERY: { label: "Out for Delivery", bg: "bg-cyan-100", text: "text-cyan-700" },
    };
    return statusMap[status] || { label: status, bg: "bg-gray-100", text: "text-gray-700" };
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FaTruck className="text-orange-500" /> Active Deliveries
        </h3>
        {deliveries?.length > 0 && (
          <span className="px-3 py-1 text-xs font-bold bg-orange-100 text-orange-700 rounded-full">
            {deliveries.length} active
          </span>
        )}
      </div>
      <div className="p-5">
        {deliveries?.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <FaTruck className="text-3xl text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No active deliveries</p>
            <p className="text-xs text-gray-400 mt-1">Accept a request to start</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries?.slice(0, 3).map((delivery) => {
              const statusInfo = getStatusInfo(delivery.status);
              return (
                <div
                  key={delivery.id}
                  className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-md transition cursor-pointer"
                  onClick={() => navigate(`/agent/deliveries/${delivery.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{delivery.trackingNumber}</p>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${statusInfo.bg} ${statusInfo.text}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    {delivery.weightKg && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{delivery.weightKg} kg</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="text-orange-500">{delivery.pickupCity}</span>
                    <span className="mx-2">→</span>
                    <span className="text-green-500">{delivery.deliveryCity}</span>
                  </p>
                </div>
              );
            })}
            {deliveries?.length > 3 && (
              <button
                onClick={() => navigate("/agent/deliveries")}
                className="w-full text-center text-sm text-orange-600 hover:text-orange-700 font-medium py-2 bg-orange-50 rounded-lg hover:bg-orange-100 transition"
              >
                View All {deliveries.length} Deliveries →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PendingRequestsList({ requests, onRefresh }) {
  const [respondingId, setRespondingId] = useState(null);

  const handleRespond = async (requestId, accept) => {
    setRespondingId(requestId);
    try {
      await respondToDeliveryRequest(requestId, accept);
      toast.success(accept ? "Delivery accepted!" : "Request rejected");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to respond");
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FaBoxOpen className="text-orange-500" /> Pending Requests
        </h3>
      </div>
      <div className="p-5">
        {requests?.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <FaBoxOpen className="text-3xl text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No pending requests</p>
            <p className="text-xs text-gray-400 mt-1">New delivery requests will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests?.map((request) => (
              <div key={request.id} className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{request.trackingNumber || `Request #${request.id}`}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="text-orange-500">{request.pickupCity}</span>
                      <span className="mx-2">→</span>
                      <span className="text-green-500">{request.deliveryCity}</span>
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full font-medium">
                    New
                  </span>
                </div>
                {request.estimatedEarnings && (
                  <p className="text-sm font-medium text-green-600 mb-3">
                    💰 Earn ₹{request.estimatedEarnings}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(request.id, true)}
                    disabled={respondingId === request.id}
                    className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50"
                  >
                    {respondingId === request.id ? "..." : "✓ Accept"}
                  </button>
                  <button
                    onClick={() => handleRespond(request.id, false)}
                    disabled={respondingId === request.id}
                    className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 bg-gray-200 rounded-2xl"></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-xl h-32"></div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-xl h-16"></div>
        ))}
      </div>
    </div>
  );
}
