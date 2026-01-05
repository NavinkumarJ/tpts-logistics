import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  FaHome, FaBuilding, FaUsers, FaBox, FaChartBar,
  FaDollarSign, FaCog, FaBell, FaShieldAlt, FaSignOutAlt, FaUser, FaEnvelope
} from "react-icons/fa";
import { getUser, logout } from "../../utils/auth";
import { getPendingCompanies } from "../../services/adminService";
import LogoutConfirmModal from "../common/LogoutConfirmModal";

export default function SuperAdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const [pendingCount, setPendingCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    fetchPendingCount();
  }, []);

  const fetchPendingCount = async () => {
    try {
      const pending = await getPendingCompanies();
      setPendingCount(pending?.length || 0);
    } catch {
      // Silent fail
    }
  };

  const menuItems = [
    { label: "Dashboard", icon: FaHome, path: "/admin/dashboard" },
    { label: "Company Approvals", icon: FaBuilding, path: "/admin/companies", badge: pendingCount },
    { label: "All Users", icon: FaUsers, path: "/admin/users" },
    { label: "All Parcels", icon: FaBox, path: "/admin/parcels" },
    { label: "Messaging", icon: FaEnvelope, path: "/admin/messaging", highlight: true },
    { label: "Analytics", icon: FaChartBar, path: "/admin/analytics" },
    { label: "Revenue", icon: FaDollarSign, path: "/admin/revenue" },
    { label: "System Logs", icon: FaShieldAlt, path: "/admin/logs" },
    { label: "Notifications", icon: FaBell, path: "/admin/notifications" },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-800 to-slate-900 text-white shadow-2xl z-50 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-slate-700">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="TPTS Logo"
              className="h-12 w-auto object-contain transition-all duration-200 group-hover:brightness-125 group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white leading-tight">TPTS</span>
              <span className="text-xs text-indigo-400 font-medium">Admin Portal</span>
            </div>
          </Link>
        </div>

        {/* User Profile Section */}
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user?.fullName}
                className="h-12 w-12 rounded-full object-cover border-2 border-indigo-500 shadow-md"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold shadow-md">
                {user?.fullName?.charAt(0) || "P"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.fullName || "Platform Super Admin"}</p>
              <p className="text-xs text-slate-400 truncate">Super Admin</p>
            </div>
          </div>
          <Link
            to="/admin/profile"
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
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${isActive
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="text-base" />
                    {item.label}
                  </div>
                  {item.badge > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold animate-pulse">
                      {item.badge}
                    </span>
                  )}
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
        userName={user?.fullName}
      />
    </>
  );
}