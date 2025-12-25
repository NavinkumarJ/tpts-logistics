import { Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import CustomerShell from "./layouts/CustomerShell";

// Public pages
import LandingPage from "./pages/public/LandingPage";
import TrackPage from "./pages/public/TrackPage";
import JobsPage from "./pages/public/JobsPage";
import AboutPage from "./pages/public/AboutPage";
import ContactPage from "./pages/public/ContactPage";
import PrivacyPolicyPage from "./pages/public/PrivacyPolicyPage";
import TermsConditionsPage from "./pages/public/TermsConditionsPage";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import VerifyOtpPage from "./pages/auth/VerifyOtpPage";
import PendingApprovalPage from "./pages/auth/PendingApprovalPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// Customer pages
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerShipments from "./pages/customer/CustomerShipments";
import NewShipmentPage from "./pages/customer/NewShipmentPage";
import OrderHistoryPage from "./pages/customer/OrderHistoryPage";
import AddressesPage from "./pages/customer/AddressesPage";
import WalletPage from "./pages/customer/WalletPage";
import NotificationsPage from "./pages/customer/NotificationsPage";
import SettingsPage from "./pages/customer/SettingsPage";
import ProfilePage from "./pages/customer/ProfilePage";
import CustomerRatingPage from "./pages/customer/CustomerRatingPage";
import CustomerTrackingPage from "./pages/customer/CustomerTrackingPage";

//Agent Pages
import AgentShell from "./layouts/AgentShell";
import AgentDashboard from "./pages/agent/AgentDashboard";
import AgentDeliveriesPage from "./pages/agent/AgentDeliveriesPage";
import AgentHistoryPage from "./pages/agent/AgentHistoryPage";
import AgentEarningsPage from "./pages/agent/AgentEarningsPage";
import AgentRatingsPage from "./pages/agent/AgentRatingsPage";
import AgentProfilePage from "./pages/agent/AgentProfilePage";
import AgentSettingsPage from "./pages/agent/AgentSettingsPage";
import AgentNotificationsPage from "./pages/agent/AgentNotificationsPage";
import AgentDeliveryDetailPage from "./pages/agent/AgentDeliveryDetailPage";

//Company Pages
import CompanyShell from "./layouts/CompanyShell";
import CompanyDashboard from "./pages/company/CompanyDashboard";
import CompanyShipments from "./pages/company/CompanyShipments";
import CompanyParcelsPage from "./pages/company/CompanyParcelsPage";
import CompanyProfilePage from "./pages/company/CompanyProfilePage";
import CompanyRatingsPage from "./pages/company/CompanyRatingsPage";
import CreateGroupShipmentPage from "./pages/company/CreateGroupShipmentPage";
import AgentsPage from "./pages/company/AgentsPage";
import ApplicationsPage from "./pages/company/ApplicationsPage";
import AnalyticsPage from "./pages/company/AnalyticsPage";
import CompanyWalletPage from "./pages/company/CompanyWalletPage";
import CompanySettingsPage from "./pages/company/CompanySettingsPage";
import GroupDetailPage from "./pages/company/GroupDetailPage";
import CompanyParcelDetailPage from "./pages/company/CompanyParcelDetailPage";

//Admin Pages
import SuperAdminShell from "./layouts/SuperAdminShell";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import CompanyApprovals from "./pages/admin/CompanyApprovals";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminProfilePage from "./pages/admin/AdminProfilePage";
import AdminFlaggedRatingsPage from "./pages/admin/AdminFlaggedRatingsPage";
import AdminParcelsPage from "./pages/admin/AdminParcelsPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminRevenuePage from "./pages/admin/AdminRevenuePage";
import AdminLogsPage from "./pages/admin/AdminLogsPage";
import AdminNotificationsPage from "./pages/admin/AdminNotificationsPage";

function Placeholder({ title }) {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-semibold">{title} (Coming Soon)</h1>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public routes WITH navbar/footer */}
      <Route path="/" element={<><Navbar /><LandingPage /><Footer /></>} />
      <Route path="/track" element={<><Navbar /><TrackPage /><Footer /></>} />
      <Route path="/jobs" element={<><Navbar /><JobsPage /><Footer /></>} />
      <Route path="/about" element={<><Navbar /><AboutPage /><Footer /></>} />
      <Route path="/contact" element={<><Navbar /><ContactPage /><Footer /></>} />
      <Route path="/privacy-policy" element={<><Navbar /><PrivacyPolicyPage /><Footer /></>} />
      <Route path="/terms-conditions" element={<><Navbar /><TermsConditionsPage /><Footer /></>} />

      {/* Auth routes (no navbar/footer) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/pending-approval" element={<PendingApprovalPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Customer Dashboard Routes (with sidebar) */}
      <Route path="/customer" element={<CustomerShell />}>
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="shipments" element={<CustomerShipments />} />
        <Route path="new-shipment" element={<NewShipmentPage />} />
        <Route path="history" element={<OrderHistoryPage />} />
        <Route path="addresses" element={<AddressesPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="rate/:parcelId" element={<CustomerRatingPage />} />
        <Route path="track/:trackingNumber" element={<CustomerTrackingPage />} />
      </Route>

      <Route path="/agent" element={<AgentShell />}>
        <Route path="dashboard" element={<AgentDashboard />} />
        <Route path="deliveries" element={<AgentDeliveriesPage />} />
        <Route path="deliveries/:parcelId" element={<AgentDeliveryDetailPage />} />
        <Route path="requests" element={<AgentDeliveriesPage />} />
        <Route path="history" element={<AgentHistoryPage />} />
        <Route path="earnings" element={<AgentEarningsPage />} />
        <Route path="ratings" element={<AgentRatingsPage />} />
        <Route path="notifications" element={<AgentNotificationsPage />} />
        <Route path="settings" element={<AgentSettingsPage />} />
        <Route path="profile" element={<AgentProfilePage />} />
      </Route>

      <Route path="/company" element={<CompanyShell />}>
        <Route path="dashboard" element={<CompanyDashboard />} />
        <Route path="shipments" element={<CompanyShipments />} />
        <Route path="shipments/:groupId" element={<GroupDetailPage />} />
        <Route path="groups" element={<CompanyShipments />} />
        <Route path="parcels" element={<CompanyParcelsPage />} />
        <Route path="parcels/:parcelId" element={<CompanyParcelDetailPage />} />
        <Route path="create-shipment" element={<CreateGroupShipmentPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="job-applications" element={<ApplicationsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="wallet" element={<CompanyWalletPage />} />
        <Route path="settings" element={<CompanySettingsPage />} />
        <Route path="profile" element={<CompanyProfilePage />} />
        <Route path="ratings" element={<CompanyRatingsPage />} />
      </Route>

      <Route path="/admin" element={<SuperAdminShell />}>
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="companies" element={<CompanyApprovals />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="parcels" element={<AdminParcelsPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        <Route path="revenue" element={<AdminRevenuePage />} />
        <Route path="moderation" element={<AdminFlaggedRatingsPage />} />
        <Route path="logs" element={<AdminLogsPage />} />
        <Route path="notifications" element={<AdminNotificationsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="profile" element={<AdminProfilePage />} />
      </Route>
    </Routes>
  );
}