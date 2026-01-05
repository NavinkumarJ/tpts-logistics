import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentCustomer, getAddresses } from "../../services/customerService";
import { createParcel, compareCompanyPrices, getOpenGroupsByRoute, confirmParcel, cancelParcel } from "../../services/parcelService";
import { initiatePayment, initiateOrder, verifyPayment, loadRazorpayScript, openRazorpayCheckout } from "../../services/paymentService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaBox, FaTruck, FaCreditCard, FaCheck, FaArrowLeft, FaArrowRight,
    FaMapMarkerAlt, FaUser, FaPhone, FaWeight, FaRuler, FaUsers,
    FaClock, FaRoute, FaStar, FaShieldAlt, FaCheckCircle
} from "react-icons/fa";
import AddressInput from "../../components/common/AddressInput";

const PACKAGE_TYPES = [
    { value: "SMALL", label: "Small (< 1kg)", icon: "📦" },
    { value: "MEDIUM", label: "Medium (1-5kg)", icon: "📦" },
    { value: "LARGE", label: "Large (5-20kg)", icon: "📦" },
    { value: "ELECTRONICS", label: "Electronics", icon: "📱" },
    { value: "FRAGILE", label: "Fragile", icon: "⚠️" },
    { value: "DOCUMENT", label: "Documents", icon: "📄" },
];

