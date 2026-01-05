import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentAgent, updateAvailability, changePassword } from "../../services/agentService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaCog, FaBell, FaLock, FaToggleOn, FaToggleOff, FaSave, FaUser, FaStar,
    FaTruck, FaMotorcycle, FaBicycle, FaMapMarkerAlt, FaPhone, FaEnvelope,
    FaIdCard, FaBuilding, FaCheckCircle, FaTimesCircle, FaShippingFast,
    FaCalendarAlt
} from "react-icons/fa";

const getVehicleIcon = (vehicleType) => {
    switch (vehicleType) {
        case "BIKE":
            return <FaMotorcycle className="text-xl" />;
        case "BICYCLE":
            return <FaBicycle className="text-xl" />;
        case "TRUCK":
        case "MINI_TRUCK":
            return <FaTruck className="text-xl" />;
        default:
            return <FaTruck className="text-xl" />;
    }
};

const formatVehicleType = (type) => {
    if (!type) return "Not specified";
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

export default function AgentSettingsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [agent, setAgent] = useState(null);
    const [isAvailable, setIsAvailable] = useState(false);
    const [passwords, setPasswords] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [notificationPrefs, setNotificationPrefs] = useState({
        push: true,
        sms: true,
        email: true,
    });

    useEffect(() => {
        fetchSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const data = await getCurrentAgent();
            setAgent(data);
            setIsAvailable(data.isAvailable || false);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load settings");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAvailability = async () => {
        setSaving(true);
        try {
            await updateAvailability(!isAvailable);
            setIsAvailable(!isAvailable);
            toast.success(isAvailable ? "You are now offline" : "You are now online");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update availability");
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (passwords.newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        if (!passwords.currentPassword) {
            toast.error("Please enter your current password");
            return;
        }

        setChangingPassword(true);
        try {
            await changePassword(passwords.currentPassword, passwords.newPassword);
            toast.success("Password changed successfully");
            setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to change password");
        } finally {
            setChangingPassword(false);
        }
    };

    const handleNotificationToggle = (key) => {
        setNotificationPrefs((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
        toast.success("Notification preference updated");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                    <p className="mt-4 text-white/70 font-medium">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Profile Photo */}
                    <div className="relative">
                        {agent?.profilePhotoUrl ? (
                            <img
                                src={agent.profilePhotoUrl}
                                alt={agent.fullName}
                                className="w-28 h-28 rounded-full object-cover border-4 border-indigo-500/30 shadow-lg"
                            />
                        ) : (
                            <div className="w-28 h-28 rounded-full bg-indigo-500/20 flex items-center justify-center border-4 border-indigo-500/30 shadow-lg">
                                <FaUser className="text-4xl text-indigo-400" />
                            </div>
                        )}
                        {/* Online Status Indicator */}
                        <div
                            className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-3 border-white flex items-center justify-center ${isAvailable ? "bg-green-500" : "bg-gray-400"
                                }`}
                        >
                            {isAvailable ? (
                                <FaCheckCircle className="text-white text-xs" />
                            ) : (
                                <FaTimesCircle className="text-white text-xs" />
                            )}
                        </div>
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-2xl font-bold text-white">{agent?.fullName || "Agent"}</h1>
                        <p className="text-white/70 mt-1 flex items-center justify-center md:justify-start gap-2">
                            {getVehicleIcon(agent?.vehicleType)}
                            {formatVehicleType(agent?.vehicleType)}
                        </p>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3">
                            {agent?.city && (
                                <span className="flex items-center gap-1 text-sm text-white/70">
                                    <FaMapMarkerAlt className="text-indigo-400" /> {agent.city}
                                </span>
                            )}
                            <span className="flex items-center gap-1 text-sm text-white/70">
                                <FaStar className="text-yellow-400" />
                                {agent?.ratingAvg?.toFixed(1) || "N/A"}
                                <span className="text-white/50">({agent?.totalRatings || 0} reviews)</span>
                            </span>
                            <span className="flex items-center gap-1 text-sm text-white/70">
                                <FaShippingFast className="text-green-400" /> {agent?.totalDeliveries || 0} deliveries
                            </span>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex gap-4 md:gap-6">
                        <div className="text-center bg-indigo-500/20 rounded-xl px-4 py-3 border border-indigo-500/30">
                            <div className="text-3xl font-bold text-indigo-400">{agent?.currentOrdersCount || 0}</div>
                            <div className="text-xs text-white/50 uppercase tracking-wide">Active</div>
                        </div>
                        <div className="text-center bg-green-500/20 rounded-xl px-4 py-3 border border-green-500/30">
                            <div className="text-3xl font-bold text-green-400">{agent?.totalDeliveries || 0}</div>
                            <div className="text-xs text-white/50 uppercase tracking-wide">Total</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Availability Toggle */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${isAvailable
                                ? "bg-green-500/30 text-green-400"
                                : "bg-white/10 text-white/50"
                                }`}
                        >
                            {isAvailable ? (
                                <FaToggleOn className="text-2xl" />
                            ) : (
                                <FaToggleOff className="text-2xl" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-lg">Availability Status</h3>
                            <p className="text-sm text-white/60">
                                {isAvailable
                                    ? "You are currently online and can receive deliveries"
                                    : "You are offline and won't receive new deliveries"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleAvailability}
                        disabled={saving || !agent?.isActive}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all ${isAvailable
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                            : "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                Updating...
                            </span>
                        ) : isAvailable ? (
                            "Go Offline"
                        ) : (
                            "Go Online"
                        )}
                    </button>
                </div>
                {!agent?.isActive && (
                    <div className="mt-4 p-4 bg-red-500/20 rounded-xl border border-red-500/30">
                        <p className="text-sm text-red-400 flex items-center gap-2">
                            <FaTimesCircle />
                            Your account is currently inactive. Contact your company admin to activate it.
                        </p>
                    </div>
                )}
            </div>

            {/* Account Information */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden">
                <div className="bg-white/5 px-6 py-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FaCog className="text-indigo-400" /> Account Information
                    </h3>
                </div>
                <div className="p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Email */}
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                                <FaEnvelope />
                            </div>
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wide">Email</p>
                                <p className="font-medium text-white break-all">{agent?.email || "N/A"}</p>
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                                <FaPhone />
                            </div>
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wide">Phone</p>
                                <p className="font-medium text-white">{agent?.phone || "N/A"}</p>
                            </div>
                        </div>

                        {/* Company */}
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                                <FaBuilding />
                            </div>
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wide">Company</p>
                                <p className="font-medium text-white">{agent?.companyName || "N/A"}</p>
                            </div>
                        </div>

                        {/* Account Status */}
                        <div className="flex items-start gap-3">
                            <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${agent?.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                    }`}
                            >
                                {agent?.isActive ? <FaCheckCircle /> : <FaTimesCircle />}
                            </div>
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wide">Account Status</p>
                                <p className={`font-medium ${agent?.isActive ? "text-green-400" : "text-red-400"}`}>
                                    {agent?.isActive ? "Active" : "Inactive"}
                                </p>
                            </div>
                        </div>

                        {/* License Number */}
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                                <FaIdCard />
                            </div>
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wide">License Number</p>
                                <p className="font-medium text-white">{agent?.licenseNumber || "N/A"}</p>
                            </div>
                        </div>

                        {/* Vehicle Number */}
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400 flex-shrink-0">
                                {getVehicleIcon(agent?.vehicleType)}
                            </div>
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wide">Vehicle Number</p>
                                <p className="font-medium text-white">{agent?.vehicleNumber || "N/A"}</p>
                            </div>
                        </div>

                        {/* Member Since */}
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                                <FaCalendarAlt />
                            </div>
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wide">Member Since</p>
                                <p className="font-medium text-white">{formatDate(agent?.createdAt)}</p>
                            </div>
                        </div>

                        {/* Service Area */}
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
                                <FaMapMarkerAlt />
                            </div>
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wide">Service Area</p>
                                <p className="font-medium text-white">
                                    {agent?.servicePincodes?.length > 0
                                        ? agent.servicePincodes.slice(0, 3).join(", ") +
                                        (agent.servicePincodes.length > 3
                                            ? ` +${agent.servicePincodes.length - 3} more`
                                            : "")
                                        : "All areas"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden">
                <div className="bg-white/5 px-6 py-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FaLock className="text-indigo-400" /> Change Password
                    </h3>
                </div>
                <div className="p-6">
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={passwords.currentPassword}
                                    onChange={(e) =>
                                        setPasswords({ ...passwords, currentPassword: e.target.value })
                                    }
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    placeholder="Current password"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={passwords.newPassword}
                                    onChange={(e) =>
                                        setPasswords({ ...passwords, newPassword: e.target.value })
                                    }
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    placeholder="New password"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={passwords.confirmPassword}
                                    onChange={(e) =>
                                        setPasswords({ ...passwords, confirmPassword: e.target.value })
                                    }
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    placeholder="Confirm password"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={changingPassword}
                            className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {changingPassword ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <FaSave /> Update Password
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden">
                <div className="bg-white/5 px-6 py-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FaBell className="text-indigo-400" /> Notification Preferences
                    </h3>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {[
                            {
                                id: "push",
                                label: "Push Notifications",
                                desc: "Receive instant alerts for new delivery assignments",
                                icon: "📱",
                            },
                            {
                                id: "sms",
                                label: "SMS Notifications",
                                desc: "Get text messages for urgent updates",
                                icon: "💬",
                            },
                            {
                                id: "email",
                                label: "Email Updates",
                                desc: "Weekly earnings summary and performance reports",
                                icon: "📧",
                            },
                        ].map((pref) => (
                            <div
                                key={pref.id}
                                className="flex items-center justify-between py-4 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/10"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl">{pref.icon}</span>
                                    <div>
                                        <p className="font-semibold text-white">{pref.label}</p>
                                        <p className="text-sm text-white/60">{pref.desc}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleNotificationToggle(pref.id)}
                                    className={`relative w-14 h-8 rounded-full transition-colors ${notificationPrefs[pref.id] ? "bg-indigo-500" : "bg-white/20"
                                        }`}
                                >
                                    <div
                                        className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${notificationPrefs[pref.id] ? "left-7" : "left-1"
                                            }`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
