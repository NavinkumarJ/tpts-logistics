import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCurrentCompany, getCompanyDashboard } from "../../services/companyService";
import { logout } from "../../utils/auth";
import {
  FaBox, FaUsers, FaUserPlus, FaChartLine,
  FaTruck, FaCheckCircle, FaClock, FaWallet, FaRupeeSign
} from "react-icons/fa";

// Helper to format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "₹0";
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export default function CompanyDashboard() {
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchDashboard();
  }, [refreshKey]);

  const fetchDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const companyProfile = await getCurrentCompany();
      setCompany(companyProfile);

      const dashboard = await getCompanyDashboard(companyProfile.id);
      setDashboardData(dashboard);

    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
      } else {
        setError(err.response?.data?.message || "Failed to load dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-xl rounded-xl p-8 border border-white/20 text-center">
        <p className="text-red-400 mb-4">⚠️ {error}</p>
        <button onClick={handleRefresh} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  // Map backend response to frontend format
  const backendStats = dashboardData?.stats || {};
  const agentStats = dashboardData?.agentStats || {};

  // Calculate correct splits client-side (10% platform, 20% agent, 70% company)
  const totalOrder = backendStats.totalOrderAmount || 0;
  const correctCompanyRevenue = totalOrder * 0.70;  // 70% to company
  const correctPlatformFee = totalOrder * 0.10;     // 10% to platform
  const correctAgentEarning = totalOrder * 0.20;    // 20% to agents

  const stats = {
    totalShipments: backendStats.totalOrders || 0,
    activeDeliveries: backendStats.activeOrders || 0,
    completedDeliveries: backendStats.completedOrders || 0,
    totalRevenue: correctCompanyRevenue,           // Company's 70% share (calculated correctly)
    totalOrderAmount: totalOrder,                  // Full customer payment (100%)
    platformCommission: correctPlatformFee,        // Platform's 10%
    agentEarning: correctAgentEarning,             // Agent's 20%
    todayRevenue: backendStats.todayRevenue || 0,
    activeAgents: agentStats.activeAgents || agentStats.totalAgents || 0,
    pendingApplications: agentStats.pendingApplications || 0,
    avgDeliveryTime: backendStats.avgDeliveryTime || "N/A",
    ratingAvg: backendStats.ratingAvg || 0
  };
  const recentShipments = dashboardData?.recentShipments || [];
  const pendingApplications = dashboardData?.pendingApplications || [];
  const activeAgents = dashboardData?.activeAgents || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Company Dashboard
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Welcome, {company.companyName}! 🏢
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/15 transition text-sm font-medium text-white"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Shipments"
          value={stats.totalShipments}
          icon={FaBox}
          gradient="from-blue-500 to-blue-600"
          bgLight="bg-blue-50"
          textColor="text-blue-600"
        />
        <StatCard
          title="Active Deliveries"
          value={stats.activeDeliveries}
          icon={FaTruck}
          gradient="from-orange-500 to-orange-600"
          bgLight="bg-orange-50"
          textColor="text-orange-600"
          highlight={stats.activeDeliveries > 0}
        />
        <StatCard
          title="Completed"
          value={stats.completedDeliveries}
          icon={FaCheckCircle}
          gradient="from-green-500 to-green-600"
          bgLight="bg-green-50"
          textColor="text-green-600"
        />
        <StatCard
          title="Your Revenue (70%)"
          value={formatCurrency(stats.totalRevenue)}
          subtitle={`Total Orders: ${formatCurrency(stats.totalOrderAmount)}`}
          icon={FaWallet}
          gradient="from-purple-500 to-purple-600"
          bgLight="bg-purple-50"
          textColor="text-purple-600"
        />
      </div>

      {/* Stats Cards Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Active Agents"
          value={stats.activeAgents}
          icon={FaUsers}
          gradient="from-indigo-500 to-indigo-600"
          bgLight="bg-indigo-50"
          textColor="text-indigo-600"
        />
        <StatCard
          title="Pending Applications"
          value={stats.pendingApplications}
          icon={FaUserPlus}
          gradient="from-cyan-500 to-cyan-600"
          bgLight="bg-cyan-50"
          textColor="text-cyan-600"
          highlight={stats.pendingApplications > 0}
        />
        <StatCard
          title="Avg Delivery Time"
          value={stats.avgDeliveryTime || "N/A"}
          icon={FaClock}
          gradient="from-yellow-500 to-yellow-600"
          bgLight="bg-yellow-50"
          textColor="text-yellow-600"
        />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shipments */}
        <RecentShipmentsList shipments={recentShipments} />

        {/* Pending Applications */}
        <PendingApplicationsList applications={pendingApplications} />
      </div>

      {/* Active Agents */}
      <ActiveAgentsSection agents={activeAgents} />
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, gradient, bgLight, textColor, highlight }) {
  return (
    <div className={`relative bg-white/10 backdrop-blur-xl rounded-xl p-6 border transition hover:bg-white/15 overflow-hidden ${highlight ? "border-orange-500/50 ring-2 ring-orange-400/30" : "border-white/20"
      }`}>
      {/* Decorative gradient corner like admin dashboard */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full group-hover:opacity-20 transition`}></div>
      <div className="relative">
        {/* Colored icon background */}
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${bgLight} mb-4`}>
          <Icon className={`text-xl ${textColor}`} />
        </div>
        <p className="text-xs font-medium text-white/50 uppercase tracking-wide mb-1">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
        {subtitle && (
          <p className="text-xs text-white/50 mt-1">{subtitle}</p>
        )}
        {highlight && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-orange-400 font-medium">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
            Needs attention
          </div>
        )}
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    {
      label: "Create Group Shipment",
      to: "/company/create-shipment",
      icon: "📦",
      gradient: "from-orange-500 to-orange-600",
    },
    {
      label: "View All Shipments",
      to: "/company/shipments",
      icon: "📋",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      label: "Manage Agents",
      to: "/company/agents",
      icon: "👥",
      gradient: "from-purple-500 to-purple-600",
    },
    {
      label: "Review Applications",
      to: "/company/applications",
      icon: "📝",
      gradient: "from-cyan-500 to-cyan-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, idx) => (
        <Link
          key={idx}
          to={action.to}
          className="bg-white/10 backdrop-blur-xl border border-white/20 text-white p-6 rounded-xl hover:bg-white/15 transition group"
        >
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${action.gradient} mb-3 shadow-lg group-hover:scale-105 transition`}>
            <span className="text-xl">{action.icon}</span>
          </div>
          <p className="text-sm font-semibold text-white">{action.label}</p>
        </Link>
      ))}
    </div>
  );
}

function RecentShipmentsList({ shipments }) {
  const getStatusColor = (status) => {
    const colors = {
      PENDING: "bg-yellow-500/20 text-yellow-400",
      ASSIGNED: "bg-blue-500/20 text-blue-400",
      IN_PROGRESS: "bg-purple-500/20 text-purple-400",
      COMPLETED: "bg-green-500/20 text-green-400",
    };
    return colors[status] || "bg-white/20 text-white/60";
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Recent Shipments</h3>
        <Link to="/company/parcels" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
          View All →
        </Link>
      </div>

      {!shipments || shipments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-white/50 text-sm">No recent shipments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shipments.slice(0, 2).map((shipment) => (
            <div key={shipment.id} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition border border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white mb-1">
                    {shipment.trackingNumber || `Parcel #${shipment.id}`}
                  </p>
                  <p className="text-xs text-white/60">
                    {shipment.pickupCity} → {shipment.deliveryCity}
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(shipment.status)}`}>
                  {shipment.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingApplicationsList({ applications }) {
  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Pending Applications</h3>
        <Link to="/company/applications" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
          View All →
        </Link>
      </div>

      {!applications || applications.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-white/50 text-sm">No pending applications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.slice(0, 5).map((app) => (
            <div key={app.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{app.applicantName}</p>
                  <p className="text-xs text-white/60">
                    {app.experienceYears} experience • {app.vehicleType}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                  Pending
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveAgentsSection({ agents }) {
  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Active Agents</h3>
        <Link to="/company/agents" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
          View All →
        </Link>
      </div>

      {!agents || agents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-white/50 text-sm">No active agents</p>
          <Link to="/company/applications" className="btn-primary mt-4 inline-block">
            Hire Agents
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <div key={agent.id} className="p-4 bg-white/5 rounded-lg text-center hover:bg-white/10 transition border border-white/10">
              {agent.profilePhotoUrl ? (
                <img
                  src={agent.profilePhotoUrl}
                  alt={agent.fullName}
                  className="w-12 h-12 rounded-full object-cover mx-auto mb-2"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto mb-2 font-bold">
                  {agent.fullName?.charAt(0)}
                </div>
              )}
              <p className="text-sm font-semibold text-white truncate">{agent.fullName}</p>
              <p className="text-xs text-white/60">{agent.vehicleType}</p>
              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${agent.isAvailable ? "bg-green-500/20 text-green-400" : "bg-white/20 text-white/60"
                  }`}>
                  {agent.isAvailable ? "Available" : "Busy"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-12 bg-white/10 rounded-lg w-1/3"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/10 rounded-xl h-36"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/10 rounded-xl h-96"></div>
        <div className="bg-white/10 rounded-xl h-96"></div>
      </div>
    </div>
  );
}
