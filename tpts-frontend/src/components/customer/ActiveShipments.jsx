// src/components/dashboard/ActiveShipments.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../utils/api";

export default function ActiveShipments({ parcels, onRefresh }) {
  const [cancelling, setCancelling] = useState(null);

  const handleCancel = async (parcelId) => {
    if (!confirm("Are you sure you want to cancel this shipment?")) return;

    setCancelling(parcelId);
    try {
      await apiClient.post(`/parcels/${parcelId}/cancel`);
      alert("✓ Shipment cancelled successfully");
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel shipment");
    } finally {
      setCancelling(null);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      CONFIRMED: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      ASSIGNED: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      PICKED_UP: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      IN_TRANSIT: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      OUT_FOR_DELIVERY: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      DELIVERED: "bg-green-500/20 text-green-300 border-green-500/30",
      CANCELLED: "bg-red-500/20 text-red-300 border-red-500/30",
    };
    return colors[status] || "bg-white/10 text-white/70";
  };

  const getStatusIcon = (status) => {
    const icons = {
      PENDING: "⏳",
      CONFIRMED: "✅",
      ASSIGNED: "👤",
      PICKED_UP: "📦",
      IN_TRANSIT: "🚚",
      OUT_FOR_DELIVERY: "🚴",
      DELIVERED: "✓",
      CANCELLED: "❌",
    };
    return icons[status] || "📍";
  };

  if (!parcels || parcels.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 text-center">
        <div className="text-5xl mb-4">📦</div>
        <h3 className="text-lg font-semibold text-white mb-2">
          No Active Shipments
        </h3>
        <p className="text-sm text-white/60 mb-6">
          You don't have any active shipments at the moment.
        </p>
        <Link to="/customer/new-shipment" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium rounded-xl hover:from-primary-500 hover:to-primary-400 transition shadow-lg">
          Create New Shipment
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Active Shipments ({parcels.length})
        </h2>
        <Link
          to="/customer/shipments"
          className="text-sm font-medium text-primary-400 hover:text-primary-300 transition"
        >
          View All →
        </Link>
      </div>

      <div className="divide-y divide-white/10">
        {parcels.map((parcel) => (
          <div key={parcel.id} className="p-6 hover:bg-white/5 transition">
            <div className="flex items-start justify-between gap-4">
              {/* Left: Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getStatusIcon(parcel.status)}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusColor(
                      parcel.status
                    )}`}
                  >
                    {parcel.status.replace("_", " ")}
                  </span>
                </div>

                <p className="text-sm font-semibold text-white mb-1">
                  Tracking: {parcel.trackingNumber}
                </p>

                <p className="text-xs text-white/60 mb-3">
                  <span className="font-medium text-white/80">From:</span> {parcel.pickupCity || 'N/A'}
                  {" → "}
                  <span className="font-medium text-white/80">To:</span> {parcel.deliveryCity}
                  {parcel.estimatedDelivery && (
                    <>
                      {" "}
                      • <span className="font-medium text-white/80">ETA:</span>{" "}
                      {new Date(parcel.estimatedDelivery).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </>
                  )}
                </p>

                {parcel.companyName && (
                  <p className="text-xs text-white/50">
                    🏢 {parcel.companyName}
                  </p>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex flex-col gap-2">
                <Link
                  to={`/customer/track/${parcel.trackingNumber}`}
                  className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-xs font-medium rounded-xl hover:from-primary-500 hover:to-primary-400 transition text-center shadow-lg"
                >
                  Track
                </Link>
                {(parcel.status === "PENDING" || parcel.status === "CONFIRMED") && (
                  <button
                    onClick={() => handleCancel(parcel.id)}
                    disabled={cancelling === parcel.id}
                    className="px-4 py-2 text-xs font-medium text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 disabled:opacity-50 transition"
                  >
                    {cancelling === parcel.id ? "..." : "Cancel"}
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {parcel.status !== "CANCELLED" && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-white/50 mb-1.5">
                  <span>Booked</span>
                  <span>In Transit</span>
                  <span>Delivered</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-500"
                    style={{
                      width: `${parcel.status === "DELIVERED"
                          ? 100
                          : parcel.status === "OUT_FOR_DELIVERY" ||
                            parcel.status === "IN_TRANSIT"
                            ? 66
                            : parcel.status === "PICKED_UP" || parcel.status === "ASSIGNED"
                              ? 33
                              : 10
                        }%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}