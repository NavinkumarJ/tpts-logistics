import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminProfile, updateAdminProfilePhoto } from "../../services/adminService";
import { logout, getUser, setUser } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaUser, FaEnvelope, FaCalendar, FaShieldAlt, FaCamera, FaSpinner } from "react-icons/fa";

export default function AdminProfilePage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [admin, setAdmin] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const data = await getAdminProfile();
            setAdmin(data);
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

    const handlePhotoUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await updateAdminProfilePhoto(formData);

            // Update admin state
            setAdmin(prev => ({ ...prev, profileImageUrl: response.profileImageUrl }));

            // Update user in localStorage so sidebar updates
            const currentUser = getUser();
            if (currentUser) {
                setUser({ ...currentUser, profileImageUrl: response.profileImageUrl });
            }

            toast.success("Profile photo updated successfully!");

            // Refresh page to update sidebar
            window.location.reload();
        } catch (err) {
            console.error("Failed to upload photo:", err);
            toast.error(err.response?.data?.message || "Failed to upload photo");
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                <p className="mt-3 text-sm text-white/60">Loading profile...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Admin Profile</h1>
                <p className="text-sm text-white/60 mt-1">Your administrative account</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
                <div className="relative px-6 pb-6">
                    <div className="absolute -top-12 left-6">
                        <div className="relative group">
                            {admin?.profileImageUrl ? (
                                <img
                                    src={admin.profileImageUrl}
                                    alt={admin?.fullName}
                                    className="w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-lg"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-4 border-white/20 shadow-lg">
                                    <FaShieldAlt className="text-4xl text-white" />
                                </div>
                            )}
                            {/* Photo Upload Overlay */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                {uploading ? (
                                    <FaSpinner className="text-2xl text-white animate-spin" />
                                ) : (
                                    <FaCamera className="text-2xl text-white" />
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                            />
                        </div>
                    </div>
                    <div className="pt-16">
                        <h2 className="text-2xl font-bold text-white">{admin?.fullName || "Super Admin"}</h2>
                        <p className="text-white/60 flex items-center gap-2 mt-1">
                            <FaShieldAlt className="text-sm text-indigo-400" /> Super Administrator
                        </p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {uploading ? (
                                <>
                                    <FaSpinner className="animate-spin" /> Uploading...
                                </>
                            ) : (
                                <>
                                    <FaCamera /> {admin?.profileImageUrl ? "Change Photo" : "Add Profile Photo"}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Account Details */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                            <FaUser className="text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-sm text-white/50">Full Name</p>
                            <p className="font-medium text-white">{admin?.fullName || "-"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                            <FaEnvelope className="text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-sm text-white/50">Email</p>
                            <p className="font-medium text-white">{admin?.email || "-"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                            <FaCalendar className="text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-sm text-white/50">Account Created</p>
                            <p className="font-medium text-white">
                                {admin?.createdAt ? new Date(admin.createdAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric"
                                }) : "-"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Notice */}
            <div className="bg-yellow-500/20 backdrop-blur-xl rounded-xl p-6 border border-yellow-500/30">
                <h3 className="text-lg font-semibold text-yellow-400 mb-2">Security Reminder</h3>
                <ul className="text-sm text-white/70 space-y-1">
                    <li>• All actions are logged and audited</li>
                    <li>• Session timeout: 30 minutes of inactivity</li>
                    <li>• Keep your credentials secure</li>
                </ul>
            </div>
        </div>
    );
}
