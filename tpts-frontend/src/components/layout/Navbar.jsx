import { Link, NavLink } from "react-router-dom";
import { isAuthenticated, getUser, logout } from "../../utils/auth";

const navLinkClasses =
  "text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-100 transition";

export default function Navbar() {
  const authenticated = isAuthenticated();
  const user = getUser();

  const getDashboardLink = () => {
    if (!user || !user.userType) return "/";
    
    const typeMap = {
      CUSTOMER: "/customer/dashboard",
      DELIVERY_AGENT: "/agent/dashboard",
      COMPANY_ADMIN: "/company/dashboard",
      SUPER_ADMIN: "/admin/dashboard",
    };
    
    return typeMap[user.userType] || "/";
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white font-bold">
              T
            </div>
            <span className="text-lg font-semibold tracking-tight">
              TPTS
            </span>
          </Link>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" className={navLinkClasses} end>
              Home
            </NavLink>
            <NavLink to="/track" className={navLinkClasses}>
              Track
            </NavLink>
            <NavLink to="/jobs" className={navLinkClasses}>
              <span className="flex items-center gap-1">
                Jobs
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  NEW
                </span>
              </span>
            </NavLink>
            <NavLink to="/about" className={navLinkClasses}>
              About
            </NavLink>
            <NavLink to="/contact" className={navLinkClasses}>
              Contact
            </NavLink>
          </nav>

          {/* Auth actions */}
          <div className="flex items-center gap-2">
            {authenticated ? (
              <>
                <Link
                  to={getDashboardLink()}
                  className="hidden sm:inline-flex text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  👤 {user?.fullName || user?.email || "Dashboard"}
                </Link>
                <button
                  onClick={logout}
                  className="btn-outline text-xs sm:text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex btn-outline text-xs sm:text-sm"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-xs sm:text-sm"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
