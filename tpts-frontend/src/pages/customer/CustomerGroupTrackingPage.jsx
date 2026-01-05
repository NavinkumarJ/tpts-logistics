import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    FaMapMarkerAlt, FaTruck, FaWarehouse, FaCheck, FaClock,
    FaSpinner, FaArrowLeft, FaBox, FaStar, FaHome, FaImage,
    FaKey, FaPhone, FaClipboardList, FaRupeeSign, FaPercent, FaUser
} from "react-icons/fa";
import ChatPanel from "../../components/chat/ChatPanel";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
// OSRM API URLs for routing (multiple servers for fallback)
const OSRM_SERVERS = [
    "https://routing.openstreetmap.de/routed-car/route/v1/driving/",
    "https://router.project-osrm.org/route/v1/driving/"
];

// 6 Stages for Group Buy Tracking
const STAGES = [
    { id: 1, label: "Agent heading to pickup", icon: "🚚", description: "Agent 1 is on the way to collect your package" },
    { id: 2, label: "Picked up", icon: "📦", description: "Your package has been collected from sender" },
    { id: 3, label: "On way to warehouse", icon: "🏭", description: "Agent 1 is heading to the sorting facility" },
    { id: 4, label: "At warehouse", icon: "📍", description: "Package is at the sorting facility, waiting for Agent 2" },
    { id: 5, label: "Out for delivery", icon: "🛵", description: "Agent 2 is on the way with your package" },
    { id: 6, label: "Delivered", icon: "✅", description: "Package has been delivered successfully" }
];

