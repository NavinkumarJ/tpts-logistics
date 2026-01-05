import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
    FaHome, FaBox, FaUsers, FaLayerGroup, FaUserPlus,
    FaChartLine, FaCog, FaSignOutAlt, FaUser, FaStar, FaEnvelope
} from "react-icons/fa";
import { getUser, logout } from "../../utils/auth";
import { getCurrentCompany } from "../../services/companyService";
import LogoutConfirmModal from "../common/LogoutConfirmModal";

export default function CompanySidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = getUser();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [companyData, setCompanyData] = useState({
        logo: null,
        name: user?.companyName || "Company",
        adminName: user?.fullName || "Admin"
    });

    useEffect(() => {
        fetchCompanyData();
    }, []);

    const fetchCompanyData = async () => {
        try {
            const company = await getCurrentCompany();
            setCompanyData({
                logo: company?.companyLogoUrl || null,
                name: company?.companyName || user?.companyName || "Company",
                adminName: company?.contactPersonName || user?.fullName || "Admin"
            });
        } catch {
            // Silent fail - use user data
        }
    };

    const menuItems = [
        { label: "Dashboard", icon: FaHome, path: "/company/dashboard" },
        { label: "Parcels", icon: FaBox, path: "/company/parcels" },
        { label: "Agents", icon: FaUsers, path: "/company/agents" },
        { label: "Group Shipments", icon: FaLayerGroup, path: "/company/groups" },
        { label: "Job Applications", icon: FaUserPlus, path: "/company/applications" },
        { label: "Message Agents", icon: FaEnvelope, path: "/company/messaging", highlight: true },
        { label: "Ratings", icon: FaStar, path: "/company/ratings" },
        { label: "Analytics", icon: FaChartLine, path: "/company/analytics" },
        { label: "Settings", icon: FaCog, path: "/company/settings" },
    ];

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <>
            <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-800 to-slate-900 text-white shadow-2xl z-50 flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-slate-700">
                    <Link to="/" className="flex items-center gap-3 group">
                        <img
                            src="/logo.png"
                            alt="TPTS Logo"
                            className="h-12 w-auto object-contain transition-all duration-200 group-hover:brightness-125 group-hover:scale-105"
                        />
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-white leading-tight">TPTS</span>
                            <span className="text-xs text-indigo-400 font-medium">Company Portal</span>
                        </div>
                    </Link>
                </div>

                {/* Company Profile */}
                <div className="p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3 mb-3">
                        {companyData.logo ? (
                            <img
                                src={companyData.logo}
                                alt={companyData.name}
                                className="h-12 w-12 rounded-full object-cover border-2 border-primary-500"
                            />
                        ) : (
                            <div className="h-12 w-12 rounded-full bg-primary-600 flex items-center justify-center text-lg font-bold">
                                {companyData.name?.charAt(0) || "C"}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{companyData.name}</p>
                            <p className="text-xs text-slate-400 truncate">{companyData.adminName}</p>
                        </div>
                    </div>
                    <Link
                        to="/company/profile"
                        className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium transition"
                    >
                        <FaUser className="text-xs" />
                        View Profile
                    </Link>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    <div className="space-y-1">
                        {menuItems.map((item, idx) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={idx}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${isActive
                                        ? "bg-indigo-600 text-white shadow-lg"
                                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                                        }`}
                                >
                                    <item.icon className="text-base" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-slate-700">
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition"
                    >
                        <FaSignOutAlt />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Logout Confirmation Modal */}
            <LogoutConfirmModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogout}
                userName={companyData.adminName}
            />
        </>
    );
}
