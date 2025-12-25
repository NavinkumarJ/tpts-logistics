import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentCustomer, getCustomerDashboard } from "../../services/customerService";
import { logout } from "../../utils/auth";
import StatsCards from "../../components/customer/StatsCards";
import ActiveShipments from "../../components/customer/ActiveShipments";
import SavedAddresses from "../../components/customer/SavedAddresses";
import RecentNotifications from "../../components/customer/RecentNotifications";

export default function CustomerDashboard() {
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const fetchDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const customerProfile = await getCurrentCustomer();
      setCustomer(customerProfile);

      const dashboard = await getCustomerDashboard(customerProfile.id);
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
      <div className="bg-white rounded-xl p-8 shadow-md text-center">
        <p className="text-red-600 mb-4">⚠️ {error}</p>
        <button onClick={handleRefresh} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  const { stats, savedAddresses, recentParcels } = dashboardData;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {customer.fullName}! 👋
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium shadow-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Shipments (2 columns) */}
        <div className="lg:col-span-2">
          <ActiveShipments
            parcels={recentParcels}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <RecentNotifications customerId={customer.id} />
          <SavedAddresses
            addresses={savedAddresses}
            customerId={customer.id}
            onRefresh={handleRefresh}
          />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-12 bg-gray-200 rounded-lg w-1/3"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-xl h-36"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-200 rounded-xl h-96"></div>
        <div className="space-y-6">
          <div className="bg-gray-200 rounded-xl h-48"></div>
          <div className="bg-gray-200 rounded-xl h-48"></div>
        </div>
      </div>
    </div>
  );
}