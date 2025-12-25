import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentCustomer } from "../../services/customerService";
import { logout } from "../../utils/auth";
import apiClient from "../../utils/api";
import Pagination from "../../components/common/Pagination";
import toast from "react-hot-toast";
import {
  FaBox, FaSync, FaTruck, FaArrowRight, FaCheckCircle,
  FaTimesCircle, FaClock, FaMapMarkerAlt, FaStar
} from "react-icons/fa";

const STATUS_CONFIG = {
  PENDING: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: FaClock, label: "Pending" },
  CONFIRMED: { color: "bg-blue-100 text-blue-800 border-blue-300", icon: FaCheckCircle, label: "Confirmed" },
  ASSIGNED: { color: "bg-indigo-100 text-indigo-800 border-indigo-300", icon: FaTruck, label: "Assigned" },
  PICKED_UP: { color: "bg-purple-100 text-purple-800 border-purple-300", icon: FaTruck, label: "Picked Up" },
  IN_TRANSIT: { color: "bg-cyan-100 text-cyan-800 border-cyan-300", icon: FaTruck, label: "In Transit" },
  OUT_FOR_DELIVERY: { color: "bg-orange-100 text-orange-800 border-orange-300", icon: FaMapMarkerAlt, label: "Out for Delivery" },
  DELIVERED: { color: "bg-green-100 text-green-800 border-green-300", icon: FaCheckCircle, label: "Delivered" },
  CANCELLED: { color: "bg-red-100 text-red-800 border-red-300", icon: FaTimesCircle, label: "Cancelled" },
};

const FILTER_OPTIONS = [
  { value: "all", label: "All", emoji: "📦" },
  { value: "active", label: "Active", emoji: "🚚" },
  { value: "delivered", label: "Delivered", emoji: "✅" },
  { value: "cancelled", label: "Cancelled", emoji: "❌" },
];

const ITEMS_PER_PAGE = 6;

export default function CustomerShipments() {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState([]);
  const [filteredParcels, setFilteredParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilter();
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcels, filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await getCurrentCustomer();
      const response = await apiClient.get("/parcels/my");
      setParcels(response.data.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
      } else {
        toast.error("Failed to load shipments");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    toast.success("Shipments refreshed");
  };

  const applyFilter = () => {
    if (filter === "all") {
      setFilteredParcels(parcels);
    } else if (filter === "active") {
      setFilteredParcels(
        parcels.filter((p) =>
          ["CONFIRMED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(p.status)
        )
      );
    } else if (filter === "delivered") {
      setFilteredParcels(parcels.filter((p) => p.status === "DELIVERED"));
    } else if (filter === "cancelled") {
      setFilteredParcels(parcels.filter((p) => p.status === "CANCELLED"));
    }
  };

  // Counts
  const activeCount = parcels.filter(p => ["CONFIRMED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(p.status)).length;
  const deliveredCount = parcels.filter(p => p.status === "DELIVERED").length;
  const cancelledCount = parcels.filter(p => p.status === "CANCELLED").length;

  const getCount = (filterValue) => {
    if (filterValue === "all") return parcels.length;
    if (filterValue === "active") return activeCount;
    if (filterValue === "delivered") return deliveredCount;
    if (filterValue === "cancelled") return cancelledCount;
    return 0;
  };

  // Pagination
  const totalPages = Math.ceil(filteredParcels.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedParcels = filteredParcels.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading shipments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
              <FaBox className="text-3xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">My Shipments</h1>
              <p className="text-white/80 mt-1">View and manage all your orders</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl flex items-center gap-2 font-medium transition"
            >
              <FaSync className={isRefreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              to="/customer/dashboard"
              className="px-4 py-2 bg-white text-primary-600 hover:bg-white/90 rounded-xl font-medium transition"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Cards */}
      <div className="grid grid-cols-4 gap-4">
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`p-4 rounded-xl border-2 transition text-left ${isActive
                ? "bg-primary-50 border-primary-500 shadow-md"
                : "bg-white border-gray-200 hover:border-primary-300"
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{opt.emoji}</span>
                <div>
                  <p className={`text-xl font-bold ${isActive ? "text-primary-700" : "text-gray-900"}`}>
                    {getCount(opt.value)}
                  </p>
                  <p className="text-sm text-gray-500">{opt.label}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Shipments List */}
      {filteredParcels.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-md border border-gray-200">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📦</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Shipments Found</h3>
          <p className="text-gray-500 mb-6">
            {filter === "all"
              ? "You haven't created any shipments yet."
              : `No ${filter} shipments found.`}
          </p>
          <Link
            to="/customer/new-shipment"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-blue-500 text-white font-medium rounded-xl hover:from-primary-600 hover:to-blue-600 transition shadow-md"
          >
            <FaBox /> Create New Shipment
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedParcels.map((parcel) => {
              const statusConfig = STATUS_CONFIG[parcel.status] || STATUS_CONFIG.PENDING;
              const StatusIcon = statusConfig.icon;
              return (
                <div
                  key={parcel.id}
                  className={`bg-white rounded-xl shadow-sm border-l-4 overflow-hidden transition hover:shadow-md ${parcel.status === "DELIVERED" ? "border-l-green-500" :
                    parcel.status === "CANCELLED" ? "border-l-red-500" :
                      "border-l-primary-500"
                    }`}
                >
                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      {/* Left Content */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}>
                            <StatusIcon className="text-xs" />
                            {statusConfig.label}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {new Date(parcel.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>

                        <p className="font-mono font-bold text-primary-600 mb-2 flex items-center gap-2">
                          <FaMapMarkerAlt className="text-primary-500" />
                          {parcel.trackingNumber}
                        </p>

                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <span className="font-medium">{parcel.pickupCity}</span>
                          <FaArrowRight className="text-gray-400 text-xs" />
                          <span className="font-medium">{parcel.deliveryCity}</span>
                        </div>

                        {parcel.companyName && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            🏢 {parcel.companyName}
                          </p>
                        )}
                      </div>

                      {/* Right Actions */}
                      <div className="flex flex-col gap-2 items-end">
                        <Link
                          to={`/customer/track/${parcel.trackingNumber}`}
                          className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-blue-500 text-white font-medium rounded-xl hover:from-primary-600 hover:to-blue-600 transition flex items-center gap-2 shadow-sm"
                        >
                          <FaMapMarkerAlt /> Track
                        </Link>
                        {parcel.status === "DELIVERED" && !parcel.hasRated && (
                          <Link
                            to={`/customer/rate/${parcel.id}`}
                            className="px-5 py-2.5 bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium rounded-xl transition flex items-center gap-2"
                          >
                            <FaStar /> Rate
                          </Link>
                        )}
                      </div>
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
              totalItems={filteredParcels.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </>
      )}
    </div>
  );
}
