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
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading delivery details...</p>
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
                    <Link to="/agent/deliveries" className="p-2 hover:bg-gray-100 rounded-lg">
                        <FaArrowLeft className="text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Delivery Details</h1>
                        <p className="text-sm text-gray-500">{parcel.trackingNumber}</p>
                    </div>
                </div>

                {/* Location Sharing Toggle */}
                <button
                    onClick={toggleSharing}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${isSharing
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                    <FaBroadcastTower className="text-green-600 animate-pulse" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">
                            📍 Live location sharing active - Customer can see you!
                        </p>
                        <p className="text-xs text-green-600">
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
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
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
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaClock className="text-orange-500" /> Status Timeline
                </h3>
                <div className="flex items-center justify-between relative">
                    <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 z-0"></div>
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
                                    ${isCompleted ? `${bgClass} text-white` : "bg-gray-200 text-gray-500"}
                                    ${isCurrent ? "ring-4 ring-offset-2 ring-orange-300" : ""}`}>
                                    {isCompleted ? "✓" : idx + 1}
                                </div>
                                <p className={`text-xs mt-2 text-center max-w-[80px]
                                    ${isCurrent ? "font-bold text-orange-600" : "text-gray-500"}`}>
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
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 font-medium mb-3">
                        <FaMapMarkerAlt /> PICKUP LOCATION
                    </div>
                    <p className="font-semibold text-gray-900">{parcel.pickupName}</p>
                    <p className="text-sm text-gray-600 mt-1">{parcel.pickupAddress}</p>
                    <p className="text-sm text-gray-500">{parcel.pickupCity} - {parcel.pickupPincode}</p>
                    {parcel.pickupPhone && (
                        <a href={`tel:${parcel.pickupPhone}`} className="mt-3 inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700">
                            <FaPhone /> {parcel.pickupPhone}
                        </a>
                    )}
                    <button
                        onClick={() => openNavigation(pickupLat, pickupLng, "Pickup")}
                        className="mt-4 w-full btn-primary flex items-center justify-center gap-2"
                    >
                        <FaRoute /> Navigate to Pickup <FaExternalLinkAlt className="text-xs" />
                    </button>
                </div>

                {/* Delivery */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700 font-medium mb-3">
                        <FaMapMarkerAlt /> DELIVERY LOCATION
                    </div>
                    <p className="font-semibold text-gray-900">{parcel.deliveryName}</p>
                    <p className="text-sm text-gray-600 mt-1">{parcel.deliveryAddress}</p>
                    <p className="text-sm text-gray-500">{parcel.deliveryCity} - {parcel.deliveryPincode}</p>
                    {parcel.deliveryPhone && (
                        <a href={`tel:${parcel.deliveryPhone}`} className="mt-3 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                            <FaPhone /> {parcel.deliveryPhone}
                        </a>
                    )}
                    <button
                        onClick={() => openNavigation(deliveryLat, deliveryLng, "Delivery")}
                        className="mt-4 w-full btn-primary flex items-center justify-center gap-2"
                    >
                        <FaRoute /> Navigate to Delivery <FaExternalLinkAlt className="text-xs" />
                    </button>
                </div>
            </div>

            {/* Package Info */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaBox className="text-orange-500" /> Package Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Weight</p>
                        <p className="font-bold text-gray-900">{parcel.weightKg || "—"} kg</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Total Amount</p>
                        <p className="font-bold text-gray-900">
                            ₹{(parcel.finalPrice || parcel.totalAmount || parcel.basePrice || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500">(incl. GST)</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Your Earnings</p>
                        <p className="font-bold text-green-600">
                            ₹{((parcel.finalPrice || parcel.totalAmount || parcel.basePrice || 0) * 0.20).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500">(20% commission)</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Package Type</p>
                        <p className="font-bold text-gray-900">{parcel.packageType || "STANDARD"}</p>
                    </div>
                </div>
                {parcel.description && (
                    <p className="mt-4 text-sm text-gray-600">
                        <strong>Notes:</strong> {parcel.description}
                    </p>
                )}
            </div>

            {/* Sender & Receiver Details */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaPhone className="text-orange-500" /> Contact Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sender Details */}
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                            📦 Sender (Pickup)
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div>
                                <p className="text-gray-500 text-xs">Name</p>
                                <p className="font-medium text-gray-900">{parcel.pickupName || "—"}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Phone</p>
                                {parcel.pickupPhone ? (
                                    <a
                                        href={`tel:${parcel.pickupPhone}`}
                                        className="font-medium text-green-600 hover:text-green-700 flex items-center gap-1"
                                    >
                                        <FaPhone className="text-xs" /> {parcel.pickupPhone}
                                    </a>
                                ) : (
                                    <p className="text-gray-400">Not available</p>
                                )}
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Address</p>
                                <p className="font-medium text-gray-900">{parcel.pickupAddress || "—"}</p>
                                <p className="text-gray-600">{parcel.pickupCity}{parcel.pickupPincode ? ` - ${parcel.pickupPincode}` : ""}</p>
                            </div>
                        </div>
                    </div>

                    {/* Receiver Details */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                            🏠 Receiver (Delivery)
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div>
                                <p className="text-gray-500 text-xs">Name</p>
                                <p className="font-medium text-gray-900">{parcel.deliveryName || "—"}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Phone</p>
                                {parcel.deliveryPhone ? (
                                    <a
                                        href={`tel:${parcel.deliveryPhone}`}
                                        className="font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                    >
                                        <FaPhone className="text-xs" /> {parcel.deliveryPhone}
                                    </a>
                                ) : (
                                    <p className="text-gray-400">Not available</p>
                                )}
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Address</p>
                                <p className="font-medium text-gray-900">{parcel.deliveryAddress || "—"}</p>
                                <p className="text-gray-600">{parcel.deliveryCity}{parcel.deliveryPincode ? ` - ${parcel.deliveryPincode}` : ""}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            {parcel.status !== "DELIVERED" && parcel.status !== "CANCELLED" && (
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FaTruck className="text-orange-500" /> Update Status
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
                    onClose={() => setShowPickupOtpModal(false)}
                    onSuccess={() => {
                        setShowPickupOtpModal(false);
                        fetchParcel();
                        toast.success("Package picked up successfully!");
                    }}
                    isPickup={true}
                />
            )}
        </div>
    );
}

// OTP Verification Modal Component - handles both pickup and delivery
function OtpVerificationModal({ parcelId, onClose, onSuccess, isPickup = false }) {
    const [otp, setOtp] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState("");

    const status = isPickup ? "PICKED_UP" : "DELIVERED";
    const title = isPickup ? "Verify Pickup" : "Verify Delivery";
    const subtitle = isPickup
        ? "Enter OTP from sender"
        : "Enter OTP received by customer";
    const description = isPickup
        ? "Ask the sender for the 6-digit pickup OTP sent to their phone."
        : "Ask the receiver for the 6-digit delivery OTP sent to their phone.";
    const successMessage = isPickup ? "Package picked up!" : "Delivery completed!";

    const handleVerify = async () => {
        if (otp.length < 4) {
            setError("Please enter a valid OTP");
            return;
        }
        setVerifying(true);
        setError("");
        try {
            // Send status update with OTP
            await updateParcelStatus(parcelId, { status, otp });
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || "Invalid OTP. Please try again.");
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                <div className={`bg-gradient-to-r ${isPickup ? "from-blue-600 to-indigo-600" : "from-green-600 to-emerald-600"} text-white px-6 py-4 rounded-t-2xl`}>
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <p className={`text-sm ${isPickup ? "text-blue-200" : "text-green-200"}`}>{subtitle}</p>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">
                        {description}
                    </p>

                    <input
                        type="text"
                        maxLength="6"
                        placeholder="Enter OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        className="input text-center text-2xl tracking-widest font-mono"
                    />

                    {error && (
                        <p className="text-red-500 text-sm mt-2">{error}</p>
                    )}

                    <div className="flex gap-3 mt-6">
                        <button onClick={onClose} className="flex-1 btn-outline">
                            Cancel
                        </button>
                        <button
                            onClick={handleVerify}
                            disabled={verifying || otp.length < 4}
                            className="flex-1 btn-primary disabled:opacity-50"
                        >
                            {verifying ? "Verifying..." : `Verify & ${isPickup ? "Pickup" : "Complete"}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
