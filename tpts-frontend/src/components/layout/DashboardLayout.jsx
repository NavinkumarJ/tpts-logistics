import { Navigate } from "react-router-dom";
import { getUser, getUserType } from "../../utils/auth";

export default function DashboardLayout({ children, allowedRole }) {
  const user = getUser();
  const userType = getUserType();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && userType !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  // Just render children, no navbar/footer
  return <>{children}</>;
}
