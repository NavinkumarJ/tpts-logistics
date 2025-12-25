import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentCustomer, updateCustomer, uploadProfileImage, removeProfileImage } from "../../services/customerService";
import { logout, setUser } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaEdit, FaCamera, FaTrash, FaSave, FaTimes, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendar, FaBox, FaCheckCircle, FaClock, FaHome } from "react-icons/fa";

export default function ProfilePage() {
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [formData, setFormData] = useState({
        fullName: "",
        city: "",
        pincode: "",
    });

    useEffect(() => {
        fetchCustomer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchCustomer = async () => {
        setLoading(true);
        try {
            const data = await getCurrentCustomer();
            setCustomer(data);
            setFormData({
                fullName: data.fullName || "",
                city: data.city || "",
                pincode: data.pincode || "",
            });
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load profile");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!formData.fullName.trim()) {
            toast.error("Name is required");
            return;
        }

        setSaving(true);
        try {
            const updated = await updateCustomer(customer.id, formData);
            setCustomer(updated);

            // Update local storage
            setUser({ ...updated, userType: "CUSTOMER" });

            toast.success("Profile updated successfully");
            setEditing(false);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        setUploadingImage(true);
        try {
            const imageUrl = await uploadProfileImage(customer.id, file);
            const updatedCustomer = { ...customer, profileImageUrl: imageUrl };
            setCustomer(updatedCustomer);
            // Update localStorage so sidebar shows the new image
            setUser({ ...updatedCustomer, userType: "CUSTOMER" });
            toast.success("Profile image updated");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to upload image");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleRemoveImage = async () => {
        if (!confirm("Remove profile picture?")) return;

        try {
            await removeProfileImage(customer.id);
            const updatedCustomer = { ...customer, profileImageUrl: null };
            setCustomer(updatedCustomer);
            // Update localStorage so sidebar reflects the change
            setUser({ ...updatedCustomer, userType: "CUSTOMER" });
            toast.success("Profile image removed");
        } catch {
            toast.error("Failed to remove image");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your personal information</p>
                </div>
                {!editing && (
                    <button onClick={() => setEditing(true)} className="btn-outline flex items-center gap-2">
                        <FaEdit /> Edit Profile
                    </button>
                )}
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Cover & Avatar */}
                <div className="h-36 bg-gradient-to-r from-primary-600 to-indigo-600 relative">
                    <div className="absolute -bottom-16 left-8">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-xl">
                                {customer.profileImageUrl ? (
                                    <img src={customer.profileImageUrl} alt={customer.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 text-white text-5xl font-bold">
                                        {customer.fullName?.charAt(0) || "U"}
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-1 right-1 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-700 transition shadow-lg border-2 border-white">
                                {uploadingImage ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <FaCamera />
                                )}
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                            </label>
                        </div>
                    </div>
                    {customer.profileImageUrl && (
                        <button
                            onClick={handleRemoveImage}
                            className="absolute bottom-4 right-4 text-white/80 hover:text-white text-sm flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20 transition"
                        >
                            <FaTrash className="text-xs" /> Remove
                        </button>
                    )}
                </div>

                {/* Profile Info */}
                <div className="pt-20 pb-8 px-8">
                    {editing ? (
                        <div className="space-y-5 max-w-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    className="input"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        className="input"
                                        value={formData.city}
                                        onChange={handleChange}
                                        placeholder="Enter your city"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                                    <input
                                        type="text"
                                        name="pincode"
                                        className="input"
                                        value={formData.pincode}
                                        onChange={handleChange}
                                        placeholder="6-digit pincode"
                                        maxLength={6}
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <p className="text-xs text-gray-500 mb-2">These fields cannot be changed:</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Email</label>
                                        <p className="text-sm font-medium text-gray-900">{customer.email}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Phone</label>
                                        <p className="text-sm font-medium text-gray-900">{customer.phone}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setEditing(false);
                                        setFormData({
                                            fullName: customer.fullName || "",
                                            city: customer.city || "",
                                            pincode: customer.pincode || "",
                                        });
                                    }}
                                    className="btn-outline flex items-center gap-2"
                                >
                                    <FaTimes /> Cancel
                                </button>
                                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <><FaSave /> Save Changes</>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{customer.fullName}</h2>
                                <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                                    <FaCalendar className="text-gray-400" />
                                    Customer since {formatDate(customer.createdAt)}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <FaEnvelope className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Email</p>
                                        <p className="font-medium text-gray-900">{customer.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                        <FaPhone className="text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Phone</p>
                                        <p className="font-medium text-gray-900">{customer.phone}</p>
                                    </div>
                                </div>

                                {customer.city && (
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                            <FaMapMarkerAlt className="text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">City</p>
                                            <p className="font-medium text-gray-900">{customer.city}</p>
                                        </div>
                                    </div>
                                )}

                                {customer.pincode && (
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                            <FaHome className="text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Pincode</p>
                                            <p className="font-medium text-gray-900">{customer.pincode}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200 text-center hover:shadow-lg transition">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <FaBox className="text-xl text-gray-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{customer.totalOrders || 0}</p>
                    <p className="text-sm text-gray-500">Total Orders</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200 text-center hover:shadow-lg transition">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-3">
                        <FaCheckCircle className="text-xl text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{customer.completedOrders || 0}</p>
                    <p className="text-sm text-gray-500">Completed</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200 text-center hover:shadow-lg transition">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mx-auto mb-3">
                        <FaClock className="text-xl text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{customer.activeOrders || 0}</p>
                    <p className="text-sm text-gray-500">Active</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200 text-center hover:shadow-lg transition">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mx-auto mb-3">
                        <FaMapMarkerAlt className="text-xl text-primary-600" />
                    </div>
                    <p className="text-2xl font-bold text-primary-600">{customer.savedAddressesCount || 0}</p>
                    <p className="text-sm text-gray-500">Saved Addresses</p>
                </div>
            </div>
        </div>
    );
}
