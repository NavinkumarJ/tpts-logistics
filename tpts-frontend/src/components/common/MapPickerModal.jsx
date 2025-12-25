import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { FaTimes, FaCheck, FaCrosshairs, FaLayerGroup, FaSpinner, FaMapMarkerAlt } from "react-icons/fa";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import toast from "react-hot-toast";

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker icons
const pickupIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const deliveryIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Map tile providers
const MAP_STYLES = {
    standard: {
        name: "Standard",
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },
    satellite: {
        name: "Satellite",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: '&copy; Esri'
    },
    terrain: {
        name: "Terrain",
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
    },
    dark: {
        name: "Dark",
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
    },
    light: {
        name: "Light",
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
    }
};

// Component to handle map clicks and marker placement
function MapClickHandler({ position, setPosition }) {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        }
    });
    return null;
}

// Component to recenter map
function RecenterMap({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, 17);
        }
    }, [position, map]);
    return null;
}

/**
 * MapPickerModal - Full-screen map picker with multiple map styles
 */
export default function MapPickerModal({
    onClose,
    onSelect,
    initialPosition = null,
    type = "pickup"
}) {
    const [position, setPosition] = useState(initialPosition);
    const [address, setAddress] = useState(null);
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [mapStyle, setMapStyle] = useState("standard");
    const [showStylePicker, setShowStylePicker] = useState(false);

    // Default center (India)
    const defaultCenter = [20.5937, 78.9629];
    const [mapCenter, setMapCenter] = useState(initialPosition || defaultCenter);
    const [mapZoom, setMapZoom] = useState(initialPosition ? 17 : 5);

    // Reverse geocode position
    useEffect(() => {
        if (!position) return;

        const reverseGeocode = async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position[0]}&lon=${position[1]}&zoom=18&addressdetails=1`,
                    {
                        headers: {
                            "Accept-Language": "en",
                            "User-Agent": "TPTS-Delivery-App"
                        }
                    }
                );
                const data = await response.json();

                const addressLine = [
                    data.address?.house_number,
                    data.address?.road,
                    data.address?.neighbourhood || data.address?.suburb,
                ].filter(Boolean).join(", ");

                setAddress({
                    addressLine: addressLine || data.display_name?.split(",").slice(0, 3).join(", ") || "",
                    city: data.address?.city || data.address?.town || data.address?.village || data.address?.state_district || "",
                    state: data.address?.state || "",
                    pincode: data.address?.postcode || "",
                    lat: position[0],
                    lng: position[1],
                    displayName: data.display_name
                });
            } catch (error) {
                console.error("Reverse geocoding error:", error);
                toast.error("Failed to get address for this location");
            }
            setLoading(false);
        };

        reverseGeocode();
    }, [position]);

    // Get current location
    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation not supported");
            return;
        }

        setLocating(true);
        const toastId = toast.loading("Getting location...");

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                const newPosition = [latitude, longitude];
                setPosition(newPosition);
                setMapCenter(newPosition);
                setMapZoom(17);

                if (accuracy > 1000) {
                    toast.success(`Found (±${(accuracy / 1000).toFixed(1)}km) - Click to refine`, { id: toastId, duration: 4000 });
                } else {
                    toast.success(`Found (±${Math.round(accuracy)}m)`, { id: toastId });
                }
                setLocating(false);
            },
            (error) => {
                setLocating(false);
                console.error("Geolocation error:", error.code, error.message);
                const msg = {
                    1: "Permission denied",
                    2: "Location unavailable",
                    3: "Timed out - click on map"
                };
                toast.error(msg[error.code] || "Location error", { id: toastId });
            },
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
        );
    };

    // Handle confirm
    const handleConfirm = () => {
        if (!address) {
            toast.error("Please select a location on the map");
            return;
        }
        onSelect(address);
    };

    const markerIcon = type === "pickup" ? pickupIcon : deliveryIcon;
    const headerColor = type === "pickup" ? "bg-green-600" : "bg-red-600";

    return (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className={`${headerColor} text-white px-4 py-3 flex items-center justify-between`}>
                    <h3 className="font-semibold flex items-center gap-2">
                        <FaMapMarkerAlt />
                        {type === "pickup" ? "Select Pickup Location" : "Select Delivery Location"}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
                        <FaTimes />
                    </button>
                </div>

                {/* Map Container */}
                <div className="relative flex-1 min-h-[400px]">
                    <MapContainer
                        center={mapCenter}
                        zoom={mapZoom}
                        className="h-full w-full"
                        style={{ height: "100%", minHeight: "400px" }}
                    >
                        <TileLayer
                            url={MAP_STYLES[mapStyle].url}
                            attribution={MAP_STYLES[mapStyle].attribution}
                        />
                        <MapClickHandler position={position} setPosition={setPosition} />
                        {position && <RecenterMap position={position} />}
                        {position && <Marker position={position} icon={markerIcon} />}
                    </MapContainer>

                    {/* Map Controls */}
                    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                        {/* Locate Me Button */}
                        <button
                            onClick={handleGetLocation}
                            disabled={locating}
                            className="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50 transition"
                            title="Use my location"
                        >
                            {locating ? (
                                <FaSpinner className="animate-spin text-blue-600" />
                            ) : (
                                <FaCrosshairs className="text-blue-600" />
                            )}
                        </button>

                        {/* Map Style Picker */}
                        <div className="relative">
                            <button
                                onClick={() => setShowStylePicker(!showStylePicker)}
                                className="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50 transition"
                                title="Change map style"
                            >
                                <FaLayerGroup className="text-purple-600" />
                            </button>

                            {showStylePicker && (
                                <div className="absolute right-full mr-2 top-0 bg-white rounded-lg shadow-lg p-2 min-w-[150px]">
                                    {Object.entries(MAP_STYLES).map(([key, style]) => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                setMapStyle(key);
                                                setShowStylePicker(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${mapStyle === key ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                                                }`}
                                        >
                                            {style.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Instructions */}
                    {!position && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm z-[1000]">
                            Click on the map to select a location
                        </div>
                    )}
                </div>

                {/* Address Preview & Actions */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    {loading ? (
                        <div className="flex items-center gap-2 text-gray-500">
                            <FaSpinner className="animate-spin" /> Getting address...
                        </div>
                    ) : address ? (
                        <div className="space-y-3">
                            <div className="text-sm">
                                <p className="font-medium text-gray-900">{address.addressLine}</p>
                                <p className="text-gray-600">
                                    {address.city}{address.state ? `, ${address.state}` : ""}
                                    {address.pincode ? ` - ${address.pincode}` : ""}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition flex items-center justify-center gap-2 ${type === "pickup" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                                        }`}
                                >
                                    <FaCheck /> Confirm Location
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                disabled
                                className="flex-1 px-4 py-2 bg-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                            >
                                Select a location
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
