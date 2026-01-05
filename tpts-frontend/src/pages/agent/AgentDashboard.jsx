import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentAgent, getAgentDashboard, updateAvailability, respondToDeliveryRequest, getActiveDeliveries, getAllDeliveries, getMyGroupAssignments } from "../../services/agentService";
import { logout } from "../../utils/auth";
import { useAgentLocationSharing } from "../../hooks/useAgentLocation";
import {
  FaTruck, FaCheckCircle, FaWallet, FaStar, FaToggleOn, FaToggleOff,
  FaMapMarkerAlt, FaArrowRight, FaBoxOpen, FaClock, FaChartLine, FaSync, FaUsers, FaWarehouse
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
  const [groupAssignments, setGroupAssignments] = useState({ pickupGroups: [], deliveryGroups: [] });

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

      // Fetch dashboard data, active deliveries, all deliveries, and group assignments in parallel
      const [dashboard, activeDeliveriesData, allDeliveriesData, groupData] = await Promise.all([
        getAgentDashboard(),
        getActiveDeliveries(),
        getAllDeliveries(),
        getMyGroupAssignments().catch(() => ({ pickupGroups: [], deliveryGroups: [] }))
      ]);

      // Set group assignments
      setGroupAssignments(groupData || { pickupGroups: [], deliveryGroups: [] });

      // Calculate earnings directly from delivered parcels (same as earnings page)
      // Agent gets 20% commission on regular deliveries, 10% on group orders
      const AGENT_COMMISSION_RATE = 0.20;
      const GROUP_COMMISSION_RATE = 0.10;

      // Filter regular delivered parcels (exclude group buy orders)
      const deliveredParcels = (allDeliveriesData || []).filter(p => p.status === "DELIVERED" && !p.groupShipmentId);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const todayDelivered = deliveredParcels.filter(p => {
        const deliveredAt = new Date(p.deliveredAt || p.updatedAt);
        return deliveredAt >= startOfDay;
      });

      const calculateEarning = (parcel) => {
        const price = parcel.finalPrice || parcel.totalAmount || parcel.basePrice || 0;
        return Number((price * AGENT_COMMISSION_RATE).toFixed(2));
      };

      // Calculate group earnings (10% commission)
      const pickupGroups = groupData?.pickupGroups || [];
      const deliveryGroups = groupData?.deliveryGroups || [];

      // Completed pickups (status is PICKUP_COMPLETE or later)
      const completedPickups = pickupGroups.filter(g =>
        ["PICKUP_COMPLETE", "DELIVERY_IN_PROGRESS", "COMPLETED"].includes(g.status)
      );
      const completedDeliveryGroups = deliveryGroups.filter(g => g.status === "COMPLETED");

      // Group earnings
      const groupPickupEarnings = completedPickups.reduce((sum, g) =>
        sum + parseFloat(g.pickupAgentEarnings || 0), 0);
      const groupDeliveryEarnings = completedDeliveryGroups.reduce((sum, g) =>
        sum + parseFloat(g.deliveryAgentEarnings || 0), 0);
      const totalGroupEarnings = groupPickupEarnings + groupDeliveryEarnings;

      // Count group completions for today (check createdAt or pickupCompletedAt)
      const todayCompletedPickups = completedPickups.filter(g => {
        const completedAt = new Date(g.pickupCompletedAt || g.updatedAt || g.createdAt);
        return completedAt >= startOfDay;
      });
      const todayCompletedDeliveries = completedDeliveryGroups.filter(g => {
        const completedAt = new Date(g.deliveryCompletedAt || g.updatedAt || g.createdAt);
        return completedAt >= startOfDay;
      });

      // Today's group earnings
      const todayGroupPickupEarnings = todayCompletedPickups.reduce((sum, g) =>
        sum + parseFloat(g.pickupAgentEarnings || 0), 0);
      const todayGroupDeliveryEarnings = todayCompletedDeliveries.reduce((sum, g) =>
        sum + parseFloat(g.deliveryAgentEarnings || 0), 0);

      // Calculate totals
      const regularTodayEarnings = todayDelivered.reduce((sum, p) => sum + calculateEarning(p), 0);
      const regularTotalEarnings = deliveredParcels.reduce((sum, p) => sum + calculateEarning(p), 0);

      const todayEarnings = regularTodayEarnings + todayGroupPickupEarnings + todayGroupDeliveryEarnings;
      const totalEarnings = regularTotalEarnings + totalGroupEarnings;

      // Completed today = regular deliveries + group pickups completed today + group deliveries completed today
      const completedTodayCount = todayDelivered.length + todayCompletedPickups.length + todayCompletedDeliveries.length;

      // Total deliveries = regular + group pickups + group deliveries
      const totalDeliveriesCount = deliveredParcels.length + completedPickups.length + completedDeliveryGroups.length;

      // Merge active deliveries and calculated earnings into dashboard data
      setDashboardData({
        ...dashboard,
        activeDeliveries: activeDeliveriesData || [],
        earnings: {
          todayEarnings,
          totalEarnings,
          todayDeliveries: completedTodayCount,
          totalDeliveries: totalDeliveriesCount,
          groupEarnings: totalGroupEarnings
        },
        allDeliveries: allDeliveriesData || [],
        completedTodayCount
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
      <div className="bg-white/10 backdrop-blur-xl rounded-xl p-8 border border-white/20 text-center">
        <p className="text-red-400 mb-4">⚠️ {error}</p>
        <button onClick={() => fetchDashboard()} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition">Try Again</button>
      </div>
    );
  }

  const {
    stats = {},
    todayStats = {},
    earnings = {},
    activeDeliveries = [],
    pendingRequests = [],
    completedTodayCount: calculatedCompletedToday
  } = dashboardData || {};

  // Map backend data to display values - use calculated values for group-inclusive stats
  const activeDeliveriesCount = activeDeliveries?.length || stats?.pendingDeliveries || 0;
  const completedTodayCount = calculatedCompletedToday ?? (earnings?.todayDeliveries || todayStats?.completedToday || 0);
  const todayEarningsValue = earnings?.todayEarnings || 0;
  const averageRating = stats?.ratingAvg ? parseFloat(stats.ratingAvg).toFixed(1) : (agent?.ratingAvg?.toFixed(1) || "5.0");

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
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
        <div className="bg-blue-500/20 backdrop-blur-xl border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/30 flex items-center justify-center">
            <FaMapMarkerAlt className="text-blue-400 animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-white">📍 Live location sharing active</p>
            <p className="text-xs text-white/60">
              Accuracy: ±{Math.round(accuracy || 0)}m • Last update: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Starting...'}
            </p>
          </div>
          <button
            onClick={toggleSharing}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
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
          gradient="from-indigo-400 to-indigo-600"
          bgLight="bg-indigo-500/20"
          textColor="text-indigo-400"
          onClick={() => navigate('/agent/deliveries')}
        />
        <StatCard
          title="Completed Today"
          value={completedTodayCount}
          icon={FaCheckCircle}
          gradient="from-green-400 to-green-600"
          bgLight="bg-green-500/20"
          textColor="text-green-400"
          onClick={() => navigate('/agent/history')}
        />
        <StatCard
          title="Today's Earnings"
          value={`₹${todayEarningsValue.toLocaleString('en-IN')}`}
          icon={FaWallet}
          gradient="from-blue-400 to-blue-600"
          bgLight="bg-blue-500/20"
          textColor="text-blue-400"
          onClick={() => navigate('/agent/earnings')}
        />
        <StatCard
          title="Average Rating"
          value={averageRating}
          icon={FaStar}
          gradient="from-yellow-400 to-amber-500"
          bgLight="bg-yellow-500/20"
          textColor="text-yellow-400"
          onClick={() => navigate('/agent/ratings')}
          suffix={<FaStar className="text-yellow-400 ml-1" />}
        />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Deliveries", value: earnings?.totalDeliveries || 0, icon: FaBoxOpen, color: "text-indigo-400", bg: "bg-indigo-500/20" },
          { label: "Total Earnings", value: `₹${(earnings?.totalEarnings || 0).toLocaleString('en-IN')}`, icon: FaChartLine, color: "text-green-400", bg: "bg-green-500/20" },
          { label: "Total Ratings", value: agent?.totalRatings || 0, icon: FaStar, color: "text-amber-400", bg: "bg-amber-500/20" },
          { label: "Current Orders", value: agent?.currentOrdersCount || 0, icon: FaClock, color: "text-blue-400", bg: "bg-blue-500/20" },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} backdrop-blur-xl rounded-xl p-4 flex items-center gap-3 border border-white/10`}>
            <stat.icon className={`text-xl ${stat.color}`} />
            <div>
              <p className={`font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-white/60">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Group Orders Section */}
      {(groupAssignments.pickupGroups?.length > 0 || groupAssignments.deliveryGroups?.length > 0) && (
        <div className="bg-indigo-500/20 backdrop-blur-xl rounded-xl p-5 border border-indigo-500/30">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FaUsers className="text-indigo-400" /> Group Shipment Orders
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pickup Groups */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <FaTruck className="text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Pickup Assignments</p>
                  <p className="text-xs text-white/50">Collect from customers → Warehouse</p>
                </div>
              </div>
              {groupAssignments.pickupGroups?.length > 0 ? (
                <div className="space-y-2">
                  {groupAssignments.pickupGroups.slice(0, 3).map(group => (
                    <button
                      key={group.id}
                      onClick={() => navigate(`/agent/group-pickup/${group.id}`)}
                      className="w-full p-3 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg text-left transition border border-indigo-500/20"
                    >
                      <p className="font-medium text-white">{group.groupCode}</p>
                      <p className="text-xs text-white/60">{group.sourceCity} → Warehouse • {group.currentMembers} parcels</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/40 text-center py-3">No pickup assignments</p>
              )}
            </div>

            {/* Delivery Groups */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <FaWarehouse className="text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Delivery Assignments</p>
                  <p className="text-xs text-white/50">Warehouse → Deliver to customers</p>
                </div>
              </div>
              {groupAssignments.deliveryGroups?.length > 0 ? (
                <div className="space-y-2">
                  {groupAssignments.deliveryGroups.slice(0, 3).map(group => (
                    <button
                      key={group.id}
                      onClick={() => navigate(`/agent/group-delivery/${group.id}`)}
                      className="w-full p-3 bg-green-500/10 hover:bg-green-500/20 rounded-lg text-left transition border border-green-500/20"
                    >
                      <p className="font-medium text-white">{group.groupCode}</p>
                      <p className="text-xs text-white/60">Warehouse → {group.destinationCity} • {group.currentMembers} parcels</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/40 text-center py-3">No delivery assignments</p>
              )}
            </div>
          </div>
        </div>
      )}

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
      className="relative bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/20 overflow-hidden cursor-pointer hover:bg-white/15 transition group"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full group-hover:opacity-20 transition`}></div>
      <div className="relative">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${bgLight} mb-3`}>
          <Icon className={`text-xl ${textColor}`} />
        </div>
        <p className="text-xs font-medium text-white/60 uppercase tracking-wide mb-1">{title}</p>
        <p className="text-2xl font-bold text-white flex items-center">
          {value}
          {suffix}
        </p>
      </div>
      <FaArrowRight className="absolute bottom-4 right-4 text-white/30 group-hover:text-white/50 transition" />
    </div>
  );
}

function ActiveDeliveriesList({ deliveries }) {
  const navigate = useNavigate();

  const getStatusInfo = (status) => {
    const statusMap = {
      ASSIGNED: { label: "Assigned", bg: "bg-purple-500/20", text: "text-purple-400" },
      PICKED_UP: { label: "Picked Up", bg: "bg-indigo-500/20", text: "text-indigo-400" },
      IN_TRANSIT: { label: "In Transit", bg: "bg-orange-500/20", text: "text-orange-400" },
      OUT_FOR_DELIVERY: { label: "Out for Delivery", bg: "bg-cyan-500/20", text: "text-cyan-400" },
    };
    return statusMap[status] || { label: status, bg: "bg-white/10", text: "text-white/70" };
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden">
      <div className="bg-white/5 px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FaTruck className="text-indigo-400" /> Active Deliveries
        </h3>
        {deliveries?.length > 0 && (
          <span className="px-3 py-1 text-xs font-bold bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/30">
            {deliveries.length} active
          </span>
        )}
      </div>
      <div className="p-5">
        {deliveries?.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
              <FaTruck className="text-3xl text-white/30" />
            </div>
            <p className="text-white/60 font-medium">No active deliveries</p>
            <p className="text-xs text-white/40 mt-1">Accept a request to start</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries?.slice(0, 3).map((delivery) => {
              const statusInfo = getStatusInfo(delivery.status);
              return (
                <div
                  key={delivery.id}
                  className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition cursor-pointer"
                  onClick={() => navigate(`/agent/deliveries/${delivery.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-white">{delivery.trackingNumber}</p>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${statusInfo.bg} ${statusInfo.text}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    {delivery.weightKg && (
                      <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded">{delivery.weightKg} kg</span>
                    )}
                  </div>
                  <p className="text-sm text-white/70">
                    <span className="text-orange-400">{delivery.pickupCity}</span>
                    <span className="mx-2">→</span>
                    <span className="text-green-400">{delivery.deliveryCity}</span>
                  </p>
                </div>
              );
            })}
            {deliveries?.length > 3 && (
              <button
                onClick={() => navigate("/agent/deliveries")}
                className="w-full text-center text-sm text-indigo-400 hover:text-indigo-300 font-medium py-2 bg-indigo-500/10 rounded-lg hover:bg-indigo-500/20 transition border border-indigo-500/20"
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
    <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden">
      <div className="bg-white/5 px-5 py-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FaBoxOpen className="text-indigo-400" /> Pending Requests
        </h3>
      </div>
      <div className="p-5">
        {requests?.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
              <FaBoxOpen className="text-3xl text-white/30" />
            </div>
            <p className="text-white/60 font-medium">No pending requests</p>
            <p className="text-xs text-white/40 mt-1">New delivery requests will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests?.map((request) => (
              <div key={request.id} className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-white">{request.trackingNumber || `Request #${request.id}`}</p>
                    <p className="text-sm text-white/70 mt-1">
                      <span className="text-orange-400">{request.pickupCity}</span>
                      <span className="mx-2">→</span>
                      <span className="text-green-400">{request.deliveryCity}</span>
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs bg-indigo-500/20 text-indigo-400 rounded-full font-medium border border-indigo-500/30">
                    New
                  </span>
                </div>
                {request.estimatedEarnings && (
                  <p className="text-sm font-medium text-green-400 mb-3">
                    💰 Earn ₹{request.estimatedEarnings}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(request.id, true)}
                    disabled={respondingId === request.id}
                    className="flex-1 bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-600 transition disabled:opacity-50"
                  >
                    {respondingId === request.id ? "..." : "✓ Accept"}
                  </button>
                  <button
                    onClick={() => handleRespond(request.id, false)}
                    disabled={respondingId === request.id}
                    className="flex-1 border border-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition disabled:opacity-50"
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
      <div className="h-32 bg-white/10 rounded-2xl"></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/10 rounded-xl h-32"></div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/10 rounded-xl h-16"></div>
        ))}
      </div>
    </div>
  );
}
