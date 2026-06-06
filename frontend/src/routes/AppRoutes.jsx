import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../utils/constants";

// Layouts
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";

// Guards
import ProtectedRoute from "../components/common/ProtectedRoute";
import RoleBasedRoute from "../components/common/RoleBasedRoute";

// Pages
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import Dashboard from "../pages/Dashboard";
import Profile from "../pages/Profile";
import AdminDashboard from "../pages/admin/AdminDashboard";
import NotFound from "../pages/NotFound";

// ERP Pages
import VendorList from "../pages/vendors/VendorList";
import VendorDetails from "../pages/vendors/VendorDetails";
import RFQList from "../pages/rfqs/RFQList";
import RFQDetails from "../pages/rfqs/RFQDetails";
import QuotationList from "../pages/quotations/QuotationList";
import ApprovalList from "../pages/approvals/ApprovalList";
import POList from "../pages/purchase-orders/POList";
import PODetails from "../pages/purchase-orders/PODetails";
import InvoiceList from "../pages/invoices/InvoiceList";
import InvoiceDetails from "../pages/invoices/InvoiceDetails";
import Reports from "../pages/reports/Reports";
import ActivityLogs from "../pages/activity-logs/ActivityLogs";

export default function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes — Auth layout */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
        />
        <Route
          path="/forgot-password"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />}
        />
        <Route
          path="/reset-password"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ResetPassword />}
        />
      </Route>

      {/* Protected routes — Dashboard layout */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />

        {/* Vendors */}
        <Route
          path="/vendors"
          element={
            <RoleBasedRoute allowedRoles={[ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER, ROLES.MANAGER]}>
              <VendorList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/vendors/:id"
          element={
            <RoleBasedRoute allowedRoles={[ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER, ROLES.MANAGER]}>
              <VendorDetails />
            </RoleBasedRoute>
          }
        />

        {/* RFQs */}
        <Route path="/rfqs" element={<RFQList />} />
        <Route path="/rfqs/:id" element={<RFQDetails />} />

        {/* Quotations */}
        <Route path="/quotations" element={<QuotationList />} />

        {/* Approvals */}
        <Route
          path="/approvals"
          element={
            <RoleBasedRoute allowedRoles={[ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER, ROLES.MANAGER]}>
              <ApprovalList />
            </RoleBasedRoute>
          }
        />

        {/* Purchase Orders */}
        <Route path="/purchase-orders" element={<POList />} />
        <Route path="/purchase-orders/:id" element={<PODetails />} />

        {/* Invoices */}
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/:id" element={<InvoiceDetails />} />

        {/* Reports & Analytics */}
        <Route
          path="/reports"
          element={
            <RoleBasedRoute allowedRoles={[ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER, ROLES.MANAGER]}>
              <Reports />
            </RoleBasedRoute>
          }
        />

        {/* Activity Logs */}
        <Route
          path="/activity-logs"
          element={
            <RoleBasedRoute allowedRoles={[ROLES.ADMIN]}>
              <ActivityLogs />
            </RoleBasedRoute>
          }
        />

        {/* Admin only routes */}
        <Route
          path="/admin/users"
          element={
            <RoleBasedRoute allowedRoles={[ROLES.ADMIN]}>
              <AdminDashboard />
            </RoleBasedRoute>
          }
        />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
