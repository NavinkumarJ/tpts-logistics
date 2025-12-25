import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    getCurrentCustomer,
    getAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} from "../../services/customerService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import AddressInput from "../../components/common/AddressInput";
import Pagination from "../../components/common/Pagination";
import {
    FaMapMarkerAlt, FaPlus, FaEdit, FaTrash, FaStar,
    FaHome, FaBuilding, FaTimes, FaCheck, FaSync, FaUser, FaPhone
} from "react-icons/fa";

const ADDRESS_TYPES = [
    { value: "HOME", label: "Home", icon: FaHome, emoji: "🏠" },
    { value: "OFFICE", label: "Office", icon: FaBuilding, emoji: "🏢" },
    { value: "OTHER", label: "Other", icon: FaMapMarkerAlt, emoji: "📍" },
];

const ITEMS_PER_PAGE = 6;

export default function AddressesPage() {
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [saving, setSaving] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [formData, setFormData] = useState({
        label: "",
        addressLine: "",
        city: "",
        state: "",
        pincode: "",
        contactName: "",
        contactPhone: "",
        addressType: "HOME",
        latitude: null,
        longitude: null,
        landmark: "",
    });

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const customerData = await getCurrentCustomer();
            setCustomer(customerData);

            const addressData = await getAddresses(customerData.id);
            setAddresses(addressData || []);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load addresses");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchData();
        setIsRefreshing(false);
        toast.success("Addresses refreshed");
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const openAddModal = () => {
        setEditingAddress(null);
        setFormData({
            label: "",
            addressLine: "",
            city: "",
            state: "",
            pincode: "",
            contactName: customer?.fullName || "",
            contactPhone: customer?.phone || "",
            addressType: "HOME",
            latitude: null,
            longitude: null,
            landmark: "",
        });
        setShowModal(true);
    };

    const openEditModal = (address) => {
        setEditingAddress(address);
        setFormData({
            label: address.label || "",
            addressLine: address.addressLine || "",
            city: address.city || "",
            state: address.state || "",
            pincode: address.pincode || "",
            contactName: address.contactName || "",
            contactPhone: address.contactPhone || "",
            addressType: address.addressType || "HOME",
            latitude: address.latitude || null,
            longitude: address.longitude || null,
            landmark: address.landmark || "",
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.addressLine.trim()) {
            toast.error("Address is required");
            return;
        }
        if (!formData.city.trim()) {
            toast.error("City is required");
            return;
        }
        if (!formData.state.trim()) {
            toast.error("State is required");
            return;
        }
        if (!/^[1-9][0-9]{5}$/.test(formData.pincode)) {
            toast.error("Please enter a valid 6-digit pincode");
            return;
        }
        if (!formData.contactName.trim()) {
            toast.error("Contact name is required");
            return;
        }
        if (!formData.contactPhone.trim() || !/^[6-9]\d{9}$/.test(formData.contactPhone)) {
            toast.error("Please enter a valid 10-digit phone number");
            return;
        }

        const requestData = {
            label: formData.label || formData.addressType,
            fullName: formData.contactName,
            phone: formData.contactPhone,
            addressLine1: formData.addressLine,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            latitude: formData.latitude,
            longitude: formData.longitude,
            landmark: formData.landmark,
        };

        setSaving(true);
        try {
            if (editingAddress) {
                await updateAddress(customer.id, editingAddress.id, requestData);
                toast.success("Address updated successfully");
            } else {
                await createAddress(customer.id, requestData);
                toast.success("Address added successfully");
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save address");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (addressId) => {
        if (!confirm("Are you sure you want to delete this address?")) return;

        try {
            await deleteAddress(customer.id, addressId);
            toast.success("Address deleted");
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete address");
        }
    };

    const handleSetDefault = async (addressId) => {
        try {
            await setDefaultAddress(customer.id, addressId);
            toast.success("Default address updated");
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to set default");
        }
    };

    const getAddressTypeConfig = (type) => {
        return ADDRESS_TYPES.find(t => t.value === type) || ADDRESS_TYPES[2];
    };

    // Pagination
    const totalPages = Math.ceil(addresses.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedAddresses = addresses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading addresses...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                            <FaMapMarkerAlt className="text-3xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Saved Addresses</h1>
                            <p className="text-white/80 mt-1">{addresses.length} addresses saved</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl flex items-center gap-2 font-medium transition"
                        >
                            <FaSync className={isRefreshing ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        <button
                            onClick={openAddModal}
                            className="px-4 py-2 bg-white text-emerald-600 hover:bg-white/90 rounded-xl flex items-center gap-2 font-medium transition"
                        >
                            <FaPlus /> Add Address
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                {ADDRESS_TYPES.map((type) => {
                    // Check addressType OR if label contains the type name (case-insensitive)
                    const count = addresses.filter(a =>
                        a.addressType?.toUpperCase() === type.value ||
                        a.label?.toUpperCase().includes(type.label.toUpperCase())
                    ).length;
                    return (
                        <div key={type.value} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                                    <span className="text-2xl">{type.emoji}</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                                    <p className="text-sm text-gray-500">{type.label}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Address List */}
            {addresses.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 shadow-md border border-gray-200 text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <FaMapMarkerAlt className="text-4xl text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Addresses Saved</h3>
                    <p className="text-gray-500 mb-6">Add your first address to make shipping faster</p>
                    <button onClick={openAddModal} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition shadow-md">
                        <FaPlus className="inline mr-2" /> Add Address
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2">
                        {paginatedAddresses.map((address) => {
                            const typeConfig = getAddressTypeConfig(address.addressType);
                            return (
                                <div
                                    key={address.id}
                                    className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition hover:shadow-md ${address.isDefault ? "border-emerald-500" : "border-gray-200"}`}
                                >
                                    {/* Card Header */}
                                    <div className={`px-5 py-3 flex items-center justify-between ${address.isDefault ? "bg-emerald-50" : "bg-gray-50"}`}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{typeConfig.emoji}</span>
                                            <span className="font-semibold text-gray-900">
                                                {address.label || typeConfig.label}
                                            </span>
                                            {address.isDefault && (
                                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                                                    <FaStar className="text-xs" /> Default
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditModal(address)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-primary-600 hover:border-primary-300 transition">
                                                <FaEdit className="text-sm" />
                                            </button>
                                            <button onClick={() => handleDelete(address.id)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-600 hover:border-red-300 transition">
                                                <FaTrash className="text-sm" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-5">
                                        <p className="text-gray-800 font-medium mb-1">{address.addressLine}</p>
                                        <p className="text-gray-600 text-sm">
                                            {address.city}, {address.state} - {address.pincode}
                                        </p>
                                        {address.landmark && (
                                            <p className="text-gray-500 text-xs mt-1">🏛️ {address.landmark}</p>
                                        )}

                                        {address.contactName && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-sm">
                                                <span className="flex items-center gap-1 text-gray-600">
                                                    <FaUser className="text-gray-400" /> {address.contactName}
                                                </span>
                                                <span className="flex items-center gap-1 text-gray-600">
                                                    <FaPhone className="text-gray-400" /> {address.contactPhone}
                                                </span>
                                            </div>
                                        )}

                                        {!address.isDefault && (
                                            <button
                                                onClick={() => handleSetDefault(address.id)}
                                                className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                                            >
                                                <FaStar /> Set as Default
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={addresses.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                        />
                    )}
                </>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 flex items-center justify-between text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    {editingAddress ? <FaEdit /> : <FaPlus />}
                                </div>
                                <h2 className="text-lg font-bold">
                                    {editingAddress ? "Edit Address" : "Add New Address"}
                                </h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Label</label>
                                    <input type="text" name="label" className="input" value={formData.label} onChange={handleChange} placeholder="Home, Office, etc." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                                    <select name="addressType" className="input" value={formData.addressType} onChange={handleChange}>
                                        {ADDRESS_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <AddressInput
                                label="Address"
                                type="pickup"
                                required={true}
                                placeholder="Search address, use location, or pick on map..."
                                value={{
                                    addressLine: formData.addressLine,
                                    city: formData.city,
                                    state: formData.state,
                                    pincode: formData.pincode,
                                    lat: formData.latitude,
                                    lng: formData.longitude,
                                }}
                                onChange={(addr) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        addressLine: addr.addressLine || "",
                                        city: addr.city || "",
                                        state: addr.state || "",
                                        pincode: addr.pincode || "",
                                        latitude: addr.lat || null,
                                        longitude: addr.lng || null,
                                    }));
                                }}
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Landmark</label>
                                <input
                                    type="text"
                                    name="landmark"
                                    className="input"
                                    value={formData.landmark}
                                    onChange={handleChange}
                                    placeholder="Near hospital, behind mall, etc."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Name *</label>
                                    <input type="text" name="contactName" className="input" value={formData.contactName} onChange={handleChange} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Phone *</label>
                                    <input type="tel" name="contactPhone" className="input" value={formData.contactPhone} onChange={handleChange} pattern="[6-9][0-9]{9}" required />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <FaCheck /> Save Address
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
