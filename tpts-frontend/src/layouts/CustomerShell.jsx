import { Outlet, Navigate } from "react-router-dom";
import { getUser } from "../utils/auth";
import Sidebar from "../components/dashboard/Sidebar";

export default function CustomerShell() {
  const user = getUser();
  
  if (!user || user.userType !== "CUSTOMER") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
