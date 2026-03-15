import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'student' | 'center' | 'admin' | 'super_admin';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: AppRole[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading role...</p>
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard
    const dashboardMap: Record<AppRole, string> = {
      student: '/student',
      center: '/center',
      admin: '/admin',
      super_admin: '/super-admin',
    };
    return <Navigate to={dashboardMap[role] ?? '/'} replace />;
  }

  return <>{children}</>;
}
