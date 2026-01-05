import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaHome, FaTruck, FaHistory, FaWallet, FaCog, FaBell,
  FaStar, FaSignOutAlt, FaUser, FaUsers
} from "react-icons/fa";
import { getUser, logout } from "../../utils/auth";
import { getCurrentAgent } from "../../services/agentService";
import LogoutConfirmModal from "../common/LogoutConfirmModal";

export default function AgentSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [agentData, setAgentData] = useState({ companyName: null });

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        const agent = await getCurrentAgent();
        setAgentData({
          companyName: agent?.companyName || null
        });
      } catch (error) {
        console.error("Failed to fetch agent data:", error);
      }
    };
    fetchAgentData();
  }, []);

  const menuItems = [
    { label: "Dashboard", icon: FaHome, path: "/agent/dashboard" },
    { label: "Active Deliveries", icon: FaTruck, path: "/agent/deliveries" },
    { label: "Group Orders", icon: FaUsers, path: "/agent/group-orders" },
    { label: "Delivery History", icon: FaHistory, path: "/agent/history" },
    { label: "Earnings", icon: FaWallet, path: "/agent/earnings" },
    { label: "Ratings", icon: FaStar, path: "/agent/ratings" },
    { label: "Notifications", icon: FaBell, path: "/agent/notifications" },
    { label: "Settings", icon: FaCog, path: "/agent/settings" },
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
              <span className="text-xs text-indigo-400 font-medium">Agent Portal</span>
            </div>
          </Link>
        </div>

        {/* User Profile */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            {(user?.profileImageUrl || user?.profilePhotoUrl) ? (
              <img
                src={user.profileImageUrl || user.profilePhotoUrl}
                alt={user?.fullName}
                className="h-12 w-12 rounded-full object-cover border-2 border-indigo-500"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold">
                {user?.fullName?.charAt(0) || "A"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.fullName}</p>
              <p className="text-xs text-indigo-400 font-medium">{agentData.companyName || "Delivery Agent"}</p>
            </div>
          </div>
          <Link
            to="/agent/profile"
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
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
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
        userName={user?.fullName}
      />
    </>
  );
}
