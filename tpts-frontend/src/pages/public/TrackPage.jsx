import { useState } from "react";
import apiClient from "../../utils/api";

export default function TrackPage() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [phoneLastFour, setPhoneLastFour] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parcel, setParcel] = useState(null);

  const handleTrack = async (e) => {
    e.preventDefault();
    setError("");
    setParcel(null);

    if (!trackingNumber || !phoneLastFour) {
      setError("Please enter both tracking number and phone last 4 digits.");
      return;
    }

    if (phoneLastFour.length !== 4) {
      setError("Phone last 4 digits must be exactly 4 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.get("/parcels/track", {
        params: { trackingNumber, phoneLastFour },
      });
      setParcel(response.data.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Parcel not found. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📍 Track Your Shipment</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your tracking details below
          </p>
        </div>

        {/* Track Form */}
        <div className="card p-6 sm:p-8 shadow-lg">
          <form onSubmit={handleTrack} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tracking Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input text-base"
                placeholder="e.g., TRK123456"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (Last 4 digits) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input text-base"
                placeholder="XXXX"
                maxLength={4}
                value={phoneLastFour}
                onChange={(e) => setPhoneLastFour(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-600">⚠️ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "🔄 Tracking..." : "🔍 Track Shipment"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              💡 Want live map tracking and more details?{" "}
              <a href="/login" className="text-primary-600 font-medium hover:underline">
                Login to your TPTS account
              </a>
            </p>
          </div>
        </div>

        {/* Tracking Results */}
        {parcel && (
          <div className="mt-8 card shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-primary-600 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Tracking Number</p>
                  <p className="text-lg font-bold">{parcel.trackingNumber}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(parcel.status)}`}>
                  {parcel.status}
                </span>
              </div>
            </div>

            {/* Route Info */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">From</p>
                  <p className="font-semibold text-gray-900">{parcel.pickupCity}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">To</p>
                  <p className="font-semibold text-gray-900">{parcel.deliveryCity}</p>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="px-6 py-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Delivery Progress</h3>
              <ol className="space-y-4">
                {getTimelineSteps(parcel).map((step, idx) => (
                  <li key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                          step.completed
                            ? "bg-success-500 text-white"
                            : step.current
                            ? "bg-primary-600 text-white ring-4 ring-primary-100"
                            : "bg-gray-200 text-gray-400"
                        }`}
                      >
                        {step.completed ? "✓" : idx + 1}
                      </div>
                      {idx < getTimelineSteps(parcel).length - 1 && (
                        <div className={`w-0.5 h-10 ${step.completed ? "bg-success-500" : "bg-gray-200"}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className={`text-sm font-semibold ${step.completed || step.current ? "text-gray-900" : "text-gray-400"}`}>
                        {step.title}
                      </p>
                      {step.timestamp && (
                        <p className="text-xs text-gray-500 mt-1">{new Date(step.timestamp).toLocaleString()}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Login CTA */}
            <div className="bg-amber-50 border-t border-amber-200 px-6 py-4">
              <p className="text-sm text-amber-900 text-center">
                🗺️ Want to see live map tracking and chat with your delivery agent?{" "}
                <a href="/login" className="font-semibold text-amber-700 hover:underline">
                  Login for full tracking
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Helper functions
function getStatusBadge(status) {
  const badges = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    ASSIGNED: "bg-indigo-100 text-indigo-800",
    PICKEDUP: "bg-purple-100 text-purple-800",
    INTRANSIT: "bg-cyan-100 text-cyan-800",
    OUTFORDELIVERY: "bg-orange-100 text-orange-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    RETURNED: "bg-gray-100 text-gray-800",
  };
  return badges[status] || "bg-gray-100 text-gray-800";
}

function getTimelineSteps(parcel) {
  const steps = [
    { title: "Order Confirmed", timestamp: parcel.confirmedAt, status: "CONFIRMED" },
    { title: "Agent Assigned", timestamp: parcel.assignedAt, status: "ASSIGNED" },
    { title: "Picked Up", timestamp: parcel.pickedUpAt, status: "PICKEDUP" },
    { title: "In Transit", timestamp: null, status: "INTRANSIT" },
    { title: "Out for Delivery", timestamp: null, status: "OUTFORDELIVERY" },
    { title: "Delivered", timestamp: parcel.deliveredAt, status: "DELIVERED" },
  ];

  const statusOrder = ["PENDING", "CONFIRMED", "ASSIGNED", "PICKEDUP", "INTRANSIT", "OUTFORDELIVERY", "DELIVERED"];
  const currentIndex = statusOrder.indexOf(parcel.status);

  return steps.map((step, idx) => ({
    ...step,
    completed: idx < currentIndex || (idx === currentIndex && step.timestamp),
    current: idx === currentIndex,
  }));
}
