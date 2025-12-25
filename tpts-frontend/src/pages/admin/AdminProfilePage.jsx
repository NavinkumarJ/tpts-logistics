import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminProfile } from "../../services/adminService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaUser, FaEnvelope, FaCalendar, FaShieldAlt } from "react-icons/fa";

export default function AdminProfilePage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [admin, setAdmin] = useState(null);

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

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading profile...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Profile</h1>
                <p className="text-sm text-gray-500 mt-1">Your administrative account</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-slate-700 to-slate-900"></div>
                <div className="relative px-6 pb-6">
                    <div className="absolute -top-12 left-6">
                        <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center border-4 border-white">
                            <FaShieldAlt className="text-4xl text-slate-700" />
                        </div>
                    </div>
                    <div className="pt-16">
                        <h2 className="text-2xl font-bold text-gray-900">{admin?.fullName || "Super Admin"}</h2>
                        <p className="text-slate-600 flex items-center gap-2 mt-1">
                            <FaShieldAlt className="text-sm" /> Super Administrator
                        </p>
                    </div>
                </div>
            </div>

            {/* Account Details */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <FaUser className="text-slate-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Full Name</p>
                            <p className="font-medium text-gray-900">{admin?.fullName || "-"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <FaEnvelope className="text-slate-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium text-gray-900">{admin?.email || "-"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <FaCalendar className="text-slate-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Account Created</p>
                            <p className="font-medium text-gray-900">
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
            <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                <h3 className="text-lg font-semibold text-amber-800 mb-2">Security Reminder</h3>
                <ul className="text-sm text-amber-700 space-y-1">
                    <li>• All actions are logged and audited</li>
                    <li>• Session timeout: 30 minutes of inactivity</li>
                    <li>• Keep your credentials secure</li>
                </ul>
            </div>
        </div>
    );
}
