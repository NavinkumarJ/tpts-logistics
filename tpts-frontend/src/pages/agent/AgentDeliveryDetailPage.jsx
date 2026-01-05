import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getParcelDetail, updateParcelStatus, verifyDeliveryOtp, getCurrentAgent } from "../../services/agentService";
import { getRoute } from "../../services/routingService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAgentLocationSharing } from "../../hooks/useAgentLocation";
import {
    FaBox, FaMapMarkerAlt, FaPhone, FaArrowLeft, FaCheck,
    FaRoute, FaExternalLinkAlt, FaClock, FaTruck, FaToggleOn, FaToggleOff, FaBroadcastTower
} from "react-icons/fa";
import ChatPanel from "../../components/chat/ChatPanel";

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const pickupIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

const deliveryIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

const agentIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [30, 49],
    iconAnchor: [15, 49],
    popupAnchor: [1, -34],
});

// Component to update map view when agent location changes
function MapUpdater({ position, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (position && position[0] && position[1]) {
            map.setView(position, zoom || 14, { animate: true });
        }
    }, [map, position, zoom]);
    return null;
}

const STATUS_FLOW = [
    { value: "ASSIGNED", label: "Assigned", color: "purple" },
    { value: "PICKED_UP", label: "Picked Up", color: "blue" },
    { value: "IN_TRANSIT", label: "In Transit", color: "orange" },
    { value: "OUT_FOR_DELIVERY", label: "Out for Delivery", color: "teal" },
    { value: "DELIVERED", label: "Delivered", color: "green" },
];

// Valid status transitions based on backend rules
const VALID_TRANSITIONS = {
    "ASSIGNED": ["PICKED_UP"],
    "PICKED_UP": ["IN_TRANSIT", "OUT_FOR_DELIVERY"],
    "IN_TRANSIT": ["OUT_FOR_DELIVERY"],
    "OUT_FOR_DELIVERY": ["DELIVERED"],
};

// Get valid next statuses for current status
const getValidNextStatuses = (currentStatus) => {
    const validValues = VALID_TRANSITIONS[currentStatus] || [];
    return STATUS_FLOW.filter(s => validValues.includes(s.value));
};