export default function NewShipmentPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [customer, setCustomer] = useState(null);
    const [savedAddresses, setSavedAddresses] = useState([]);

    // Step 1: Shipment Details
    const [formData, setFormData] = useState({
        // Pickup
        pickupName: "",
        pickupPhone: "",
        pickupAddress: "",
        pickupCity: "",
        pickupState: "",
        pickupPincode: "",
        pickupLatitude: null,
        pickupLongitude: null,
        // Delivery
        deliveryName: "",
        deliveryPhone: "",
        deliveryAddress: "",
        deliveryCity: "",
        deliveryState: "",
        deliveryPincode: "",
        deliveryLatitude: null,
        deliveryLongitude: null,
        // Package
        packageType: "SMALL",
        weightKg: "1",
        dimensions: "",
        isFragile: false,
        specialInstructions: "",
    });

    // Step 2: Company Selection
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [isGroupBuy, setIsGroupBuy] = useState(false);
    const [routeInfo, setRouteInfo] = useState({ distanceKm: 0, etaHours: 0, etaDays: "1-2" });

    // Step 3: Payment
    const [createdParcel, setCreatedParcel] = useState(null);
    const [paymentComplete, setPaymentComplete] = useState(false);

    useEffect(() => {
        fetchCustomerData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchCustomerData = async () => {
        try {
            const customerData = await getCurrentCustomer();
            setCustomer(customerData);

            // Pre-fill pickup with customer info
            setFormData(prev => ({
                ...prev,
                pickupName: customerData.fullName || "",
                pickupPhone: customerData.phone || "",
            }));

            // Fetch saved addresses
            const addresses = await getAddresses(customerData.id);
            setSavedAddresses(addresses || []);

            // Pre-fill with default address
            const defaultAddr = addresses?.find(a => a.isDefault);
            if (defaultAddr) {
                setFormData(prev => ({
                    ...prev,
                    pickupAddress: defaultAddr.addressLine || "",
                    pickupCity: defaultAddr.city || "",
                    pickupState: defaultAddr.state || "",
                    pickupPincode: defaultAddr.pincode || "",
                }));
            }
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load customer data");
            }
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleAddressSelect = (address, type) => {
        const prefix = type === "pickup" ? "pickup" : "delivery";
        setFormData(prev => ({
            ...prev,
            [`${prefix}Name`]: address.contactName || prev[`${prefix}Name`],
            [`${prefix}Phone`]: address.contactPhone || prev[`${prefix}Phone`],
            [`${prefix}Address`]: address.addressLine || "",
            [`${prefix}City`]: address.city || "",
            [`${prefix}State`]: address.state || "",
            [`${prefix}Pincode`]: address.pincode || "",
        }));
    };

    // Step 1 Validation
    const validateStep1 = () => {
        console.log("validateStep1 checking form data:", formData);
        const required = [
            "pickupName", "pickupPhone", "pickupAddress", "pickupCity", "pickupPincode",
            "deliveryName", "deliveryPhone", "deliveryAddress", "deliveryCity", "deliveryPincode"
        ];
        for (const field of required) {
            if (!formData[field]?.trim()) {
                console.log("Missing required field:", field, "value:", formData[field]);
                toast.error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
                return false;
            }
        }
        if (!/^[6-9]\d{9}$/.test(formData.pickupPhone)) {
            console.log("Invalid pickup phone:", formData.pickupPhone);
            toast.error("Please enter a valid 10-digit pickup phone number");
            return false;
        }
        if (!/^[6-9]\d{9}$/.test(formData.deliveryPhone)) {
            console.log("Invalid delivery phone:", formData.deliveryPhone);
            toast.error("Please enter a valid 10-digit delivery phone number");
            return false;
        }
        if (!/^[1-9][0-9]{5}$/.test(formData.pickupPincode)) {
            console.log("Invalid pickup pincode:", formData.pickupPincode);
            toast.error("Please enter a valid 6-digit pickup pincode");
            return false;
        }
        if (!/^[1-9][0-9]{5}$/.test(formData.deliveryPincode)) {
            console.log("Invalid delivery pincode:", formData.deliveryPincode);
            toast.error("Please enter a valid 6-digit delivery pincode");
            return false;
        }
        console.log("Validation passed!");
        return true;
    };

    // Haversine formula to calculate distance between two coordinates
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
        if (!lat1 || !lng1 || !lat2 || !lng2) return 50; // Default 50km
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Move to Step 2: Fetch companies and groups
    const handleStep1Next = async () => {
        console.log("handleStep1Next called, validating...");
        if (!validateStep1()) {
            console.log("Validation failed");
            return;
        }
        console.log("Validation passed, fetching data...");

        setLoading(true);
        try {
            // Calculate distance from coordinates
            const distanceKm = calculateDistance(
                formData.pickupLatitude, formData.pickupLongitude,
                formData.deliveryLatitude, formData.deliveryLongitude
            );

            // Calculate ETA (assuming 40km/h average for delivery vehicles)
            const etaHours = Math.ceil(distanceKm / 40);
            const etaDays = distanceKm < 100 ? "1" : distanceKm < 300 ? "1-2" : distanceKm < 500 ? "2-3" : "3-5";

            setRouteInfo({
                distanceKm: Math.round(distanceKm),
                etaHours,
                etaDays
            });

            // Fetch company prices with distance
            console.log("Fetching companies for route:", formData.pickupCity, "->", formData.deliveryCity);
            const priceData = await compareCompanyPrices(
                formData.pickupCity,
                formData.deliveryCity,
                parseFloat(formData.weightKg) || 1,
                Math.round(distanceKm)
            );
            console.log("Companies fetched:", priceData);
            setCompanies(priceData || []);

            // Fetch available groups for this route
            const groupData = await getOpenGroupsByRoute(formData.pickupCity, formData.deliveryCity);
            console.log("Groups fetched:", groupData);
            setGroups(groupData || []);

            console.log("Moving to step 2");
            setStep(2);
        } catch (err) {
            console.error("Error in handleStep1Next:", err);
            toast.error(err.response?.data?.message || "Failed to fetch companies");
        } finally {
            setLoading(false);
        }
    };

    // Step 2 Validation
    const validateStep2 = () => {
        if (isGroupBuy) {
            if (!selectedGroup) {
                toast.error("Please select a group to join");
                return false;
            }
        } else {
            if (!selectedCompany) {
                toast.error("Please select a company");
                return false;
            }
        }
        return true;
    };

    // Move to Step 3: Show payment summary (parcel created only after payment)
    const handleStep2Next = () => {
        if (!validateStep2()) return;
        setStep(3);
    };

    // Handle Payment - Uses payment-first flow: pay first, parcel created after success
    const handlePayment = async () => {
        setLoading(true);
        try {
            // Step 1: Load Razorpay script first
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                toast.error("Failed to load payment gateway");
                return;
            }

            // Step 2: Prepare order data (parcel data included for after payment)
            const orderData = {
                companyId: isGroupBuy ? selectedGroup.companyId : selectedCompany.id,
                groupShipmentId: isGroupBuy ? selectedGroup.id : null,
                paymentMethod: "UPI",
                pickupName: formData.pickupName,
                pickupPhone: formData.pickupPhone,
                pickupAddress: formData.pickupAddress,
                pickupCity: formData.pickupCity,
                pickupState: formData.pickupState,
                pickupPincode: formData.pickupPincode,
                pickupLatitude: formData.pickupLatitude,
                pickupLongitude: formData.pickupLongitude,
                deliveryName: formData.deliveryName,
                deliveryPhone: formData.deliveryPhone,
                deliveryAddress: formData.deliveryAddress,
                deliveryCity: formData.deliveryCity,
                deliveryState: formData.deliveryState,
                deliveryPincode: formData.deliveryPincode,
                deliveryLatitude: formData.deliveryLatitude,
                deliveryLongitude: formData.deliveryLongitude,
                packageType: formData.packageType,
                weightKg: parseFloat(formData.weightKg) || 1,
                distanceKm: routeInfo.distanceKm,
                dimensions: formData.dimensions,
                isFragile: formData.isFragile,
                specialInstructions: formData.specialInstructions,
            };

            console.log("Initiating payment with order data:", orderData);

            // Step 3: Initiate order (creates Razorpay order, NOT parcel)
            const paymentData = await initiateOrder(orderData);
            console.log("Payment order created:", paymentData);

            // Step 4: Open Razorpay checkout
            const paymentResponse = await openRazorpayCheckout({
                key: paymentData.razorpayKeyId,
                amount: paymentData.amount,
                currency: paymentData.currency || "INR",
                name: "TPTS Delivery",
                description: paymentData.description || `Delivery from ${formData.pickupCity} to ${formData.deliveryCity}`,
                order_id: paymentData.razorpayOrderId,
                prefill: {
                    name: customer?.fullName,
                    email: customer?.email,
                    contact: customer?.phone,
                },
                theme: {
                    color: "#4F46E5",
                },
            });

            // Step 5: Verify payment - this creates parcel and confirms it
            console.log("Verifying payment, parcel will be created now...");
            const verifyResult = await verifyPayment({
                razorpayOrderId: paymentResponse.razorpay_order_id,
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpaySignature: paymentResponse.razorpay_signature,
            });

            console.log("Payment verified, parcel created:", verifyResult);

            // Set the created parcel from verify result
            setCreatedParcel({
                id: verifyResult.parcelId,
                trackingNumber: verifyResult.trackingNumber,
                status: "CONFIRMED",
            });

            setPaymentComplete(true);
            toast.success("Payment successful! Your shipment is confirmed.");
        } catch (err) {
            if (err.message === "Payment cancelled by user") {
                // No parcel was created, just inform user
                toast("Payment cancelled. You can try again.", { icon: "ℹ️" });
            } else {
                console.error("Payment error:", err);
                const errorMessage = err.response?.data?.message ||
                    err.response?.data?.error ||
                    "Payment failed";
                toast.error(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    // Render step indicator
    const renderStepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            {[
                { num: 1, label: "Shipment Details", icon: FaBox },
                { num: 2, label: "Select Company", icon: FaTruck },
                { num: 3, label: "Payment", icon: FaCreditCard },
            ].map((s, idx) => (
                <div key={s.num} className="flex items-center">
                    <div className={`flex flex-col items-center ${step >= s.num ? "text-primary-600" : "text-gray-400"}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${step > s.num ? "bg-primary-600 border-primary-600 text-white" :
                            step === s.num ? "border-primary-600 bg-primary-50" :
                                "border-gray-300 bg-gray-100"
                            }`}>
                            {step > s.num ? <FaCheck /> : <s.icon />}
                        </div>
                        <span className="text-xs mt-2 font-medium">{s.label}</span>
                    </div>
                    {idx < 2 && (
                        <div className={`w-16 h-0.5 mx-2 ${step > s.num ? "bg-primary-600" : "bg-gray-300"}`} />
                    )}
                </div>
            ))}
        </div>
    );

    // Step 1: Shipment Details Form
    const renderStep1 = () => (
        <div className="space-y-8">
            {/* Pickup Details */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 overflow-visible relative z-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-green-600" /> Pickup Details (Sender)
                </h3>

                <div className="space-y-4">
                    {/* Name and Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                <FaUser className="inline mr-1" /> Sender Name *
                            </label>
                            <input type="text" name="pickupName" className="input" value={formData.pickupName} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                <FaPhone className="inline mr-1" /> Phone *
                            </label>
                            <input type="tel" name="pickupPhone" className="input" value={formData.pickupPhone} onChange={handleChange} placeholder="9876543210" />
                        </div>
                    </div>

                    {/* Smart Address Input */}
                    <AddressInput
                        label="Pickup Address"
                        type="pickup"
                        required={true}
                        savedAddresses={savedAddresses}
                        placeholder="Search address, use location, or pick on map..."
                        value={{
                            addressLine: formData.pickupAddress,
                            city: formData.pickupCity,
                            state: formData.pickupState,
                            pincode: formData.pickupPincode,
                        }}
                        onChange={(addr) => {
                            setFormData(prev => ({
                                ...prev,
                                pickupAddress: addr.addressLine || "",
                                pickupCity: addr.city || "",
                                pickupState: addr.state || "",
                                pickupPincode: addr.pincode || "",
                                pickupLatitude: addr.lat || null,
                                pickupLongitude: addr.lng || null,
                                pickupName: addr.contactName || prev.pickupName,
                                pickupPhone: addr.contactPhone || prev.pickupPhone,
                            }));
                        }}
                    />
                </div>
            </div>

            {/* Delivery Details */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 overflow-visible relative z-40">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-red-600" /> Delivery Details (Receiver)
                </h3>

                <div className="space-y-4">
                    {/* Name and Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                <FaUser className="inline mr-1" /> Receiver Name *
                            </label>
                            <input type="text" name="deliveryName" className="input" value={formData.deliveryName} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                <FaPhone className="inline mr-1" /> Phone *
                            </label>
                            <input type="tel" name="deliveryPhone" className="input" value={formData.deliveryPhone} onChange={handleChange} placeholder="9876543210" />
                        </div>
                    </div>

                    {/* Smart Address Input */}
                    <AddressInput
                        label="Delivery Address"
                        type="delivery"
                        required={true}
                        savedAddresses={savedAddresses}
                        placeholder="Search address, use location, or pick on map..."
                        value={{
                            addressLine: formData.deliveryAddress,
                            city: formData.deliveryCity,
                            state: formData.deliveryState,
                            pincode: formData.deliveryPincode,
                        }}
                        onChange={(addr) => {
                            setFormData(prev => ({
                                ...prev,
                                deliveryAddress: addr.addressLine || "",
                                deliveryCity: addr.city || "",
                                deliveryState: addr.state || "",
                                deliveryPincode: addr.pincode || "",
                                deliveryLatitude: addr.lat || null,
                                deliveryLongitude: addr.lng || null,
                                deliveryName: addr.contactName || prev.deliveryName,
                                deliveryPhone: addr.contactPhone || prev.deliveryPhone,
                            }));
                        }}
                    />
                </div>
            </div>

            {/* Package Details */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaBox className="text-primary-600" /> Package Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Package Type</label>
                        <select
                            name="packageType"
                            className="input"
                            value={formData.packageType}
                            onChange={handleChange}
                        >
                            {PACKAGE_TYPES.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.icon} {type.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            <FaWeight className="inline mr-1" /> Weight (kg)
                        </label>
                        <input type="number" name="weightKg" className="input" value={formData.weightKg} onChange={handleChange} min="0.1" max="100" step="0.1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            <FaRuler className="inline mr-1" /> Dimensions (LxWxH cm)
                        </label>
                        <input type="text" name="dimensions" className="input" value={formData.dimensions} onChange={handleChange} placeholder="30x20x15" />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                        <input type="checkbox" name="isFragile" id="isFragile" checked={formData.isFragile} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-primary-600" />
                        <label htmlFor="isFragile" className="text-sm font-medium text-gray-700">⚠️ Fragile Item</label>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Special Instructions</label>
                        <textarea name="specialInstructions" className="input" rows={2} value={formData.specialInstructions} onChange={handleChange} placeholder="Any special handling instructions..." />
                    </div>
                </div>
            </div>
        </div>
    );

    // Step 2: Company Selection
    const renderStep2 = () => (
        <div className="space-y-6">
            {/* Route Info Card - Like Swiggy/Redbus */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-3 rounded-xl">
                            <FaRoute className="text-2xl" />
                        </div>
                        <div>
                            <p className="text-sm opacity-80">Route Details</p>
                            <h3 className="text-xl font-bold">{formData.pickupCity} → {formData.deliveryCity}</h3>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
                    <div className="text-center">
                        <FaMapMarkerAlt className="mx-auto text-2xl mb-1 opacity-80" />
                        <p className="text-2xl font-bold">{routeInfo.distanceKm}</p>
                        <p className="text-sm opacity-70">Kilometers</p>
                    </div>
                    <div className="text-center border-x border-white/20">
                        <FaClock className="mx-auto text-2xl mb-1 opacity-80" />
                        <p className="text-2xl font-bold">{routeInfo.etaDays}</p>
                        <p className="text-sm opacity-70">Days (Est.)</p>
                    </div>
                    <div className="text-center">
                        <FaWeight className="mx-auto text-2xl mb-1 opacity-80" />
                        <p className="text-2xl font-bold">{formData.weightKg}</p>
                        <p className="text-sm opacity-70">Kg Weight</p>
                    </div>
                </div>
            </div>

            {/* Toggle: Regular vs Group Buy */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }} className="rounded-xl p-4 shadow-md">
                <div className="flex gap-3">
                    <button
                        onClick={() => { setIsGroupBuy(false); setSelectedGroup(null); }}
                        style={!isGroupBuy ? {
                            background: 'linear-gradient(to right, #2563eb, #4f46e5)',
                            color: '#ffffff',
                            boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)'
                        } : {
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: '2px solid #e5e7eb'
                        }}
                        className="flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                        <FaTruck className="text-xl" /> Regular Shipping
                    </button>
                    <button
                        onClick={() => { setIsGroupBuy(true); setSelectedCompany(null); }}
                        style={isGroupBuy ? {
                            background: 'linear-gradient(to right, #16a34a, #059669)',
                            color: '#ffffff',
                            boxShadow: '0 4px 15px rgba(22, 163, 74, 0.4)'
                        } : {
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: '2px solid #e5e7eb'
                        }}
                        className="flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                        <FaUsers className="text-xl" />
                        <span>Group Buy</span>
                        <span style={{
                            backgroundColor: isGroupBuy ? 'rgba(255,255,255,0.25)' : '#dcfce7',
                            color: isGroupBuy ? 'white' : '#16a34a',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>
                            Save 20-40%
                        </span>
                    </button>
                </div>
            </div>

            {/* Regular Company Selection */}
            {!isGroupBuy && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">
                            Choose Courier Partner
                        </h3>
                        <p className="text-sm text-white/70">
                            {companies.length} companies found
                        </p>
                    </div>

                    {companies.length === 0 ? (
                        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }} className="rounded-2xl p-12 text-center shadow-md">
                            <FaTruck style={{ color: '#d1d5db' }} className="text-6xl mx-auto mb-4" />
                            <p style={{ color: '#374151' }} className="text-xl font-semibold">No companies available</p>
                            <p style={{ color: '#6b7280' }} className="mt-2">No courier partners serve this route yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {companies.map((company, index) => {
                                const isSelected = selectedCompany?.id === company.id;
                                const distancePrice = (company.baseRatePerKm || 10) * routeInfo.distanceKm;
                                const weightPrice = (company.baseRatePerKg || 40) * parseFloat(formData.weightKg);

                                return (
                                    <div
                                        key={company.companyId || company.id || index}
                                        onClick={() => setSelectedCompany(company)}
                                        className={`light-content rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg ${isSelected ? 'ring-4 ring-blue-200' : ''
                                            }`}
                                        style={{
                                            border: isSelected ? '3px solid #2563eb' : '2px solid #e5e7eb',
                                            boxShadow: isSelected ? '0 0 0 4px rgba(37, 99, 235, 0.15), 0 10px 25px -5px rgba(0, 0, 0, 0.1)' : '0 4px 15px -3px rgba(0, 0, 0, 0.1)'
                                        }}
                                    >
                                        {/* Header Row */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                {/* Company Logo/Icon */}
                                                <div style={{
                                                    background: index === 0 ? 'linear-gradient(to bottom right, #3b82f6, #1d4ed8)' :
                                                        index === 1 ? 'linear-gradient(to bottom right, #8b5cf6, #6d28d9)' :
                                                            'linear-gradient(to bottom right, #6b7280, #374151)',
                                                    color: '#ffffff'
                                                }} className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl">
                                                    {company.companyLogoUrl ? (
                                                        <img src={company.companyLogoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                                                    ) : (
                                                        company.companyName?.charAt(0) || "C"
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-bold text-dark">{company.companyName}</h4>
                                                    <div className="flex items-center gap-3 text-sm">
                                                        <span className="flex items-center gap-1 text-warning font-medium">
                                                            <FaStar /> {company.ratingAvg?.toFixed(1) || "New"}
                                                        </span>
                                                        <span className="text-muted">•</span>
                                                        <span className="text-muted">{company.totalDeliveries || 0} deliveries</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Price & Selection */}
                                            <div className="text-right">
                                                <p className="text-3xl font-bold text-primary">₹{company.estimatedPrice?.toFixed(0) || "TBD"}</p>
                                                <p className="text-sm text-muted">Est. {routeInfo.etaDays} days</p>
                                            </div>
                                        </div>

                                        {/* Pricing Breakdown */}
                                        <div className="rounded-xl p-4 mt-3" style={{ backgroundColor: '#f3f4f6' }}>
                                            <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-muted">Price Breakdown</p>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted">📏 Distance ({routeInfo.distanceKm} km)</span>
                                                    <span className="font-medium text-dark">₹{distancePrice.toFixed(0)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted">⚖️ Weight ({formData.weightKg} kg)</span>
                                                    <span className="font-medium text-dark">₹{weightPrice.toFixed(0)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Selection Indicator */}
                                        {isSelected && (
                                            <div className="flex items-center justify-center gap-2 mt-4 font-semibold text-primary">
                                                <FaCheckCircle className="text-lg" />
                                                <span>Selected</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Group Buy Selection */}
            {isGroupBuy && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                        <FaUsers className="text-green-400" /> Available Group Shipments
                    </h3>
                    {groups.length === 0 ? (
                        <div className="light-content rounded-2xl p-12 text-center shadow-md">
                            <FaUsers className="text-6xl mx-auto mb-4 text-muted" />
                            <p className="text-xl font-semibold text-dark">No groups available</p>
                            <p className="mt-2 text-muted">Try regular shipping instead.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {groups.map((group, index) => {
                                const isSelected = selectedGroup?.id === group.id;
                                return (
                                    <div
                                        key={group.id || index}
                                        onClick={() => setSelectedGroup(group)}
                                        className={`light-content rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg ${isSelected ? 'ring-4 ring-green-200' : ''
                                            }`}
                                        style={{
                                            border: isSelected ? '3px solid #16a34a' : '2px solid #e5e7eb',
                                            boxShadow: isSelected ? '0 0 0 4px rgba(22, 163, 74, 0.15), 0 10px 25px -5px rgba(0, 0, 0, 0.1)' : '0 4px 15px -3px rgba(0, 0, 0, 0.1)'
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <h4 className="text-lg font-bold text-dark">{group.companyName || "Company"}</h4>
                                                <p className="text-sm text-muted">{group.sourceCity} · {group.targetCity}</p>
                                            </div>
                                            <div style={{ backgroundColor: '#dcfce7', color: '#15803d' }} className="px-4 py-2 rounded-full font-bold text-lg">
                                                {group.discountPercentage}% OFF
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-sm mb-2">
                                            <span className="flex items-center gap-1 text-muted">
                                                <FaUsers className="text-primary" /> {group.currentMembers}/{group.targetMembers} members
                                            </span>
                                            {group.companyRating && (
                                                <span className="flex items-center gap-1 font-medium text-warning">
                                                    ⭐ {parseFloat(group.companyRating).toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between text-sm mb-3">
                                            <span className="text-muted">
                                                📅 Deadline: {new Date(group.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                            </span>
                                            <span className="font-medium text-danger">
                                                ⏰ Closes in {Math.ceil((new Date(group.deadline) - new Date()) / (1000 * 60 * 60))}h
                                            </span>
                                        </div>
                                        <div style={{ backgroundColor: '#e5e7eb' }} className="h-3 rounded-full overflow-hidden">
                                            <div
                                                style={{
                                                    background: 'linear-gradient(to right, #4ade80, #16a34a)',
                                                    width: `${(group.currentMembers / group.targetMembers) * 100}%`
                                                }}
                                                className="h-full transition-all"
                                            />
                                        </div>
                                        {isSelected && (
                                            <div className="flex items-center justify-center gap-2 mt-4 font-semibold text-success">
                                                <FaCheckCircle className="text-lg" />
                                                <span>Selected</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    // Step 3: Payment
    const renderStep3 = () => {
        // Calculate price breakdown from company rates
        // For group buy, use rates from the selected group's company
        const ratePerKm = isGroupBuy
            ? (selectedGroup?.baseRatePerKm || 10)
            : (selectedCompany?.baseRatePerKm || 10);
        const ratePerKg = isGroupBuy
            ? (selectedGroup?.baseRatePerKg || 50)
            : (selectedCompany?.baseRatePerKg || 50);

        const distancePrice = ratePerKm * routeInfo.distanceKm;
        const weightPrice = ratePerKg * parseFloat(formData.weightKg);
        const subtotal = distancePrice + weightPrice;
        const groupDiscount = isGroupBuy ? (subtotal * (selectedGroup?.discountPercentage || 0) / 100) : 0;
        const baseAfterDiscount = subtotal - groupDiscount;
        const gstAmount = baseAfterDiscount * 0.18; // 18% GST
        const finalTotal = baseAfterDiscount + gstAmount;

        return (
            <div className="space-y-6">
                {paymentComplete ? (
                    <div className="light-content rounded-2xl p-12 shadow-lg text-center" style={{ border: '2px solid #86efac' }}>
                        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg" style={{ background: 'linear-gradient(to right, #4ade80, #10b981)' }}>
                            <FaCheck className="text-5xl" style={{ color: '#ffffff' }} />
                        </div>
                        <h2 className="text-3xl font-bold text-dark mb-2">Payment Successful!</h2>
                        <p className="text-muted mb-8">Your shipment has been booked and confirmed.</p>

                        {/* Tracking Number */}
                        <div className="rounded-2xl p-6 mb-6 shadow-md" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <p className="text-sm text-muted mb-1">Tracking Number</p>
                            <p className="text-3xl font-mono font-bold text-primary">{createdParcel?.trackingNumber}</p>
                        </div>

                        {/* Receipt Card */}
                        <div className="rounded-2xl p-6 mb-6 shadow-md text-left" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
                            <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <span className="text-muted">Transaction ID</span>
                                <span className="font-mono text-sm text-dark">TXN{Date.now()}</span>
                            </div>
                            <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <span className="text-muted">Date & Time</span>
                                <span className="font-medium text-dark">{new Date().toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted">Amount Paid</span>
                                <span className="text-2xl font-bold text-success">₹{createdParcel?.finalPrice?.toFixed(2) || finalTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 justify-center">
                            <button
                                onClick={() => navigate(`/customer/track/${createdParcel?.trackingNumber}`)}
                                className="py-3 px-6 font-semibold rounded-xl shadow-md"
                                style={{ background: 'linear-gradient(to right, #2563eb, #4f46e5)', color: '#ffffff' }}
                            >
                                📍 Track Shipment
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        const token = localStorage.getItem('token');
                                        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/receipts/${createdParcel?.id}`, {
                                            headers: {
                                                'Authorization': `Bearer ${token}`
                                            }
                                        });
                                        if (!response.ok) throw new Error('Download failed');
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `Receipt_${createdParcel?.trackingNumber}.pdf`;
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        a.remove();
                                        toast.success("Receipt downloaded!");
                                    } catch (err) {
                                        toast.error("Failed to download receipt");
                                    }
                                }}
                                className="py-3 px-6 font-semibold rounded-xl"
                                style={{ backgroundColor: '#f3f4f6', color: '#374151', border: '2px solid #e5e7eb' }}
                            >
                                📥 Download Receipt
                            </button>
                        </div>

                        <p className="text-sm text-muted mt-6">
                            📧 A confirmation email and SMS has been sent to you.
                        </p>
                    </div>
                ) : (
                    <div className="light-content rounded-2xl p-8 shadow-lg">
                        <h3 className="text-2xl font-bold text-dark mb-6">Order Summary</h3>

                        {/* Route & Company Info */}
                        <div style={{ backgroundColor: '#eff6ff' }} className="rounded-xl p-5 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-sm text-muted">Route</p>
                                    <p className="text-lg font-bold text-dark">{formData.pickupCity} → {formData.deliveryCity}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted">Distance</p>
                                    <p className="text-lg font-bold text-dark">{routeInfo.distanceKm} km</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted">Courier Partner</p>
                                    <p className="font-semibold text-dark">{isGroupBuy ? selectedGroup?.companyName : selectedCompany?.companyName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted">Est. Delivery</p>
                                    <p className="font-semibold text-dark">{routeInfo.etaDays} days</p>
                                </div>
                            </div>
                        </div>

                        {/* Package Info */}
                        <div className="flex items-center gap-4 p-4 rounded-xl mb-6" style={{ backgroundColor: '#f3f4f6' }}>
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#dbeafe' }}>
                                <FaBox className="text-xl text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold text-dark">{formData.packageType}</p>
                                <p className="text-sm text-muted">{formData.weightKg} kg {formData.isFragile && "• Fragile"}</p>
                            </div>
                        </div>

                        {/* Price Breakdown */}
                        <div className="py-4 mb-4 space-y-3" style={{ borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Price Breakdown</p>
                            <div className="flex justify-between">
                                <span className="text-muted">📏 Distance Charge ({routeInfo.distanceKm} km × ₹{ratePerKm}/km)</span>
                                <span className="font-medium text-dark">₹{distancePrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">⚖️ Weight Charge ({formData.weightKg} kg × ₹{ratePerKg}/kg)</span>
                                <span className="font-medium text-dark">₹{weightPrice.toFixed(2)}</span>
                            </div>
                            {isGroupBuy && (
                                <div className="flex justify-between text-success">
                                    <span>🎉 Group Discount ({selectedGroup?.discountPercentage}%)</span>
                                    <span className="font-medium">-₹{groupDiscount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-muted">
                                <span>🧾 GST (18%)</span>
                                <span className="font-medium text-dark">₹{gstAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Total */}
                        <div className="flex justify-between items-center py-4">
                            <div>
                                <span className="text-xl font-bold text-dark">Total Payable</span>
                                <p className="text-xs text-muted">Including all taxes</p>
                            </div>
                            <span className="text-3xl font-bold text-primary">₹{finalTotal.toFixed(2)}</span>
                        </div>

                        {/* Pay Button */}
                        <button
                            onClick={handlePayment}
                            disabled={loading}
                            className="w-full mt-6 py-4 text-lg font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: 'linear-gradient(to right, #2563eb, #4f46e5)',
                                color: '#ffffff'
                            }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin">⏳</span> Processing Payment...
                                </span>
                            ) : (
                                <span>Pay ₹{finalTotal.toFixed(2)}</span>
                            )}
                        </button>

                        {/* Security Note */}
                        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted">
                            <FaShieldAlt className="text-success" />
                            <span>100% Secure Payment via Razorpay</span>
                        </div>

                        {/* Cancel Button - Order is not created yet */}
                        <div className="mt-6 pt-6" style={{ borderTop: '1px solid #e5e7eb' }}>
                            <p className="text-xs text-muted text-center mb-3">
                                Changed your mind? No order has been created yet.
                            </p>
                            <button
                                onClick={() => {
                                    if (window.confirm("Are you sure you want to cancel? No charges will be made.")) {
                                        navigate("/customer/dashboard");
                                    }
                                }}
                                disabled={loading}
                                className="w-full py-3 font-medium rounded-xl transition disabled:opacity-50"
                                style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}
                            >
                                Cancel & Go Back
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Create New Shipment</h1>
                    <p className="text-sm text-gray-500 mt-1">Book your parcel delivery in 3 easy steps</p>
                </div>
                {step > 1 && !paymentComplete && (
                    <button onClick={() => { setLoading(false); setStep(step - 1); }} className="btn-outline flex items-center gap-2">
                        <FaArrowLeft /> Back
                    </button>
                )}
            </div>

            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Step Content */}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {/* Navigation Buttons */}
            {!paymentComplete && (
                <div className="flex justify-end pt-6">
                    {step === 1 && (
                        <button onClick={handleStep1Next} disabled={loading} className="btn-primary flex items-center gap-2 px-8 py-3">
                            {loading ? "Loading..." : "Continue"} <FaArrowRight />
                        </button>
                    )}
                    {step === 2 && (
                        <button onClick={handleStep2Next} disabled={loading} className="btn-primary flex items-center gap-2 px-8 py-3">
                            {loading ? "Creating Shipment..." : "Proceed to Payment"} <FaArrowRight />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
