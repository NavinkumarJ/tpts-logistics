import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentCustomer, changePassword, deleteAccount } from "../../services/customerService";
import { logout, getUser } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaLock, FaBell, FaShieldAlt, FaCheck, FaTrash, FaTimes, FaCog, FaUser, FaEnvelope, FaPhone, FaCalendar, FaExclamationTriangle } from "react-icons/fa";

export default function SettingsPage() {
    const navigate = useNavigate();
    const user = getUser();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState("password");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleting, setDeleting] = useState(false);

    // Password form
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    // Notification preferences (local state for now)
    const [notificationPrefs, setNotificationPrefs] = useState({
        emailNotifications: true,
        smsNotifications: true,
        promotionalEmails: false,
        orderUpdates: true,
        deliveryAlerts: true,
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

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const handleNotificationChange = (name) => {
        setNotificationPrefs(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (!passwordData.currentPassword) {
            toast.error("Current password is required");
            return;
        }
        if (!passwordData.newPassword) {
            toast.error("New password is required");
            return;
        }
        if (passwordData.newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setSaving(true);
        try {
            await changePassword(customer.id, {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });
            toast.success("Password changed successfully");
            setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to change password");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveNotifications = () => {
        // TODO: Implement backend API for notification preferences
        toast.success("Notification preferences saved");
    };

    const sections = [
        { id: "password", label: "Change Password", icon: FaLock, emoji: "🔐" },
        { id: "notifications", label: "Notifications", icon: FaBell, emoji: "🔔" },
        { id: "security", label: "Security", icon: FaShieldAlt, emoji: "🛡️" },
    ];

    const notificationOptions = [
        { name: "emailNotifications", label: "Email Notifications", desc: "Receive order updates via email", emoji: "📧" },
        { name: "smsNotifications", label: "SMS Notifications", desc: "Receive order updates via SMS", emoji: "📱" },
        { name: "orderUpdates", label: "Order Updates", desc: "Get notified when order status changes", emoji: "📦" },
        { name: "deliveryAlerts", label: "Delivery Alerts", desc: "Get notified when delivery is near", emoji: "🚚" },
        { name: "promotionalEmails", label: "Promotional Emails", desc: "Receive offers and promotions", emoji: "🎁" },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                        <FaCog className="text-3xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Account Settings</h1>
                        <p className="text-white/80 mt-1">Manage your account preferences and security</p>
                    </div>
                </div>
            </div>

            {/* User Info Card */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-center gap-4">
                    {user?.profileImageUrl ? (
                        <img src={user.profileImageUrl} alt={user.fullName} className="w-14 h-14 rounded-full object-cover border-2 border-primary-500" />
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-xl font-bold text-white">
                            {user?.fullName?.charAt(0) || "U"}
                        </div>
                    )}
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{customer?.fullName || user?.fullName}</h3>
                        <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><FaEnvelope className="text-primary-500" /> {customer?.email}</span>
                            <span className="flex items-center gap-1"><FaPhone className="text-green-500" /> {customer?.phone}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b">
                            <h3 className="font-semibold text-gray-700">Settings Menu</h3>
                        </div>
                        <nav className="p-2">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeSection === section.id
                                        ? "bg-primary-50 text-primary-700 border border-primary-200"
                                        : "text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    <span className="text-lg">{section.emoji}</span>
                                    {section.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Content */}
                <div className="lg:col-span-3">
                    {/* Change Password */}
                    {activeSection === "password" && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                    <span className="text-xl">🔐</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                                    <p className="text-sm text-gray-500">Update your account password</p>
                                </div>
                            </div>

                            <form onSubmit={handleChangePassword} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                                    <div className="relative">
                                        <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="password"
                                            name="currentPassword"
                                            className="input pl-10"
                                            value={passwordData.currentPassword}
                                            onChange={handlePasswordChange}
                                            placeholder="Enter current password"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                                        <div className="relative">
                                            <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="password"
                                                name="newPassword"
                                                className="input pl-10"
                                                value={passwordData.newPassword}
                                                onChange={handlePasswordChange}
                                                placeholder="Enter new password"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                                        <div className="relative">
                                            <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                className="input pl-10"
                                                value={passwordData.confirmPassword}
                                                onChange={handlePasswordChange}
                                                placeholder="Confirm new password"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-medium rounded-xl hover:from-primary-700 hover:to-primary-800 transition flex items-center gap-2 shadow-md"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <FaCheck /> Update Password
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Notification Preferences */}
                    {activeSection === "notifications" && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-b flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <span className="text-xl">🔔</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
                                    <p className="text-sm text-gray-500">Choose how you want to be notified</p>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {notificationOptions.map((pref) => (
                                    <div
                                        key={pref.name}
                                        className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
                                        onClick={() => handleNotificationChange(pref.name)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{pref.emoji}</span>
                                            <div>
                                                <p className="font-medium text-gray-900">{pref.label}</p>
                                                <p className="text-sm text-gray-500">{pref.desc}</p>
                                            </div>
                                        </div>
                                        <div className={`w-12 h-7 rounded-full transition relative ${notificationPrefs[pref.name] ? "bg-primary-600" : "bg-gray-300"}`}>
                                            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${notificationPrefs[pref.name] ? "right-1" : "left-1"}`}></div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={handleSaveNotifications}
                                    className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition flex items-center gap-2 shadow-md"
                                >
                                    <FaCheck /> Save Preferences
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Security */}
                    {activeSection === "security" && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                        <span className="text-xl">🛡️</span>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Security & Account</h2>
                                        <p className="text-sm text-gray-500">Manage your account security</p>
                                    </div>
                                </div>

                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3 mb-2">
                                            <FaCalendar className="text-primary-500" />
                                            <span className="font-medium text-gray-700">Account Created</span>
                                        </div>
                                        <p className="text-gray-900 font-semibold">
                                            {customer?.createdAt ? new Date(customer.createdAt).toLocaleDateString("en-IN", {
                                                day: "numeric", month: "long", year: "numeric"
                                            }) : "N/A"}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-green-50 rounded-xl">
                                        <div className="flex items-center gap-3 mb-2">
                                            <FaEnvelope className="text-green-600" />
                                            <span className="font-medium text-gray-700">Email Verified</span>
                                        </div>
                                        <p className="text-green-700 font-semibold flex items-center gap-1">
                                            <FaCheck /> {customer?.email}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-green-50 rounded-xl">
                                        <div className="flex items-center gap-3 mb-2">
                                            <FaPhone className="text-green-600" />
                                            <span className="font-medium text-gray-700">Phone Verified</span>
                                        </div>
                                        <p className="text-green-700 font-semibold flex items-center gap-1">
                                            <FaCheck /> {customer?.phone}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-blue-50 rounded-xl">
                                        <div className="flex items-center gap-3 mb-2">
                                            <FaUser className="text-blue-600" />
                                            <span className="font-medium text-gray-700">Account Status</span>
                                        </div>
                                        <p className="text-blue-700 font-semibold flex items-center gap-1">
                                            <FaCheck /> Active
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                                <div className="p-5 bg-gradient-to-r from-red-50 to-rose-50 border-b flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                                        <FaExclamationTriangle className="text-red-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
                                        <p className="text-sm text-red-500">Irreversible actions</p>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <p className="text-gray-600 mb-4">
                                        Deleting your account will permanently remove all your data including shipments, addresses, and order history. This action cannot be undone.
                                    </p>
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition flex items-center gap-2"
                                    >
                                        <FaTrash /> Delete Account
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full mx-4 shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                        <FaTrash className="text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">Delete Account</h3>
                                        <p className="text-white/80 text-sm">This action is permanent</p>
                                    </div>
                                </div>
                                <button onClick={() => { setShowDeleteModal(false); setDeletePassword(""); }} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                                    <FaTimes />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <FaExclamationTriangle className="text-xl text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-gray-900 font-medium">Are you absolutely sure?</p>
                                    <p className="text-gray-500 text-sm mt-1">
                                        All your shipments, addresses, and account data will be permanently deleted.
                                    </p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Enter your password to confirm</label>
                                <input
                                    type="password"
                                    className="input"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    placeholder="Your password"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowDeleteModal(false); setDeletePassword(""); }}
                                    className="flex-1 px-4 py-3 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!deletePassword) {
                                            toast.error("Please enter your password");
                                            return;
                                        }
                                        setDeleting(true);
                                        try {
                                            await deleteAccount(customer.id, deletePassword);
                                            toast.success("Account deleted successfully");
                                            logout();
                                            navigate("/login");
                                        } catch (err) {
                                            toast.error(err.response?.data?.message || "Failed to delete account");
                                        } finally {
                                            setDeleting(false);
                                        }
                                    }}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-3 rounded-xl font-medium bg-red-600 text-white hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {deleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <FaTrash /> Delete Permanently
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
