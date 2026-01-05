import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    FaMapMarkerAlt, FaTruck, FaWarehouse, FaPhone, FaCheck, FaClock,
    FaSpinner, FaArrowLeft, FaRoute, FaCheckCircle, FaTimesCircle, FaCamera,
    FaBroadcastTower, FaMoneyBillWave, FaExclamationTriangle, FaCreditCard
} from "react-icons/fa";
import GroupChatPanel from "../../components/chat/GroupChatPanel";

// OSRM API URLs for routing (multiple servers for fallback)
const OSRM_SERVERS = [
    "https://routing.openstreetmap.de/routed-car/route/v1/driving/",
    "https://router.project-osrm.org/route/v1/driving/"
];
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export default function GroupDeliveryPage() {
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
    const [sharingLocation, setSharingLocation] = useState(false);

    // OTP Modal state
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [selectedParcel, setSelectedParcel] = useState(null);
    const [otp, setOtp] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [deliveryPhoto, setDeliveryPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const photoInputRef = useRef(null);

    // Cash collection modal state
    const [showCashModal, setShowCashModal] = useState(false);
    const [cashParcel, setCashParcel] = useState(null);
    const [cashPhoto, setCashPhoto] = useState(null);
    const [cashPhotoPreview, setCashPhotoPreview] = useState(null);
    const [collectingCash, setCollectingCash] = useState(false);

    // Fetch group data
    useEffect(() => {
        fetchGroupData();

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [groupId]);

    // Start location tracking after group data is loaded
    useEffect(() => {
        if (group && parcels.length > 0) {
            startLocationTracking();
        }
    }, [group, parcels]);

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

    // Share location to backend (updates agent's current location for customers/company to see)
    const shareLocation = async () => {
        if (!agentLocation) {
            toast.error("Cannot get your location. Please enable location services.");
            return;
        }

        console.log("Sharing location to backend:", agentLocation.lat, agentLocation.lng);
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
                toast.success(`Location shared! (${agentLocation.lat.toFixed(4)}, ${agentLocation.lng.toFixed(4)})`);
            } else {
                toast.error("Failed to share location");
            }
        } catch (err) {
            toast.error("Failed to share location");
        } finally {
            setSharingLocation(false);
        }
    };

    const startLocationTracking = () => {
        // Set initial location from group data immediately (last shared location)
        if (group?.deliveryAgentLatitude && group?.deliveryAgentLongitude) {
            setAgentLocation({
                lat: parseFloat(group.deliveryAgentLatitude),
                lng: parseFloat(group.deliveryAgentLongitude)
            });
        } else if (group?.warehouseLatitude && group?.warehouseLongitude) {
            setAgentLocation({
                lat: parseFloat(group.warehouseLatitude),
                lng: parseFloat(group.warehouseLongitude)
            });
        } else if (parcels.length > 0 && parcels[0].deliveryLatitude) {
            setAgentLocation({
                lat: parseFloat(parcels[0].deliveryLatitude),
                lng: parseFloat(parcels[0].deliveryLongitude)
            });
        }

        // Then try to get actual GPS location and update if successful
        if ("geolocation" in navigator) {
            // Use low accuracy first (faster) - desktop browsers often timeout with highAccuracy
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setAgentLocation(loc);
                    autoShareLocation(loc.lat, loc.lng);
                    console.log("GPS location obtained:", loc);
                },
                (error) => {
                    console.warn("Geolocation unavailable:", error.message);
                    // Don't show toast for every timeout - it's annoying
                    if (error.code !== 3) { // 3 = TIMEOUT
                        toast.error("GPS unavailable: " + error.message);
                    }
                },
                { enableHighAccuracy: false, maximumAge: 60000, timeout: 30000 }
            );

            // Watch for location updates with less strict settings
            const id = navigator.geolocation.watchPosition(
                (position) => {
                    const loc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setAgentLocation(loc);
                    autoShareLocation(loc.lat, loc.lng);
                },
                (error) => {
                    // Silent fail for watch errors - they happen often on desktop
                    if (error.code !== 3) {
                        console.warn("Location watch error:", error.message);
                    }
                },
                { enableHighAccuracy: false, maximumAge: 30000, timeout: 60000 }
            );
            setWatchId(id);
        } else {
            toast.error("Geolocation not supported by this browser");
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
            toast.error("Failed to load delivery data");
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

            // Define base layers
            const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            });

            const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri'
            });

            // Add default layer
            streetLayer.addTo(map);

            // Add layer control
            const baseMaps = {
                "Street": streetLayer,
                "Satellite": satelliteLayer
            };
            L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

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

    useEffect(() => {
        if (mapInstanceRef.current && agentLocation) {
            updateMapMarkers(mapInstanceRef.current);
        }
    }, [agentLocation]);

    const updateMapMarkers = async (map) => {
        const L = window.L;
        if (!L || !group) return;

        console.log("updateMapMarkers called with agentLocation:", agentLocation);

        map.eachLayer((layer) => {
            if (!(layer instanceof L.TileLayer)) {
                map.removeLayer(layer);
            }
        });

        const bounds = [];
        const routePoints = [];

        // Geocode function using Nominatim (same as pickup page)
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
            const R = 6371; // km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        // Prepare delivery points with coordinates (geocode if needed)
        const deliveryPoints = [];
        const centerLat = group.warehouseLatitude ? parseFloat(group.warehouseLatitude) : 13.0827;
        const centerLng = group.warehouseLongitude ? parseFloat(group.warehouseLongitude) : 80.2707;

        for (let originalIndex = 0; originalIndex < parcels.length; originalIndex++) {
            const parcel = parcels[originalIndex];
            let lat = parseFloat(parcel.deliveryLatitude);
            let lng = parseFloat(parcel.deliveryLongitude);

            // If no coordinates, try to geocode from address
            if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                const geocoded = await geocodeAddress(
                    parcel.deliveryAddress,
                    parcel.deliveryCity,
                    parcel.deliveryPincode
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

            const isDelivered = parcel.status === "DELIVERED";
            deliveryPoints.push({ parcel, lat, lng, originalIndex, isDelivered });
        }

        // Nearest Neighbor Algorithm: Sort pending deliveries by distance from current position
        const pendingDeliveries = deliveryPoints.filter(p => !p.isDelivered);
        const completedDeliveries = deliveryPoints.filter(p => p.isDelivered);

        const optimizedRoute = [];
        let currentLat = agentLocation?.lat || centerLat;
        let currentLng = agentLocation?.lng || centerLng;

        // Greedy nearest neighbor: Always pick the closest unvisited delivery
        const remaining = [...pendingDeliveries];
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

        // Save optimized route to state for use in delivery list
        setOptimizedParcels(optimizedRoute.map((p, idx) => ({ ...p.parcel, routeOrder: idx })));

        // Add warehouse marker
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

        // Draw completed delivery markers (green checkmarks)
        completedDeliveries.forEach((point) => {
            const markerIcon = L.divIcon({
                className: "delivery-marker",
                html: `<div style="background: #10b981; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid white;">✓</div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });
            L.marker([point.lat, point.lng], { icon: markerIcon })
                .addTo(map)
                .bindPopup(`<b>Delivery (Done)</b><br>${point.parcel.deliveryName}<br>${point.parcel.trackingNumber}`);
            bounds.push([point.lat, point.lng]);
        });

        // Draw optimized pending deliveries with route order numbers
        optimizedRoute.forEach((point, routeOrder) => {
            const isNext = routeOrder === 0;
            const markerColor = isNext ? "#8b5cf6" : "#9ca3af";
            const markerSize = isNext ? 42 : 36;

            const markerIcon = L.divIcon({
                className: "delivery-marker",
                html: `<div style="background: ${markerColor}; color: white; width: ${markerSize}px; height: ${markerSize}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: ${isNext ? 16 : 14}px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: ${isNext ? '3px' : '2px'} solid white;">${routeOrder + 1}</div>`,
                iconSize: [markerSize, markerSize],
                iconAnchor: [markerSize / 2, markerSize / 2]
            });
            L.marker([point.lat, point.lng], { icon: markerIcon })
                .addTo(map)
                .bindPopup(`
                    <b>Delivery ${routeOrder + 1}</b><br>
                    ${point.parcel.deliveryName}<br>
                    ${point.parcel.trackingNumber}<br>
                    <small>${isNext ? "🔵 Next (Nearest)" : "⏳ Pending"}</small>
                `);
            bounds.push([point.lat, point.lng]);
        });

        // Add agent marker and start route from agent location
        if (agentLocation) {
            console.log("Creating agent marker at:", agentLocation.lat, agentLocation.lng);
            const agentIcon = L.divIcon({
                className: "agent-marker",
                html: `<div style="background: #8b5cf6; color: white; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 4px 12px rgba(139,92,246,0.5); border: 3px solid white;">🏃</div>`,
                iconSize: [48, 48],
                iconAnchor: [24, 24]
            });
            L.marker([agentLocation.lat, agentLocation.lng], { icon: agentIcon })
                .addTo(map)
                .bindPopup(`<b>Your Location</b><br>Lat: ${agentLocation.lat.toFixed(6)}<br>Lng: ${agentLocation.lng.toFixed(6)}`);
            bounds.push([agentLocation.lat, agentLocation.lng]);
            routePoints.push([agentLocation.lng, agentLocation.lat]);
        }

        // Build route ONLY to next nearest delivery (not all pending)
        if (optimizedRoute.length > 0) {
            routePoints.push([optimizedRoute[0].lng, optimizedRoute[0].lat]);
        }

        if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }

        if (routePoints.length > 1) {
            fetchAndDrawRoute(map, routePoints, L);
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
                            color: "#8b5cf6",
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

    const handleDelivery = (parcel) => {
        setSelectedParcel(parcel);
        setOtp("");
        setDeliveryPhoto(null);
        setPhotoPreview(null); // Reset preview when opening new modal
        setShowOtpModal(true);
    };

    const handlePhotoCapture = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Store raw file for Cloudinary upload later
            setDeliveryPhoto(file);
            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
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

            // Use FormData to send OTP, groupId, and photo in one request (like pickup flow)
            const formData = new FormData();
            formData.append("otp", otp);
            formData.append("groupShipmentId", groupId);
            if (deliveryPhoto && deliveryPhoto instanceof File) {
                formData.append("deliveryPhoto", deliveryPhoto);
            }

            console.log("Verifying delivery - parcelId:", selectedParcel.id, "groupId:", groupId, "hasPhoto:", !!deliveryPhoto);

            const response = await fetch(`${API_BASE}/agents/deliveries/${selectedParcel.id}/verify-with-photo`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                    // Don't set Content-Type for FormData - browser will set it with boundary
                },
                body: formData
            });

            if (response.ok) {
                toast.success(`Delivered ${selectedParcel.trackingNumber}!`);
                setShowOtpModal(false);
                setPhotoPreview(null);
                setDeliveryPhoto(null);
                fetchGroupData();
            } else {
                const error = await response.json();
                toast.error(error.message || "Invalid OTP");
            }
        } catch (err) {
            console.error("Delivery verification error:", err);
            toast.error("Verification failed");
        } finally {
            setVerifying(false);
        }
    };

    const openNavigation = (lat, lng) => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
    };

    // Get next delivery based on optimized route (nearest first)
    const getNextDelivery = () => {
        // Use optimized route if available, otherwise fall back to original list
        if (optimizedParcels.length > 0) {
            return optimizedParcels[0]; // First in optimized route is nearest
        }
        return parcels.find(p => p.status === "OUT_FOR_DELIVERY");
    };

    // Check if parcel has unpaid balance
    const hasUnpaidBalance = (parcel) => {
        return parcel.balanceAmount && parseFloat(parcel.balanceAmount) > 0 && !parcel.balancePaid;
    };

    // Open cash collection modal
    const openCashModal = (parcel) => {
        setCashParcel(parcel);
        setCashPhoto(null);
        setCashPhotoPreview(null);
        setShowCashModal(true);
    };

    // Handle cash photo capture
    const handleCashPhotoCapture = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCashPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => setCashPhotoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    // Submit cash collection
    const submitCashCollection = async () => {
        if (!cashPhoto) {
            toast.error("Please take a photo of the cash as proof");
            return;
        }

        setCollectingCash(true);
        try {
            const token = localStorage.getItem("token");

            // First upload photo to Cloudinary
            const formData = new FormData();
            formData.append("file", cashPhoto);
            formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_PRESET || "tpts_uploads");

            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "your_cloud_name";
            const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: "POST",
                body: formData
            });
            const uploadData = await uploadRes.json();

            if (!uploadData.secure_url) {
                throw new Error("Failed to upload photo");
            }

            // Record cash collection with photo URL
            const response = await fetch(`${API_BASE}/payments/balance/${cashParcel.id}/cash`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ photoUrl: uploadData.secure_url })
            });

            if (response.ok) {
                toast.success(`Cash collected: ₹${cashParcel.balanceAmount}`);
                setShowCashModal(false);
                fetchGroupData(); // Refresh to update balance status
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to record cash collection");
            }
        } catch (err) {
            console.error("Cash collection error:", err);
            toast.error(err.message || "Failed to collect cash");
        } finally {
            setCollectingCash(false);
        }
    };

    const deliveredCount = parcels.filter(p => p.status === "DELIVERED").length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900">
                <FaSpinner className="animate-spin text-4xl text-purple-400" />
            </div>
        );
    }

    const nextDelivery = getNextDelivery();

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-violet-500 text-white p-4 sticky top-0 z-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/agent/dashboard")} className="p-2 hover:bg-white/20 rounded-lg">
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className="font-bold text-lg">Group Delivery</h1>
                            <p className="text-sm opacity-90">{group?.groupCode} | {deliveredCount}/{parcels.length} delivered</p>
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
                        <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                            {group?.status?.replace(/_/g, " ")}
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
                    <span className="w-4 h-4 bg-amber-500 rounded-full inline-block" /> Warehouse
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap text-white/80">
                    <span className="w-4 h-4 bg-green-500 rounded-full inline-block" /> Delivered
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap text-white/80">
                    <span className="w-4 h-4 bg-purple-500 rounded-full inline-block" /> Next
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap text-white/80">
                    <span className="w-4 h-4 bg-gray-400 rounded-full inline-block" /> Pending
                </span>
            </div>

            {/* Next Delivery Card - Only show if there are pending deliveries */}
            {nextDelivery && group?.status !== "COMPLETED" && (
                <div className="bg-purple-500/20 border-l-4 border-purple-500 p-4 m-4 rounded-r-lg backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-purple-300">Next Delivery</span>
                        <span className="text-sm text-purple-400">{nextDelivery.trackingNumber}</span>
                    </div>
                    <p className="font-medium text-white">{nextDelivery.deliveryName}</p>
                    <p className="text-sm text-white/70 mb-2">{nextDelivery.deliveryAddress}</p>

                    {/* Payment Summary */}
                    <div className="bg-white/10 rounded-lg p-2 mb-3 flex items-center justify-between text-sm border border-white/10">
                        <span className="text-white/70">
                            Amount Paid: <span className="font-semibold text-green-400">₹{parseFloat(nextDelivery.finalPrice || 0).toFixed(2)}</span>
                        </span>
                        {parseFloat(nextDelivery.balanceAmount || 0) > 0 && (
                            <span className={nextDelivery.balancePaid ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                                {nextDelivery.balancePaid ? '✓ Balance Paid' : `+ ₹${parseFloat(nextDelivery.balanceAmount).toFixed(2)} due`}
                            </span>
                        )}
                    </div>


                    {/* Balance Alert */}
                    {hasUnpaidBalance(nextDelivery) && (
                        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FaExclamationTriangle className="text-red-400" />
                                <div>
                                    <p className="font-medium text-red-300">Balance Due: ₹{parseFloat(nextDelivery.balanceAmount).toFixed(2)}</p>
                                    <p className="text-xs text-red-400">Collect cash or ask to pay online</p>
                                </div>
                            </div>
                            <button
                                onClick={() => openCashModal(nextDelivery)}
                                className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1"
                            >
                                <FaMoneyBillWave /> Collect
                            </button>
                        </div>
                    )}

                    {/* Balance Paid Badge */}
                    {nextDelivery.balancePaid && parseFloat(nextDelivery.balanceAmount) > 0 && (
                        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-2 mb-3 flex items-center gap-2">
                            <FaCheckCircle className="text-green-400" />
                            <span className="text-sm text-green-300">
                                Balance ₹{parseFloat(nextDelivery.balanceAmount).toFixed(2)} Paid ({nextDelivery.balancePaymentMethod})
                            </span>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={() => openNavigation(nextDelivery.deliveryLatitude, nextDelivery.deliveryLongitude)}
                            className="flex-1 bg-purple-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 font-medium"
                        >
                            <FaRoute /> Navigate
                        </button>
                        <a
                            href={`tel:${nextDelivery.deliveryPhone}`}
                            className="px-4 bg-white/10 text-white py-2 rounded-lg flex items-center justify-center border border-white/20"
                        >
                            <FaPhone />
                        </a>
                        <button
                            onClick={() => handleDelivery(nextDelivery)}
                            className="flex-1 bg-green-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 font-medium"
                        >
                            <FaCheck /> Deliver
                        </button>
                    </div>
                </div>
            )}

            {/* COMPLETED GROUP SUMMARY */}
            {group?.status === "COMPLETED" && (
                <div className="p-4 space-y-4">
                    {/* Success Banner */}
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white text-center">
                        <FaCheckCircle className="text-5xl mx-auto mb-3" />
                        <h2 className="text-2xl font-bold mb-2">All Deliveries Complete!</h2>
                        <p className="opacity-90">{parcels.length} parcels delivered successfully</p>
                    </div>

                    {/* Delivered Parcels Details */}
                    <h3 className="font-semibold text-white text-lg">Delivery Details</h3>
                    <div className="space-y-4">
                        {parcels.map((parcel) => (
                            <div key={parcel.id} className="bg-white/10 backdrop-blur-xl rounded-xl shadow-md overflow-hidden border border-white/20">
                                {/* Parcel Header */}
                                <div className="bg-green-500/20 px-4 py-3 border-b border-green-500/30 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FaCheckCircle className="text-green-400" />
                                        <span className="font-bold text-white">{parcel.trackingNumber}</span>
                                    </div>
                                    <span className="text-xs bg-green-500/30 text-green-300 px-2 py-1 rounded-full">
                                        {parcel.deliveredAt ? new Date(parcel.deliveredAt).toLocaleString() : "Delivered"}
                                    </span>
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* Sender & Receiver Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Sender */}
                                        <div className="bg-orange-500/20 rounded-lg p-3 border border-orange-500/30">
                                            <p className="text-xs text-orange-400 font-medium mb-1">📦 SENDER</p>
                                            <p className="font-semibold text-white">{parcel.pickupName || parcel.senderName || 'N/A'}</p>
                                            <p className="text-sm text-white/70">{parcel.pickupPhone || parcel.senderPhone || 'N/A'}</p>
                                            <p className="text-xs text-white/60 mt-1">{parcel.pickupAddress}</p>
                                            <p className="text-xs text-white/60">{parcel.pickupCity} - {parcel.pickupPincode}</p>
                                        </div>
                                        {/* Receiver */}
                                        <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/30">
                                            <p className="text-xs text-green-400 font-medium mb-1">📍 RECEIVER</p>
                                            <p className="font-semibold text-white">{parcel.deliveryName}</p>
                                            <p className="text-sm text-white/70">{parcel.deliveryPhone}</p>
                                            <p className="text-xs text-white/60 mt-1">{parcel.deliveryAddress}</p>
                                            <p className="text-xs text-white/60">{parcel.deliveryCity} - {parcel.deliveryPincode}</p>
                                        </div>
                                    </div>

                                    {/* Parcel Details */}
                                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                        <div className="bg-white/10 rounded-lg p-2 border border-white/10">
                                            <p className="text-white/60 text-xs">Weight</p>
                                            <p className="font-semibold text-white">{parcel.weightKg || "N/A"} kg</p>
                                        </div>
                                        <div className="bg-white/10 rounded-lg p-2 border border-white/10">
                                            <p className="text-white/60 text-xs">Category</p>
                                            <p className="font-semibold text-white">{parcel.category || "General"}</p>
                                        </div>
                                        <div className="bg-white/10 rounded-lg p-2 border border-white/10">
                                            <p className="text-white/60 text-xs">Payment</p>
                                            <p className="font-semibold text-green-400">₹{parcel.finalPrice || "0"}</p>
                                        </div>
                                    </div>

                                    {/* Balance Status - if applicable */}
                                    {parseFloat(parcel.balanceAmount) > 0 && (
                                        <div className={`px-3 py-2 rounded-lg ${parcel.balancePaid ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-sm font-medium ${parcel.balancePaid ? 'text-green-400' : 'text-red-400'}`}>
                                                    {parcel.balancePaid ? '✓ Balance Collected' : '⚠️ Balance Due'}
                                                </span>
                                                <span className={`font-bold ${parcel.balancePaid ? 'text-green-400' : 'text-red-400'}`}>
                                                    ₹{parseFloat(parcel.balanceAmount).toFixed(2)}
                                                </span>
                                            </div>
                                            {parcel.balancePaid && parcel.balancePaymentMethod && (
                                                <p className="text-xs text-green-400/70 mt-1">
                                                    via {parcel.balancePaymentMethod} {parcel.balancePaidAt ? `on ${new Date(parcel.balancePaidAt).toLocaleDateString()}` : ''}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Proof Photos */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-white/80 flex items-center gap-2">
                                            <FaCamera className="text-white/60" /> Proof Photos
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {parcel.pickupPhotoUrl && (
                                                <div className="relative">
                                                    <img
                                                        src={parcel.pickupPhotoUrl}
                                                        alt="Pickup proof"
                                                        className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                                        onClick={() => window.open(parcel.pickupPhotoUrl, '_blank')}
                                                    />
                                                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">Pickup</span>
                                                </div>
                                            )}
                                            {parcel.deliveryPhotoUrl && (
                                                <div className="relative">
                                                    <img
                                                        src={parcel.deliveryPhotoUrl}
                                                        alt="Delivery proof"
                                                        className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                                        onClick={() => window.open(parcel.deliveryPhotoUrl, '_blank')}
                                                    />
                                                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">Delivery</span>
                                                </div>
                                            )}
                                            {parcel.balanceCashPhotoUrl && (
                                                <div className="relative col-span-2">
                                                    <img
                                                        src={parcel.balanceCashPhotoUrl}
                                                        alt="Cash collection proof"
                                                        className="w-full h-28 object-cover rounded-lg cursor-pointer hover:opacity-90 border-2 border-red-200"
                                                        onClick={() => window.open(parcel.balanceCashPhotoUrl, '_blank')}
                                                    />
                                                    <span className="absolute bottom-1 left-1 bg-red-600 text-white text-xs px-2 py-0.5 rounded">💵 Cash Collected</span>
                                                </div>
                                            )}
                                            {!parcel.pickupPhotoUrl && !parcel.deliveryPhotoUrl && !parcel.balanceCashPhotoUrl && (
                                                <p className="text-sm text-white/40 col-span-2">No proof photos available</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Timestamps */}
                                    <div className="flex items-center justify-between text-xs text-white/50 pt-2 border-t border-white/10">
                                        <span>Picked: {parcel.pickedUpAt ? new Date(parcel.pickedUpAt).toLocaleString() : "N/A"}</span>
                                        <span>Delivered: {parcel.deliveredAt ? new Date(parcel.deliveredAt).toLocaleString() : "N/A"}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Delivery List - Only show for ongoing deliveries */}
            {group?.status !== "COMPLETED" && (
                <div className="p-4">
                    <h2 className="font-semibold text-white mb-3">
                        Delivery List <span className="text-sm font-normal text-white/50">(optimized route)</span>
                    </h2>
                    <div className="space-y-2">
                        {/* First show completed deliveries with details */}
                        {parcels.filter(p => p.status === "DELIVERED").map((parcel) => (
                            <div
                                key={parcel.id}
                                className="bg-white/10 backdrop-blur-xl rounded-lg p-3 border border-green-500/30"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-green-500/20 text-green-400">
                                        <FaCheck />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white truncate">{parcel.deliveryName}</p>
                                        <p className="text-xs text-white/50 truncate">{parcel.trackingNumber}</p>
                                    </div>
                                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                                        {parcel.deliveredAt ? new Date(parcel.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Delivered"}
                                    </span>
                                </div>
                                {/* Balance and Proof Info */}
                                <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 text-xs">
                                    {/* Balance Status */}
                                    {parseFloat(parcel.balanceAmount || 0) > 0 ? (
                                        <span className={`px-2 py-0.5 rounded-full border ${parcel.balancePaid ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                            {parcel.balancePaid ? '✓ ₹' + parseFloat(parcel.balanceAmount).toFixed(0) + ' Paid' : '⚠️ ₹' + parseFloat(parcel.balanceAmount).toFixed(0) + ' Due'}
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/10">
                                            No balance
                                        </span>
                                    )}
                                    {/* Proof indicators */}
                                    {parcel.deliveryPhotoUrl && (
                                        <span className="text-green-400 flex items-center gap-1">
                                            <FaCamera className="text-xs" /> Proof
                                        </span>
                                    )}
                                    {parcel.balanceCashPhotoUrl && (
                                        <span className="text-red-400 flex items-center gap-1">
                                            💵 Cash
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Then show pending deliveries in optimized order */}
                        {(optimizedParcels.length > 0 ? optimizedParcels : parcels.filter(p => p.status !== "DELIVERED")).map((parcel, index) => {
                            const isDelivered = parcel.status === "DELIVERED";
                            if (isDelivered) return null; // Skip delivered ones (shown above)

                            const routeOrder = parcel.routeOrder ?? index;
                            const isNext = routeOrder === 0;

                            return (
                                <div
                                    key={parcel.id}
                                    className={`bg-white/10 backdrop-blur-xl rounded-lg p-3 flex items-center gap-3 border border-white/10 ${isNext ? "ring-2 ring-purple-500" : ""}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isNext ? "bg-purple-500 text-white" : "bg-white/10 text-white/50"
                                        }`}>
                                        {routeOrder + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white truncate">{parcel.deliveryName}</p>
                                        <p className="text-xs text-white/50 truncate">{parcel.trackingNumber}</p>
                                    </div>
                                    {isNext && (
                                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full border border-purple-500/30">Nearest</span>
                                    )}
                                    {!isNext && parseFloat(parcel.balanceAmount) > 0 && !parcel.balancePaid && (
                                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full flex items-center gap-1 border border-red-500/30">
                                            <FaMoneyBillWave className="text-xs" /> ₹{parseFloat(parcel.balanceAmount).toFixed(0)}
                                        </span>
                                    )}
                                    {!isNext && parcel.balancePaid && parseFloat(parcel.balanceAmount) > 0 && (
                                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">Paid</span>
                                    )}
                                    {!isNext && !(parseFloat(parcel.balanceAmount) > 0) && (
                                        <span className="text-xs text-white/40">Pending</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* OTP Modal */}
            {showOtpModal && selectedParcel && (
                <div className="fixed inset-0 bg-black/70 flex items-end z-50">
                    <div className="bg-slate-800 w-full rounded-t-2xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto border-t border-white/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Confirm Delivery</h3>
                            <button onClick={() => setShowOtpModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                                <FaTimesCircle className="text-white/50" />
                            </button>
                        </div>
                        <p className="text-white/70 mb-4">
                            Enter OTP from <strong className="text-white">{selectedParcel.deliveryName}</strong>
                        </p>
                        <input
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            placeholder="Enter OTP"
                            className="w-full text-center text-2xl tracking-widest py-4 bg-white/10 border-2 border-white/20 rounded-lg focus:border-green-500 focus:outline-none mb-4 text-white placeholder-white/40"
                            autoFocus
                        />

                        {/* Photo capture */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Delivery Photo (Optional)
                            </label>
                            {photoPreview ? (
                                <div className="relative">
                                    <img src={photoPreview} alt="Delivery" className="w-full h-32 object-cover rounded-lg" />
                                    <button
                                        onClick={() => { setDeliveryPhoto(null); setPhotoPreview(null); }}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                                    >
                                        <FaTimesCircle />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-white/30 rounded-lg cursor-pointer hover:border-white/50">
                                    <FaCamera className="text-white/40" />
                                    <span className="text-white/60">Take Photo</span>
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

                        <button
                            onClick={verifyOtp}
                            disabled={verifying || otp.length !== 6}
                            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {verifying ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                            {verifying ? "Verifying..." : "Confirm Delivery"}
                        </button>
                    </div>
                </div>
            )}

            {/* Cash Collection Modal */}
            {showCashModal && cashParcel && (
                <div className="fixed inset-0 bg-black/70 flex items-end z-50">
                    <div className="bg-slate-800 w-full rounded-t-2xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto border-t border-white/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Collect Cash Payment</h3>
                            <button onClick={() => setShowCashModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                                <FaTimesCircle className="text-white/50" />
                            </button>
                        </div>

                        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
                            <p className="text-sm text-white/70">Customer: <strong className="text-white">{cashParcel.deliveryName}</strong></p>
                            <p className="text-sm text-white/70">Tracking: <strong className="text-white">{cashParcel.trackingNumber}</strong></p>
                            <p className="text-2xl font-bold text-red-400 mt-2">
                                Amount: ₹{parseFloat(cashParcel.balanceAmount).toFixed(2)}
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                <FaCamera className="inline mr-1" /> Photo of Cash (Required)
                            </label>
                            <p className="text-xs text-white/50 mb-2">
                                Take a photo of the cash received as proof of collection
                            </p>
                            {cashPhotoPreview ? (
                                <div className="relative">
                                    <img src={cashPhotoPreview} alt="Cash" className="w-full h-40 object-cover rounded-lg" />
                                    <button
                                        onClick={() => { setCashPhoto(null); setCashPhotoPreview(null); }}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                                    >
                                        <FaTimesCircle />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex items-center justify-center gap-2 py-6 border-2 border-dashed border-red-500/40 rounded-lg cursor-pointer hover:border-red-400 bg-red-500/10">
                                    <FaCamera className="text-red-400 text-xl" />
                                    <span className="text-red-400 font-medium">Take Photo of Cash</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleCashPhotoCapture}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>

                        <button
                            onClick={submitCashCollection}
                            disabled={collectingCash || !cashPhoto}
                            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {collectingCash ? <FaSpinner className="animate-spin" /> : <FaMoneyBillWave />}
                            {collectingCash ? "Recording..." : `Confirm Cash Collection ₹${parseFloat(cashParcel.balanceAmount).toFixed(2)}`}
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

            {/* Chat with Customers - show always, but read-only after delivery complete */}
            {group && parcels.length > 0 && (
                <GroupChatPanel
                    groupId={parseInt(groupId)}
                    parcels={parcels}
                    isMinimized={true}
                    readOnly={group.status === 'COMPLETED'}
                />
            )}
        </div>
    );
}
