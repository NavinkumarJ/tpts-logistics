import { Outlet, Navigate } from "react-router-dom";
import { getUser } from "../utils/auth";
import AgentSidebar from "../components/dashboard/AgentSidebar";

export default function AgentShell() {
  const user = getUser();
  
  if (!user || user.userType !== "DELIVERY_AGENT") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AgentSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