export default function CustomerGroupTrackingPage() {
    const { parcelId } = useParams();
    const navigate = useNavigate();
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    const [parcel, setParcel] = useState(null);
    const [group, setGroup] = useState(null);
    const [groupParcels, setGroupParcels] = useState([]); // All parcels in the group
    const [loading, setLoading] = useState(true);
    const [currentStage, setCurrentStage] = useState(1);
    const [agentLocation, setAgentLocation] = useState(null);
    const [showPhotoModal, setShowPhotoModal] = useState(null);
    const [showOtpSection, setShowOtpSection] = useState(false);
    const [isNextDelivery, setIsNextDelivery] = useState(false); // Is this parcel the next/nearest delivery?

    // Pickup agent rating state
    const [showPickupRatingModal, setShowPickupRatingModal] = useState(false);
    const [pickupRating, setPickupRating] = useState(0);
    const [pickupRatingComment, setPickupRatingComment] = useState("");
    const [submittingPickupRating, setSubmittingPickupRating] = useState(false);
    const [hasRatedPickupAgent, setHasRatedPickupAgent] = useState(false);

    // Delivery agent rating state
    const [showDeliveryRatingModal, setShowDeliveryRatingModal] = useState(false);
    const [deliveryRating, setDeliveryRating] = useState(0);
    const [deliveryRatingComment, setDeliveryRatingComment] = useState("");
    const [submittingDeliveryRating, setSubmittingDeliveryRating] = useState(false);
    const [hasRatedDeliveryAgent, setHasRatedDeliveryAgent] = useState(false);

    // Company rating state
    const [showCompanyRatingModal, setShowCompanyRatingModal] = useState(false);
    const [companyRating, setCompanyRating] = useState(0);
    const [companyRatingComment, setCompanyRatingComment] = useState("");
    const [submittingCompanyRating, setSubmittingCompanyRating] = useState(false);
    const [hasRatedCompany, setHasRatedCompany] = useState(false);

    useEffect(() => {
        fetchParcelData();
        const interval = setInterval(fetchParcelData, 15000);
        return () => clearInterval(interval);
    }, [parcelId]);

    const fetchParcelData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const parcelRes = await fetch(`${API_BASE}/parcels/${parcelId}`, { headers });
            if (!parcelRes.ok) throw new Error("Failed to fetch parcel");

            const parcelData = await parcelRes.json();
            setParcel(parcelData.data);

            // Load rating status from parcel data
            if (parcelData.data.hasRatedPickupAgent) setHasRatedPickupAgent(true);
            if (parcelData.data.hasRatedDeliveryAgent) setHasRatedDeliveryAgent(true);
            if (parcelData.data.hasRatedCompany) setHasRatedCompany(true);

            let groupData = null;
            let allGroupParcels = [];
            if (parcelData.data.groupShipmentId) {
                const groupRes = await fetch(`${API_BASE}/groups/${parcelData.data.groupShipmentId}`, { headers });
                if (groupRes.ok) {
                    groupData = await groupRes.json();
                    setGroup(groupData.data);
                }

                // Fetch all parcels in this group to show pickup progress
                const parcelsRes = await fetch(`${API_BASE}/groups/${parcelData.data.groupShipmentId}/parcels`, { headers });
                if (parcelsRes.ok) {
                    const parcelsData = await parcelsRes.json();
                    allGroupParcels = parcelsData.data || [];
                    setGroupParcels(allGroupParcels);
                }
            }

            const stage = getStageFromStatus(parcelData.data.status);
            setCurrentStage(stage);
            getAgentLocationFromGroup(stage, parcelData.data, groupData?.data);

            // Calculate if this parcel is the next/nearest delivery during delivery phase
            if (stage === 5 && groupData?.data && allGroupParcels.length > 0) {
                const agentLat = parseFloat(groupData.data.deliveryAgentLatitude);
                const agentLng = parseFloat(groupData.data.deliveryAgentLongitude);

                if (agentLat && agentLng) {
                    // Haversine distance calculation
                    const calcDistance = (lat1, lng1, lat2, lng2) => {
                        const R = 6371;
                        const dLat = (lat2 - lat1) * Math.PI / 180;
                        const dLng = (lng2 - lng1) * Math.PI / 180;
                        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                            Math.sin(dLng / 2) * Math.sin(dLng / 2);
                        return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    };

                    // Find pending deliveries
                    const pendingParcels = allGroupParcels.filter(p => p.status === "OUT_FOR_DELIVERY");

                    if (pendingParcels.length > 0) {
                        // Calculate distance for each pending parcel
                        const parcelsWithDistance = pendingParcels.map(p => ({
                            id: p.id,
                            distance: calcDistance(agentLat, agentLng, parseFloat(p.deliveryLatitude), parseFloat(p.deliveryLongitude))
                        }));

                        // Sort by distance and check if this parcel is the nearest
                        parcelsWithDistance.sort((a, b) => a.distance - b.distance);
                        setIsNextDelivery(parcelsWithDistance[0]?.id === parseInt(parcelId));
                    } else {
                        setIsNextDelivery(false);
                    }
                } else {
                    // If no agent location, assume first in list order
                    const pendingParcels = allGroupParcels.filter(p => p.status === "OUT_FOR_DELIVERY");
                    setIsNextDelivery(pendingParcels[0]?.id === parseInt(parcelId));
                }
            } else {
                setIsNextDelivery(false);
            }
        } catch (err) {
            toast.error("Failed to load tracking data");
        } finally {
            setLoading(false);
        }
    };

    const getStageFromStatus = (status) => {
        switch (status) {
            case "PENDING":
            case "CONFIRMED": return 0;
            case "ASSIGNED": return 1;
            case "PICKED_UP": return 2;
            case "IN_TRANSIT":
            case "IN_TRANSIT_TO_WAREHOUSE": return 3;
            case "AT_WAREHOUSE": return 4;
            case "OUT_FOR_DELIVERY": return 5;
            case "DELIVERED": return 6;
            default: return 0;
        }
    };

    const getAgentLocationFromGroup = (stage, parcel, group) => {
        // Use real agent location from database (shared by agent via GroupShipment)
        if (stage === 1 || stage === 2 || stage === 3) {
            // Pickup phase - use pickup agent's location
            if (group?.pickupAgentLatitude && group?.pickupAgentLongitude) {
                setAgentLocation({
                    lat: parseFloat(group.pickupAgentLatitude),
                    lng: parseFloat(group.pickupAgentLongitude)
                });
                return;
            }
        } else if (stage === 5) {
            // Delivery phase - use delivery agent's location
            if (group?.deliveryAgentLatitude && group?.deliveryAgentLongitude) {
                setAgentLocation({
                    lat: parseFloat(group.deliveryAgentLatitude),
                    lng: parseFloat(group.deliveryAgentLongitude)
                });
                return;
            }
        }

        // Fallback: If no real location, use simulated position
        if (stage === 1 && parcel.pickupLatitude) {
            setAgentLocation({
                lat: parseFloat(parcel.pickupLatitude) - 0.015,
                lng: parseFloat(parcel.pickupLongitude) - 0.015
            });
        } else if ((stage === 2 || stage === 3) && group?.warehouseLatitude && parcel.pickupLatitude) {
            // Stage 2-3: Agent between pickup and warehouse (simulated position)
            setAgentLocation({
                lat: (parseFloat(parcel.pickupLatitude) + parseFloat(group.warehouseLatitude)) / 2,
                lng: (parseFloat(parcel.pickupLongitude) + parseFloat(group.warehouseLongitude)) / 2
            });
        } else if (stage === 5 && parcel.deliveryLatitude && group?.warehouseLatitude) {
            setAgentLocation({
                lat: (parseFloat(parcel.deliveryLatitude) + parseFloat(group.warehouseLatitude)) / 2,
                lng: (parseFloat(parcel.deliveryLongitude) + parseFloat(group.warehouseLongitude)) / 2
            });
        } else {
            setAgentLocation(null);
        }
    };

    // Submit pickup agent rating
    const submitPickupRating = async () => {
        if (pickupRating === 0) {
            toast.error("Please select a rating");
            return;
        }

        setSubmittingPickupRating(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE}/ratings/agent/${group?.pickupAgentId}/pickup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    parcelId: parseInt(parcelId),
                    rating: pickupRating,
                    comment: pickupRatingComment || ""
                })
            });

            if (response.ok) {
                toast.success("Thank you for rating the pickup agent!");
                setHasRatedPickupAgent(true);
                setShowPickupRatingModal(false);
                fetchParcelData();
            } else if (response.status === 409) {
                // Already rated - update UI to reflect this
                toast.info("You've already rated this agent!");
                setHasRatedPickupAgent(true);
                setShowPickupRatingModal(false);
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to submit rating");
            }
        } catch (err) {
            toast.error("Failed to submit rating");
        } finally {
            setSubmittingPickupRating(false);
        }
    };

    // Submit delivery agent rating
    const submitDeliveryRating = async () => {
        if (deliveryRating === 0) {
            toast.error("Please select a rating");
            return;
        }

        setSubmittingDeliveryRating(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE}/ratings/agent/${group?.deliveryAgentId}/delivery`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    parcelId: parseInt(parcelId),
                    rating: deliveryRating,
                    comment: deliveryRatingComment || ""
                })
            });

            if (response.ok) {
                toast.success("Thank you for rating the delivery agent!");
                setHasRatedDeliveryAgent(true);
                setShowDeliveryRatingModal(false);
                fetchParcelData();
            } else if (response.status === 409) {
                // Already rated - update UI to reflect this
                toast.info("You've already rated this agent!");
                setHasRatedDeliveryAgent(true);
                setShowDeliveryRatingModal(false);
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to submit rating");
            }
        } catch (err) {
            toast.error("Failed to submit rating");
        } finally {
            setSubmittingDeliveryRating(false);
        }
    };

    // Submit company rating
    const submitCompanyRating = async () => {
        if (companyRating === 0) {
            toast.error("Please select a rating");
            return;
        }

        setSubmittingCompanyRating(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE}/ratings/company/${group?.companyId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    parcelId: parseInt(parcelId),
                    rating: companyRating,
                    comment: companyRatingComment || ""
                })
            });

            if (response.ok) {
                toast.success("Thank you for rating the company!");
                setHasRatedCompany(true);
                setShowCompanyRatingModal(false);
                fetchParcelData();
            } else if (response.status === 409) {
                // Already rated - update UI to reflect this
                toast.info("You've already rated this company!");
                setHasRatedCompany(true);
                setShowCompanyRatingModal(false);
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to submit rating");
            }
        } catch (err) {
            toast.error("Failed to submit rating");
        } finally {
            setSubmittingCompanyRating(false);
        }
    };

    // Initialize map based on current stage
    useEffect(() => {
        if (!parcel || !mapRef.current) return;

        // Check if the DOM element is still attached
        if (!document.body.contains(mapRef.current)) return;

        let isMounted = true;

        const initMap = () => {
            if (!isMounted || !mapRef.current || !document.body.contains(mapRef.current)) return;

            const L = window.L;
            if (!L) return;

            // Clean up existing map properly
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.remove();
                } catch (e) {
                    // Map already removed
                }
                mapInstanceRef.current = null;
            }

            try {
                const map = L.map(mapRef.current).setView([13.0827, 80.2707], 11);
                mapInstanceRef.current = map;

                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: "© OpenStreetMap"
                }).addTo(map);

                if (isMounted) {
                    drawStageBasedMarkers(map, L);
                }
            } catch (e) {
                console.warn("Map initialization error:", e);
            }
        };

        if (!window.L) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
            document.head.appendChild(link);

            const script = document.createElement("script");
            script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            script.onload = () => {
                if (isMounted) initMap();
            };
            document.head.appendChild(script);
        } else {
            // Small delay to ensure DOM is ready
            setTimeout(initMap, 50);
        }

        return () => {
            isMounted = false;
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.remove();
                } catch (e) {
                    // Ignore cleanup errors
                }
                mapInstanceRef.current = null;
            }
        };
    }, [parcel, group, agentLocation, currentStage, groupParcels]);

    const drawStageBasedMarkers = (map, L) => {
        if (!parcel) return;

        const bounds = [];
        const routePoints = [];

        // Haversine distance calculation (same as agent map)
        const haversineDistance = (lat1, lng1, lat2, lng2) => {
            const R = 6371;
            const dLat = ((lat2 - lat1) * Math.PI) / 180;
            const dLng = ((lng2 - lng1) * Math.PI) / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        // Pickup Phase (Stages 1-3): Show all pickup locations like agent map
        if (currentStage <= 3) {
            // Fallback: if groupParcels is empty or has no valid coordinates, use parcel data
            let parcelsToShow = groupParcels.filter(p => p.pickupLatitude && p.pickupLongitude);

            // If no valid parcels in group, at least show current parcel
            if (parcelsToShow.length === 0 && parcel.pickupLatitude && parcel.pickupLongitude) {
                parcelsToShow = [parcel];
            }

            // Separate completed and pending pickups
            const completedPickups = [];
            const pendingPickups = [];

            parcelsToShow.forEach(p => {
                const isCompleted = ["PICKED_UP", "IN_TRANSIT", "IN_TRANSIT_TO_WAREHOUSE", "AT_WAREHOUSE", "OUT_FOR_DELIVERY", "DELIVERED"].includes(p.status);
                const isMyPickup = p.id === parcel.id;
                const point = {
                    lat: parseFloat(p.pickupLatitude),
                    lng: parseFloat(p.pickupLongitude),
                    parcel: p,
                    isMyPickup,
                    isCompleted
                };
                if (isCompleted) {
                    completedPickups.push(point);
                } else {
                    pendingPickups.push(point);
                }
            });

            // Apply Nearest Neighbor algorithm to pending pickups (if agent location available)
            let optimizedPending = [...pendingPickups];
            if (agentLocation && pendingPickups.length > 0) {
                let current = { lat: agentLocation.lat, lng: agentLocation.lng };
                const remaining = [...pendingPickups];
                const optimized = [];
                while (remaining.length > 0) {
                    let nearestIdx = 0;
                    let nearestDist = Infinity;
                    remaining.forEach((p, idx) => {
                        const dist = haversineDistance(current.lat, current.lng, p.lat, p.lng);
                        if (dist < nearestDist) {
                            nearestDist = dist;
                            nearestIdx = idx;
                        }
                    });
                    const nearest = remaining.splice(nearestIdx, 1)[0];
                    optimized.push(nearest);
                    current = { lat: nearest.lat, lng: nearest.lng };
                }
                optimizedPending = optimized;
            }

            // Draw completed pickup markers with checkmarks
            completedPickups.forEach((point) => {
                const markerColor = point.isMyPickup ? "#10b981" : "#6b7280"; // Green for mine, gray for others
                const pickupIcon = L.divIcon({
                    className: "pickup-marker",
                    html: `<div style="background: ${markerColor}; color: white; width: ${point.isMyPickup ? 42 : 32}px; height: ${point.isMyPickup ? 42 : 32}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: ${point.isMyPickup ? 18 : 14}px; border: 3px solid ${point.isMyPickup ? '#fff' : '#ccc'}; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">✓</div>`,
                    iconSize: [point.isMyPickup ? 42 : 32, point.isMyPickup ? 42 : 32],
                    iconAnchor: [point.isMyPickup ? 21 : 16, point.isMyPickup ? 21 : 16]
                });
                L.marker([point.lat, point.lng], { icon: pickupIcon })
                    .addTo(map)
                    .bindPopup(`<b>${point.isMyPickup ? "📦 Your Pickup (Done)" : "📦 Other Pickup (Done)"}</b><br>${point.parcel.pickupName}`);
                bounds.push([point.lat, point.lng]);
            });

            // Draw pending pickup markers with route order
            optimizedPending.forEach((point, routeOrder) => {
                const isNext = routeOrder === 0;
                const markerColor = point.isMyPickup
                    ? (isNext ? "#6366f1" : "#8b5cf6") // Purple for MY pickup
                    : (isNext ? "#6366f1" : "#9ca3af"); // Blue for next, gray for other pending
                const markerSize = point.isMyPickup ? 42 : 32;
                const pickupIcon = L.divIcon({
                    className: "pickup-marker",
                    html: `<div style="background: ${markerColor}; color: white; width: ${markerSize}px; height: ${markerSize}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: ${point.isMyPickup ? 16 : 12}px; border: 3px solid ${point.isMyPickup ? '#fff' : '#ccc'}; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">${point.isMyPickup ? "YOU" : routeOrder + 1}</div>`,
                    iconSize: [markerSize, markerSize],
                    iconAnchor: [markerSize / 2, markerSize / 2]
                });
                L.marker([point.lat, point.lng], { icon: pickupIcon })
                    .addTo(map)
                    .bindPopup(`
                        <b>${point.isMyPickup ? "📦 Your Pickup" : `📦 Stop ${routeOrder + 1}`}</b><br>
                        ${point.parcel.pickupName}<br>
                        <small>${isNext ? "🔵 Next" : "⏳ Pending"}</small>
                    `);
                bounds.push([point.lat, point.lng]);
            });

            // Add agent marker and route
            if (agentLocation) {
                addAgentMarker(map, L, bounds, "Agent 1 - Pickup");
                routePoints.push([agentLocation.lng, agentLocation.lat]);

                // Route to next pickup (if any pending) or warehouse
                if (optimizedPending.length > 0) {
                    routePoints.push([optimizedPending[0].lng, optimizedPending[0].lat]);
                } else if (group?.warehouseLatitude) {
                    // All pickups done, route to warehouse
                    routePoints.push([parseFloat(group.warehouseLongitude), parseFloat(group.warehouseLatitude)]);
                }
            }

            // Add warehouse marker
            if (group?.warehouseLatitude) {
                addWarehouseMarker(map, L, bounds);
            }

        } else if (currentStage === 4) {
            // At warehouse - show pickup done, warehouse highlighted
            if (parcel.pickupLatitude) {
                addPickupMarker(map, L, bounds, true);
            }
            addWarehouseMarker(map, L, bounds, true);
            if (parcel.deliveryLatitude) {
                addDeliveryMarker(map, L, bounds, false);
            }
        } else if (currentStage >= 5) {
            // Delivery phase - route from agent to delivery

            // Add warehouse marker (for reference, not in route)
            if (group?.warehouseLatitude) {
                addWarehouseMarker(map, L, bounds, false);
            }

            // Add agent marker and start route from agent location
            if (agentLocation && currentStage === 5) {
                addAgentMarker(map, L, bounds, "Agent 2 - Delivery");
                // Route starts from agent
                routePoints.push([agentLocation.lng, agentLocation.lat]);
            }

            // Add delivery marker and end route at delivery
            if (parcel.deliveryLatitude) {
                addDeliveryMarker(map, L, bounds, currentStage === 6);
                // Route ends at delivery
                if (currentStage === 5) {
                    routePoints.push([parseFloat(parcel.deliveryLongitude), parseFloat(parcel.deliveryLatitude)]);
                }
            }
        }

        // Fit bounds
        if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (bounds.length === 1) {
            map.setView(bounds[0], 14);
        }

        // Draw route
        if (routePoints.length > 1) {
            drawRoute(map, routePoints, L);
        }
    };

    const addAgentMarker = (map, L, bounds, label) => {
        if (!agentLocation) return;
        const agentIcon = L.divIcon({
            className: "agent-marker",
            html: `<div style="background: #ef4444; color: white; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; border: 3px solid white; box-shadow: 0 4px 12px rgba(239,68,68,0.6); animation: pulse 1.5s infinite;">🚚</div>`,
            iconSize: [48, 48],
            iconAnchor: [24, 24]
        });
        L.marker([agentLocation.lat, agentLocation.lng], { icon: agentIcon })
            .addTo(map)
            .bindPopup(`<b>🚚 ${label}</b><br>Live tracking`);
        bounds.push([agentLocation.lat, agentLocation.lng]);
    };

    const addPickupMarker = (map, L, bounds, completed = false) => {
        if (!parcel.pickupLatitude) return;
        const pickupIcon = L.divIcon({
            className: "custom-marker",
            html: `<div style="background: ${completed ? '#6b7280' : '#10b981'}; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${completed ? '✓' : '📦'}</div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19]
        });
        L.marker([parcel.pickupLatitude, parcel.pickupLongitude], { icon: pickupIcon })
            .addTo(map)
            .bindPopup(`<b>📦 Pickup Location</b><br>${parcel.pickupName}<br>${parcel.pickupAddress}`);
        bounds.push([parcel.pickupLatitude, parcel.pickupLongitude]);
    };

    const addWarehouseMarker = (map, L, bounds, highlight = false) => {
        if (!group?.warehouseLatitude) return;
        const warehouseIcon = L.divIcon({
            className: "custom-marker",
            html: `<div style="background: ${highlight ? '#f59e0b' : '#9ca3af'}; color: white; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🏭</div>`,
            iconSize: [42, 42],
            iconAnchor: [21, 21]
        });
        L.marker([group.warehouseLatitude, group.warehouseLongitude], { icon: warehouseIcon })
            .addTo(map)
            .bindPopup(`<b>🏭 Warehouse</b><br>${group.warehouseAddress || 'Sorting Facility'}<br>${group.warehouseCity}`);
        bounds.push([group.warehouseLatitude, group.warehouseLongitude]);
    };

    const addDeliveryMarker = (map, L, bounds, completed = false) => {
        if (!parcel.deliveryLatitude) return;
        const deliveryIcon = L.divIcon({
            className: "custom-marker",
            html: `<div style="background: ${completed ? '#10b981' : '#3b82f6'}; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${completed ? '✅' : '🏠'}</div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19]
        });
        L.marker([parcel.deliveryLatitude, parcel.deliveryLongitude], { icon: deliveryIcon })
            .addTo(map)
            .bindPopup(`<b>🏠 Delivery Location</b><br>${parcel.deliveryName}<br>${parcel.deliveryAddress}`);
        bounds.push([parcel.deliveryLatitude, parcel.deliveryLongitude]);
    };

    const drawRoute = async (map, points, L) => {
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
                            dashArray: "10, 5"
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

    const getMapTitle = () => {
        if (currentStage <= 2) return "Agent 1 → Pickup";
        if (currentStage === 3) return "Pickup → Warehouse";
        if (currentStage === 4) return "At Warehouse (Waiting for Agent 2)";
        if (currentStage === 5) return "Agent 2 → Your Delivery";
        return "Delivered";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <FaSpinner className="animate-spin text-4xl text-indigo-600" />
            </div>
        );
    }

    if (!parcel) {
        return (
            <div className="p-6 text-center">
                <p className="text-gray-600">Parcel not found</p>
            </div>
        );
    }

    const currentStageInfo = STAGES[currentStage - 1] || STAGES[0];

    return (
        <div className="min-h-screen bg-slate-900 pb-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 sticky top-0 z-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/20 rounded-lg">
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className="font-bold">Track Group Package</h1>
                            <p className="text-sm opacity-90">{parcel.trackingNumber}</p>
                        </div>
                    </div>
                    {group && (
                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                            {group.groupCode}
                        </span>
                    )}
                </div>
            </div>

            {/* Current Stage Card */}
            <div className="bg-white/10 backdrop-blur-xl m-4 rounded-xl shadow-md overflow-hidden border border-white/20">
                <div className={`p-4 ${currentStage === 6 ? "bg-green-500/20" : "bg-indigo-500/20"}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${currentStage === 6 ? "bg-green-500/30" : "bg-indigo-500/30"}`}>
                            {currentStageInfo?.icon || "📦"}
                        </div>
                        <div className="flex-1">
                            <p className={`font-semibold text-lg ${currentStage === 6 ? "text-green-400" : "text-white"}`}>
                                {currentStageInfo?.label || "Processing"}
                            </p>
                            <p className="text-sm text-white/70">{currentStageInfo?.description}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* PROMINENT OTP Alert - Show when agent is arriving */}
            {(currentStage === 1 || currentStage === 5) && parcel && (
                <div className={`mx-4 mb-4 rounded-xl shadow-lg overflow-hidden ${currentStage === 1 ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'}`}>
                    <div className="p-4 text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🔐</span>
                            <span className="font-bold text-lg">
                                {currentStage === 1 ? "Pickup OTP - Share with Agent" : "Delivery OTP - Share with Agent"}
                            </span>
                        </div>
                        <p className="text-sm opacity-90 mb-3">
                            {currentStage === 1
                                ? "Agent is arriving! Share this OTP to verify pickup"
                                : "Agent is delivering! Share this OTP to receive package"
                            }
                        </p>
                        <div className="bg-white/20 backdrop-blur rounded-lg p-4 text-center">
                            <p className="text-4xl font-bold tracking-[0.3em]">
                                {currentStage === 1 ? (parcel.pickupOtp || "------") : (parcel.deliveryOtp || "------")}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Both Agents Info Card */}
            {group && (
                <div className="bg-white/10 backdrop-blur-xl mx-4 mb-4 rounded-xl shadow-md overflow-hidden border border-white/20">
                    <div className="p-3 border-b border-white/10 bg-white/5">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <FaUser className="text-indigo-400" /> Assigned Agents
                        </h3>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-white/10">
                        {/* Pickup Agent (Agent 1) */}
                        <div className={`p-4 ${currentStage <= 3 ? 'bg-orange-500/10' : 'bg-white/5'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                                    Agent 1 - Pickup
                                </span>
                                {currentStage <= 3 && (
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                )}
                            </div>
                            <p className="font-medium text-white">
                                {group.pickupAgentName || "Not Assigned"}
                            </p>
                            {group.pickupAgentPhone && (
                                <a
                                    href={`tel:${group.pickupAgentPhone}`}
                                    className="mt-2 flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700"
                                >
                                    <FaPhone /> {group.pickupAgentPhone}
                                </a>
                            )}
                            {currentStage > 3 && (
                                <p className="text-xs text-white/60 mt-1">✓ Pickup completed</p>
                            )}
                        </div>

                        {/* Delivery Agent (Agent 2) */}
                        <div className={`p-4 ${currentStage >= 4 ? 'bg-green-500/10' : 'bg-white/5'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                    Agent 2 - Delivery
                                </span>
                                {currentStage >= 5 && currentStage < 6 && (
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                )}
                            </div>
                            <p className="font-medium text-white">
                                {group.deliveryAgentName || (currentStage >= 4 ? "Assigning..." : "Pending")}
                            </p>
                            {group.deliveryAgentPhone && currentStage >= 4 && (
                                <a
                                    href={`tel:${group.deliveryAgentPhone}`}
                                    className="mt-2 flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
                                >
                                    <FaPhone /> {group.deliveryAgentPhone}
                                </a>
                            )}
                            {currentStage === 6 && (
                                <p className="text-xs text-white/60 mt-1">✓ Delivery completed</p>
                            )}
                            {currentStage < 4 && (
                                <p className="text-xs text-white/40 mt-1">Assigned after warehouse</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Map */}
            <div className="mx-5 mb-4 rounded-xl overflow-hidden shadow-md bg-white/10 backdrop-blur-xl border border-white/20">
                <div className="p-3 border-b border-white/10 bg-white/5">
                    <h3 className="font-semibold text-white">Live Tracking Map</h3>
                    <p className="text-xs text-white/60">{getMapTitle()}</p>
                </div>
                <div ref={mapRef} style={{ height: "280px " }} className="w-full" />
                {/* Map Legend */}
                <div className="p-3 flex flex-wrap gap-3 text-xs border-t">
                    {currentStage <= 2 && (
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-green-500 rounded-full"></span> Pickup
                        </span>
                    )}
                    {currentStage >= 3 && (
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-amber-500 rounded-full"></span> Warehouse
                        </span>
                    )}
                    {currentStage >= 4 && (
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-blue-500 rounded-full"></span> Delivery
                        </span>
                    )}
                    {[1, 3, 5].includes(currentStage) && (
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                            {currentStage <= 3 ? 'Agent 1' : 'Agent 2'} (Live)
                        </span>
                    )}
                </div>
            </div>

            {/* OTP Section */}
            <div className="bg-white/10 backdrop-blur-xl mx-4 mb-4 rounded-xl shadow-md overflow-hidden border border-white/20">
                <button
                    onClick={() => setShowOtpSection(!showOtpSection)}
                    className="w-full p-4 flex items-center justify-between bg-amber-500/10"
                >
                    <div className="flex items-center gap-3">
                        <FaKey className="text-amber-400" />
                        <span className="font-semibold text-white">OTP & Verification</span>
                    </div>
                    <span className="text-amber-400">{showOtpSection ? "▲" : "▼"}</span>
                </button>
                {showOtpSection && (
                    <div className="p-4 grid grid-cols-2 gap-4">
                        <div className="bg-orange-500/20 rounded-lg p-4 text-center border border-orange-500/30">
                            <p className="text-xs text-white/60 mb-1">Pickup OTP (for Agent 1)</p>
                            <p className="text-2xl font-bold text-orange-400 tracking-widest">
                                {parcel.pickupOtp || "------"}
                            </p>
                            {currentStage <= 2 && <p className="text-xs text-orange-400 mt-1">Share when agent arrives</p>}
                            {currentStage > 2 && <p className="text-xs text-green-400 mt-1">✓ Verified</p>}
                        </div>
                        <div className="bg-green-500/20 rounded-lg p-4 text-center border border-green-500/30">
                            <p className="text-xs text-white/60 mb-1">Delivery OTP (for Agent 2)</p>
                            <p className="text-2xl font-bold text-green-400 tracking-widest">
                                {parcel.deliveryOtp || "------"}
                            </p>
                            {currentStage >= 5 && currentStage < 6 && <p className="text-xs text-green-400 mt-1">Share when agent arrives</p>}
                            {currentStage === 6 && <p className="text-xs text-green-400 mt-1">✓ Verified</p>}
                            {currentStage < 5 && <p className="text-xs text-white/40 mt-1">Active after pickup</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* Photos Section */}
            {(parcel.pickupPhotoUrl || parcel.deliveryPhotoUrl) && (
                <div className="bg-white/10 backdrop-blur-xl mx-4 mb-4 rounded-xl shadow-md p-4 border border-white/20">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <FaImage className="text-indigo-400" /> Proof Photos
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        {parcel.pickupPhotoUrl && (
                            <div onClick={() => setShowPhotoModal(parcel.pickupPhotoUrl)} className="cursor-pointer">
                                <p className="text-xs text-white/60 mb-1">Pickup Photo</p>
                                <img src={parcel.pickupPhotoUrl} alt="Pickup" className="w-full h-32 object-cover rounded-lg border border-white/20 hover:opacity-90 transition" />
                                <p className="text-xs text-white/40 mt-1">{parcel.pickedUpAt && new Date(parcel.pickedUpAt).toLocaleString()}</p>
                            </div>
                        )}
                        {parcel.deliveryPhotoUrl && (
                            <div onClick={() => setShowPhotoModal(parcel.deliveryPhotoUrl)} className="cursor-pointer">
                                <p className="text-xs text-white/60 mb-1">Delivery Photo</p>
                                <img src={parcel.deliveryPhotoUrl} alt="Delivery" className="w-full h-32 object-cover rounded-lg border border-white/20 hover:opacity-90 transition" />
                                <p className="text-xs text-white/40 mt-1">{parcel.deliveredAt && new Date(parcel.deliveredAt).toLocaleString()}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Enhanced Timeline with Group Pickup Progress */}
            <div className="bg-white/10 backdrop-blur-xl mx-4 mb-4 rounded-xl shadow-md p-4 border border-white/20">
                <h2 className="font-semibold text-white mb-4">Delivery Progress</h2>

                {/* Calculate group pickup stats for dynamic timeline */}
                {(() => {
                    // Handle case when groupParcels is empty - treat as single parcel
                    const totalPickups = groupParcels.length > 0 ? groupParcels.length : 1;
                    const completedPickups = groupParcels.length > 0
                        ? groupParcels.filter(p =>
                            p.status === "PICKED_UP" || p.status === "IN_TRANSIT" ||
                            p.status === "IN_TRANSIT_TO_WAREHOUSE" || p.status === "AT_WAREHOUSE" ||
                            p.status === "OUT_FOR_DELIVERY" || p.status === "DELIVERED"
                        ).length
                        : (["PICKED_UP", "IN_TRANSIT", "IN_TRANSIT_TO_WAREHOUSE", "AT_WAREHOUSE", "OUT_FOR_DELIVERY", "DELIVERED"].includes(parcel?.status) ? 1 : 0);
                    const myPickupDone = parcel?.status && ["PICKED_UP", "IN_TRANSIT", "IN_TRANSIT_TO_WAREHOUSE", "AT_WAREHOUSE", "OUT_FOR_DELIVERY", "DELIVERED"].includes(parcel.status);
                    // If groupParcels is empty, use myPickupDone as allPickupsDone
                    const allPickupsDone = groupParcels.length > 0 ? completedPickups >= totalPickups : myPickupDone;
                    const agentAssigned = currentStage >= 1;

                    // Determine if it's currently the user's turn (their pickup is next)
                    const isMyTurn = agentAssigned && !myPickupDone;

                    // Build dynamic timeline stages
                    const allStages = [];

                    // Stage 0: Agent Assigned
                    allStages.push({
                        done: agentAssigned,
                        current: currentStage === 0,
                        label: "Pickup agent assigned",
                        detail: agentAssigned ? `Agent 1 - ${group?.pickupAgentName || 'Assigned'}` : "Awaiting assignment",
                        icon: "👤"
                    });

                    // Stage 1: Agent heading to YOUR pickup (only show when it's their turn)
                    if (agentAssigned) {
                        allStages.push({
                            done: myPickupDone,
                            current: isMyTurn && currentStage === 1,
                            label: "Agent heading to your pickup",
                            detail: myPickupDone ? "Completed" : (isMyTurn ? "Agent is on the way" : "Your turn is coming"),
                            icon: "🚚"
                        });
                    }

                    // Stage 2: YOUR package picked up
                    if (agentAssigned) {
                        allStages.push({
                            done: myPickupDone,
                            current: false,
                            label: "Your package picked up",
                            detail: myPickupDone ? (parcel.pickedUpAt ? new Date(parcel.pickedUpAt).toLocaleTimeString() : "Done") : "Waiting",
                            icon: "📦"
                        });
                    }

                    // Stage 3: Other pickups (only if there are multiple in the group)
                    if (totalPickups > 1 && myPickupDone) {
                        allStages.push({
                            done: allPickupsDone,
                            current: myPickupDone && !allPickupsDone,
                            label: `Collecting other packages (${completedPickups}/${totalPickups})`,
                            detail: allPickupsDone ? "All collected" : `${totalPickups - completedPickups} more to collect`,
                            icon: "📋"
                        });
                    }

                    // Stage 4: All parcels collected (show after all pickups are done)
                    if (myPickupDone) {
                        allStages.push({
                            done: allPickupsDone,
                            current: false,
                            label: "All parcels collected",
                            detail: allPickupsDone ? "Ready for warehouse" : "Collecting others",
                            icon: "✓"
                        });
                    }

                    // Stage 5: On way to warehouse
                    if (myPickupDone) {
                        allStages.push({
                            done: currentStage >= 4,
                            current: allPickupsDone && currentStage < 4,
                            label: "On way to warehouse",
                            detail: currentStage >= 4 ? "Arrived" : (allPickupsDone ? "In transit" : "After all pickups"),
                            icon: "🏭"
                        });
                    }

                    // Stage 6: At warehouse
                    allStages.push({
                        done: currentStage >= 4,
                        current: currentStage === 4 && !group?.deliveryAgentId,
                        label: "At warehouse",
                        detail: currentStage >= 4 ? "Package at sorting hub" : "Waiting",
                        icon: "📍"
                    });

                    // Stage 7: Delivery agent assigned
                    const deliveryAgentAssigned = currentStage >= 4 && group?.deliveryAgentId;
                    allStages.push({
                        done: deliveryAgentAssigned,
                        current: currentStage === 4 && !deliveryAgentAssigned,
                        label: "Delivery agent assigned",
                        detail: deliveryAgentAssigned ? `Agent 2 - ${group?.deliveryAgentName || 'Assigned'}` : "Awaiting assignment",
                        icon: "👤"
                    });

                    // Stage 8: Out for delivery - Show different status based on if this is the next/nearest delivery
                    const pendingDeliveryCount = groupParcels.filter(p => p.status === "OUT_FOR_DELIVERY").length;
                    const deliveredCount = groupParcels.filter(p => p.status === "DELIVERED").length;

                    let outForDeliveryLabel = "Out for delivery";
                    let outForDeliveryDetail = "Pending";

                    if (currentStage === 5) {
                        if (isNextDelivery) {
                            outForDeliveryLabel = "Out for delivery";
                            outForDeliveryDetail = `${group?.deliveryAgentName || 'Vinitha'} on the way`;
                        } else if (pendingDeliveryCount > 1) {
                            outForDeliveryLabel = "Out for delivery";
                            outForDeliveryDetail = `Delivering to other parcels (${deliveredCount}/${groupParcels.length} done)`;
                        } else {
                            outForDeliveryLabel = "Out for delivery";
                            outForDeliveryDetail = `${group?.deliveryAgentName || 'Agent'} on the way`;
                        }
                    } else if (currentStage >= 6) {
                        outForDeliveryDetail = "Done";
                    }

                    allStages.push({
                        done: currentStage >= 5, // Out for delivery is done when in delivery phase
                        current: false, // Sub-stages handle the current state
                        label: outForDeliveryLabel,
                        detail: outForDeliveryDetail,
                        icon: "🛵"
                    });

                    // Add "Coming to your address" substage when this is the nearest
                    if (currentStage === 5 && isNextDelivery) {
                        allStages.push({
                            done: false,
                            current: true,
                            label: "Coming to your address",
                            detail: `${group?.deliveryAgentName || 'Agent'} is heading to you!`,
                            icon: "📍"
                        });
                    } else if (currentStage === 5 && !isNextDelivery && pendingDeliveryCount > 1) {
                        // Show that agent is delivering others first
                        allStages.push({
                            done: false,
                            current: true,
                            label: "Delivering to others first",
                            detail: `${pendingDeliveryCount - 1} ${pendingDeliveryCount - 1 === 1 ? 'parcel' : 'parcels'} before yours`,
                            icon: "📦"
                        });
                    }

                    // Stage 9: Delivered
                    const isDelivered = currentStage >= 6;
                    allStages.push({
                        done: isDelivered,
                        current: false,
                        label: "Delivered",
                        detail: isDelivered ? (parcel.deliveredAt ? new Date(parcel.deliveredAt).toLocaleString() : "Done") : "Pending",
                        icon: "✅"
                    });

                    return (
                        <div className="space-y-0">
                            {allStages.map((stage, index) => (
                                <div key={index} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${stage.done ? "bg-green-500/30" :
                                            stage.current ? "bg-indigo-500 animate-pulse" : "bg-white/10"
                                            }`}>
                                            {stage.done ? <FaCheck className="text-green-400" /> :
                                                stage.current ? <span className="text-white">{stage.icon}</span> :
                                                    <span className="text-white/40">{stage.icon}</span>}
                                        </div>
                                        {index < allStages.length - 1 && (
                                            <div className={`w-0.5 h-8 ${stage.done ? "bg-green-500/50" : "bg-white/20"}`} />
                                        )}
                                    </div>
                                    <div className={`pb-4 ${stage.current ? "text-white font-medium" : stage.done ? "text-white/70" : "text-white/40"}`}>
                                        <p className="text-sm">{stage.label}</p>
                                        <p className={`text-xs ${stage.current ? "text-indigo-400" : "text-white/50"}`}>{stage.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            {/* Delivery Details */}
            <div className="bg-white/10 backdrop-blur-xl mx-4 mb-4 rounded-xl shadow-md p-4 border border-white/20">
                <h2 className="font-semibold text-white mb-3">Delivery Details</h2>
                <div className="space-y-4 text-sm">
                    {/* From */}
                    <div className="flex items-start gap-3 p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
                        <div className="flex-1">
                            <p className="text-xs text-white/60">From (Sender)</p>
                            <p className="font-medium text-white">{parcel.pickupName}</p>
                            <p className="text-white/70">{parcel.pickupAddress}, {parcel.pickupCity}</p>
                            <p className="text-white/60 flex items-center gap-1 mt-1">
                                <FaPhone className="text-xs" /> {parcel.pickupPhone}
                            </p>
                        </div>
                    </div>

                    {/* Warehouse */}
                    {group && (
                        <div className="flex items-start gap-3 p-3 bg-amber-500/20 rounded-lg border border-amber-500/30">
                            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white">
                                <FaWarehouse className="text-sm" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-white/60">Via Warehouse (Sorting Hub)</p>
                                <p className="font-medium text-white">{group.warehouseCity || 'Sorting Facility'}</p>
                                <p className="text-white/70">{group.warehouseAddress || 'Central sorting and consolidation hub'}</p>
                                {group.warehousePincode && (
                                    <p className="text-white/60">Pincode: {group.warehousePincode}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* To */}
                    <div className="flex items-start gap-3 p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
                        <div className="flex-1">
                            <p className="text-xs text-white/60">To (Receiver)</p>
                            <p className="font-medium text-white">{parcel.deliveryName}</p>
                            <p className="text-white/70">{parcel.deliveryAddress}, {parcel.deliveryCity}</p>
                            <p className="text-white/60 flex items-center gap-1 mt-1">
                                <FaPhone className="text-xs" /> {parcel.deliveryPhone}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment & Savings */}
            <div className="bg-white/10 backdrop-blur-xl mx-4 mb-4 rounded-xl shadow-md p-4 border border-white/20">
                <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <FaRupeeSign className="text-green-400" /> Payment Details
                </h2>
                {(() => {
                    // Use parcel data directly - these values come from backend
                    const basePrice = parseFloat(parcel.basePrice || 0);
                    const discountPercent = parseFloat(group?.discountPercentage || 0);
                    const discountAmount = parseFloat(parcel.discountAmount || 0);
                    const finalPrice = parseFloat(parcel.finalPrice || 0);
                    const balanceAmount = parseFloat(parcel.balanceAmount || 0);
                    const balancePaid = parcel.balancePaid || false;
                    // Total due = what was paid + any pending balance
                    const totalDue = finalPrice + (balancePaid ? 0 : balanceAmount);
                    // yourSavings = basePrice - totalDue (actual savings considering balance)
                    const yourSavings = basePrice - totalDue;

                    return (
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-white/60">Base Price</span>
                                <span className="font-medium text-white">₹{basePrice.toFixed(2)}</span>
                            </div>
                            {group && discountPercent > 0 && discountAmount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Group Discount ({discountPercent}%)</span>
                                    <span className="font-medium">-₹{discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-white/60">Amount Paid</span>
                                <span className="font-medium text-white">₹{finalPrice.toFixed(2)}</span>
                            </div>
                            {balanceAmount > 0 && (
                                <div className={`flex justify-between ${balancePaid ? 'text-green-600' : 'text-red-600'}`}>
                                    <span className="flex items-center gap-1">
                                        {balancePaid ? <FaCheck className="text-xs" /> : null}
                                        Balance {balancePaid ? '(Paid)' : '(Due)'}
                                    </span>
                                    <span className="font-medium">₹{balanceAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-white/10 pt-2 font-bold">
                                <span className="text-white">Total</span>
                                <span className="text-indigo-400">₹{totalDue.toFixed(2)}</span>
                            </div>
                            {balanceAmount > 0 && !balancePaid && (
                                <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2 mt-2">
                                    <p className="text-red-400 text-xs">
                                        ⚠️ Balance amount of ₹{balanceAmount.toFixed(2)} is due. Please pay during delivery.
                                    </p>
                                </div>
                            )}
                            {yourSavings > 0 && (
                                <div className="flex justify-between items-center bg-green-100 -mx-4 px-4 py-3 mt-2 rounded-lg">
                                    <span className="text-green-800 font-medium flex items-center gap-1">
                                        <FaPercent /> You Saved
                                    </span>
                                    <span className="text-green-700 font-bold text-lg">
                                        ₹{yourSavings.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Proof Photos Section - Show when either pickup, delivery, or cash balance photos exist */}
            {(parcel.pickupPhotoUrl || parcel.deliveryPhotoUrl || parcel.balanceCashPhotoUrl) && (
                <div className="bg-white mx-4 mb-4 rounded-xl shadow-md p-4">
                    <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FaImage className="text-purple-600" /> Proof Photos
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Pickup Proof */}
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pickup Proof</p>
                            {parcel.pickupPhotoUrl ? (
                                <div
                                    className="relative cursor-pointer group"
                                    onClick={() => window.open(parcel.pickupPhotoUrl, '_blank')}
                                >
                                    <img
                                        src={parcel.pickupPhotoUrl}
                                        alt="Pickup proof"
                                        className="w-full h-32 object-cover rounded-lg border-2 border-orange-200 group-hover:opacity-80 transition"
                                    />
                                    <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                                        📦 Picked up
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                                    <span className="text-gray-400 text-sm">No photo</span>
                                </div>
                            )}
                        </div>

                        {/* Delivery Proof */}
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Delivery Proof</p>
                            {parcel.deliveryPhotoUrl ? (
                                <div
                                    className="relative cursor-pointer group"
                                    onClick={() => window.open(parcel.deliveryPhotoUrl, '_blank')}
                                >
                                    <img
                                        src={parcel.deliveryPhotoUrl}
                                        alt="Delivery proof"
                                        className="w-full h-32 object-cover rounded-lg border-2 border-green-200 group-hover:opacity-80 transition"
                                    />
                                    <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                        ✅ Delivered
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                                    <span className="text-gray-400 text-sm">{currentStage >= 6 ? 'No photo' : 'Pending'}</span>
                                </div>
                            )}
                        </div>

                        {/* Balance Cash Collection Proof - Only show if balance was due */}
                        {parseFloat(parcel.balanceAmount || 0) > 0 && (
                            <div className="space-y-2 col-span-2">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Balance Payment Proof</p>
                                {parcel.balanceCashPhotoUrl ? (
                                    <div
                                        className="relative cursor-pointer group"
                                        onClick={() => window.open(parcel.balanceCashPhotoUrl, '_blank')}
                                    >
                                        <img
                                            src={parcel.balanceCashPhotoUrl}
                                            alt="Balance payment proof"
                                            className="w-full h-40 object-cover rounded-lg border-2 border-red-200 group-hover:opacity-80 transition"
                                        />
                                        <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                            💵 Cash Collected
                                        </div>
                                    </div>
                                ) : parcel.balancePaid ? (
                                    <div className="w-full h-24 bg-green-50 rounded-lg border-2 border-green-300 flex items-center justify-center">
                                        <span className="text-green-600 text-sm font-medium">✓ Paid via {parcel.balancePaymentMethod || 'Online'}</span>
                                    </div>
                                ) : (
                                    <div className="w-full h-24 bg-red-50 rounded-lg border-2 border-dashed border-red-300 flex items-center justify-center">
                                        <span className="text-red-500 text-sm">⚠️ Balance payment pending</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )
            }

            {/* Rate Pickup Agent - show from stage 4 onwards if not yet rated */}
            {
                currentStage >= 4 && !hasRatedPickupAgent && group?.pickupAgentId && (
                    <div className="mx-4 mb-4">
                        <div className="bg-purple-500/20 backdrop-blur-xl border border-purple-500/30 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                    {group.pickupAgentName?.charAt(0) || "P"}
                                </div>
                                <div>
                                    <p className="font-semibold text-white text-lg">{group.pickupAgentName || "Pickup Agent"}</p>
                                    <p className="text-sm text-purple-200">{currentStage >= 6 ? "Successfully picked up your parcel" : "Your parcel has arrived at the warehouse!"}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPickupRatingModal(true)}
                                className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition"
                            >
                                <FaStar /> Rate Pickup Agent
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Show if already rated pickup agent - show at any stage >= 4 */}
            {
                hasRatedPickupAgent && currentStage >= 4 && (
                    <div className="mx-4 mb-4">
                        <div className="bg-green-500/20 backdrop-blur-xl border border-green-500/30 rounded-xl p-4 text-center">
                            <p className="text-green-400 font-medium flex items-center justify-center gap-2">
                                <FaCheck /> Pickup agent rated - Thank you!
                            </p>
                        </div>
                    </div>
                )
            }

            {/* Rate Delivery Agent - Show after delivery (stage 6) and not yet rated */}
            {
                currentStage === 6 && !hasRatedDeliveryAgent && group?.deliveryAgentId && (
                    <div className="mx-4 mb-4">
                        <div className="bg-green-500/20 backdrop-blur-xl border border-green-500/30 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                    {group.deliveryAgentName?.charAt(0) || "D"}
                                </div>
                                <div>
                                    <p className="font-semibold text-white text-lg">{group.deliveryAgentName || "Delivery Agent"}</p>
                                    <p className="text-sm text-green-200">Delivered your package successfully!</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDeliveryRatingModal(true)}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition"
                            >
                                <FaStar /> Rate Delivery Agent
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Show if already rated delivery agent */}
            {
                hasRatedDeliveryAgent && currentStage === 6 && (
                    <div className="mx-4 mb-4">
                        <div className="bg-green-500/20 backdrop-blur-xl border border-green-500/30 rounded-xl p-3 text-center">
                            <p className="text-green-400 font-medium flex items-center justify-center gap-2 text-sm">
                                <FaCheck /> Delivery agent rated - Thank you!
                            </p>
                        </div>
                    </div>
                )
            }

            {/* Rate Company - Show after delivery (stage 6) and not yet rated */}
            {
                currentStage === 6 && !hasRatedCompany && group?.companyId && (
                    <div className="mx-4 mb-4">
                        <div className="bg-blue-500/20 backdrop-blur-xl border border-blue-500/30 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                    {group.companyName?.charAt(0) || "C"}
                                </div>
                                <div>
                                    <p className="font-semibold text-white text-lg">{group.companyName || "Company"}</p>
                                    <p className="text-sm text-blue-200">How was your overall experience?</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCompanyRatingModal(true)}
                                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition"
                            >
                                <FaStar /> Rate Company
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Show if already rated company */}
            {
                hasRatedCompany && currentStage === 6 && (
                    <div className="mx-4 mb-4">
                        <div className="bg-blue-500/20 backdrop-blur-xl border border-blue-500/30 rounded-xl p-3 text-center">
                            <p className="text-blue-400 font-medium flex items-center justify-center gap-2 text-sm">
                                <FaCheck /> Company rated - Thank you!
                            </p>
                        </div>
                    </div>
                )
            }

            {/* Pickup Agent Rating Modal */}
            {
                showPickupRatingModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl">
                                <h3 className="text-lg font-bold">Rate Pickup Agent</h3>
                                <p className="text-white/80 text-sm">How was your pickup experience?</p>
                            </div>

                            <div className="p-6">
                                {/* Agent Info */}
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-lg">
                                        {group?.pickupAgentName?.charAt(0) || "P"}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{group?.pickupAgentName || "Pickup Agent"}</p>
                                        <p className="text-sm text-gray-500">Collected your parcel</p>
                                    </div>
                                </div>

                                {/* Star Rating */}
                                <div className="text-center mb-6">
                                    <p className="text-sm text-gray-600 mb-3">Tap to rate</p>
                                    <div className="flex justify-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setPickupRating(star)}
                                                className="p-1 transition transform hover:scale-110"
                                            >
                                                <FaStar
                                                    className={`text-4xl ${pickupRating >= star ? "text-yellow-400" : "text-gray-300"}`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    {pickupRating > 0 && (
                                        <p className="mt-2 text-sm font-medium text-gray-700">
                                            {pickupRating === 1 && "Poor"}
                                            {pickupRating === 2 && "Fair"}
                                            {pickupRating === 3 && "Good"}
                                            {pickupRating === 4 && "Very Good"}
                                            {pickupRating === 5 && "Excellent"}
                                        </p>
                                    )}
                                </div>

                                {/* Comment */}
                                <textarea
                                    placeholder="Add a comment (optional)"
                                    value={pickupRatingComment}
                                    onChange={(e) => setPickupRatingComment(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:border-purple-500 focus:outline-none mb-4"
                                    rows={3}
                                />

                                {/* Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowPickupRatingModal(false)}
                                        className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-600 hover:bg-gray-50"
                                    >
                                        Later
                                    </button>
                                    <button
                                        onClick={submitPickupRating}
                                        disabled={submittingPickupRating || pickupRating === 0}
                                        className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {submittingPickupRating ? "Submitting..." : "Submit Rating"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delivery Agent Rating Modal */}
            {
                showDeliveryRatingModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
                            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-t-2xl">
                                <h3 className="text-lg font-bold">Rate Delivery Agent</h3>
                                <p className="text-white/80 text-sm">How was your delivery experience?</p>
                            </div>

                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-lg">
                                        {group?.deliveryAgentName?.charAt(0) || "D"}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{group?.deliveryAgentName || "Delivery Agent"}</p>
                                        <p className="text-sm text-gray-500">Delivered your parcel</p>
                                    </div>
                                </div>

                                <div className="text-center mb-6">
                                    <p className="text-sm text-gray-600 mb-3">Tap to rate</p>
                                    <div className="flex justify-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setDeliveryRating(star)}
                                                className={`text-4xl transition-transform hover:scale-110 ${star <= deliveryRating ? "text-yellow-400" : "text-gray-300"}`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">
                                        {deliveryRating === 0 ? "Select rating" : ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][deliveryRating]}
                                    </p>
                                </div>

                                <textarea
                                    placeholder="Add a comment (optional)"
                                    value={deliveryRatingComment}
                                    onChange={(e) => setDeliveryRatingComment(e.target.value)}
                                    className="w-full p-3 border rounded-xl mb-6 resize-none focus:ring-2 focus:ring-green-200 focus:border-green-500 outline-none"
                                    rows={3}
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeliveryRatingModal(false)}
                                        className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-600 hover:bg-gray-50"
                                    >
                                        Later
                                    </button>
                                    <button
                                        onClick={submitDeliveryRating}
                                        disabled={submittingDeliveryRating || deliveryRating === 0}
                                        className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {submittingDeliveryRating ? "Submitting..." : "Submit Rating"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Company Rating Modal */}
            {
                showCompanyRatingModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl">
                                <h3 className="text-lg font-bold">Rate Company</h3>
                                <p className="text-white/80 text-sm">How was your overall experience?</p>
                            </div>

                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                                        {group?.companyName?.charAt(0) || "C"}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{group?.companyName || "Company"}</p>
                                        <p className="text-sm text-gray-500">Your shipping provider</p>
                                    </div>
                                </div>

                                <div className="text-center mb-6">
                                    <p className="text-sm text-gray-600 mb-3">Tap to rate</p>
                                    <div className="flex justify-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setCompanyRating(star)}
                                                className={`text-4xl transition-transform hover:scale-110 ${star <= companyRating ? "text-yellow-400" : "text-gray-300"}`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">
                                        {companyRating === 0 ? "Select rating" : ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][companyRating]}
                                    </p>
                                </div>

                                <textarea
                                    placeholder="Add a comment (optional)"
                                    value={companyRatingComment}
                                    onChange={(e) => setCompanyRatingComment(e.target.value)}
                                    className="w-full p-3 border rounded-xl mb-6 resize-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                                    rows={3}
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowCompanyRatingModal(false)}
                                        className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-600 hover:bg-gray-50"
                                    >
                                        Later
                                    </button>
                                    <button
                                        onClick={submitCompanyRating}
                                        disabled={submittingCompanyRating || companyRating === 0}
                                        className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {submittingCompanyRating ? "Submitting..." : "Submit Rating"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Photo Modal */}
            {
                showPhotoModal && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowPhotoModal(null)}>
                        <img src={showPhotoModal} alt="Proof" className="max-w-full max-h-full rounded-lg" />
                    </div>
                )
            }

            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(239,68,68,0.6); }
                    50% { transform: scale(1.15); box-shadow: 0 6px 20px rgba(239,68,68,0.8); }
                }
            `}</style>

            {/* Chat with Agent - show when pickup or delivery agent is assigned */}
            {parcel && group && (group.pickupAgentId || group.deliveryAgentId) &&
                !['DELIVERED', 'CANCELLED'].includes(parcel.status) && (
                    <ChatPanel
                        type="group"
                        id={group.id}
                        receiverParcelId={parcel.id}
                        receiverName={currentStage <= 3 ? (group.pickupAgentName || 'Pickup Agent') : (group.deliveryAgentName || 'Delivery Agent')}
                        isAgent={false}
                        isMinimized={true}
                    />
                )}
        </div >
    );
}
