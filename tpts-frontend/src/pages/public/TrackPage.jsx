import { useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaBox, FaUsers, FaSearch, FaSpinner, FaExclamationTriangle, FaMapMarkerAlt, FaPhone, FaTruck, FaBuilding, FaWarehouse, FaStar } from "react-icons/fa";
import apiClient from "../../utils/api";

export default function TrackPage() {
  // Track type: "regular" or "group"
  const [trackType, setTrackType] = useState("regular");

  // Regular tracking state
  const [trackingNumber, setTrackingNumber] = useState("");
  const [phoneLastFour, setPhoneLastFour] = useState("");
  const [parcel, setParcel] = useState(null);

  // Group tracking state
  const [groupCode, setGroupCode] = useState("");
  const [receiverPhoneLastFour, setReceiverPhoneLastFour] = useState("");
  const [group, setGroup] = useState(null);

  // Common state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async (e) => {
    e.preventDefault();
    setError("");
    setParcel(null);
    setGroup(null);

    if (trackType === "regular") {
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
    } else {
      // Group tracking
      if (!groupCode) {
        setError("Please enter the group code.");
        return;
      }
      if (!receiverPhoneLastFour || receiverPhoneLastFour.length !== 4) {
        setError("Please enter receiver's phone last 4 digits (exactly 4 characters).");
        return;
      }

      setLoading(true);
      try {
        const response = await apiClient.get(`/groups/code/${groupCode.toUpperCase()}`);
        setGroup(response.data.data);
      } catch (err) {
        setError(
          err.response?.data?.message || "Group not found. Please check your group code."
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleTabChange = (type) => {
    setTrackType(type);
    setError("");
    setParcel(null);
    setGroup(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
          >
            <FaArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <FaMapMarkerAlt className="text-2xl text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Track Your <span className="text-primary-400">Shipment</span></h1>
          <p className="text-white/60">
            Enter your tracking details below
          </p>
        </div>

        {/* Track Form */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 sm:p-8">
          {/* Tabs */}
          <div className="flex mb-6 gap-2">
            <button
              onClick={() => handleTabChange("regular")}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${trackType === "regular"
                ? "bg-white text-gray-900 shadow-lg"
                : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
            >
              <FaBox className={trackType === "regular" ? "text-primary-600" : ""} /> Regular Shipment
            </button>
            <button
              onClick={() => handleTabChange("group")}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${trackType === "group"
                ? "bg-white text-gray-900 shadow-lg"
                : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
            >
              <FaUsers className={trackType === "group" ? "text-primary-600" : ""} /> Group Shipment
            </button>
          </div>

          <form onSubmit={handleTrack} className="space-y-5">
            {trackType === "regular" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Tracking Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., TRK123456"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Receiver's Phone (Last 4 digits) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="XXXX"
                    maxLength={4}
                    value={phoneLastFour}
                    onChange={(e) => setPhoneLastFour(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Group Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., GRP-XXXXX"
                    value={groupCode}
                    onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                  />
                  <p className="mt-1.5 text-xs text-white/50">
                    You can find this code in your booking confirmation email or SMS
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Receiver's Phone (Last 4 digits) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="XXXX"
                    maxLength={4}
                    value={receiverPhoneLastFour}
                    onChange={(e) => setReceiverPhoneLastFour(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </>
            )}

            {error && (
              <div className="rounded-xl bg-red-500/20 backdrop-blur-sm border border-red-400/30 p-4 flex items-start gap-3">
                <FaExclamationTriangle className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-100">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" /> Tracking...
                </>
              ) : (
                <>
                  <FaSearch /> Track {trackType === "regular" ? "Shipment" : "Group Shipment"}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-xs text-white/50 text-center">
              💡 Want live map tracking and more details?{" "}
              <Link to="/login" className="text-primary-400 font-medium hover:text-primary-300">
                Login to your TPTS account
              </Link>
            </p>
          </div>
        </div>

        {/* Regular Parcel Results */}
        {parcel && (
          <div className="mt-8 bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-indigo-600 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Tracking Number</p>
                  <p className="text-lg font-bold">{parcel.trackingNumber}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getParcelStatusBadge(parcel.status)}`}>
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
                {getParcelTimelineSteps(parcel).map((step, idx) => (
                  <li key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${step.completed
                          ? "bg-green-500 text-white"
                          : step.current
                            ? "bg-primary-600 text-white ring-4 ring-primary-100"
                            : "bg-gray-200 text-gray-400"
                          }`}
                      >
                        {step.completed ? "✓" : idx + 1}
                      </div>
                      {idx < getParcelTimelineSteps(parcel).length - 1 && (
                        <div className={`w-0.5 h-10 ${step.completed ? "bg-green-500" : "bg-gray-200"}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className={`text-sm font-semibold ${step.completed || step.current ? "text-gray-900" : "text-gray-400"}`}>
                        {step.title}
                      </p>
                      {step.timestamp && (
                        <p className="text-xs text-gray-500 mt-1">{new Date(step.timestamp).toLocaleString()}</p>
                      )}
                      {step.description && step.completed && (
                        <p className="text-xs text-green-600 mt-1">{step.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Sender & Receiver Details */}
            <div className="px-6 py-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Shipment Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sender */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📤</span>
                    <span className="text-xs font-medium text-blue-700 uppercase">Sender</span>
                  </div>
                  <p className="font-semibold text-gray-900">{parcel.pickupName || "N/A"}</p>
                  {parcel.pickupPhone && (
                    <a
                      href={`tel:${parcel.pickupPhone}`}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      📞 {parcel.pickupPhone}
                    </a>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{parcel.pickupAddress}</p>
                  <p className="text-xs text-gray-500">{parcel.pickupCity}, {parcel.pickupPincode}</p>
                </div>

                {/* Receiver */}
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📥</span>
                    <span className="text-xs font-medium text-green-700 uppercase">Receiver</span>
                  </div>
                  <p className="font-semibold text-gray-900">{parcel.deliveryName || "N/A"}</p>
                  {parcel.deliveryPhone && (
                    <a
                      href={`tel:${parcel.deliveryPhone}`}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      📞 {parcel.deliveryPhone}
                    </a>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{parcel.deliveryAddress}</p>
                  <p className="text-xs text-gray-500">{parcel.deliveryCity}, {parcel.deliveryPincode}</p>
                </div>
              </div>
            </div>

            {/* Agent Details */}
            {parcel.agent && (
              <div className="px-6 py-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Delivery Agent</h3>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 font-bold text-lg">{parcel.agent.fullName?.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{parcel.agent.fullName}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {parcel.agent.vehicleType && <span>🚗 {parcel.agent.vehicleType}</span>}
                        {parcel.agent.vehicleNumber && <span>• {parcel.agent.vehicleNumber}</span>}
                      </div>
                      {parcel.agent.ratingAvg && (
                        <div className="flex items-center gap-1 text-xs mt-1">
                          <span className="text-yellow-500">⭐</span>
                          <span>{parseFloat(parcel.agent.ratingAvg).toFixed(1)}</span>
                          {parcel.agent.totalDeliveries && (
                            <span className="text-gray-400">({parcel.agent.totalDeliveries} deliveries)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {parcel.agent.phone && (
                    <a
                      href={`tel:${parcel.agent.phone}`}
                      className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm"
                    >
                      📞 Call Agent: {parcel.agent.phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Company Details */}
            {parcel.companyName && (
              <div className="px-6 py-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Courier Company</h3>
                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 font-bold text-lg">{parcel.companyName?.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{parcel.companyName}</p>
                    {parcel.companyRating && (
                      <div className="flex items-center gap-1 text-xs mt-1">
                        <span className="text-yellow-500">⭐</span>
                        <span>{parseFloat(parcel.companyRating).toFixed(1)}</span>
                        {parcel.companyTotalRatings && (
                          <span className="text-gray-400">({parcel.companyTotalRatings} reviews)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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

        {/* Group Shipment Results */}
        {group && (
          <div className="mt-8 bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-indigo-600 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Group Code</p>
                  <p className="text-lg font-bold">{group.groupCode}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getGroupStatusBadge(group.status)}`}>
                  {formatGroupStatus(group.status)}
                </span>
              </div>
            </div>

            {/* Route Info */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">From</p>
                  <p className="font-semibold text-gray-900">{group.sourceCity}</p>
                  <p className="text-xs text-gray-500">{group.sourcePincode}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">To</p>
                  <p className="font-semibold text-gray-900">{group.targetCity}</p>
                  <p className="text-xs text-gray-500">{group.targetPincode}</p>
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-bold">{group.companyName?.charAt(0) || "C"}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{group.companyName}</p>
                    <p className="text-xs text-gray-500">Courier Company</p>
                  </div>
                </div>
                {group.companyRating && (
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-yellow-500">⭐</span>
                    <span className="font-medium">{parseFloat(group.companyRating).toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Group Stats */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary-600">{group.currentMembers}</p>
                  <p className="text-xs text-gray-500">Members Joined</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{group.targetMembers}</p>
                  <p className="text-xs text-gray-500">Target Members</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{group.discountPercentage}%</p>
                  <p className="text-xs text-gray-500">Group Discount</p>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="px-6 py-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Shipment Progress</h3>
              <ol className="space-y-4">
                {getGroupTimelineSteps(group).map((step, idx) => (
                  <li key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${step.completed
                          ? "bg-green-500 text-white"
                          : step.current
                            ? "bg-primary-600 text-white ring-4 ring-primary-100"
                            : "bg-gray-200 text-gray-400"
                          }`}
                      >
                        {step.completed ? "✓" : idx + 1}
                      </div>
                      {idx < getGroupTimelineSteps(group).length - 1 && (
                        <div className={`w-0.5 h-10 ${step.completed ? "bg-green-500" : "bg-gray-200"}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className={`text-sm font-semibold ${step.completed || step.current ? "text-gray-900" : "text-gray-400"}`}>
                        {step.title}
                      </p>
                      {step.timestamp && (
                        <p className="text-xs text-gray-500 mt-1">{new Date(step.timestamp).toLocaleString()}</p>
                      )}
                      {step.current && step.description && (
                        <p className="text-xs text-primary-600 mt-1">{step.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Agent Info (if assigned) */}
            {(group.pickupAgentName || group.deliveryAgentName) && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Assigned Agents</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {group.pickupAgentName && (
                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-orange-600">🚚</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Pickup Agent</p>
                          <p className="font-medium text-gray-900">{group.pickupAgentName}</p>
                        </div>
                      </div>
                      {group.pickupAgentPhone && (
                        <a
                          href={`tel:${group.pickupAgentPhone}`}
                          className="mt-2 flex items-center gap-2 text-sm text-primary-600 hover:underline"
                        >
                          📞 {group.pickupAgentPhone}
                        </a>
                      )}
                    </div>
                  )}
                  {group.deliveryAgentName && (
                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600">📦</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Delivery Agent</p>
                          <p className="font-medium text-gray-900">{group.deliveryAgentName}</p>
                        </div>
                      </div>
                      {group.deliveryAgentPhone && (
                        <a
                          href={`tel:${group.deliveryAgentPhone}`}
                          className="mt-2 flex items-center gap-2 text-sm text-primary-600 hover:underline"
                        >
                          📞 {group.deliveryAgentPhone}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Company Contact Details */}
            <div className="px-6 py-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Company Contact</h3>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-lg">{group.companyName?.charAt(0) || "C"}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{group.companyName}</p>
                  <p className="text-xs text-gray-500">Courier Company</p>
                  <p className="text-xs text-gray-500 mt-1">
                    For support, login to your account or contact the company directly.
                  </p>
                </div>
              </div>
            </div>

            {/* Warehouse Info (if applicable) */}
            {group.warehouseCity && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600">🏢</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Warehouse / Hub Location</p>
                    <p className="font-medium text-gray-900">{group.warehouseAddress || group.warehouseCity}</p>
                    <p className="text-xs text-gray-500">{group.warehouseCity}, {group.warehousePincode}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Login CTA */}
            <div className="bg-amber-50 border-t border-amber-200 px-6 py-4">
              <p className="text-sm text-amber-900 text-center">
                🗺️ Want to see live map tracking and detailed parcel info?{" "}
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

// Helper functions for Regular Parcel
function getParcelStatusBadge(status) {
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

function getParcelTimelineSteps(parcel) {
  // Map statuses to step indices
  const statusToStepIndex = {
    "PENDING": -1,
    "CONFIRMED": 0,
    "ASSIGNED": 1,
    "PICKEDUP": 2,
    "INTRANSIT": 3,
    "OUTFORDELIVERY": 4,
    "OUT_FOR_DELIVERY": 4,
    "DELIVERED": 5,
  };

  const currentStepIndex = statusToStepIndex[parcel.status] ?? -1;
  const isDelivered = parcel.status === "DELIVERED";

  const steps = [
    {
      title: "Order Confirmed",
      timestamp: parcel.confirmedAt || parcel.createdAt,
      stepIndex: 0
    },
    {
      title: "Agent Assigned",
      timestamp: parcel.assignedAt,
      stepIndex: 1
    },
    {
      title: "Picked Up",
      timestamp: parcel.pickedUpAt,
      stepIndex: 2
    },
    {
      title: "In Transit",
      // Use updatedAt as approximation if step is completed
      timestamp: currentStepIndex > 3 ? parcel.updatedAt : null,
      stepIndex: 3
    },
    {
      title: "Out for Delivery",
      // Use updatedAt as approximation if step is completed
      timestamp: currentStepIndex > 4 ? parcel.updatedAt : null,
      stepIndex: 4
    },
    {
      title: "Delivered",
      timestamp: parcel.deliveredAt,
      stepIndex: 5,
      description: isDelivered ? "Parcel delivered successfully! ✅" : null
    },
  ];

  return steps.map((step) => ({
    ...step,
    completed: step.stepIndex < currentStepIndex || (step.stepIndex === currentStepIndex && isDelivered),
    current: step.stepIndex === currentStepIndex && !isDelivered,
  }));
}

// Helper functions for Group Shipment
function getGroupStatusBadge(status) {
  const badges = {
    OPEN: "bg-green-100 text-green-800",
    FULL: "bg-blue-100 text-blue-800",
    CONFIRMED: "bg-indigo-100 text-indigo-800",
    PICKUP_ASSIGNED: "bg-purple-100 text-purple-800",
    PICKUP_IN_PROGRESS: "bg-orange-100 text-orange-800",
    AT_WAREHOUSE: "bg-cyan-100 text-cyan-800",
    DELIVERY_ASSIGNED: "bg-teal-100 text-teal-800",
    DELIVERY_IN_PROGRESS: "bg-amber-100 text-amber-800",
    DELIVERED: "bg-green-100 text-green-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    EXPIRED: "bg-gray-100 text-gray-800",
  };
  return badges[status] || "bg-gray-100 text-gray-800";
}

function formatGroupStatus(status) {
  const statusMap = {
    OPEN: "Open - Accepting Members",
    FULL: "Full - Ready to Ship",
    CONFIRMED: "Confirmed",
    PICKUP_ASSIGNED: "Pickup Agent Assigned",
    PICKUP_IN_PROGRESS: "Pickup In Progress",
    AT_WAREHOUSE: "At Warehouse",
    DELIVERY_ASSIGNED: "Delivery Agent Assigned",
    DELIVERY_IN_PROGRESS: "Out for Delivery",
    DELIVERED: "Delivered ✅",
    COMPLETED: "Delivered ✅",
    CANCELLED: "Cancelled",
    EXPIRED: "Expired",
  };
  return statusMap[status] || status;
}

function getGroupTimelineSteps(group) {
  // Map backend statuses to our simplified timeline steps
  const statusToStepIndex = {
    "OPEN": 0,
    "FULL": 1,
    "CONFIRMED": 1,
    "PICKUP_ASSIGNED": 2,
    "PICKUP_IN_PROGRESS": 3,
    "AT_WAREHOUSE": 4,
    "DELIVERY_ASSIGNED": 5,
    "DELIVERY_IN_PROGRESS": 6,
    "OUT_FOR_DELIVERY": 6,
    "DELIVERED": 7,
    "COMPLETED": 7, // COMPLETED = DELIVERED
  };

  const currentStepIndex = statusToStepIndex[group.status] ?? -1;
  const isDelivered = group.status === "DELIVERED" || group.status === "COMPLETED";

  const steps = [
    {
      title: "Group Created",
      timestamp: group.createdAt,
      stepIndex: 0
    },
    {
      title: "Group Full",
      timestamp: currentStepIndex >= 1 ? (group.updatedAt || group.createdAt) : null,
      stepIndex: 1,
      description: "All members joined"
    },
    {
      title: "Pickup Assigned",
      timestamp: group.pickupAgentId ? group.updatedAt : null,
      stepIndex: 2
    },
    {
      title: "Pickup Started",
      timestamp: group.pickupStartedAt,
      stepIndex: 3
    },
    {
      title: "At Warehouse",
      timestamp: group.pickupCompletedAt,
      stepIndex: 4,
      description: "All packages collected"
    },
    {
      title: "Delivery Assigned",
      timestamp: group.deliveryAgentId ? group.updatedAt : null,
      stepIndex: 5
    },
    {
      title: "Out for Delivery",
      timestamp: group.deliveryStartedAt,
      stepIndex: 6
    },
    {
      title: "Delivered",
      timestamp: group.deliveryCompletedAt,
      stepIndex: 7,
      description: isDelivered ? "All packages delivered! ✅" : "Awaiting delivery"
    },
  ];

  return steps.map((step) => ({
    ...step,
    completed: step.stepIndex < currentStepIndex || (step.stepIndex === currentStepIndex && isDelivered),
    current: step.stepIndex === currentStepIndex && !isDelivered,
  }));
}
