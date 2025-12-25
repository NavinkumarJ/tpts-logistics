import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import apiClient from "../../utils/api";
import { getRoute } from "../../services/routingService";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import {
    FaMapMarkerAlt, FaTruck, FaBox, FaUser, FaPhone, FaBuilding,
    FaStar, FaRoute, FaCheck, FaClock, FaArrowLeft, FaSync,
    FaWeightHanging, FaRuler, FaExclamationTriangle
} from "react-icons/fa";

export default function CustomerTrackingPage() {
    const { trackingNumber } = useParams();
    const navigate = useNavigate();
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const agentMarkerRef = useRef(null);
    const routeLineRef = useRef(null);
    const stompClientRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [parcel, setParcel] = useState(null);
    const [agentLocation, setAgentLocation] = useState(null);
    const [connected, setConnected] = useState(false);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [routeInfo, setRouteInfo] = useState(null);

    // Fetch parcel details
    const fetchParcelDetails = useCallback(async () => {
        try {
            const response = await apiClient.get(`/parcels/my/${trackingNumber}`);
            setParcel(response.data.data);

            // Get agent location if assigned
            if (response.data.data.agentId) {
                try {
                    const locRes = await apiClient.get(`/agents/${response.data.data.agentId}/location`);
                    if (locRes.data.data) {
                        console.log("📍 Initial agent location:", locRes.data.data);
                        // Map backend fields to our expected format
                        setAgentLocation({
                            latitude: locRes.data.data.agentLat,
                            longitude: locRes.data.data.agentLng,
                            agentName: locRes.data.data.agentName,
                            timestamp: locRes.data.data.timestamp
                        });
                    }
                } catch (e) {
                    console.log("Agent location not available yet:", e.message);
                }
            }
        } catch (err) {
            if (err.response?.status === 403) {
                toast.error("This parcel doesn't belong to your account. Use the public tracking page to track other parcels.");
            } else if (err.response?.status === 404) {
                toast.error("Parcel not found with this tracking number");
            } else {
                toast.error(err.response?.data?.message || "Failed to load tracking details");
            }
        } finally {
            setLoading(false);
        }
    }, [trackingNumber]);

    // Initialize WebSocket connection
    const initWebSocket = useCallback(() => {
        const socket = new SockJS("http://localhost:8080/ws");
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                setConnected(true);
                console.log("WebSocket connected for tracking");

                // Subscribe to parcel tracking updates
                client.subscribe(`/topic/tracking/${trackingNumber}`, (message) => {
                    const update = JSON.parse(message.body);
                    setParcel(prev => ({ ...prev, ...update }));
                    toast.success(`Status updated: ${update.status}`);
                });

                // Subscribe to agent location updates
                client.subscribe(`/topic/agent-location/${trackingNumber}`, (message) => {
                    const data = JSON.parse(message.body);
                    console.log("📍 Agent location update:", data);
                    // Map backend fields to our expected format
                    const location = {
                        latitude: data.agentLat,
                        longitude: data.agentLng,
                        distanceKm: data.distanceKm,
                        etaText: data.etaText,
                        etaMinutes: data.etaMinutes,
                        timestamp: data.timestamp
                    };
                    setAgentLocation(location);
                    updateAgentMarker(location);
                });
            },
            onDisconnect: () => {
                setConnected(false);
            },
            onStompError: (frame) => {
                console.error("STOMP error:", frame);
            }
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (client.active) {
                client.deactivate();
            }
        };
    }, [trackingNumber]);

    // Update agent marker on map
    const updateAgentMarker = useCallback((location) => {
        if (!mapInstanceRef.current || !location?.latitude || !location?.longitude) return;

        const L = window.L;
        if (!L) return;

        const latLng = [location.latitude, location.longitude];

        if (agentMarkerRef.current) {
            agentMarkerRef.current.setLatLng(latLng);
        }

        // Update route line
        updateRouteLine(latLng);
    }, []);

    // Fetch road route using OSRM and update map
    const fetchRoadRoute = useCallback(async (agentLat, agentLng, destLat, destLng, lineColor) => {
        if (!mapInstanceRef.current) return;

        const L = window.L;
        if (!L) return;

        try {
            const route = await getRoute(agentLat, agentLng, destLat, destLng);

            if (route && route.coordinates.length > 0) {
                // Remove existing route line
                if (routeLineRef.current) {
                    mapInstanceRef.current.removeLayer(routeLineRef.current);
                }

                // Add new OSRM road route
                routeLineRef.current = L.polyline(route.coordinates, {
                    color: lineColor,
                    weight: 5,
                    opacity: 0.9
                }).addTo(mapInstanceRef.current);

                // Update agent marker position to match actual agent location (route start)
                if (agentMarkerRef.current) {
                    agentMarkerRef.current.setLatLng([agentLat, agentLng]);
                }

                // Update route info for display
                setRouteCoordinates(route.coordinates);
                setRouteInfo({
                    distance: route.distance,
                    duration: route.duration,
                    durationText: route.durationText
                });
            }
        } catch (error) {
            console.error("Failed to fetch road route:", error);
        }
    }, []);

    // Update route line based on parcel status
    const updateRouteLine = useCallback((agentLatLng) => {
        if (!mapInstanceRef.current || !parcel) return;

        const L = window.L;
        if (!L) return;

        let destLat, destLng;
        let lineColor;

        if (parcel.status === "ASSIGNED" || parcel.status === "CONFIRMED") {
            // Before pickup: show route to pickup
            destLat = parcel.pickupLatitude;
            destLng = parcel.pickupLongitude;
            lineColor = "#3B82F6"; // Blue
        } else if (["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(parcel.status)) {
            // After pickup: show route to delivery
            destLat = parcel.deliveryLatitude;
            destLng = parcel.deliveryLongitude;
            lineColor = "#10B981"; // Green
        } else {
            return;
        }

        if (destLat && destLng && agentLatLng && agentLatLng[0] && agentLatLng[1]) {
            // Fetch OSRM road route
            fetchRoadRoute(agentLatLng[0], agentLatLng[1], destLat, destLng, lineColor);
        }
    }, [parcel, fetchRoadRoute]);

    // Initialize Leaflet map
    const initializeMap = useCallback(async () => {
        if (!mapRef.current) return;

        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        window.L = L;

        // Check if this container already has a map - Leaflet stores _leaflet_id on the element
        if (mapRef.current._leaflet_id && mapInstanceRef.current) {
            // Map already initialized - just update agent marker if location available
            if (agentLocation?.latitude && agentLocation?.longitude) {
                if (agentMarkerRef.current) {
                    mapInstanceRef.current.removeLayer(agentMarkerRef.current);
                }
                // Use L.Icon with image like agent page does (divIcon doesn't render properly)
                const agentIcon = new L.Icon({
                    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
                    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
                    iconSize: [30, 49],
                    iconAnchor: [15, 49],
                    popupAnchor: [1, -34],
                });
                agentMarkerRef.current = L.marker([agentLocation.latitude, agentLocation.longitude], { icon: agentIcon })
                    .bindPopup(`<b>${parcel?.agentName || "Delivery Agent"}</b><br/>🚚 On the way`)
                    .addTo(mapInstanceRef.current);
                updateRouteLine([agentLocation.latitude, agentLocation.longitude]);
            }
            return;
        }

        // Also clean up our ref if it exists
        if (mapInstanceRef.current) {
            try {
                mapInstanceRef.current.remove();
            } catch (e) {
                // Ignore cleanup errors
            }
            mapInstanceRef.current = null;
        }

        // Fix default marker icons
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
            iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        // Calculate center from pickup/delivery or default
        let center = [20.5937, 78.9629]; // India center
        let zoom = 5;

        if (parcel?.pickupLatitude && parcel?.pickupLongitude) {
            center = [parcel.pickupLatitude, parcel.pickupLongitude];
            zoom = 12;
        }

        const map = L.map(mapRef.current).setView(center, zoom);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        mapInstanceRef.current = map;

        // Add markers
        if (parcel) {
            // Pickup marker
            if (parcel.pickupLatitude && parcel.pickupLongitude) {
                const pickupIcon = L.divIcon({
                    html: '<div style="background: #F59E0B; color: white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 3px solid white;">📦</div>',
                    className: "custom-marker",
                    iconSize: [36, 36],
                    iconAnchor: [18, 18]
                });
                L.marker([parcel.pickupLatitude, parcel.pickupLongitude], { icon: pickupIcon })
                    .bindPopup(`<b>Pickup Location</b><br/>${parcel.pickupAddress}`)
                    .addTo(map);
            }

            // Delivery marker
            if (parcel.deliveryLatitude && parcel.deliveryLongitude) {
                const deliveryIcon = L.divIcon({
                    html: '<div style="background: #10B981; color: white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 3px solid white;">📍</div>',
                    className: "custom-marker",
                    iconSize: [36, 36],
                    iconAnchor: [18, 18]
                });
                L.marker([parcel.deliveryLatitude, parcel.deliveryLongitude], { icon: deliveryIcon })
                    .bindPopup(`<b>Delivery Location</b><br/>${parcel.deliveryAddress}`)
                    .addTo(map);
            }

            // Fit bounds if both markers exist
            if (parcel.pickupLatitude && parcel.deliveryLatitude) {
                const bounds = L.latLngBounds(
                    [parcel.pickupLatitude, parcel.pickupLongitude],
                    [parcel.deliveryLatitude, parcel.deliveryLongitude]
                );
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }

        // Agent marker - remove old one first to prevent duplicates
        if (agentLocation?.latitude && agentLocation?.longitude) {
            // Remove existing agent marker if any
            if (agentMarkerRef.current) {
                map.removeLayer(agentMarkerRef.current);
            }

            // Use L.Icon with image (same as agent page - divIcon doesn't render properly)
            const agentIcon = new L.Icon({
                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
                iconSize: [30, 49],
                iconAnchor: [15, 49],
                popupAnchor: [1, -34],
            });

            agentMarkerRef.current = L.marker([agentLocation.latitude, agentLocation.longitude], { icon: agentIcon })
                .bindPopup(`<b>${parcel?.agentName || "Delivery Agent"}</b><br/>🚚 On the way`)
                .addTo(map);

            // Update route line which will also update marker position
            updateRouteLine([agentLocation.latitude, agentLocation.longitude]);
        }
    }, [parcel, agentLocation, updateRouteLine]);

    useEffect(() => {
        fetchParcelDetails();
    }, [fetchParcelDetails]);

    useEffect(() => {
        if (parcel && mapRef.current) {
            initializeMap();
        }
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [parcel, initializeMap]);

    useEffect(() => {
        if (parcel) {
            const cleanup = initWebSocket();
            return cleanup;
        }
    }, [parcel, initWebSocket]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading tracking details...</p>
                </div>
            </div>
        );
    }

    if (!parcel) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-md text-center">
                <div className="text-6xl mb-4">📦</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Parcel Not Found</h2>
                <p className="text-gray-600 mb-4">The tracking number may be invalid or you don't have access.</p>
                <Link to="/customer/shipments" className="btn-primary inline-flex items-center gap-2">
                    <FaArrowLeft /> Back to Shipments
                </Link>
            </div>
        );
    }

    const timelineSteps = getTimelineSteps(parcel);
    const isDelivered = parcel.status === "DELIVERED";
    const showLiveTracking = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(parcel.status);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Link to="/customer/shipments" className="text-gray-500 hover:text-gray-700">
                            <FaArrowLeft />
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">📍 Live Tracking</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-gray-600 font-mono text-lg">{parcel.trackingNumber}</span>
                        {connected && (
                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Live
                            </span>
                        )}
                    </div>
                </div>
                <StatusBadge status={parcel.status} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Column: Map + Route Info */}
                <div className="xl:col-span-2 space-y-4">
                    {/* Live Map */}
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FaRoute />
                                <h3 className="font-semibold">🗺️ Live Tracking Map</h3>
                            </div>
                            <button onClick={fetchParcelDetails} className="text-white/80 hover:text-white transition">
                                <FaSync />
                            </button>
                        </div>
                        <div ref={mapRef} className="h-[450px] w-full relative">
                            {!showLiveTracking && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 z-10">
                                    <div className="text-center p-6">
                                        <div className="text-5xl mb-3">
                                            {parcel.status === "PENDING" ? "⏳" :
                                                parcel.status === "CONFIRMED" ? "✅" :
                                                    parcel.status === "DELIVERED" ? "🎉" : "🗺️"}
                                        </div>
                                        <p className="text-gray-700 font-medium">
                                            {parcel.status === "PENDING" && "Waiting for confirmation..."}
                                            {parcel.status === "CONFIRMED" && "Waiting for agent assignment..."}
                                            {parcel.status === "DELIVERED" && "Package delivered successfully!"}
                                            {parcel.status === "CANCELLED" && "Shipment was cancelled"}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Map Legend */}
                        <div className="px-4 py-3 bg-gray-50 border-t flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-amber-500"></span>
                                <span className="text-gray-600">Pickup</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-green-500"></span>
                                <span className="text-gray-600">Delivery</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-blue-500"></span>
                                <span className="text-gray-600">Agent</span>
                            </div>
                        </div>
                    </div>

                    {/* Live Tracking Status Panel */}
                    {showLiveTracking && (
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 shadow-lg text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl animate-pulse">
                                        🚚
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{parcel.agentName || "Delivery Agent"}</h3>
                                        <p className="text-blue-200 text-sm">
                                            {agentLocation?.latitude ? "📡 Location active" : "⏳ Waiting for location updates..."}
                                        </p>
                                    </div>
                                </div>
                                {agentLocation?.timestamp && (
                                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full">
                                        Updated: {new Date(agentLocation.timestamp).toLocaleTimeString()}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/10 rounded-lg p-4 text-center">
                                    <p className="text-blue-200 text-xs uppercase mb-1">Distance</p>
                                    <p className="text-3xl font-bold">
                                        {routeInfo?.distance || agentLocation?.distanceKm || "—"}
                                        <span className="text-lg ml-1">km</span>
                                    </p>
                                </div>
                                <div className="bg-white/10 rounded-lg p-4 text-center">
                                    <p className="text-blue-200 text-xs uppercase mb-1">ETA</p>
                                    <p className="text-3xl font-bold">
                                        {routeInfo?.durationText || agentLocation?.etaText || "—"}
                                    </p>
                                </div>
                            </div>

                            {!agentLocation?.latitude && (
                                <p className="mt-4 text-center text-blue-200 text-sm">
                                    📍 Agent will start sharing location once they begin delivery
                                </p>
                            )}
                        </div>
                    )}

                    {/* Route Info Card */}
                    <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* From */}
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 text-xl flex-shrink-0">
                                    📦
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">From (Sender)</p>
                                    <p className="font-semibold text-gray-900">{parcel.pickupName}</p>
                                    <p className="text-sm text-gray-600">{parcel.pickupAddress}</p>
                                    <p className="text-sm text-gray-500">{parcel.pickupCity}, {parcel.pickupPincode}</p>
                                    <a href={`tel:${parcel.pickupPhone}`} className="text-sm text-primary-600 flex items-center gap-1 mt-1 hover:underline">
                                        <FaPhone className="text-xs" /> {parcel.pickupPhone}
                                    </a>
                                </div>
                            </div>

                            {/* To */}
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600 text-xl flex-shrink-0">
                                    📍
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">To (Receiver)</p>
                                    <p className="font-semibold text-gray-900">{parcel.deliveryName}</p>
                                    <p className="text-sm text-gray-600">{parcel.deliveryAddress}</p>
                                    <p className="text-sm text-gray-500">{parcel.deliveryCity}, {parcel.deliveryPincode}</p>
                                    <a href={`tel:${parcel.deliveryPhone}`} className="text-sm text-primary-600 flex items-center gap-1 mt-1 hover:underline">
                                        <FaPhone className="text-xs" /> {parcel.deliveryPhone}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* OTP Verification Codes */}
                    {(parcel.pickupOtp || parcel.deliveryOtp) && (
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 shadow-lg border border-indigo-100">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                🔐 Verification OTPs
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Share these OTPs with the delivery agent to verify pickup and delivery.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Pickup OTP */}
                                {parcel.pickupOtp && parcel.status !== "PICKED_UP" && parcel.status !== "IN_TRANSIT" && parcel.status !== "OUT_FOR_DELIVERY" && parcel.status !== "DELIVERED" && (
                                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                                        <p className="text-xs text-blue-600 font-semibold uppercase mb-2">📦 Pickup OTP</p>
                                        <p className="text-3xl font-mono font-bold text-blue-800 tracking-widest text-center">
                                            {parcel.pickupOtp}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-2 text-center">
                                            Give this to agent when they pickup
                                        </p>
                                    </div>
                                )}

                                {/* Delivery OTP */}
                                {parcel.deliveryOtp && parcel.status !== "DELIVERED" && (
                                    <div className="bg-white rounded-lg p-4 border border-green-200">
                                        <p className="text-xs text-green-600 font-semibold uppercase mb-2">📍 Delivery OTP</p>
                                        <p className="text-3xl font-mono font-bold text-green-800 tracking-widest text-center">
                                            {parcel.deliveryOtp}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-2 text-center">
                                            Receiver gives this to agent on delivery
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {/* Package Details */}
                    <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FaBox className="text-primary-600" /> Package Details
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Type</p>
                                <p className="font-semibold text-gray-900">{parcel.packageType || "Standard"}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                    <FaWeightHanging className="text-gray-400" /> Weight
                                </p>
                                <p className="font-semibold text-gray-900">{parcel.weightKg} kg</p>
                            </div>
                            {parcel.dimensions && (
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                        <FaRuler className="text-gray-400" /> Dimensions
                                    </p>
                                    <p className="font-semibold text-gray-900">{parcel.dimensions}</p>
                                </div>
                            )}
                            {parcel.isFragile && (
                                <div className="bg-red-50 rounded-lg p-3">
                                    <p className="text-xs text-red-500 mb-1 flex items-center gap-1">
                                        <FaExclamationTriangle /> Fragile
                                    </p>
                                    <p className="font-semibold text-red-600">Handle with care</p>
                                </div>
                            )}
                        </div>
                        {parcel.specialInstructions && (
                            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <p className="text-xs text-amber-700 font-semibold mb-1">Special Instructions</p>
                                <p className="text-sm text-amber-800">{parcel.specialInstructions}</p>
                            </div>
                        )}
                    </div>

                    {/* Order Summary */}
                    <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            💰 Order Summary
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Base Price</span>
                                <span className="text-gray-900 font-medium">₹{parcel.basePrice?.toFixed(2) || "0.00"}</span>
                            </div>
                            {parcel.discountAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-green-600">Discount</span>
                                    <span className="text-green-600 font-medium">-₹{parcel.discountAmount?.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="text-gray-900 font-medium">₹{parcel.basePrice?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">GST (18%)</span>
                                <span className="text-gray-900 font-medium">₹{((parcel.basePrice || 0) * 0.18).toFixed(2)}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-3 mt-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-900 font-bold">Total Paid</span>
                                    <span className="text-lg font-bold text-primary-600">
                                        ₹{(parcel.finalPrice || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            {parcel.paymentStatus && (
                                <div className="mt-2 flex items-center justify-center gap-3 flex-wrap">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${parcel.paymentStatus === "PAID" || parcel.paymentStatus === "SUCCESS"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-yellow-100 text-yellow-700"
                                        }`}>
                                        {["PAID", "SUCCESS"].includes(parcel.paymentStatus) ? "✓ Payment Completed" : "⏳ " + parcel.paymentStatus}
                                    </span>
                                    {parcel.paymentMethod && (
                                        <span className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                            💳 {parcel.paymentMethod === "RAZORPAY" ? "Online (Razorpay)" : parcel.paymentMethod}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Agent, Company, Timeline */}
                <div className="space-y-4">
                    {/* Delivery Agent Card */}
                    {parcel.agentId ? (
                        <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FaTruck className="text-blue-600" /> Delivery Agent
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                    {parcel.agentName?.charAt(0) || "A"}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 text-lg">{parcel.agentName}</p>
                                    <div className="flex items-center gap-1 text-yellow-500 mt-1">
                                        <FaStar />
                                        <span className="text-gray-700 font-medium">
                                            {parcel.agentRating ? parcel.agentRating.toFixed(1) : "New"}
                                        </span>
                                        {parcel.agentRating && (
                                            <span className="text-gray-400 text-xs ml-1">
                                                ({parcel.agentTotalRatings || 0} reviews)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Agent Details */}
                            <div className="mt-4 bg-gray-50 rounded-lg p-3 space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <FaPhone className="text-green-600" />
                                    <span className="text-gray-600">Phone:</span>
                                    <a href={`tel:${parcel.agentPhone}`} className="text-primary-600 font-medium hover:underline">
                                        {parcel.agentPhone || "Not available"}
                                    </a>
                                </div>
                                {parcel.agentVehicleType && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <FaTruck className="text-blue-600" />
                                        <span className="text-gray-600">Vehicle:</span>
                                        <span className="text-gray-900 font-medium">{parcel.agentVehicleType}</span>
                                    </div>
                                )}
                                {parcel.agentVehicleNumber && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-600">🚗 Vehicle No:</span>
                                        <span className="text-gray-900 font-medium">{parcel.agentVehicleNumber}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FaTruck className="text-gray-400" /> Delivery Agent
                            </h3>
                            <div className="text-center py-4">
                                <div className="text-4xl mb-2">👤</div>
                                <p className="text-gray-500">Agent not yet assigned</p>
                            </div>
                        </div>
                    )}

                    {/* Company Card */}
                    <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FaBuilding className="text-indigo-600" /> Delivery Company
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow">
                                {parcel.companyName?.charAt(0) || "C"}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">{parcel.companyName}</p>
                                <div className="flex items-center gap-1 text-yellow-500">
                                    <FaStar className="text-sm" />
                                    <span className="text-gray-600 text-sm">
                                        {parcel.companyRating ? `${parcel.companyRating.toFixed(1)} rating` : "New company"}
                                    </span>
                                    {parcel.companyTotalRatings && (
                                        <span className="text-gray-400 text-xs">
                                            ({parcel.companyTotalRatings} reviews)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline Card */}
                    <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FaClock className="text-primary-600" /> Delivery Progress
                        </h3>
                        <ol className="space-y-4">
                            {timelineSteps.map((step, idx) => (
                                <li key={idx} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all ${step.completed
                                                ? "bg-green-500 text-white shadow-md"
                                                : step.current
                                                    ? "bg-primary-600 text-white ring-4 ring-primary-100 shadow-lg"
                                                    : "bg-gray-200 text-gray-400"
                                                }`}
                                        >
                                            {step.completed ? <FaCheck /> : step.icon}
                                        </div>
                                        {idx < timelineSteps.length - 1 && (
                                            <div className={`w-0.5 h-8 mt-1 ${step.completed ? "bg-green-500" : "bg-gray-200"}`} />
                                        )}
                                    </div>
                                    <div className="flex-1 pb-2">
                                        <p className={`font-medium ${step.completed || step.current ? "text-gray-900" : "text-gray-400"}`}>
                                            {step.title}
                                        </p>
                                        {step.timestamp && (
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {new Date(step.timestamp).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button onClick={fetchParcelDetails} className="btn-outline w-full flex items-center justify-center gap-2">
                            <FaSync /> Refresh Status
                        </button>
                        {isDelivered && !parcel.hasRated && (
                            <Link
                                to={`/customer/rate/${parcel.id}`}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                <FaStar /> Rate This Delivery
                            </Link>
                        )}
                        {isDelivered && parcel.hasRated && (
                            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                                <FaStar className="text-yellow-500 mx-auto mb-2 text-xl" />
                                <p className="text-green-700 font-medium">✓ Thank you for your feedback!</p>
                                <p className="text-xs text-gray-500 mt-1">You've already rated this delivery</p>
                            </div>
                        )}
                    </div>

                    {/* Estimated Delivery */}
                    {parcel.estimatedDelivery && !isDelivered && (
                        <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-4 border border-primary-200">
                            <p className="text-xs text-primary-700 font-semibold uppercase">Estimated Delivery</p>
                            <p className="text-lg font-bold text-primary-800">
                                {new Date(parcel.estimatedDelivery).toLocaleDateString("en-IN", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "short"
                                })}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* CSS for pulse animation */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                }
                .agent-marker { animation: pulse 2s infinite; }
            `}</style>
        </div>
    );
}

// Status Badge Component
function StatusBadge({ status }) {
    const statusConfig = {
        PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", label: "⏳ Pending" },
        CONFIRMED: { bg: "bg-blue-100", text: "text-blue-800", label: "✅ Confirmed" },
        ASSIGNED: { bg: "bg-indigo-100", text: "text-indigo-800", label: "🚚 Agent Assigned" },
        PICKED_UP: { bg: "bg-purple-100", text: "text-purple-800", label: "📦 Picked Up" },
        IN_TRANSIT: { bg: "bg-cyan-100", text: "text-cyan-800", label: "🛣️ In Transit" },
        OUT_FOR_DELIVERY: { bg: "bg-orange-100", text: "text-orange-800", label: "🚚 Out for Delivery" },
        DELIVERED: { bg: "bg-green-100", text: "text-green-800", label: "🎉 Delivered" },
        CANCELLED: { bg: "bg-red-100", text: "text-red-800", label: "❌ Cancelled" },
    };

    const config = statusConfig[status] || { bg: "bg-gray-100", text: "text-gray-800", label: status };

    return (
        <span className={`px-4 py-2 rounded-full text-sm font-bold ${config.bg} ${config.text} shadow-sm`}>
            {config.label}
        </span>
    );
}

// Timeline Helper
function getTimelineSteps(parcel) {
    const steps = [
        { title: "Order Confirmed", timestamp: parcel.confirmedAt, status: "CONFIRMED", icon: "✅" },
        { title: "Agent Assigned", timestamp: parcel.assignedAt, status: "ASSIGNED", icon: "👤" },
        { title: "Package Picked Up", timestamp: parcel.pickedUpAt, status: "PICKED_UP", icon: "📦" },
        { title: "In Transit", timestamp: null, status: "IN_TRANSIT", icon: "🛣️" },
        { title: "Out for Delivery", timestamp: null, status: "OUT_FOR_DELIVERY", icon: "🚚" },
        { title: "Delivered", timestamp: parcel.deliveredAt, status: "DELIVERED", icon: "🎉" },
    ];

    const statusOrder = ["PENDING", "CONFIRMED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];
    const currentIndex = statusOrder.indexOf(parcel.status);

    return steps.map((step, idx) => ({
        ...step,
        completed: statusOrder.indexOf(step.status) < currentIndex,
        current: step.status === parcel.status,
    }));
}
