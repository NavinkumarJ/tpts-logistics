import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getSuperAdminDashboard } from "../../services/superAdminService";
import { getPlatformStats, getPendingCompanies, getAllUsers, getAdminLogs } from "../../services/adminService";
import { logout } from "../../utils/auth";
import {
  FaBuilding, FaUsers, FaTruck, FaBox, FaDollarSign,
  FaCheckCircle, FaClock, FaExclamationTriangle, FaSync,
  FaChartLine, FaMapMarkerAlt, FaEnvelope, FaPhone, FaStar
} from "react-icons/fa";
import toast from "react-hot-toast";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [platformStats, setPlatformStats] = useState(null);
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch all data in parallel for real data
      const [dashboard, stats, pending, users, logs] = await Promise.all([
        getSuperAdminDashboard().catch(() => null),
        getPlatformStats(),
        getPendingCompanies().catch(() => []),
        getAllUsers().catch(() => []),
        getAdminLogs(null, 10, null).catch(() => [])
      ]);

      setDashboardData(dashboard);
      setPlatformStats(stats);
      setPendingCompanies(pending || []);

      // Get 5 most recent users
      const sortedUsers = (users || [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      setRecentUsers(sortedUsers);

      // Map logs to activities format
      const activities = (logs || []).slice(0, 8).map(log => ({
        action: log.action,
        user: log.userEmail,
        type: log.actionType,
        timestamp: log.createdAt,
      }));
      setRecentActivities(activities);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
      } else {
        setError(err.response?.data?.message || "Failed to load dashboard");
        toast.error("Failed to load dashboard data");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-md text-center">
        <p className="text-red-600 mb-4">⚠️ {error}</p>
        <button onClick={fetchDashboard} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  // Use platform stats for real data
  const stats = {
    totalCompanies: platformStats?.totalCompanies || 0,
    approvedCompanies: platformStats?.approvedCompanies || 0,
    totalUsers: platformStats?.totalUsers || 0,
    totalAgents: platformStats?.totalAgents || 0,
    activeAgents: platformStats?.activeAgents || 0,
    availableAgents: platformStats?.availableAgents || 0,
    totalParcels: platformStats?.totalParcels || 0,
    deliveredParcels: platformStats?.deliveredParcels || 0,
    pendingParcels: platformStats?.pendingParcels || 0,
    inTransitParcels: platformStats?.inTransitParcels || 0,
    totalRevenue: platformStats?.totalRevenue || 0,
    monthlyRevenue: platformStats?.monthlyRevenue || 0,
    pendingApprovals: platformStats?.pendingCompanyApprovals || pendingCompanies.length,
    totalCustomers: platformStats?.totalCustomers || 0,
  };

  // Calculate real completion rate
  const completionRate = stats.totalParcels > 0
    ? Math.round((stats.deliveredParcels / stats.totalParcels) * 100)
    : 0;

  // System health
  const systemHealth = {
    status: pendingCompanies.length > 5 ? "warning" : "healthy",
    message: pendingCompanies.length > 5 ? `${pendingCompanies.length} companies awaiting approval` : null,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Super Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Platform Overview & Management 🛡️
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium shadow-sm"
        >
          <FaSync className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* System Health Alert */}
      {systemHealth.status !== "healthy" && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-yellow-600" />
            <p className="text-sm text-yellow-700 font-medium">
              System Alert: {systemHealth.message}
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards Row 1 - Platform Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Companies"
          value={stats.totalCompanies}
          icon={FaBuilding}
          gradient="from-blue-500 to-blue-600"
          bgLight="bg-blue-50"
          textColor="text-blue-600"
          subtitle={`${stats.approvedCompanies} approved`}
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={FaUsers}
          gradient="from-purple-500 to-purple-600"
          bgLight="bg-purple-50"
          textColor="text-purple-600"
          subtitle={`${stats.totalCustomers} customers`}
        />
        <StatCard
          title="Delivery Agents"
          value={stats.totalAgents}
          icon={FaTruck}
          gradient="from-orange-500 to-orange-600"
          bgLight="bg-orange-50"
          textColor="text-orange-600"
          subtitle={`${stats.availableAgents} available`}
        />
        <StatCard
          title="Total Parcels"
          value={stats.totalParcels}
          icon={FaBox}
          gradient="from-green-500 to-green-600"
          bgLight="bg-green-50"
          textColor="text-green-600"
          subtitle={`${stats.deliveredParcels} delivered`}
        />
      </div>

      {/* Stats Cards Row 2 - Business Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Platform Revenue"
          value={`₹${Number(stats.totalRevenue).toLocaleString()}`}
          icon={FaDollarSign}
          gradient="from-emerald-500 to-emerald-600"
          bgLight="bg-emerald-50"
          textColor="text-emerald-600"
          subtitle={`₹${Number(stats.monthlyRevenue).toLocaleString()} this month`}
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          icon={FaClock}
          gradient="from-yellow-500 to-yellow-600"
          bgLight="bg-yellow-50"
          textColor="text-yellow-600"
          highlight={stats.pendingApprovals > 0}
          subtitle="Companies awaiting"
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          icon={FaCheckCircle}
          gradient="from-cyan-500 to-cyan-600"
          bgLight="bg-cyan-50"
          textColor="text-cyan-600"
          subtitle={`${stats.deliveredParcels}/${stats.totalParcels} parcels`}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions pendingCount={stats.pendingApprovals} />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Company Approvals */}
        <PendingCompaniesList
          companies={pendingCompanies}
        />

        {/* Recent Users */}
        <RecentUsersList users={recentUsers} />
      </div>

      {/* Recent Activities */}
      <RecentActivitiesList activities={recentActivities} />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, gradient, bgLight, textColor, subtitle, highlight }) {
  return (
    <div className={`relative bg-white rounded-xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition ${highlight ? "ring-2 ring-yellow-400" : ""}`}>
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full`}></div>
      <div className="relative">
        <div className={`inline-flex items-center justify-center w-11 h-11 rounded-lg ${bgLight} mb-3`}>
          <Icon className={`text-lg ${textColor}`} />
        </div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
        {highlight && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-yellow-600 font-medium">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            Needs attention
          </div>
        )}
      </div>
    </div>
  );
}

function QuickActions({ pendingCount }) {
  const actions = [
    {
      label: "Approve Companies",
      to: "/admin/companies",
      icon: "🏢",
      color: "bg-gradient-to-r from-blue-600 to-blue-700",
      badge: pendingCount,
    },
    {
      label: "Manage Users",
      to: "/admin/users",
      icon: "👥",
      color: "bg-gradient-to-r from-purple-600 to-purple-700",
    },
    {
      label: "View Analytics",
      to: "/admin/analytics",
      icon: "📊",
      color: "bg-gradient-to-r from-teal-600 to-teal-700",
    },
    {
      label: "Revenue Reports",
      to: "/admin/revenue",
      icon: "💰",
      color: "bg-gradient-to-r from-emerald-600 to-emerald-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, idx) => (
        <Link
          key={idx}
          to={action.to}
          className={`${action.color} text-white p-5 rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 relative`}
        >
          <div className="text-2xl mb-2">{action.icon}</div>
          <p className="text-sm font-semibold">{action.label}</p>
          {action.badge > 0 && (
            <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold animate-pulse">
              {action.badge}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

function PendingCompaniesList({ companies }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Pending Company Approvals
        </h3>
        <Link to="/admin/companies" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          View All →
        </Link>
      </div>

      {!companies || companies.length === 0 ? (
        <div className="text-center py-8">
          <FaCheckCircle className="mx-auto text-4xl text-green-500 mb-2" />
          <p className="text-gray-600 font-medium">All caught up!</p>
          <p className="text-gray-500 text-sm">No pending approvals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {companies.slice(0, 4).map((company) => (
            <div key={company.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition border border-gray-100">
              <div className="flex items-start gap-3">
                {company.companyLogoUrl ? (
                  <img src={company.companyLogoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                    {company.companyName?.charAt(0) || "C"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{company.companyName}</p>
                  <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                    <FaEnvelope className="text-[10px]" /> {company.email}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <FaMapMarkerAlt className="text-[10px]" /> {company.city}, {company.state}
                  </p>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                  Pending
                </span>
              </div>
            </div>
          ))}
          {companies.length > 4 && (
            <Link to="/admin/companies" className="block text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium py-2">
              +{companies.length - 4} more pending
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function RecentUsersList({ users }) {
  const getUserTypeConfig = (type) => {
    const configs = {
      CUSTOMER: { color: "bg-blue-100 text-blue-700", label: "Customer" },
      DELIVERY_AGENT: { color: "bg-orange-100 text-orange-700", label: "Agent" },
      COMPANY_ADMIN: { color: "bg-purple-100 text-purple-700", label: "Company" },
      SUPER_ADMIN: { color: "bg-red-100 text-red-700", label: "Admin" },
    };
    return configs[type] || { color: "bg-gray-100 text-gray-700", label: type };
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
        <Link to="/admin/users" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          View All →
        </Link>
      </div>

      {!users || users.length === 0 ? (
        <div className="text-center py-8">
          <FaUsers className="mx-auto text-4xl text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">No recent users</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user, idx) => {
            const typeConfig = getUserTypeConfig(user.userType);
            return (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white text-sm font-bold">
                      {user.fullName?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{user.fullName || "N/A"}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig.color}`}>
                    {typeConfig.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecentActivitiesList({ activities }) {
  const getActivityIcon = (type) => {
    const icons = {
      COMPANY: "🏢",
      USER: "👤",
      SETTINGS: "⚙️",
      MODERATION: "🛡️",
      ADMIN: "👑",
    };
    return icons[type] || "📌";
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
        <Link to="/admin/logs" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          View All →
        </Link>
      </div>

      {!activities || activities.length === 0 ? (
        <div className="text-center py-8">
          <FaChartLine className="mx-auto text-4xl text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">No recent activities</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activities.map((activity, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 line-clamp-1">{activity.action}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activity.user} • {new Date(activity.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
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
    <div className="space-y-6 animate-pulse">
      <div className="h-12 bg-gray-200 rounded-lg w-1/3"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-xl h-32"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-xl h-32"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-200 rounded-xl h-80"></div>
        <div className="bg-gray-200 rounded-xl h-80"></div>
      </div>
    </div>
  );
}
