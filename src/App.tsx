import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleGuard } from "@/components/RoleGuard";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentProfilePage from "./pages/student/StudentProfilePage";
import StudentPaymentPage from "./pages/student/StudentPaymentPage";
import ExamPage from "./pages/student/ExamPage";
import StudentResultsPage from "./pages/student/StudentResultsPage";
import StudentCertificatePage from "./pages/student/StudentCertificatePage";
import StudentWalletPage from "./pages/student/StudentWalletPage";

// Center pages
import CenterDashboard from "./pages/center/CenterDashboard";
import CenterProfilePage from "./pages/center/CenterProfilePage";
import CenterStudentsPage from "./pages/center/CenterStudentsPage";
import CenterEarningsPage from "./pages/center/CenterEarningsPage";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminQuestionsPage from "./pages/admin/AdminQuestionsPage";
import AdminStudentsPage from "./pages/admin/AdminStudentsPage";
import AdminCentersPage from "./pages/admin/AdminCentersPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminResultsPage from "./pages/admin/AdminResultsPage";

// Super Admin pages
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";

// Public pages
import Index from "./pages/Index";
import CertificateVerifyPage from "./pages/CertificateVerifyPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify/:certId" element={<CertificateVerifyPage />} />
            <Route path="/verify" element={<CertificateVerifyPage />} />

            {/* Student */}
            <Route path="/student" element={<RoleGuard allowedRoles={['student']}><StudentDashboard /></RoleGuard>} />
            <Route path="/student/profile" element={<RoleGuard allowedRoles={['student']}><StudentProfilePage /></RoleGuard>} />
            <Route path="/student/payment" element={<RoleGuard allowedRoles={['student']}><StudentPaymentPage /></RoleGuard>} />
            <Route path="/student/exam" element={<RoleGuard allowedRoles={['student']}><ExamPage /></RoleGuard>} />
            <Route path="/student/results" element={<RoleGuard allowedRoles={['student']}><StudentResultsPage /></RoleGuard>} />
            <Route path="/student/certificate" element={<RoleGuard allowedRoles={['student']}><StudentCertificatePage /></RoleGuard>} />
            <Route path="/student/wallet" element={<RoleGuard allowedRoles={['student']}><StudentWalletPage /></RoleGuard>} />

            {/* Center */}
            <Route path="/center" element={<RoleGuard allowedRoles={['center']}><CenterDashboard /></RoleGuard>} />
            <Route path="/center/profile" element={<RoleGuard allowedRoles={['center']}><CenterProfilePage /></RoleGuard>} />
            <Route path="/center/students" element={<RoleGuard allowedRoles={['center']}><CenterStudentsPage /></RoleGuard>} />
            <Route path="/center/earnings" element={<RoleGuard allowedRoles={['center']}><CenterEarningsPage /></RoleGuard>} />

            {/* Admin */}
            <Route path="/admin" element={<RoleGuard allowedRoles={['admin', 'super_admin']}><AdminDashboard /></RoleGuard>} />
            <Route path="/admin/questions" element={<RoleGuard allowedRoles={['admin', 'super_admin']}><AdminQuestionsPage /></RoleGuard>} />
            <Route path="/admin/students" element={<RoleGuard allowedRoles={['admin', 'super_admin']}><AdminStudentsPage /></RoleGuard>} />
            <Route path="/admin/centers" element={<RoleGuard allowedRoles={['admin', 'super_admin']}><AdminCentersPage /></RoleGuard>} />
            <Route path="/admin/payments" element={<RoleGuard allowedRoles={['admin', 'super_admin']}><AdminPaymentsPage /></RoleGuard>} />
            <Route path="/admin/results" element={<RoleGuard allowedRoles={['admin', 'super_admin']}><AdminResultsPage /></RoleGuard>} />

            {/* Super Admin */}
            <Route path="/super-admin" element={<RoleGuard allowedRoles={['super_admin']}><SuperAdminDashboard /></RoleGuard>} />
            <Route path="/super-admin/*" element={<RoleGuard allowedRoles={['super_admin']}><SuperAdminDashboard /></RoleGuard>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
