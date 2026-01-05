import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentCustomer } from "../../services/customerService";
import { cancelParcel } from "../../services/parcelService";
import { logout } from "../../utils/auth";
import apiClient from "../../utils/api";
import Pagination from "../../components/common/Pagination";
import toast from "react-hot-toast";
import {
  FaBox, FaSync, FaTruck, FaArrowRight, FaCheckCircle,
  FaTimesCircle, FaClock, FaMapMarkerAlt, FaStar, FaBan
} from "react-icons/fa";

const STATUS_CONFIG = {
  PENDING: { color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", icon: FaClock, label: "Pending" },
  CONFIRMED: { color: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: FaCheckCircle, label: "Confirmed" },
  ASSIGNED: { color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30", icon: FaTruck, label: "Assigned" },
  PICKED_UP: { color: "bg-purple-500/20 text-purple-300 border-purple-500/30", icon: FaTruck, label: "Picked Up" },
  IN_TRANSIT: { color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", icon: FaTruck, label: "In Transit" },
  OUT_FOR_DELIVERY: { color: "bg-orange-500/20 text-orange-300 border-orange-500/30", icon: FaMapMarkerAlt, label: "Out for Delivery" },
  DELIVERED: { color: "bg-green-500/20 text-green-300 border-green-500/30", icon: FaCheckCircle, label: "Delivered" },
  CANCELLED: { color: "bg-red-500/20 text-red-300 border-red-500/30", icon: FaTimesCircle, label: "Cancelled" },
};

const FILTER_OPTIONS = [
  { value: "all", label: "All", emoji: "📦" },
  { value: "active", label: "Active", emoji: "🚚" },
  { value: "delivered", label: "Delivered", emoji: "✅" },
  { value: "cancelled", label: "Cancelled", emoji: "❌" },
];

const ITEMS_PER_PAGE = 6;

// Helper: Check if order can be cancelled
const canCancelOrder = (status) => ["PENDING", "CONFIRMED", "ASSIGNED"].includes(status);

export default function CustomerShipments() {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState([]);
  const [filteredParcels, setFilteredParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [cancelModal, setCancelModal] = useState({ open: false, parcel: null });
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

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
      // Filter out group parcels - they have their own MyGroupsPage
      const regularParcels = (response.data.data || []).filter(p => !p.groupShipmentId);
      setParcels(regularParcels);
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

  const handleCancelOrder = async () => {
    if (!cancelModal.parcel) return;
    setCancelling(true);
    try {
      await cancelParcel(cancelModal.parcel.id, cancelReason || "Cancelled by customer");
      toast.success("Order cancelled successfully");
      setCancelModal({ open: false, parcel: null });
      setCancelReason("");
      fetchData(); // Refresh the list
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
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
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
          <p className="mt-4 text-white/70 font-medium">Loading shipments...</p>
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
              className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl font-medium transition"
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
                ? "bg-indigo-500/20 border-indigo-500/50"
                : "bg-white/10 backdrop-blur-xl border-white/20 hover:border-white/40"
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{opt.emoji}</span>
                <div>
                  <p className={`text-xl font-bold ${isActive ? "text-primary-400" : "text-white"}`}>
                    {getCount(opt.value)}
                  </p>
                  <p className="text-sm text-white/60">{opt.label}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Shipments List */}
      {filteredParcels.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/20">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📦</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Shipments Found</h3>
          <p className="text-white/60 mb-6">
            {filter === "all"
              ? "You haven't created any shipments yet."
              : `No ${filter} shipments found.`}
          </p>
          <Link
            to="/customer/new-shipment"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-500 transition shadow-lg"
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
                  className={`bg-white/10 backdrop-blur-xl rounded-xl border-l-4 overflow-hidden transition hover:bg-white/15 border border-white/20 ${parcel.status === "DELIVERED" ? "border-l-green-500" :
                    parcel.status === "CANCELLED" ? "border-l-red-500" :
                      "border-l-indigo-500"
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
                          <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded">
                            {new Date(parcel.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          {/* Refund badge for cancelled paid orders */}
                          {parcel.status === "CANCELLED" && parcel.paymentStatus === "PAID" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                              💰 Refunded
                            </span>
                          )}
                        </div>

                        <p className="font-mono font-bold text-indigo-400 mb-2 flex items-center gap-2">
                          <FaMapMarkerAlt className="text-indigo-400" />
                          {parcel.trackingNumber}
                        </p>

                        <div className="flex items-center gap-2 text-white/70 mb-2">
                          <span className="font-medium">{parcel.pickupCity}</span>
                          <FaArrowRight className="text-white/40 text-xs" />
                          <span className="font-medium">{parcel.deliveryCity}</span>
                        </div>

                        {parcel.companyName && (
                          <p className="text-xs text-white/50 flex items-center gap-1">
                            🏢 {parcel.companyName}
                          </p>
                        )}

                        {/* Cancellation info */}
                        {parcel.status === "CANCELLED" && (
                          <div className="mt-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                            <p className="text-xs text-red-400">
                              <strong>Cancelled:</strong> {parcel.cancelledAt ? new Date(parcel.cancelledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "N/A"}
                            </p>
                            {parcel.cancellationReason && (
                              <p className="text-xs text-red-300 mt-1">
                                <strong>Reason:</strong> {parcel.cancellationReason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Actions */}
                      <div className="flex flex-col gap-2 items-end">
                        <Link
                          to={`/customer/track/${parcel.trackingNumber}`}
                          className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-500 transition flex items-center gap-2 shadow-lg"
                        >
                          <FaMapMarkerAlt /> Track
                        </Link>
                        {parcel.status === "DELIVERED" && !parcel.hasRated && (
                          <Link
                            to={`/customer/rate/${parcel.id}`}
                            className="px-5 py-2.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-medium rounded-xl transition flex items-center gap-2 border border-amber-500/30"
                          >
                            <FaStar /> Rate
                          </Link>
                        )}
                        {canCancelOrder(parcel.status) && (
                          <button
                            onClick={() => setCancelModal({ open: true, parcel })}
                            className="px-5 py-2.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium rounded-xl transition flex items-center gap-2 border border-red-500/30"
                          >
                            <FaBan /> Cancel
                          </button>
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

      {/* Cancel Confirmation Modal */}
      {cancelModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/20 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaBan className="text-red-400 text-3xl" />
              </div>
              <h3 className="text-xl font-bold text-white">Cancel Order?</h3>
              <p className="text-white/60 mt-2">
                Are you sure you want to cancel order <span className="font-mono font-bold text-indigo-400">{cancelModal.parcel?.trackingNumber}</span>?
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-white/80 mb-2">
                Reason for cancellation (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Changed my mind, Wrong address, etc."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCancelModal({ open: false, parcel: null });
                  setCancelReason("");
                }}
                disabled={cancelling}
                className="flex-1 px-4 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition border border-white/20"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-500 transition flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <FaBan /> Cancel Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
