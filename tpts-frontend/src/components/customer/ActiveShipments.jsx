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
      PENDING: "bg-yellow-100 text-yellow-800",
      CONFIRMED: "bg-blue-100 text-blue-800",
      ASSIGNED: "bg-indigo-100 text-indigo-800",
      PICKED_UP: "bg-purple-100 text-purple-800",
      IN_TRANSIT: "bg-cyan-100 text-cyan-800",
      OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800",
      DELIVERED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
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
      <div className="card p-8 text-center">
        <div className="text-5xl mb-4">📦</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Active Shipments
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          You don't have any active shipments at the moment.
        </p>
        <Link to="/customer/new-shipment" className="btn-primary inline-block">
          Create New Shipment
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Active Shipments ({parcels.length})
        </h2>
        <Link
          to="/customer/shipments"
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          View All →
        </Link>
      </div>

      <div className="divide-y divide-gray-200">
        {parcels.map((parcel) => (
          <div key={parcel.id} className="p-6 hover:bg-gray-50 transition">
            <div className="flex items-start justify-between gap-4">
              {/* Left: Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getStatusIcon(parcel.status)}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                      parcel.status
                    )}`}
                  >
                    {parcel.status.replace("_", " ")}
                  </span>
                </div>

                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Tracking: {parcel.trackingNumber}
                </p>

                <p className="text-xs text-gray-600 mb-3">
                  <span className="font-medium">From:</span> {parcel.pickupCity || 'N/A'}
                  {" → "}
                  <span className="font-medium">To:</span> {parcel.deliveryCity}
                  {parcel.estimatedDelivery && (
                    <>
                      {" "}
                      • <span className="font-medium">ETA:</span>{" "}
                      {new Date(parcel.estimatedDelivery).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </>
                  )}
                </p>

                {parcel.companyName && (
                  <p className="text-xs text-gray-500">
                    🏢 {parcel.companyName}
                  </p>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex flex-col gap-2">
                <Link
                  to={`/customer/track/${parcel.trackingNumber}`}
                  className="btn-primary text-xs px-3 py-1.5 text-center"
                >
                  Track
                </Link>
                {(parcel.status === "PENDING" || parcel.status === "CONFIRMED") && (
                  <button
                    onClick={() => handleCancel(parcel.id)}
                    disabled={cancelling === parcel.id}
                    className="btn-outline text-xs px-3 py-1.5 text-red-600 border-red-300 hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancelling === parcel.id ? "..." : "Cancel"}
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {parcel.status !== "CANCELLED" && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>Booked</span>
                  <span>In Transit</span>
                  <span>Delivered</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600 transition-all duration-500"
                    style={{
                      width: `${
                        parcel.status === "DELIVERED"
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