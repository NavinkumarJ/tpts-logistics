import { Outlet, Navigate } from "react-router-dom";
import { getUser } from "../utils/auth";
import CompanySidebar from "../components/dashboard/CompanySidebar";

export default function CompanyShell() {
  const user = getUser();

  if (!user || user.userType !== "COMPANY_ADMIN") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <CompanySidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
