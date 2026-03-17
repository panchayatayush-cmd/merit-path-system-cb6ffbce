import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import {
  LayoutDashboard,
  User,
  CreditCard,
  FileText,
  Award,
  BookOpen,
  Users,
  Settings,
  LogOut,
  Wallet,
  Building2,
  BarChart3,
  Shield,
  ArrowDownToLine,
  Sparkles,
  Calendar,
  Bell,
  MessageCircle,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const studentNav: NavItem[] = [
  { label: 'Dashboard', href: '/student', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Profile', href: '/student/profile', icon: <User className="h-4 w-4" /> },
  { label: 'Payment', href: '/student/payment', icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Exam', href: '/student/exam', icon: <BookOpen className="h-4 w-4" /> },
  { label: 'Results', href: '/student/results', icon: <FileText className="h-4 w-4" /> },
  { label: 'Certificate', href: '/student/certificate', icon: <Award className="h-4 w-4" /> },
  { label: 'Wallet', href: '/student/wallet', icon: <Wallet className="h-4 w-4" /> },
];

const centerNav: NavItem[] = [
  { label: 'Dashboard', href: '/center', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Payment', href: '/center/payment', icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Profile', href: '/center/profile', icon: <User className="h-4 w-4" /> },
  { label: 'Students', href: '/center/students', icon: <Users className="h-4 w-4" /> },
  { label: 'Earnings', href: '/center/earnings', icon: <Wallet className="h-4 w-4" /> },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Centers', href: '/admin/centers', icon: <Building2 className="h-4 w-4" /> },
];

const superAdminNav: NavItem[] = [
  { label: 'Dashboard', href: '/super-admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Users', href: '/super-admin/users', icon: <Users className="h-4 w-4" /> },
  { label: 'Admins', href: '/super-admin/admins', icon: <Shield className="h-4 w-4" /> },
  { label: 'Syllabus', href: '/super-admin/syllabus', icon: <BookOpen className="h-4 w-4" /> },
  { label: 'AI Exam', href: '/super-admin/ai-exam', icon: <Sparkles className="h-4 w-4" /> },
  { label: 'Scheduler', href: '/super-admin/exam-scheduler', icon: <Calendar className="h-4 w-4" /> },
  { label: 'Notifications', href: '/super-admin/notifications', icon: <Bell className="h-4 w-4" /> },
  { label: 'Payments', href: '/super-admin/payments', icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Wallets', href: '/super-admin/wallets', icon: <Wallet className="h-4 w-4" /> },
  { label: 'Withdrawals', href: '/super-admin/withdrawals', icon: <ArrowDownToLine className="h-4 w-4" /> },
  { label: 'Gallery', href: '/super-admin/gallery', icon: <FileText className="h-4 w-4" /> },
  { label: 'Fund', href: '/super-admin/fund', icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Settings', href: '/super-admin/settings', icon: <Settings className="h-4 w-4" /> },
];

const navMap: Record<string, NavItem[]> = {
  student: studentNav,
  center: centerNav,
  admin: adminNav,
  super_admin: superAdminNav,
};

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { role, user, signOut } = useAuth();
  const location = useLocation();
  const navItems = navMap[role ?? 'student'] ?? studentNav;

  const roleLabel: Record<string, string> = {
    student: 'Student',
    center: 'Center',
    admin: 'Admin',
    super_admin: 'Super Admin',
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-60 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-sidebar-foreground">Scholarship Exam</h2>
            <p className="text-xs text-sidebar-foreground/60 mt-0.5">{roleLabel[role ?? ''] ?? ''}</p>
          </div>
          <NotificationBell />
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-sidebar-border">
          <div className="px-3 py-1.5 text-xs text-sidebar-foreground/50 truncate">
            {user?.email ?? ''}
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-150"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Scholarship Exam</h2>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground">
              Sign Out
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 lg:p-6 max-w-[1280px] w-full mx-auto">
          {children}
        </div>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-50">
          {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-all ${
                  isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
