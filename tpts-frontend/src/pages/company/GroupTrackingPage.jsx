import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGroupById, getGroupParcels } from "../../services/companyService";
import apiClient from "../../utils/api";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaMapMarkerAlt, FaTruck, FaWarehouse, FaPhone, FaCheck, FaClock, FaSpinner, FaArrowLeft, FaRoute } from "react-icons/fa";

// OSRM API URLs for routing (multiple servers for fallback)
const OSRM_SERVERS = [
    "https://routing.openstreetmap.de/routed-car/route/v1/driving/",
    "https://router.project-osrm.org/route/v1/driving/"
];

export default function GroupTrackingPage() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    const [group, setGroup] = useState(null);
    const [parcels, setParcels] = useState([]);
    const [optimizedParcels, setOptimizedParcels] = useState([]); // Sorted by nearest distance
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Real agent location from API
    const [agentLocation, setAgentLocation] = useState(null);

    useEffect(() => {
        fetchGroupData();
        const interval = setInterval(fetchGroupData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [groupId]);

    const fetchGroupData = async () => {
        try {
            const [groupData, parcelsData] = await Promise.all([
                getGroupById(groupId),
                getGroupParcels(groupId)
            ]);
            setGroup(groupData);
            setParcels(parcelsData);
            setError(null);

            // Use agent location from group data (shared via GroupDTO)
            const isPickupPhase = groupData.status === "PICKUP_IN_PROGRESS" || groupData.status === "FULL";

            if (isPickupPhase && groupData.pickupAgentLatitude && groupData.pickupAgentLongitude) {
                // Pickup phase - use pickup agent's location from group
                setAgentLocation({
                    lat: parseFloat(groupData.pickupAgentLatitude),
                    lng: parseFloat(groupData.pickupAgentLongitude)
                });
            } else if (!isPickupPhase && groupData.deliveryAgentLatitude && groupData.deliveryAgentLongitude) {
                // Delivery phase - use delivery agent's location from group
                setAgentLocation({
                    lat: parseFloat(groupData.deliveryAgentLatitude),
                    lng: parseFloat(groupData.deliveryAgentLongitude)
                });
            } else {
                // Fallback: generate simulated position near warehouse
                if (groupData.warehouseLatitude && groupData.warehouseLongitude) {
                    setAgentLocation({
                        lat: parseFloat(groupData.warehouseLatitude) + 0.02,
                        lng: parseFloat(groupData.warehouseLongitude) - 0.03
                    });
                }
            }
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                setError("Failed to load group data");
            }
        } finally {
            setLoading(false);
        }
    };

    // Initialize map when group data is loaded
    useEffect(() => {
        if (!group || !mapRef.current || mapInstanceRef.current) return;

        // Check if Leaflet is available
        if (typeof window.L === "undefined") {
            // Load Leaflet CSS and JS
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
            document.head.appendChild(link);

            const script = document.createElement("script");
            script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            script.onload = () => initializeMap();
            document.head.appendChild(script);
        } else {
            initializeMap();
        }
    }, [group, parcels]);

    const initializeMap = async () => {
        if (!group || !mapRef.current || mapInstanceRef.current) return;

        const L = window.L;

        // Calculate center from warehouse or default Chennai
        const centerLat = group.warehouseLatitude || 13.0827;
        const centerLng = group.warehouseLongitude || 80.2707;

        const map = L.map(mapRef.current).setView([centerLat, centerLng], 12);
        mapInstanceRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors"
        }).addTo(map);

        const bounds = [];
        const pickupPoints = [];

        // Warehouse marker
        const warehouseLat = group.warehouseLatitude || 13.0523;
        const warehouseLng = group.warehouseLongitude || 80.2116;
        const warehouseIcon = L.divIcon({
            className: "custom-marker",
            html: `<div style="background: #f59e0b; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🏭</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        L.marker([warehouseLat, warehouseLng], { icon: warehouseIcon })
            .addTo(map)
            .bindPopup(`<b>Warehouse</b><br>${group.warehouseAddress || "Company Warehouse"}`);
        bounds.push([warehouseLat, warehouseLng]);

        // Geocode function using Nominatim
        const geocodeAddress = async (address, city, pincode) => {
            try {
                const query = encodeURIComponent(`${address}, ${city}, ${pincode}, India`);
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`);
                const data = await response.json();
                if (data && data.length > 0) {
                    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                }
            } catch (err) {
                console.log("Geocoding failed:", err);
            }
            return null;
        };

        // Process parcels and geocode if needed
        const isPickupPhase = group.status === "PICKUP_IN_PROGRESS" || group.status === "FULL";

        for (let i = 0; i < parcels.length; i++) {
            const parcel = parcels[i];
            let lat = isPickupPhase ? parcel.pickupLatitude : parcel.deliveryLatitude;
            let lng = isPickupPhase ? parcel.pickupLongitude : parcel.deliveryLongitude;

            // If no coordinates, try to geocode from address
            if (!lat || !lng) {
                const address = isPickupPhase ? parcel.pickupAddress : parcel.deliveryAddress;
                const city = isPickupPhase ? parcel.pickupCity : parcel.deliveryCity;
                const pincode = isPickupPhase ? parcel.pickupPincode : parcel.deliveryPincode;

                const geocoded = await geocodeAddress(address, city, pincode);
                if (geocoded) {
                    lat = geocoded.lat;
                    lng = geocoded.lng;
                } else {
                    // Fallback: spread around city center
                    lat = centerLat + (i * 0.01) - 0.015;
                    lng = centerLng + (i % 2 === 0 ? 0.01 : -0.01);
                }
            }

            // Determine if this point is completed based on phase
            let isCompleted;
            if (isPickupPhase) {
                // Pickup phase: completed if picked up or beyond
                isCompleted = parcel.status === "PICKED_UP" || parcel.status === "IN_TRANSIT_TO_WAREHOUSE" ||
                    parcel.status === "AT_WAREHOUSE" || parcel.status === "OUT_FOR_DELIVERY" ||
                    parcel.status === "DELIVERED";
            } else {
                // Delivery phase: completed ONLY if delivered
                isCompleted = parcel.status === "DELIVERED";
            }

            pickupPoints.push({
                index: i,
                parcel,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                isCompleted
            });
        }

        // Haversine distance calculation for accurate distance
        const calculateDistance = (lat1, lng1, lat2, lng2) => {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        // Separate completed and pending pickups
        const completedPickups = pickupPoints.filter(p => p.isCompleted);
        const pendingPickups = pickupPoints.filter(p => !p.isCompleted);

        // Nearest Neighbor Algorithm for pending pickups
        const optimizedRoute = [];
        let currentLat = agentLocation?.lat || centerLat;
        let currentLng = agentLocation?.lng || centerLng;

        const remaining = [...pendingPickups];
        while (remaining.length > 0) {
            let nearestIdx = 0;
            let nearestDist = Infinity;

            for (let i = 0; i < remaining.length; i++) {
                const dist = calculateDistance(currentLat, currentLng, remaining[i].lat, remaining[i].lng);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestIdx = i;
                }
            }

            const nearest = remaining.splice(nearestIdx, 1)[0];
            optimizedRoute.push(nearest);
            currentLat = nearest.lat;
            currentLng = nearest.lng;
        }

        // Draw completed pickup markers
        completedPickups.forEach((point) => {
            const markerIcon = L.divIcon({
                className: "custom-marker",
                html: `<div style="background: #10b981; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">✓</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });
            L.marker([point.lat, point.lng], { icon: markerIcon })
                .addTo(map)
                .bindPopup(`<b>${isPickupPhase ? "Pickup" : "Delivery"} (Done)</b><br>${point.parcel.trackingNumber}<br>${isPickupPhase ? point.parcel.pickupName : point.parcel.deliveryName}`);
            bounds.push([point.lat, point.lng]);
        });

        // Draw pending pickup markers in optimized order
        optimizedRoute.forEach((point, routeOrder) => {
            const isNext = routeOrder === 0;
            const markerColor = isNext ? "#6366f1" : "#9ca3af";
            const markerIcon = L.divIcon({
                className: "custom-marker",
                html: `<div style="background: ${markerColor}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${routeOrder + 1}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });
            L.marker([point.lat, point.lng], { icon: markerIcon })
                .addTo(map)
                .bindPopup(`<b>Stop ${routeOrder + 1}${isNext ? " (Next)" : ""}</b><br>${point.parcel.trackingNumber}<br>${isPickupPhase ? point.parcel.pickupName : point.parcel.deliveryName}<br><small>${isPickupPhase ? point.parcel.pickupAddress : point.parcel.deliveryAddress}</small>`);
            bounds.push([point.lat, point.lng]);
        });

        // Agent marker
        if (agentLocation || optimizedRoute.length > 0) {
            const agentPos = agentLocation || { lat: optimizedRoute[0]?.lat || centerLat, lng: optimizedRoute[0]?.lng || centerLng };
            const agentIcon = L.divIcon({
                className: "custom-marker",
                html: `<div style="background: #3b82f6; color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 8px rgba(59,130,246,0.4);">🚚</div>`,
                iconSize: [44, 44],
                iconAnchor: [22, 22]
            });
            L.marker([agentPos.lat, agentPos.lng], { icon: agentIcon })
                .addTo(map)
                .bindPopup(`<b>Agent</b><br>${group.status === "PICKUP_IN_PROGRESS" ? group.pickupAgentName : group.deliveryAgentName}`);
            bounds.push([agentPos.lat, agentPos.lng]);
        }

        // Fit bounds
        if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }

        // Draw route - ONLY to next destination (not entire path)
        let currentRouteCoords = [];

        if (optimizedRoute.length > 0 && agentLocation) {
            // There are pending pickups - show route from agent to NEXT pickup only
            const nextPickup = optimizedRoute[0];
            currentRouteCoords = [
                [agentLocation.lat, agentLocation.lng],
                [nextPickup.lat, nextPickup.lng]
            ];
        } else if (completedPickups.length > 0 || pendingPickups.length === 0) {
            // All pickups done - show route to warehouse
            const lastPos = agentLocation || (completedPickups.length > 0 ?
                { lat: completedPickups[completedPickups.length - 1].lat, lng: completedPickups[completedPickups.length - 1].lng } :
                { lat: centerLat, lng: centerLng });
            currentRouteCoords = [
                [lastPos.lat, lastPos.lng],
                [warehouseLat, warehouseLng]
            ];
        }

        if (currentRouteCoords.length >= 2) {
            fetchAndDrawRoute(map, currentRouteCoords);
        }

        // Store optimized parcels for the progress list
        // Sort completed by pickup/delivery time (earliest first), pending by route order
        const sortedCompleted = completedPickups
            .map(p => ({ ...p.parcel, isCompleted: true, routeOrder: -1 }))
            .sort((a, b) => {
                const timeA = new Date(a.pickedUpAt || a.deliveredAt || 0).getTime();
                const timeB = new Date(b.pickedUpAt || b.deliveredAt || 0).getTime();
                return timeA - timeB;
            });

        setOptimizedParcels([
            ...sortedCompleted,
            ...optimizedRoute.map((p, idx) => ({ ...p.parcel, isCompleted: false, routeOrder: idx }))
        ]);
    };

    const fetchAndDrawRoute = async (map, coordinates) => {
        const coordsString = coordinates.map(c => `${c[1]},${c[0]}`).join(";");

        // Try each server until one works
        for (const server of OSRM_SERVERS) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const response = await fetch(`${server}${coordsString}?overview=full&geometries=geojson`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                const data = await response.json();

                if (data.routes && data.routes[0]) {
                    const routeLine = window.L.geoJSON(data.routes[0].geometry, {
                        style: {
                            color: "#6366f1",
                            weight: 4,
                            opacity: 0.8,
                            dashArray: "10, 5"
                        }
                    });
                    routeLine.addTo(map);
                    console.log("Route drawn successfully from:", server);
                    return; // Success
                }
            } catch (err) {
                console.warn(`Route from ${server} failed:`, err.message);
            }
        }
        console.error("All routing servers failed");
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "PENDING":
            case "CONFIRMED":
                return "bg-slate-600/50 text-slate-200";
            case "ASSIGNED":
                return "bg-blue-500/30 text-blue-300";
            case "PICKED_UP":
            case "IN_TRANSIT":
                return "bg-amber-500/30 text-amber-300";
            case "OUT_FOR_DELIVERY":
                return "bg-purple-500/30 text-purple-300";
            case "DELIVERED":
                return "bg-green-500/30 text-green-300";
            default:
                return "bg-slate-600/50 text-slate-200";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <FaSpinner className="animate-spin text-4xl text-indigo-600" />
                <span className="ml-3 text-lg text-gray-600">Loading tracking data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-700">{error}</p>
                <button onClick={fetchGroupData} className="btn-primary mt-4">Retry</button>
            </div>
        );
    }

    const isPickupPhase = group.status === "PICKUP_IN_PROGRESS" || group.status === "FULL";
    const isDeliveryPhase = group.status === "DELIVERY_IN_PROGRESS" || group.status === "PICKUP_COMPLETE";
    const showMap = isPickupPhase || isDeliveryPhase; // Map shown for both pickup and delivery phases

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/company/shipments/${groupId}`)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FaArrowLeft className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isPickupPhase ? "🚚 Agent 1 - Pickup Tracking" : "📦 Agent 2 - Delivery Status"}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Group: {group.groupCode} | {group.sourceCity} → {group.targetCity}
                        </p>
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${group.status === "PICKUP_IN_PROGRESS" ? "bg-amber-100 text-amber-800" :
                    group.status === "DELIVERY_IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                        group.status === "COMPLETED" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}>
                    {group.status.replace(/_/g, " ")}
                </div>
            </div>

            <div className={`grid ${showMap ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"} gap-6`}>
                {/* Map Section - For Pickup and Delivery Phases */}
                {showMap && (
                    <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl shadow-lg border border-slate-600/30 overflow-hidden">
                        <div className={`p-4 bg-gradient-to-r ${isPickupPhase ? "from-blue-600 to-indigo-600" : "from-purple-600 to-violet-600"}`}>
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <FaRoute className="text-white" />
                                {isPickupPhase ? "Live Map - Agent 1 (Pickup)" : "Live Map - Agent 2 (Delivery)"}
                            </h2>
                            <p className="text-sm text-blue-100 mt-1">
                                {isPickupPhase ? "Showing all pickup points and route to warehouse" : "Showing all delivery points and agent route"}
                            </p>
                        </div>
                        <div ref={mapRef} style={{ height: "400px" }} className="w-full" />

                        {/* Map Legend */}
                        <div className="p-3 bg-slate-800/80 border-t border-slate-600/30 flex flex-wrap gap-4 text-xs text-slate-300">
                            <span className="flex items-center gap-1">
                                <span className="w-4 h-4 bg-blue-500 rounded-full inline-block" />
                                Agent Location
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-4 h-4 bg-indigo-500 rounded-full inline-block" />
                                {isPickupPhase ? "Pending Pickup" : "Pending Delivery"}
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-4 h-4 bg-green-500 rounded-full inline-block" />
                                {isPickupPhase ? "Picked Up" : "Delivered"}
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-4 h-4 bg-amber-500 rounded-full inline-block" />
                                Warehouse
                            </span>
                        </div>
                    </div>
                )}

                {/* Status List Section */}
                <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl shadow-lg border border-slate-600/30">
                    <div className="p-4 border-b border-slate-600/30">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            {isPickupPhase ? (
                                <>
                                    <FaTruck className="text-amber-400" />
                                    Pickup Progress <span className="text-sm font-normal text-slate-400">(optimized route)</span>
                                </>
                            ) : (
                                <>
                                    <FaMapMarkerAlt className="text-green-400" />
                                    Delivery Status <span className="text-sm font-normal text-slate-400">(optimized route)</span>
                                </>
                            )}
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {(optimizedParcels.length > 0 ? optimizedParcels : parcels).filter(p =>
                                isPickupPhase
                                    ? (p.isCompleted || p.status === "PICKED_UP" || p.status === "IN_TRANSIT_TO_WAREHOUSE" || p.status === "AT_WAREHOUSE" || p.status === "OUT_FOR_DELIVERY" || p.status === "DELIVERED")
                                    : p.status === "DELIVERED"
                            ).length} / {parcels.length} {isPickupPhase ? "picked" : "delivered"}
                        </p>
                    </div>

                    <div className="divide-y divide-slate-700/50 max-h-[500px] overflow-y-auto">
                        {(optimizedParcels.length > 0 ? optimizedParcels : parcels).map((parcel, index) => {
                            const isCompleted = parcel.isCompleted ?? (isPickupPhase
                                ? parcel.status === "PICKED_UP" || parcel.status === "IN_TRANSIT" || parcel.status === "OUT_FOR_DELIVERY" || parcel.status === "DELIVERED"
                                : parcel.status === "DELIVERED");
                            const routeOrder = parcel.routeOrder ?? index;
                            const isNext = routeOrder === 0 && !isCompleted;

                            return (
                                <div
                                    key={parcel.id}
                                    className={`p-4 ${isNext ? "bg-indigo-500/20 border-l-4 border-indigo-500" : ""} ${isCompleted ? "opacity-70" : ""}`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Index marker */}
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isCompleted ? "bg-green-500/30 text-green-300" :
                                            isNext ? "bg-indigo-500 text-white" : "bg-slate-600/50 text-slate-300"
                                            }`}>
                                            {isCompleted ? <FaCheck /> : routeOrder + 1}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-white">{parcel.trackingNumber}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(parcel.status)}`}>
                                                    {parcel.status.replace(/_/g, " ")}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-300">
                                                <span className="font-medium">{isPickupPhase ? parcel.pickupName : parcel.deliveryName}</span>
                                            </p>
                                            <p className="text-xs text-slate-400 truncate">
                                                {isPickupPhase ? parcel.pickupAddress : parcel.deliveryAddress}
                                            </p>
                                            {parcel.pickedUpAt && isPickupPhase && (
                                                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                                    <FaClock />
                                                    Picked up at {new Date(parcel.pickedUpAt).toLocaleTimeString()}
                                                    <span className="ml-2 bg-green-500/30 text-green-300 px-1.5 py-0.5 rounded text-[10px]">✓ OTP Verified</span>
                                                </p>
                                            )}
                                            {/* Show pickup photo only during pickup phase */}
                                            {parcel.pickupPhotoUrl && isPickupPhase && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <img
                                                        src={parcel.pickupPhotoUrl}
                                                        alt="Pickup proof"
                                                        className="w-16 h-16 object-cover rounded border border-slate-600 cursor-pointer hover:opacity-80"
                                                        onClick={() => window.open(parcel.pickupPhotoUrl, '_blank')}
                                                        title="Click to view full photo"
                                                    />
                                                    <span className="text-xs text-slate-400">📷 Pickup Proof</span>
                                                </div>
                                            )}
                                            {parcel.deliveredAt && !isPickupPhase && (
                                                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                                    <FaClock />
                                                    Delivered at {new Date(parcel.deliveredAt).toLocaleTimeString()}
                                                    <span className="ml-2 bg-green-500/30 text-green-300 px-1.5 py-0.5 rounded text-[10px]">✓ OTP Verified</span>
                                                </p>
                                            )}
                                            {/* Show delivery photo if available */}
                                            {parcel.deliveryPhotoUrl && !isPickupPhase && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <img
                                                        src={parcel.deliveryPhotoUrl}
                                                        alt="Delivery proof"
                                                        className="w-16 h-16 object-cover rounded border border-green-600/50 cursor-pointer hover:opacity-80"
                                                        onClick={() => window.open(parcel.deliveryPhotoUrl, '_blank')}
                                                        title="Click to view full delivery photo"
                                                    />
                                                    <span className="text-xs text-green-400">📷 Delivery Proof</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex-shrink-0">
                                            <a
                                                href={`tel:${isPickupPhase ? parcel.pickupPhone : parcel.deliveryPhone}`}
                                                className="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-full transition-colors"
                                            >
                                                <FaPhone className="text-slate-300 text-sm" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Warehouse destination for pickup phase */}
                    {isPickupPhase && group.warehouseAddress && (
                        <div className="p-4 bg-amber-500/20 border-t border-amber-500/30">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                                    <FaWarehouse className="text-white text-sm" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-amber-300">Final Destination: Warehouse</p>
                                    <p className="text-xs text-amber-400/70 truncate">{group.warehouseAddress}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Agent Info Card */}
            <div className="bg-gradient-to-r from-slate-800/90 to-slate-900/90 rounded-xl shadow-lg border border-slate-600/30 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                    {isPickupPhase ? "Pickup Agent (Agent 1)" : "Delivery Agent (Agent 2)"}
                </h3>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/30 rounded-full flex items-center justify-center">
                        <FaTruck className="text-indigo-400 text-xl" />
                    </div>
                    <div>
                        <p className="font-medium text-white">
                            {isPickupPhase ? group.pickupAgentName || "Not assigned" : group.deliveryAgentName || "Not assigned"}
                        </p>
                        <p className="text-sm text-slate-400">
                            {isPickupPhase ? "Collecting parcels from customers" : "Delivering parcels to receivers"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
