import { Outlet, Navigate } from "react-router-dom";
import { getUser } from "../utils/auth";
import AgentSidebar from "../components/dashboard/AgentSidebar";

export default function AgentShell() {
  const user = getUser();

  if (!user || user.userType !== "DELIVERY_AGENT") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="dark-theme flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950">
      <AgentSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
