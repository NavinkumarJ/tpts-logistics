import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    FaMapMarkerAlt, FaTruck, FaWarehouse, FaPhone, FaCheck, FaClock,
    FaSpinner, FaArrowLeft, FaRoute, FaCheckCircle, FaTimesCircle,
    FaShareAlt, FaBroadcastTower, FaCamera
} from "react-icons/fa";
import GroupChatPanel from "../../components/chat/GroupChatPanel";

// OSRM API URLs for routing (multiple servers for fallback)
const OSRM_SERVERS = [
    "https://routing.openstreetmap.de/routed-car/route/v1/driving/",
    "https://router.project-osrm.org/route/v1/driving/"
];

// API base
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export default function GroupPickupPage() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    const [group, setGroup] = useState(null);
    const [parcels, setParcels] = useState([]);
    const [optimizedParcels, setOptimizedParcels] = useState([]); // Sorted by nearest distance
    const [loading, setLoading] = useState(true);
    const [agentLocation, setAgentLocation] = useState(null);
    const [watchId, setWatchId] = useState(null);

    // OTP Modal state
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [selectedParcel, setSelectedParcel] = useState(null);
    const [otp, setOtp] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [sharingLocation, setSharingLocation] = useState(false);
    const [pickupPhoto, setPickupPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const photoInputRef = useRef(null);

    // Warehouse arrival state
    const [showWarehouseModal, setShowWarehouseModal] = useState(false);
    const [warehousePhoto, setWarehousePhoto] = useState(null);
    const [warehousePhotoPreview, setWarehousePhotoPreview] = useState(null);
    const [confirmingWarehouse, setConfirmingWarehouse] = useState(false);
    const warehousePhotoRef = useRef(null);

    // Fetch group data
    useEffect(() => {
        fetchGroupData();
        startLocationTracking();

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [groupId]);

    // Auto-share location to backend
    const autoShareLocation = async (lat, lng) => {
        try {
            const token = localStorage.getItem("token");
            await fetch(`${API_BASE}/agents/share-location`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    groupShipmentId: groupId,
                    latitude: lat,
                    longitude: lng
                })
            });
        } catch (err) {
            // Silent fail for auto-share
        }
    };

    const startLocationTracking = () => {
        if ("geolocation" in navigator) {
            // First try to get current position
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setAgentLocation(loc);
                    // Auto-share this location
                    autoShareLocation(loc.lat, loc.lng);
                    console.log("GPS location obtained:", loc);
                },
                (error) => {
                    console.warn("Initial location error:", error);
                    toast.error("GPS unavailable: " + error.message + ". Using fallback location.");
                    // Fallback: Use warehouse location or Chennai center
                    if (group?.warehouseLatitude) {
                        const fallbackLoc = {
                            lat: parseFloat(group.warehouseLatitude) + 0.02,
                            lng: parseFloat(group.warehouseLongitude) + 0.02
                        };
                        setAgentLocation(fallbackLoc);
                    } else {
                        setAgentLocation({ lat: 13.0827, lng: 80.2707 });
                    }
                },
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
            );

            // Then watch for updates and auto-share every update
            const id = navigator.geolocation.watchPosition(
                (position) => {
                    const loc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setAgentLocation(loc);
                    // Auto-share on each location update
                    autoShareLocation(loc.lat, loc.lng);
                },
                (error) => console.warn("Location watch error:", error),
                { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
            );
            setWatchId(id);
        } else {
            // No geolocation support - use fallback
            toast.error("Geolocation not supported by this browser");
            setAgentLocation({ lat: 13.0827, lng: 80.2707 });
        }
    };

    const fetchGroupData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [groupRes, parcelsRes] = await Promise.all([
                fetch(`${API_BASE}/groups/${groupId}`, { headers }),
                fetch(`${API_BASE}/groups/${groupId}/parcels`, { headers })
            ]);

            if (!groupRes.ok || !parcelsRes.ok) throw new Error("Failed to fetch");

            const groupData = await groupRes.json();
            const parcelsData = await parcelsRes.json();

            setGroup(groupData.data);
            setParcels(parcelsData.data || []);
        } catch (err) {
            toast.error("Failed to load pickup data");
        } finally {
            setLoading(false);
        }
    };

    // Initialize map
    useEffect(() => {
        if (!group || !mapRef.current || mapInstanceRef.current) return;

        const initMap = () => {
            const L = window.L;
            if (!L) return;

            const centerLat = agentLocation?.lat || group.warehouseLatitude || 13.0827;
            const centerLng = agentLocation?.lng || group.warehouseLongitude || 80.2707;

            const map = L.map(mapRef.current).setView([centerLat, centerLng], 12);
            mapInstanceRef.current = map;

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap"
            }).addTo(map);

            updateMapMarkers(map);
        };

        if (!window.L) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
            document.head.appendChild(link);

            const script = document.createElement("script");
            script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            script.onload = initMap;
            document.head.appendChild(script);
        } else {
            initMap();
        }
    }, [group, parcels]);

    // Update markers when agent location changes
    useEffect(() => {
        if (mapInstanceRef.current && agentLocation) {
            updateMapMarkers(mapInstanceRef.current);
        }
    }, [agentLocation]);

    const updateMapMarkers = async (map) => {
        const L = window.L;
        if (!L || !group) return;

        // Clear existing layers except tile layer
        map.eachLayer((layer) => {
            if (!(layer instanceof L.TileLayer)) {
                map.removeLayer(layer);
            }
        });

        const bounds = [];
        const routePoints = [];

        // Agent marker (current position)
        if (agentLocation) {
            const agentIcon = L.divIcon({
                className: "agent-marker",
                html: `<div style="background: #3b82f6; color: white; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 4px 12px rgba(59,130,246,0.5); border: 3px solid white;">🚚</div>`,
                iconSize: [48, 48],
                iconAnchor: [24, 24]
            });
            L.marker([agentLocation.lat, agentLocation.lng], { icon: agentIcon })
                .addTo(map)
                .bindPopup("<b>Your Location</b>");
            bounds.push([agentLocation.lat, agentLocation.lng]);
        }

        // Geocode function using Nominatim (same as company page)
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

        // Calculate distance between two points (Haversine formula)
        const calculateDistance = (lat1, lng1, lat2, lng2) => {
            const R = 6371; // Earth's radius in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        // Prepare pickup points with coordinates (geocode if needed)
        const pickupPoints = [];
        const centerLat = group.warehouseLatitude ? parseFloat(group.warehouseLatitude) : 13.0827;
        const centerLng = group.warehouseLongitude ? parseFloat(group.warehouseLongitude) : 80.2707;

        for (let originalIndex = 0; originalIndex < parcels.length; originalIndex++) {
            const parcel = parcels[originalIndex];
            let lat = parseFloat(parcel.pickupLatitude);
            let lng = parseFloat(parcel.pickupLongitude);

            // If no coordinates, try to geocode from address
            if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                const geocoded = await geocodeAddress(
                    parcel.pickupAddress,
                    parcel.pickupCity,
                    parcel.pickupPincode
                );
                if (geocoded) {
                    lat = geocoded.lat;
                    lng = geocoded.lng;
                } else {
                    // Fallback: spread around warehouse
                    lat = centerLat + (originalIndex * 0.01) - 0.015;
                    lng = centerLng + (originalIndex % 2 === 0 ? 0.01 : -0.01);
                }
            }

            const isPickedUp = parcel.status === "PICKED_UP" || parcel.status === "IN_TRANSIT" ||
                parcel.status === "IN_TRANSIT_TO_WAREHOUSE" || parcel.status === "AT_WAREHOUSE" ||
                parcel.status === "OUT_FOR_DELIVERY" || parcel.status === "DELIVERED";

            pickupPoints.push({ parcel, lat, lng, originalIndex, isPickedUp });
        }

        // Nearest Neighbor Algorithm: Sort pending pickups by distance from current position
        const pendingPickups = pickupPoints.filter(p => !p.isPickedUp);
        const completedPickups = pickupPoints.filter(p => p.isPickedUp);

        const optimizedRoute = [];
        let currentLat = agentLocation?.lat || (group.warehouseLatitude ? parseFloat(group.warehouseLatitude) : 13.0827);
        let currentLng = agentLocation?.lng || (group.warehouseLongitude ? parseFloat(group.warehouseLongitude) : 80.2707);

        // Start with agent location for route
        routePoints.push([currentLng, currentLat]);

        // Greedy nearest neighbor: Always pick the closest unvisited pickup
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

        // Draw pickup markers - Completed first, then optimized pending
        completedPickups.forEach((point, idx) => {
            const markerIcon = L.divIcon({
                className: "pickup-marker",
                html: `<div style="background: #10b981; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid white;">✓</div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });
            L.marker([point.lat, point.lng], { icon: markerIcon })
                .addTo(map)
                .bindPopup(`<b>Pickup (Done)</b><br>${point.parcel.pickupName}<br>${point.parcel.trackingNumber}`);
            bounds.push([point.lat, point.lng]);
        });

        // Draw optimized pending pickups with route order numbers
        optimizedRoute.forEach((point, routeOrder) => {
            const isNext = routeOrder === 0;
            const markerColor = isNext ? "#6366f1" : "#9ca3af";
            const markerIcon = L.divIcon({
                className: "pickup-marker",
                html: `<div style="background: ${markerColor}; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid white;">${routeOrder + 1}</div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });
            L.marker([point.lat, point.lng], { icon: markerIcon })
                .addTo(map)
                .bindPopup(`
                    <b>Stop ${routeOrder + 1}</b><br>
                    ${point.parcel.pickupName}<br>
                    ${point.parcel.pickupAddress || ''}<br>
                    ${point.parcel.trackingNumber}<br>
                    <small>${isNext ? "🔵 Next (Nearest)" : "⏳ Pending"}</small>
                `);
            bounds.push([point.lat, point.lng]);
            routePoints.push([point.lng, point.lat]);
        });

        // Update optimized parcels state for the pickup list
        // Sort completed by pickup time (earliest first), pending by route order
        const sortedCompleted = completedPickups
            .map(p => ({ ...p.parcel, isPickedUp: true, routeOrder: -1 }))
            .sort((a, b) => {
                const timeA = new Date(a.pickedUpAt || 0).getTime();
                const timeB = new Date(b.pickedUpAt || 0).getTime();
                return timeA - timeB;
            });

        const orderedParcels = [
            ...sortedCompleted,
            ...optimizedRoute.map((p, idx) => ({ ...p.parcel, isPickedUp: false, routeOrder: idx }))
        ];
        setOptimizedParcels(orderedParcels);

        // Warehouse marker
        if (group.warehouseLatitude && group.warehouseLongitude) {
            const warehouseIcon = L.divIcon({
                className: "warehouse-marker",
                html: `<div style="background: #f59e0b; color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 4px 12px rgba(245,158,11,0.5); border: 3px solid white;">🏭</div>`,
                iconSize: [44, 44],
                iconAnchor: [22, 22]
            });
            L.marker([group.warehouseLatitude, group.warehouseLongitude], { icon: warehouseIcon })
                .addTo(map)
                .bindPopup(`<b>Warehouse</b><br>${group.warehouseAddress}`);
            bounds.push([group.warehouseLatitude, group.warehouseLongitude]);
        }

        // Fit bounds
        if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }

        // Draw route - ONLY to next destination (not entire path)
        // If pending pickups exist: Agent → Next Pickup
        // If all pickups done: Agent current location → Warehouse
        let currentRoutePoints = [];

        if (optimizedRoute.length > 0 && agentLocation) {
            // There are pending pickups - show route from agent to NEXT pickup only
            const nextPickup = optimizedRoute[0];
            currentRoutePoints = [
                [agentLocation.lng, agentLocation.lat],
                [nextPickup.lng, nextPickup.lat]
            ];
        } else if (agentLocation && group.warehouseLatitude && group.warehouseLongitude) {
            // All pickups done - show route from AGENT'S CURRENT LOCATION to warehouse
            currentRoutePoints = [
                [agentLocation.lng, agentLocation.lat],
                [parseFloat(group.warehouseLongitude), parseFloat(group.warehouseLatitude)]
            ];
        }

        if (currentRoutePoints.length >= 2) {
            fetchAndDrawRoute(map, currentRoutePoints, L);
        }
    };

    const fetchAndDrawRoute = async (map, points, L) => {
        const coordsString = points.map(p => `${p[0]},${p[1]}`).join(";");

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
                    L.geoJSON(data.routes[0].geometry, {
                        style: {
                            color: "#6366f1",
                            weight: 5,
                            opacity: 0.8,
                            dashArray: "10, 10"
                        }
                    }).addTo(map);
                    console.log("Route drawn successfully from:", server);
                    return; // Success
                }
            } catch (err) {
                console.warn(`Route from ${server} failed:`, err.message);
            }
        }
        console.error("All routing servers failed");
    };

    // Handle pickup verification
    const handlePickup = (parcel) => {
        setSelectedParcel(parcel);
        setOtp("");
        setPickupPhoto(null);
        setPhotoPreview(null);
        setShowOtpModal(true);
    };

    // Handle photo capture
    const handlePhotoCapture = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPickupPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const verifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            toast.error("Please enter 6-digit OTP");
            return;
        }

        setVerifying(true);
        try {
            const token = localStorage.getItem("token");

            // Use FormData to send both OTP and photo
            const formData = new FormData();
            formData.append("otp", otp);
            formData.append("groupShipmentId", groupId);
            if (pickupPhoto) {
                formData.append("pickupPhoto", pickupPhoto);
            }

            const response = await fetch(`${API_BASE}/agents/pickups/${selectedParcel.id}/verify`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                    // Don't set Content-Type for FormData - browser will set it with boundary
                },
                body: formData
            });

            if (response.ok) {
                toast.success(`Picked up ${selectedParcel.trackingNumber}!`);
                setShowOtpModal(false);
                setPickupPhoto(null);
                setPhotoPreview(null);
                fetchGroupData(); // Refresh data to show updated status
            } else {
                const error = await response.json();
                toast.error(error.message || "Invalid OTP");
            }
        } catch (err) {
            toast.error("Verification failed");
        } finally {
            setVerifying(false);
        }
    };

    // Confirm warehouse arrival with photo proof
    const confirmWarehouseArrival = async () => {
        if (!warehousePhoto) {
            toast.error("Please take a photo as proof of arrival");
            return;
        }

        setConfirmingWarehouse(true);
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("groupShipmentId", groupId);
            formData.append("warehousePhoto", warehousePhoto);

            const response = await fetch(`${API_BASE}/agents/warehouse-arrival`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                toast.success("Warehouse arrival confirmed! All parcels updated.");
                setShowWarehouseModal(false);
                setWarehousePhoto(null);
                setWarehousePhotoPreview(null);
                fetchGroupData(); // Refresh data
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to confirm arrival");
            }
        } catch (err) {
            toast.error("Failed to confirm warehouse arrival");
        } finally {
            setConfirmingWarehouse(false);
        }
    };

    // Handle warehouse photo capture
    const handleWarehousePhoto = (e) => {
        const file = e.target.files[0];
        if (file) {
            setWarehousePhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => setWarehousePhotoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    // Navigate to location
    const openNavigation = (lat, lng) => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
    };

    // Share location to backend (updates agent's current location for customers/company to see)
    const shareLocation = async () => {
        if (!agentLocation) {
            toast.error("Cannot get your location. Please enable location services.");
            return;
        }

        setSharingLocation(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE}/agents/share-location`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    groupShipmentId: groupId,
                    latitude: agentLocation.lat,
                    longitude: agentLocation.lng
                })
            });

            if (response.ok) {
                toast.success("Location shared with customer & company!");
            } else {
                toast.error("Failed to share location");
            }
        } catch (err) {
            toast.error("Failed to share location");
        } finally {
            setSharingLocation(false);
        }
    };

    // Get next pickup - use optimized route (nearest neighbor) if available
    const getNextPickup = () => {
        // First try to get from optimized route (routeOrder 0 is nearest)
        if (optimizedParcels.length > 0) {
            const nearest = optimizedParcels.find(p => p.routeOrder === 0 && !p.isPickedUp);
            if (nearest) return nearest;
        }
        // Fallback to original parcels
        return parcels.find(p => p.status === "ASSIGNED" || p.status === "CONFIRMED");
    };

    // Count picked up
    const pickedCount = parcels.filter(p =>
        p.status === "PICKED_UP" || p.status === "IN_TRANSIT" || p.status === "IN_TRANSIT_TO_WAREHOUSE" ||
        p.status === "AT_WAREHOUSE" || p.status === "OUT_FOR_DELIVERY" || p.status === "DELIVERED"
    ).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900">
                <FaSpinner className="animate-spin text-4xl text-orange-400" />
            </div>
        );
    }

    const nextPickup = getNextPickup();

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 sticky top-0 z-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/agent/dashboard")} className="p-2 hover:bg-white/20 rounded-lg">
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className="font-bold text-lg">Group Pickup</h1>
                            <p className="text-sm opacity-90">{group?.groupCode} | {pickedCount}/{parcels.length} collected</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={shareLocation}
                            disabled={sharingLocation || !agentLocation}
                            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                        >
                            {sharingLocation ? <FaSpinner className="animate-spin" /> : <FaBroadcastTower />}
                            Share Location
                        </button>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            // Determine the actual status considering parcel states
                            (group?.status === "PICKUP_COMPLETE" ||
                                (parcels.length > 0 && parcels.every(p =>
                                    ["AT_WAREHOUSE", "OUT_FOR_DELIVERY", "DELIVERED"].includes(p.status))))
                                ? "bg-green-500 text-white"
                                : "bg-white/20"
                            }`}>
                            {/* Show PICKUP COMPLETE if all parcels are at warehouse */}
                            {(group?.status === "PICKUP_COMPLETE" ||
                                (parcels.length > 0 && parcels.every(p =>
                                    ["AT_WAREHOUSE", "OUT_FOR_DELIVERY", "DELIVERED"].includes(p.status))))
                                ? "✓ PICKUP COMPLETE"
                                : group?.status?.replace(/_/g, " ")}
                        </div>
                    </div>
                </div>
            </div>

            {/* Map */}
            <div className="relative z-0 overflow-hidden" style={{ height: "45vh" }}>
                <div ref={mapRef} className="w-full h-full" />
            </div>

            {/* Map Legend */}
            <div className="bg-white/10 backdrop-blur-xl px-4 py-2 flex gap-4 text-xs border-b border-white/10 overflow-x-auto">
                <span className="flex items-center gap-1 whitespace-nowrap text-white/80">
                    <span className="w-4 h-4 bg-blue-500 rounded-full inline-block" /> Your Location
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap text-white/80">
                    <span className="w-4 h-4 bg-green-500 rounded-full inline-block" /> Done
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap text-white/80">
                    <span className="w-4 h-4 bg-indigo-500 rounded-full inline-block" /> Next
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap text-white/80">
                    <span className="w-4 h-4 bg-gray-400 rounded-full inline-block" /> Pending
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap text-white/80">
                    <span className="w-4 h-4 bg-amber-500 rounded-full inline-block" /> Warehouse
                </span>
            </div>

            {/* Next Pickup Card */}
            {nextPickup && (
                <div className="bg-blue-500/20 border-l-4 border-blue-500 p-4 m-4 rounded-r-lg backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-blue-300">Next Stop</span>
                        <span className="text-sm text-blue-400">{nextPickup.trackingNumber}</span>
                    </div>
                    <p className="font-medium text-white">{nextPickup.pickupName}</p>
                    <p className="text-sm text-white/70 mb-3">{nextPickup.pickupAddress}</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => openNavigation(nextPickup.pickupLatitude, nextPickup.pickupLongitude)}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 font-medium"
                        >
                            <FaRoute /> Navigate
                        </button>
                        <a
                            href={`tel:${nextPickup.pickupPhone}`}
                            className="px-4 bg-white/10 text-white py-2 rounded-lg flex items-center justify-center border border-white/20"
                        >
                            <FaPhone />
                        </a>
                        <button
                            onClick={() => handlePickup(nextPickup)}
                            className="flex-1 bg-green-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 font-medium"
                        >
                            <FaCheck /> Pickup
                        </button>
                    </div>
                </div>
            )}

            {/* Pickup List - Optimized Order (Nearest First) */}
            <div className="p-4">
                <h2 className="font-semibold text-white mb-3">
                    Pickup List <span className="text-sm font-normal text-white/50">(optimized route)</span>
                </h2>
                <div className="space-y-2">
                    {(optimizedParcels.length > 0 ? optimizedParcels : parcels).map((parcel, index) => {
                        const isPickedUp = parcel.isPickedUp ?? (parcel.status === "PICKED_UP" || parcel.status === "IN_TRANSIT" ||
                            parcel.status === "IN_TRANSIT_TO_WAREHOUSE" || parcel.status === "AT_WAREHOUSE" ||
                            parcel.status === "OUT_FOR_DELIVERY" || parcel.status === "DELIVERED");
                        const routeOrder = parcel.routeOrder ?? index;
                        const isNext = routeOrder === 0 && !isPickedUp;

                        return (
                            <div
                                key={parcel.id}
                                className={`bg-white/10 backdrop-blur-xl rounded-lg p-3 flex items-center gap-3 border border-white/10 ${isNext ? "ring-2 ring-indigo-500" : ""} ${isPickedUp ? "opacity-60" : ""}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isPickedUp ? "bg-green-500/20 text-green-400" :
                                    isNext ? "bg-indigo-500 text-white" : "bg-white/10 text-white/50"
                                    }`}>
                                    {isPickedUp ? <FaCheck /> : routeOrder + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white truncate">{parcel.pickupName}</p>
                                    <p className="text-xs text-white/50 truncate">{parcel.trackingNumber}</p>
                                </div>
                                {isPickedUp && (
                                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                                        {parcel.pickedUpAt ? new Date(parcel.pickedUpAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Picked"}
                                    </span>
                                )}
                                {isNext && (
                                    <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-full border border-indigo-500/30">Nearest</span>
                                )}
                                {!isPickedUp && !isNext && (
                                    <span className="text-xs text-white/40">Pending</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Warehouse destination */}
                {group?.warehouseAddress && (() => {
                    const allPickupsDone = parcels.length > 0 && parcels.every(p =>
                        ["PICKED_UP", "IN_TRANSIT", "IN_TRANSIT_TO_WAREHOUSE", "AT_WAREHOUSE", "OUT_FOR_DELIVERY", "DELIVERED"].includes(p.status)
                    );
                    const atWarehouse = parcels.length > 0 && parcels.some(p =>
                        ["AT_WAREHOUSE", "OUT_FOR_DELIVERY", "DELIVERED"].includes(p.status)
                    );

                    return (
                        <div className={`mt-4 ${atWarehouse ? 'bg-green-500/20 border-green-500/30' : 'bg-amber-500/20 border-amber-500/30'} border rounded-lg p-3 backdrop-blur-xl`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 ${atWarehouse ? 'bg-green-500' : 'bg-amber-500'} rounded-full flex items-center justify-center text-white`}>
                                    {atWarehouse ? <FaCheck /> : <FaWarehouse />}
                                </div>
                                <div className="flex-1">
                                    <p className={`font-medium ${atWarehouse ? 'text-green-300' : 'text-amber-300'}`}>
                                        {atWarehouse ? "✓ Arrived at Warehouse" : "After all pickups → Warehouse"}
                                    </p>
                                    <p className={`text-xs ${atWarehouse ? 'text-green-400' : 'text-amber-400'} truncate`}>{group.warehouseAddress}</p>
                                </div>
                            </div>

                            {/* Confirm Arrival Button - only show when all pickups done but not yet at warehouse */}
                            {allPickupsDone && !atWarehouse && (
                                <button
                                    onClick={() => setShowWarehouseModal(true)}
                                    className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
                                >
                                    <FaCamera /> Confirm Warehouse Arrival
                                </button>
                            )}

                            {atWarehouse && group.warehouseArrivalPhotoUrl && (
                                <div className="mt-2 text-xs text-green-400">
                                    📷 Arrival proof submitted
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* OTP Modal */}
            {showOtpModal && selectedParcel && (
                <div className="fixed inset-0 bg-black/70 flex items-end z-50">
                    <div className="bg-slate-800 w-full rounded-t-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto border-t border-white/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Verify Pickup</h3>
                            <button onClick={() => setShowOtpModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                                <FaTimesCircle className="text-white/50" />
                            </button>
                        </div>

                        {/* Parcel Info */}
                        <div className="bg-white/10 rounded-lg p-3 mb-4 border border-white/10">
                            <p className="font-medium text-white">{selectedParcel.pickupName}</p>
                            <p className="text-sm text-white/60">{selectedParcel.trackingNumber}</p>
                        </div>

                        {/* Photo Capture Section */}
                        <div className="mb-4">
                            <p className="text-sm font-medium text-white/80 mb-2">📷 Take Pickup Photo</p>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={photoInputRef}
                                onChange={handlePhotoCapture}
                                className="hidden"
                            />
                            {photoPreview ? (
                                <div className="relative">
                                    <img src={photoPreview} alt="Pickup" className="w-full h-32 object-cover rounded-lg border-2 border-green-500" />
                                    <button
                                        onClick={() => { setPickupPhoto(null); setPhotoPreview(null); }}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => photoInputRef.current?.click()}
                                    className="w-full border-2 border-dashed border-white/30 rounded-lg p-4 flex flex-col items-center gap-2 text-white/60 hover:border-indigo-400 hover:bg-indigo-500/10"
                                >
                                    <FaCamera className="text-2xl" />
                                    <span>Tap to capture package photo</span>
                                </button>
                            )}
                        </div>

                        {/* OTP Input */}
                        <p className="text-sm font-medium text-white/80 mb-2">🔑 Enter 6-digit OTP from customer</p>
                        <input
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            placeholder="Enter OTP"
                            className="w-full text-center text-2xl tracking-widest py-4 bg-white/10 border-2 border-white/20 rounded-lg focus:border-green-500 focus:outline-none mb-4 text-white placeholder-white/40"
                            autoFocus
                        />

                        <button
                            onClick={verifyOtp}
                            disabled={verifying || otp.length !== 6}
                            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {verifying ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                            {verifying ? "Verifying..." : "Confirm Pickup"}
                        </button>
                    </div>
                </div>
            )}

            {/* Warehouse Arrival Modal */}
            {showWarehouseModal && (
                <div className="fixed inset-0 bg-black/70 flex items-end z-50">
                    <div className="bg-slate-800 w-full rounded-t-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto border-t border-white/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Confirm Warehouse Arrival</h3>
                            <button onClick={() => setShowWarehouseModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                                <FaTimesCircle className="text-white/50" />
                            </button>
                        </div>

                        {/* Warehouse Info */}
                        <div className="bg-amber-500/20 rounded-lg p-3 mb-4 border border-amber-500/30">
                            <div className="flex items-center gap-3">
                                <FaWarehouse className="text-amber-400 text-xl" />
                                <div>
                                    <p className="font-medium text-white">{group?.warehouseAddress || 'Warehouse'}</p>
                                    <p className="text-sm text-white/60">{group?.warehouseCity}</p>
                                </div>
                            </div>
                        </div>

                        {/* Photo Capture */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                📷 Take arrival proof photo
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleWarehousePhoto}
                                ref={warehousePhotoRef}
                                className="hidden"
                            />
                            {warehousePhotoPreview ? (
                                <div className="relative">
                                    <img src={warehousePhotoPreview} alt="Warehouse arrival" className="w-full h-48 object-cover rounded-lg" />
                                    <button
                                        onClick={() => { setWarehousePhoto(null); setWarehousePhotoPreview(null); }}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                                    >
                                        <FaTimesCircle />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => warehousePhotoRef.current?.click()}
                                    className="w-full border-2 border-dashed border-white/30 rounded-lg p-8 text-center hover:border-amber-400 transition"
                                >
                                    <FaCamera className="mx-auto text-3xl text-white/40 mb-2" />
                                    <p className="text-white/60">Tap to take photo</p>
                                </button>
                            )}
                        </div>

                        <p className="text-xs text-white/50 mb-4 text-center">
                            This confirms all {parcels.length} parcels have arrived at the warehouse
                        </p>

                        <button
                            onClick={confirmWarehouseArrival}
                            disabled={confirmingWarehouse || !warehousePhoto}
                            className="w-full bg-amber-500 text-white py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {confirmingWarehouse ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                            {confirmingWarehouse ? "Confirming..." : "Confirm Arrival at Warehouse"}
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up { animation: slide-up 0.3s ease-out; }
            `}</style>

            {/* Chat with Customers - show always, but read-only after pickup complete */}
            {group && parcels.length > 0 && (
                <GroupChatPanel
                    groupId={parseInt(groupId)}
                    parcels={parcels}
                    isMinimized={true}
                    readOnly={['AT_WAREHOUSE', 'PICKUP_COMPLETE', 'DELIVERY_IN_PROGRESS', 'COMPLETED'].includes(group.status)}
                />
            )}
        </div>
    );
}
