import { useState, useEffect, useRef, useCallback } from "react";
import { FaMapMarkerAlt, FaSearch, FaCrosshairs, FaMap, FaStar, FaTimes, FaSpinner } from "react-icons/fa";
import MapPickerModal from "./MapPickerModal";
import toast from "react-hot-toast";

/**
 * AddressInput - Smart address input with autocomplete, live location, and map picker
 * 
 * Features:
 * - Autocomplete from saved addresses
 * - Nominatim address search
 * - Live location detection with high accuracy
 * - Map picker modal
 */
export default function AddressInput({
    value = {},
    onChange,
    savedAddresses = [],
    placeholder = "Start typing or search address...",
    label = "Address",
    required = false,
    type = "pickup" // "pickup" or "delivery"
}) {
    const [query, setQuery] = useState(value.addressLine || "");
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const debounceRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target) &&
                inputRef.current &&
                !inputRef.current.contains(e.target)
            ) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced Nominatim search
    const searchNominatim = useCallback(async (searchQuery) => {
        if (searchQuery.length < 3) return [];

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=5&addressdetails=1`,
                {
                    headers: {
                        "Accept-Language": "en",
                        "User-Agent": "TPTS-Delivery-App"
                    }
                }
            );
            const data = await response.json();
            return data.map(item => ({
                id: `nominatim-${item.place_id}`,
                type: "search",
                displayName: item.display_name,
                addressLine: item.display_name.split(",").slice(0, 3).join(", "),
                city: item.address?.city || item.address?.town || item.address?.village || item.address?.state_district || "",
                state: item.address?.state || "",
                pincode: item.address?.postcode || "",
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
            }));
        } catch (error) {
            console.error("Nominatim search error:", error);
            return [];
        }
    }, []);

    // Handle input change
    const handleInputChange = (e) => {
        const newQuery = e.target.value;
        setQuery(newQuery);
        setShowDropdown(true);

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Filter saved addresses immediately
        const filteredSaved = savedAddresses.filter(addr =>
            addr.addressLine?.toLowerCase().includes(newQuery.toLowerCase()) ||
            addr.city?.toLowerCase().includes(newQuery.toLowerCase()) ||
            addr.label?.toLowerCase().includes(newQuery.toLowerCase())
        ).map(addr => ({ ...addr, type: "saved" }));

        setSuggestions(filteredSaved);

        // Debounce Nominatim search
        if (newQuery.length >= 3) {
            setLoading(true);
            debounceRef.current = setTimeout(async () => {
                const nominatimResults = await searchNominatim(newQuery);
                setSuggestions(prev => [
                    ...prev.filter(s => s.type === "saved"),
                    ...nominatimResults
                ]);
                setLoading(false);
            }, 500);
        }
    };

    // Select address from suggestions
    const handleSelectAddress = (address) => {
        setQuery(address.addressLine || address.displayName || "");
        setShowDropdown(false);
        onChange({
            addressLine: address.addressLine || address.displayName?.split(",").slice(0, 3).join(", ") || "",
            city: address.city || "",
            state: address.state || "",
            pincode: address.pincode || "",
            contactName: address.contactName || "",
            contactPhone: address.contactPhone || "",
            lat: address.lat,
            lng: address.lng,
        });
    };

    // Get live location
    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }

        setLocating(true);
        const toastId = toast.loading("Getting your location...");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;

                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
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

                    const address = {
                        addressLine: addressLine || data.display_name?.split(",").slice(0, 3).join(", ") || "",
                        city: data.address?.city || data.address?.town || data.address?.village || data.address?.state_district || "",
                        state: data.address?.state || "",
                        pincode: data.address?.postcode || "",
                        lat: latitude,
                        lng: longitude,
                    };

                    setQuery(address.addressLine);
                    onChange(address);

                    if (accuracy > 1000) {
                        toast.success(`Location found (±${(accuracy / 1000).toFixed(1)}km). Use Map for precision.`, { id: toastId, duration: 4000 });
                    } else {
                        toast.success(`Location found (±${Math.round(accuracy)}m)`, { id: toastId });
                    }
                } catch (error) {
                    console.error("Reverse geocoding error:", error);
                    toast.error("Failed to get address", { id: toastId });
                }
                setLocating(false);
            },
            (error) => {
                setLocating(false);
                console.error("Geolocation error:", error.code, error.message);
                const messages = {
                    1: "Location permission denied. Please allow in browser settings.",
                    2: "Location unavailable on this device.",
                    3: "Location timed out. Please use the Map button instead."
                };
                toast.error(messages[error.code] || "Could not get location.", { id: toastId });
            },
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
        );
    };

    // Handle map picker result
    const handleMapSelect = (address) => {
        setQuery(address.addressLine || "");
        setShowMapPicker(false);
        onChange(address);
    };

    const iconColor = type === "pickup" ? "text-green-600" : "text-red-600";
    const borderColor = type === "pickup" ? "focus:ring-green-500" : "focus:ring-red-500";

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <FaMapMarkerAlt className={`inline mr-1 ${iconColor}`} />
                {label} {required && <span className="text-red-500">*</span>}
            </label>

            <div className="relative">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={handleInputChange}
                            onFocus={() => setShowDropdown(true)}
                            placeholder={placeholder}
                            className={`input pl-10 pr-10 w-full ${borderColor}`}
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery("");
                                    onChange({});
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <FaTimes />
                            </button>
                        )}
                    </div>

                    {/* Live Location Button */}
                    <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={locating}
                        className={`px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition flex items-center gap-1 text-sm ${locating ? "bg-gray-100" : "bg-white"
                            }`}
                        title="Use my current location"
                    >
                        {locating ? (
                            <FaSpinner className="animate-spin text-blue-600" />
                        ) : (
                            <FaCrosshairs className="text-blue-600" />
                        )}
                        <span className="hidden sm:inline">Locate</span>
                    </button>

                    {/* Map Picker Button - Most Accurate */}
                    <button
                        type="button"
                        onClick={() => setShowMapPicker(true)}
                        className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 transition flex items-center gap-1 text-sm font-medium shadow-sm"
                        title="Pick exact location on map (Best accuracy)"
                    >
                        <FaMap />
                        <span className="hidden sm:inline">Map</span>
                    </button>
                </div>

                {/* Suggestions Dropdown */}
                {showDropdown && (suggestions.length > 0 || loading) && (
                    <div
                        ref={dropdownRef}
                        className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto"
                    >
                        {loading && (
                            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                                <FaSpinner className="animate-spin" /> Searching...
                            </div>
                        )}

                        {suggestions.length > 0 && (
                            <>
                                {/* Saved Addresses Section */}
                                {suggestions.filter(s => s.type === "saved").length > 0 && (
                                    <div>
                                        <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                                            <FaStar className="text-yellow-500" /> Saved Addresses
                                        </div>
                                        {suggestions.filter(s => s.type === "saved").map(addr => (
                                            <button
                                                key={addr.id}
                                                type="button"
                                                onClick={() => handleSelectAddress(addr)}
                                                className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0"
                                            >
                                                <p className="font-medium text-gray-900 text-sm">
                                                    {addr.label || addr.city}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {addr.addressLine}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Search Results Section */}
                                {suggestions.filter(s => s.type === "search").length > 0 && (
                                    <div>
                                        <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                                            <FaSearch className="text-blue-500" /> Search Results
                                        </div>
                                        {suggestions.filter(s => s.type === "search").map(addr => (
                                            <button
                                                key={addr.id}
                                                type="button"
                                                onClick={() => handleSelectAddress(addr)}
                                                className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0"
                                            >
                                                <p className="text-sm text-gray-900 truncate">
                                                    {addr.addressLine}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {addr.city}{addr.state ? `, ${addr.state}` : ""} {addr.pincode}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Selected Address Display */}
            {value.city && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                    <span className="font-medium">{value.city}</span>
                    {value.state && <span>, {value.state}</span>}
                    {value.pincode && <span> - {value.pincode}</span>}
                </div>
            )}

            {/* Map Picker Modal */}
            {showMapPicker && (
                <MapPickerModal
                    onClose={() => setShowMapPicker(false)}
                    onSelect={handleMapSelect}
                    initialPosition={value.lat && value.lng ? [value.lat, value.lng] : null}
                    type={type}
                />
            )}
        </div>
    );
}
