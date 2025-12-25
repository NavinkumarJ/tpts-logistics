import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentAgent, updateAgentProfile, uploadProfileImage, removeProfileImage } from "../../services/agentService";
import { logout, setUser, getUser } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaTruck, FaStar, FaSave,
    FaBuilding, FaCamera, FaTrash, FaIdCard, FaMotorcycle, FaCheckCircle,
    FaTimesCircle, FaCalendarAlt, FaShippingFast, FaEdit
} from "react-icons/fa";

const getVehicleIcon = (type) => {
    const icons = {
        BIKE: FaMotorcycle,
        SCOOTER: FaMotorcycle,
        CAR: FaTruck,
        VAN: FaTruck,
    };
    return icons[type] || FaTruck;
};

const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

export default function AgentProfilePage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [agent, setAgent] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        city: "",
        pincode: "",
        vehicleType: "",
        vehicleNumber: "",
    });

    useEffect(() => {
        fetchProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const data = await getCurrentAgent();
            setAgent(data);
            setFormData({
                fullName: data.fullName || "",
                phone: data.phone || "",
                city: data.city || "",
                pincode: data.pincode || "",
                vehicleType: data.vehicleType || "",
                vehicleNumber: data.vehicleNumber || "",
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateAgentProfile(formData);
            toast.success("Profile updated successfully");
            setIsEditing(false);
            fetchProfile();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

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
            const imageUrl = await uploadProfileImage(agent.id, file);
            const updatedAgent = { ...agent, profilePhotoUrl: imageUrl };
            setAgent(updatedAgent);

            const currentUser = getUser();
            setUser({ ...currentUser, profilePhotoUrl: imageUrl, profileImageUrl: imageUrl });

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
            await removeProfileImage(agent.id);
            const updatedAgent = { ...agent, profilePhotoUrl: null };
            setAgent(updatedAgent);

            const currentUser = getUser();
            setUser({ ...currentUser, profilePhotoUrl: null, profileImageUrl: null });

            toast.success("Profile image removed");
        } catch {
            toast.error("Failed to remove image");
        }
    };

    const VehicleIcon = agent?.vehicleType ? getVehicleIcon(agent.vehicleType) : FaTruck;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Profile Header Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Cover */}
                <div className="h-40 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 relative">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/30 to-transparent"></div>

                    {/* Profile Photo */}
                    <div className="absolute -bottom-16 left-8">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-2xl border-4 border-white bg-gray-200 overflow-hidden shadow-xl">
                                {agent?.profilePhotoUrl ? (
                                    <img
                                        src={agent.profilePhotoUrl}
                                        alt={agent.fullName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 text-white text-4xl font-bold">
                                        {agent?.fullName?.charAt(0) || "A"}
                                    </div>
                                )}
                            </div>
                            <label className="absolute -bottom-1 -right-1 w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center cursor-pointer hover:bg-orange-700 transition shadow-lg">
                                {uploadingImage ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <FaCamera />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={uploadingImage}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Remove Image */}
                    {agent?.profilePhotoUrl && (
                        <button
                            onClick={handleRemoveImage}
                            className="absolute bottom-4 right-4 text-white/80 hover:text-white text-sm flex items-center gap-1 bg-black/20 px-3 py-1.5 rounded-lg hover:bg-black/30 transition"
                        >
                            <FaTrash className="text-xs" /> Remove Photo
                        </button>
                    )}
                </div>

                {/* Profile Info */}
                <div className="pt-20 pb-6 px-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{agent?.fullName}</h1>
                            <p className="text-gray-500 flex items-center gap-2 mt-1">
                                <FaEnvelope className="text-gray-400" /> {agent?.email}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-3">
                                {agent?.city && (
                                    <span className="flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                        <FaMapMarkerAlt className="text-orange-500" /> {agent.city}
                                    </span>
                                )}
                                {agent?.vehicleType && (
                                    <span className="flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                        <VehicleIcon className="text-blue-500" /> {agent.vehicleType?.replace(/_/g, ' ')}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Rating Badge */}
                            <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-2 rounded-xl shadow-md">
                                <FaStar className="text-white" />
                                <span className="font-bold text-lg">{agent?.ratingAvg?.toFixed(1) || "5.0"}</span>
                                <span className="text-white/80 text-sm">({agent?.totalRatings || 0})</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Deliveries", value: agent?.totalDeliveries || 0, icon: FaShippingFast, color: "text-orange-600", bg: "bg-orange-100", gradient: "from-orange-500 to-orange-600" },
                    { label: "Account Status", value: agent?.isActive ? "Active" : "Inactive", icon: agent?.isActive ? FaCheckCircle : FaTimesCircle, color: agent?.isActive ? "text-green-600" : "text-red-600", bg: agent?.isActive ? "bg-green-100" : "bg-red-100" },
                    { label: "Availability", value: agent?.isAvailable ? "Online" : "Offline", icon: agent?.isAvailable ? FaCheckCircle : FaTimesCircle, color: agent?.isAvailable ? "text-green-600" : "text-gray-500", bg: agent?.isAvailable ? "bg-green-100" : "bg-gray-100" },
                    { label: "Member Since", value: formatDate(agent?.createdAt).split(' ').slice(1, 3).join(' '), icon: FaCalendarAlt, color: "text-indigo-600", bg: "bg-indigo-100" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                <stat.icon className={`text-xl ${stat.color}`} />
                            </div>
                            <div>
                                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                                <p className="text-xs text-gray-500">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Account Info */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FaUser className="text-orange-500" /> Account Details
                    </h3>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition ${isEditing
                                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                : "bg-orange-100 text-orange-600 hover:bg-orange-200"
                            }`}
                    >
                        <FaEdit /> {isEditing ? "Cancel" : "Edit Profile"}
                    </button>
                </div>

                <div className="p-6">
                    {!isEditing ? (
                        /* View Mode */
                        <div className="grid md:grid-cols-2 gap-6">
                            {[
                                { label: "Full Name", value: agent?.fullName, icon: FaUser, color: "text-orange-500", bg: "bg-orange-50" },
                                { label: "Phone", value: agent?.phone, icon: FaPhone, color: "text-blue-500", bg: "bg-blue-50" },
                                { label: "Email", value: agent?.email, icon: FaEnvelope, color: "text-purple-500", bg: "bg-purple-50" },
                                { label: "City", value: agent?.city, icon: FaMapMarkerAlt, color: "text-green-500", bg: "bg-green-50" },
                                { label: "Vehicle Type", value: agent?.vehicleType?.replace(/_/g, ' '), icon: FaTruck, color: "text-indigo-500", bg: "bg-indigo-50" },
                                { label: "Vehicle Number", value: agent?.vehicleNumber, icon: FaIdCard, color: "text-teal-500", bg: "bg-teal-50" },
                                { label: "License Number", value: agent?.licenseNumber, icon: FaIdCard, color: "text-amber-500", bg: "bg-amber-50" },
                                { label: "Company", value: agent?.companyName, icon: FaBuilding, color: "text-rose-500", bg: "bg-rose-50" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                                        <item.icon className={item.color} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
                                        <p className="font-medium text-gray-900">{item.value || "Not provided"}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Edit Mode */
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                    <div className="relative">
                                        <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            placeholder="Your full name"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                    <div className="relative">
                                        <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            placeholder="+91 XXXXXXXXXX"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                                    <div className="relative">
                                        <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            placeholder="City"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                                    <input
                                        type="text"
                                        value={formData.pincode}
                                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="6-digit pincode"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
                                    <div className="relative">
                                        <FaTruck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <select
                                            value={formData.vehicleType}
                                            onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                                        >
                                            <option value="">Select vehicle</option>
                                            <option value="BIKE">Bike</option>
                                            <option value="SCOOTER">Scooter</option>
                                            <option value="CAR">Car</option>
                                            <option value="VAN">Van</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number</label>
                                    <input
                                        type="text"
                                        value={formData.vehicleNumber}
                                        onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="KA01AB1234"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <FaSave /> Save Changes
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-3 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
