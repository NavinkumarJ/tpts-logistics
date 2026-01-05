import { Outlet, Navigate } from "react-router-dom";
import { getUser } from "../utils/auth";
import SuperAdminSidebar from "../components/dashboard/SuperAdminSidebar";

export default function SuperAdminShell() {
  const user = getUser();

  if (!user || user.userType !== "SUPER_ADMIN") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="dark-theme flex min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-900">
      <SuperAdminSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