export default function AgentDeliveryDetailPage() {
    const { parcelId } = useParams();
    const navigate = useNavigate();
    const [parcel, setParcel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [showPickupOtpModal, setShowPickupOtpModal] = useState(false);
    const [agentId, setAgentId] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [routeInfo, setRouteInfo] = useState(null);

    // Location sharing hook
    const {
        isSharing,
        currentLocation,
        accuracy,
        lastUpdate,
        toggleSharing,
        error: locationError,
    } = useAgentLocationSharing(agentId, {
        intervalMs: 10000, // Update every 10 seconds when on delivery
    });

    // Fetch road route when location or parcel changes
    const fetchRoadRoute = useCallback(async () => {
        if (!currentLocation || !parcel) return;

        let destLat, destLng;

        // Determine destination based on status
        if (parcel.status === "ASSIGNED") {
            destLat = parcel.pickupLatitude;
            destLng = parcel.pickupLongitude;
        } else if (["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(parcel.status)) {
            destLat = parcel.deliveryLatitude;
            destLng = parcel.deliveryLongitude;
        } else {
            return;
        }

        if (!destLat || !destLng) return;

        try {
            const route = await getRoute(
                currentLocation.latitude,
                currentLocation.longitude,
                destLat,
                destLng
            );

            if (route) {
                setRouteCoordinates(route.coordinates);
                setRouteInfo({
                    distance: route.distance,
                    duration: route.duration,
                    durationText: route.durationText,
                });
            }
        } catch (error) {
            console.error("Failed to fetch road route:", error);
        }
    }, [currentLocation, parcel]);

    // Fetch route when location changes
    useEffect(() => {
        if (currentLocation && parcel) {
            fetchRoadRoute();
        }
    }, [currentLocation, parcel, fetchRoadRoute]);

    useEffect(() => {
        fetchParcel();
        fetchAgentId();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parcelId]);

    const fetchAgentId = async () => {
        try {
            const agent = await getCurrentAgent();
            setAgentId(agent?.id);
        } catch (err) {
            console.error("Failed to get agent ID for location sharing");
        }
    };

    const fetchParcel = async () => {
        setLoading(true);
        try {
            const data = await getParcelDetail(parcelId);
            setParcel(data);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load parcel details");
                navigate("/agent/deliveries");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        // OTP required for pickup and delivery
        if (newStatus === "DELIVERED") {
            setShowOtpModal(true);
            return;
        }
        if (newStatus === "PICKED_UP") {
            setShowPickupOtpModal(true);
            return;
        }

        setUpdatingStatus(true);
        try {
            await updateParcelStatus(parcelId, { status: newStatus });
            toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
            fetchParcel();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update status");
        } finally {
            setUpdatingStatus(false);
        }
    };

    const openNavigation = (lat, lng, label) => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        window.open(url, "_blank");
    };

    const getCurrentStatusIndex = () => {
        return STATUS_FLOW.findIndex(s => s.value === parcel?.status);
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                <p className="mt-3 text-sm text-white/60">Loading delivery details...</p>
            </div>
        );
    }

    if (!parcel) return null;

    // Default coordinates if not available
    const pickupLat = parcel.pickupLatitude || 13.0827;
    const pickupLng = parcel.pickupLongitude || 80.2707;
    const deliveryLat = parcel.deliveryLatitude || 12.9716;
    const deliveryLng = parcel.deliveryLongitude || 77.5946;
    const centerLat = (pickupLat + deliveryLat) / 2;
    const centerLng = (pickupLng + deliveryLng) / 2;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/agent/deliveries" className="p-2 hover:bg-white/10 rounded-lg">
                        <FaArrowLeft className="text-white/60" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Delivery Details</h1>
                        <p className="text-sm text-white/50">{parcel.trackingNumber}</p>
                    </div>
                </div>

                {/* Location Sharing Toggle */}
                <button
                    onClick={toggleSharing}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${isSharing
                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                        : "bg-white/10 text-white/70 hover:bg-white/15 border border-white/20"
                        }`}
                >
                    {isSharing ? (
                        <>
                            <FaBroadcastTower className="animate-pulse" />
                            <span className="hidden sm:inline">Sharing</span>
                        </>
                    ) : (
                        <>
                            <FaBroadcastTower />
                            <span className="hidden sm:inline">Share Location</span>
                        </>
                    )}
                </button>
            </div>

            {/* Location Sharing Status Banner */}
            {isSharing && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 flex items-center gap-3">
                    <FaBroadcastTower className="text-green-400 animate-pulse" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-green-300">
                            📍 Live location sharing active - Customer can see you!
                        </p>
                        <p className="text-xs text-green-400">
                            Accuracy: ±{Math.round(accuracy || 0)}m •
                            Last update: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Starting...'}
                        </p>
                    </div>
                    <button
                        onClick={toggleSharing}
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                    >
                        Stop
                    </button>
                </div>
            )}

            {/* Map Section */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden">
                {/* Route Info Banner */}
                {routeInfo && currentLocation && (
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <FaRoute className="text-blue-200" />
                                <span className="font-medium">{routeInfo.distance} km</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FaClock className="text-blue-200" />
                                <span className="font-medium">{routeInfo.durationText}</span>
                            </div>
                        </div>
                        <span className="text-xs bg-white/20 px-3 py-1 rounded-full">
                            🛣️ Road Route
                        </span>
                    </div>
                )}
                <div className="h-64 md:h-80">
                    <MapContainer
                        center={[centerLat, centerLng]}
                        zoom={10}
                        style={{ height: "100%", width: "100%" }}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap contributors'
                        />
                        {/* Dynamic map view updater */}
                        {currentLocation && (
                            <MapUpdater
                                position={[currentLocation.latitude, currentLocation.longitude]}
                                zoom={14}
                            />
                        )}
                        {/* Pickup marker */}
                        <Marker position={[pickupLat, pickupLng]} icon={pickupIcon}>
                            <Popup>
                                <strong>📦 Pickup</strong><br />
                                {parcel.pickupName}<br />
                                {parcel.pickupCity}
                            </Popup>
                        </Marker>
                        {/* Delivery marker */}
                        <Marker position={[deliveryLat, deliveryLng]} icon={deliveryIcon}>
                            <Popup>
                                <strong>🏠 Delivery</strong><br />
                                {parcel.deliveryName}<br />
                                {parcel.deliveryCity}
                            </Popup>
                        </Marker>
                        {/* Agent's current location marker */}
                        {currentLocation && (
                            <Marker position={[currentLocation.latitude, currentLocation.longitude]} icon={agentIcon}>
                                <Popup>
                                    <strong>🚚 You are here</strong><br />
                                    Accuracy: ±{Math.round(accuracy || 0)}m
                                </Popup>
                            </Marker>
                        )}
                        {/* OSRM Road Route - solid line following actual roads */}
                        {routeCoordinates.length > 0 && (
                            <Polyline
                                positions={routeCoordinates}
                                color={parcel.status === "ASSIGNED" ? "#3B82F6" : "#10B981"}
                                weight={5}
                                opacity={0.9}
                            />
                        )}
                        {/* Fallback: simple dashed line when no route available */}
                        {routeCoordinates.length === 0 && !currentLocation && (
                            <Polyline
                                positions={[[pickupLat, pickupLng], [deliveryLat, deliveryLng]]}
                                color="#6366f1"
                                weight={3}
                                dashArray="10, 10"
                            />
                        )}
                    </MapContainer>
                </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FaClock className="text-orange-400" /> Status Timeline
                </h3>
                <div className="flex items-center justify-between relative">
                    <div className="absolute top-4 left-0 right-0 h-1 bg-white/20 z-0"></div>
                    {STATUS_FLOW.map((status, idx) => {
                        const currentIdx = getCurrentStatusIndex();
                        const isCompleted = idx <= currentIdx;
                        const isCurrent = idx === currentIdx;

                        // Use explicit color classes (Tailwind doesn't support dynamic)
                        const colorClasses = {
                            purple: "bg-purple-500",
                            blue: "bg-blue-500",
                            orange: "bg-orange-500",
                            teal: "bg-teal-500",
                            green: "bg-green-500",
                        };
                        const bgClass = colorClasses[status.color] || "bg-gray-500";

                        return (
                            <div key={status.value} className="relative z-10 flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                    ${isCompleted ? `${bgClass} text-white` : "bg-white/20 text-white/50"}
                                    ${isCurrent ? "ring-4 ring-offset-2 ring-offset-slate-900 ring-orange-400" : ""}`}>
                                    {isCompleted ? "✓" : idx + 1}
                                </div>
                                <p className={`text-xs mt-2 text-center max-w-[80px]
                                    ${isCurrent ? "font-bold text-orange-400" : "text-white/50"}`}>
                                    {status.label}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Route Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pickup */}
                <div className="bg-green-500/20 backdrop-blur-xl rounded-xl p-5 border border-green-500/30">
                    <div className="flex items-center gap-2 text-green-400 font-medium mb-3">
                        <FaMapMarkerAlt /> PICKUP LOCATION
                    </div>
                    <p className="font-semibold text-white">{parcel.pickupName}</p>
                    <p className="text-sm text-white/70 mt-1">{parcel.pickupAddress}</p>
                    <p className="text-sm text-white/50">{parcel.pickupCity} - {parcel.pickupPincode}</p>
                    {parcel.pickupPhone && (
                        <a href={`tel:${parcel.pickupPhone}`} className="mt-3 inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300">
                            <FaPhone /> {parcel.pickupPhone}
                        </a>
                    )}
                    <button
                        onClick={() => openNavigation(pickupLat, pickupLng, "Pickup")}
                        className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 font-medium"
                    >
                        <FaRoute /> Navigate to Pickup <FaExternalLinkAlt className="text-xs" />
                    </button>
                </div>

                {/* Delivery */}
                <div className="bg-blue-500/20 backdrop-blur-xl rounded-xl p-5 border border-blue-500/30">
                    <div className="flex items-center gap-2 text-blue-400 font-medium mb-3">
                        <FaMapMarkerAlt /> DELIVERY LOCATION
                    </div>
                    <p className="font-semibold text-white">{parcel.deliveryName}</p>
                    <p className="text-sm text-white/70 mt-1">{parcel.deliveryAddress}</p>
                    <p className="text-sm text-white/50">{parcel.deliveryCity} - {parcel.deliveryPincode}</p>
                    {parcel.deliveryPhone && (
                        <a href={`tel:${parcel.deliveryPhone}`} className="mt-3 inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                            <FaPhone /> {parcel.deliveryPhone}
                        </a>
                    )}
                    <button
                        onClick={() => openNavigation(deliveryLat, deliveryLng, "Delivery")}
                        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 font-medium"
                    >
                        <FaRoute /> Navigate to Delivery <FaExternalLinkAlt className="text-xs" />
                    </button>
                </div>
            </div>

            {/* Package Info */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FaBox className="text-orange-400" /> Package Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                        <p className="text-white/50 text-xs">Weight</p>
                        <p className="font-bold text-white">{parcel.weightKg || "—"} kg</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                        <p className="text-white/50 text-xs">Total Amount</p>
                        <p className="font-bold text-white">
                            ₹{(parcel.finalPrice || parcel.totalAmount || parcel.basePrice || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-white/40">(incl. GST)</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                        <p className="text-white/50 text-xs">Your Earnings</p>
                        <p className="font-bold text-green-400">
                            ₹{((parcel.finalPrice || parcel.totalAmount || parcel.basePrice || 0) * 0.20).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-white/40">(20% commission)</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                        <p className="text-white/50 text-xs">Package Type</p>
                        <p className="font-bold text-white">{parcel.packageType || "STANDARD"}</p>
                    </div>
                </div>
                {parcel.description && (
                    <p className="mt-4 text-sm text-white/70">
                        <strong className="text-white">Notes:</strong> {parcel.description}
                    </p>
                )}
            </div>

            {/* Proof Photos - Show if any photos exist */}
            {(parcel.pickupPhotoUrl || parcel.deliveryPhotoUrl) && (
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        📸 Proof Photos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Pickup Photo */}
                        {parcel.pickupPhotoUrl && (
                            <div className="space-y-2">
                                <p className="text-sm text-white/70 font-medium flex items-center gap-2">
                                    📦 Pickup Photo
                                </p>
                                <div className="relative group">
                                    <img
                                        src={parcel.pickupPhotoUrl}
                                        alt="Pickup proof"
                                        className="w-full h-48 object-cover rounded-lg border border-white/20"
                                    />
                                    <a
                                        href={parcel.pickupPhotoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                                    >
                                        <span className="text-white font-medium text-sm">🔍 View Full Size</span>
                                    </a>
                                </div>
                                {parcel.pickedUpAt && (
                                    <p className="text-xs text-white/50">
                                        Picked up: {new Date(parcel.pickedUpAt).toLocaleString("en-IN")}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Delivery Photo */}
                        {parcel.deliveryPhotoUrl && (
                            <div className="space-y-2">
                                <p className="text-sm text-white/70 font-medium flex items-center gap-2">
                                    ✅ Delivery Photo
                                </p>
                                <div className="relative group">
                                    <img
                                        src={parcel.deliveryPhotoUrl}
                                        alt="Delivery proof"
                                        className="w-full h-48 object-cover rounded-lg border border-white/20"
                                    />
                                    <a
                                        href={parcel.deliveryPhotoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                                    >
                                        <span className="text-white font-medium text-sm">🔍 View Full Size</span>
                                    </a>
                                </div>
                                {parcel.deliveredAt && (
                                    <p className="text-xs text-white/50">
                                        Delivered: {new Date(parcel.deliveredAt).toLocaleString("en-IN")}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            {parcel.status !== "DELIVERED" && parcel.status !== "CANCELLED" && (
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <FaTruck className="text-orange-400" /> Update Status
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {getValidNextStatuses(parcel.status).map((status) => {
                            // Use explicit color classes (Tailwind doesn't support dynamic)
                            const buttonClasses = {
                                purple: "bg-purple-600 hover:bg-purple-700",
                                blue: "bg-blue-600 hover:bg-blue-700",
                                orange: "bg-orange-600 hover:bg-orange-700",
                                teal: "bg-teal-600 hover:bg-teal-700",
                                green: "bg-green-600 hover:bg-green-700",
                            };
                            const btnClass = buttonClasses[status.color] || "bg-gray-600 hover:bg-gray-700";

                            return (
                                <button
                                    key={status.value}
                                    onClick={() => handleStatusUpdate(status.value)}
                                    disabled={updatingStatus}
                                    className={`px-5 py-2.5 rounded-lg text-sm font-medium text-white ${btnClass} disabled:opacity-50 flex items-center gap-2`}
                                >
                                    <FaCheck /> Mark as {status.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* OTP Verification Modal - Delivery */}
            {showOtpModal && (
                <OtpVerificationModal
                    parcelId={parcelId}
                    trackingNumber={parcel?.trackingNumber}
                    onClose={() => setShowOtpModal(false)}
                    onSuccess={() => {
                        setShowOtpModal(false);
                        fetchParcel();
                        toast.success("Delivery completed successfully!");
                    }}
                    isPickup={false}
                />
            )}

            {/* OTP Verification Modal - Pickup */}
            {showPickupOtpModal && (
                <OtpVerificationModal
                    parcelId={parcelId}
                    trackingNumber={parcel?.trackingNumber}
                    onClose={() => setShowPickupOtpModal(false)}
                    onSuccess={() => {
                        setShowPickupOtpModal(false);
                        fetchParcel();
                        toast.success("Package picked up successfully!");
                    }}
                    isPickup={true}
                />
            )}

            {/* Chat with Customer - only show for active deliveries */}
            {parcel.status !== "DELIVERED" && parcel.status !== "CANCELLED" && (
                <ChatPanel
                    type="parcel"
                    id={parseInt(parcelId)}
                    receiverName={parcel.pickupName || "Customer"}
                    isAgent={true}
                    isMinimized={true}
                />
            )}
        </div>
    );
}

// OTP Verification Modal Component - handles both pickup and delivery with photo proof
function OtpVerificationModal({ parcelId, trackingNumber, onClose, onSuccess, isPickup = false }) {
    const [otp, setOtp] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState("");
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);


    const title = isPickup ? "Verify Pickup" : "Verify Delivery";
    const subtitle = isPickup
        ? "Enter OTP from sender"
        : "Enter OTP received by customer";
    const description = isPickup
        ? "Ask the sender for the 6-digit pickup OTP sent to their phone."
        : "Ask the receiver for the 6-digit delivery OTP sent to their phone.";

    const handlePhotoCapture = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleVerify = async () => {
        if (otp.length < 4) {
            setError("Please enter a valid OTP");
            return;
        }
        if (!photo) {
            setError("Please take a photo proof");
            return;
        }

        setVerifying(true);
        setError("");
        try {
            // Import the new functions dynamically to avoid circular imports
            const { verifyPickupWithPhoto, verifyDeliveryWithPhoto } = await import("../../services/agentService");

            // Use backend endpoints that handle Cloudinary upload
            if (isPickup) {
                await verifyPickupWithPhoto(parcelId, otp, photo, trackingNumber);
            } else {
                await verifyDeliveryWithPhoto(parcelId, otp, photo, trackingNumber);
            }
            onSuccess();
        } catch (err) {
            const message = err.response?.data?.message || err.message || "Verification failed. Please try again.";
            setError(message);
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto border border-white/10">
                <div className={`bg-gradient-to-r ${isPickup ? "from-blue-600 to-indigo-600" : "from-green-600 to-emerald-600"} text-white px-6 py-4 rounded-t-2xl sticky top-0`}>
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <p className={`text-sm ${isPickup ? "text-blue-200" : "text-green-200"}`}>{subtitle}</p>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-white/70">
                        {description}
                    </p>

                    {/* OTP Input */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">OTP Code *</label>
                        <input
                            type="text"
                            maxLength="6"
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            className="w-full px-4 py-3 text-center text-2xl tracking-widest font-mono bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Photo Capture */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            📷 {isPickup ? "Pickup" : "Delivery"} Photo Proof *
                        </label>
                        {photoPreview ? (
                            <div className="relative">
                                <img
                                    src={photoPreview}
                                    alt="Proof"
                                    className="w-full h-40 object-cover rounded-xl border-2 border-white/20"
                                />
                                <button
                                    onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-red-600"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isPickup ? "border-blue-400/50 bg-blue-500/10 hover:bg-blue-500/20" : "border-green-400/50 bg-green-500/10 hover:bg-green-500/20"}`}>
                                <div className="flex flex-col items-center justify-center">
                                    <span className="text-3xl mb-2">📸</span>
                                    <span className={`text-sm font-medium ${isPickup ? "text-blue-300" : "text-green-300"}`}>
                                        Tap to take photo
                                    </span>
                                    <span className="text-xs text-white/50">Camera or Gallery</span>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handlePhotoCapture}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm bg-red-500/20 p-2 rounded-lg border border-red-500/30">{error}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition font-medium"
                            disabled={verifying}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleVerify}
                            disabled={verifying || otp.length < 4 || !photo}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-white font-medium disabled:opacity-50 transition ${isPickup ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}
                        >
                            {verifying ? "Verifying..." : `Verify & ${isPickup ? "Pickup" : "Complete"}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
