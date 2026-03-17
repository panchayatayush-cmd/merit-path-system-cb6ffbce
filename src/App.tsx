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
import CenterPaymentPage from "./pages/center/CenterPaymentPage";
import CenterStudentsPage from "./pages/center/CenterStudentsPage";
import CenterEarningsPage from "./pages/center/CenterEarningsPage";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCentersPage from "./pages/admin/AdminCentersPage";

// Super Admin pages
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import ManageAdminsPage from "./pages/superadmin/ManageAdminsPage";
import SuperAdminPaymentsPage from "./pages/superadmin/SuperAdminPaymentsPage";
import SuperAdminWalletsPage from "./pages/superadmin/SuperAdminWalletsPage";
import SuperAdminWithdrawalsPage from "./pages/superadmin/SuperAdminWithdrawalsPage";
import SuperAdminGalleryPage from "./pages/superadmin/SuperAdminGalleryPage";
import SuperAdminSyllabusPage from "./pages/superadmin/SuperAdminSyllabusPage";
import SuperAdminAIExamPage from "./pages/superadmin/SuperAdminAIExamPage";
import SuperAdminExamSchedulerPage from "./pages/superadmin/SuperAdminExamSchedulerPage";
import SuperAdminNotificationsPage from "./pages/superadmin/SuperAdminNotificationsPage";
// Public pages
import Index from "./pages/Index";
import AboutUsPage from "./pages/AboutUsPage";
import PhotoGalleryPage from "./pages/PhotoGalleryPage";
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
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/gallery" element={<PhotoGalleryPage />} />
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
            <Route path="/center/payment" element={<RoleGuard allowedRoles={['center']}><CenterPaymentPage /></RoleGuard>} />
            <Route path="/center/profile" element={<RoleGuard allowedRoles={['center']}><CenterProfilePage /></RoleGuard>} />
            <Route path="/center/students" element={<RoleGuard allowedRoles={['center']}><CenterStudentsPage /></RoleGuard>} />
            <Route path="/center/earnings" element={<RoleGuard allowedRoles={['center']}><CenterEarningsPage /></RoleGuard>} />

            {/* Admin */}
            <Route path="/admin" element={<RoleGuard allowedRoles={['admin', 'super_admin']}><AdminDashboard /></RoleGuard>} />
            <Route path="/admin/centers" element={<RoleGuard allowedRoles={['admin', 'super_admin']}><AdminCentersPage /></RoleGuard>} />

            {/* Super Admin */}
            <Route path="/super-admin" element={<RoleGuard allowedRoles={['super_admin']}><SuperAdminDashboard /></RoleGuard>} />
            <Route path="/super-admin/admins" element={<RoleGuard allowedRoles={['super_admin']}><ManageAdminsPage /></RoleGuard>} />
            <Route path="/super-admin/payments" element={<RoleGuard allowedRoles={['super_admin']}><SuperAdminPaymentsPage /></RoleGuard>} />
            <Route path="/super-admin/wallets" element={<RoleGuard allowedRoles={['super_admin']}><SuperAdminWalletsPage /></RoleGuard>} />
            <Route path="/super-admin/withdrawals" element={<RoleGuard allowedRoles={['super_admin']}><SuperAdminWithdrawalsPage /></RoleGuard>} />
            <Route path="/super-admin/gallery" element={<RoleGuard allowedRoles={['super_admin']}><SuperAdminGalleryPage /></RoleGuard>} />
            <Route path="/super-admin/syllabus" element={<RoleGuard allowedRoles={['super_admin']}><SuperAdminSyllabusPage /></RoleGuard>} />
            <Route path="/super-admin/ai-exam" element={<RoleGuard allowedRoles={['super_admin']}><SuperAdminAIExamPage /></RoleGuard>} />
            <Route path="/super-admin/exam-scheduler" element={<RoleGuard allowedRoles={['super_admin']}><SuperAdminExamSchedulerPage /></RoleGuard>} />
            <Route path="/super-admin/notifications" element={<RoleGuard allowedRoles={['super_admin']}><SuperAdminNotificationsPage /></RoleGuard>} />
            <Route path="/super-admin/*" element={<RoleGuard allowedRoles={['super_admin']}><SuperAdminDashboard /></RoleGuard>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
