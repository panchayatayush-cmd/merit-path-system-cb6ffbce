import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, Building2, CreditCard, BarChart3, Wallet, Trophy, Shield } from 'lucide-react';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    admins: 0, students: 0, centers: 0, payments: 0, totalRevenue: 0, fundBalance: 0,
  });

  useEffect(() => {
    const load = async () => {
      const [admins, students, centers, payments, fund] = await Promise.all([
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('centers').select('id', { count: 'exact', head: true }),
        supabase.from('payment_orders').select('amount').eq('status', 'verified'),
        supabase.from('scholarship_fund').select('amount'),
      ]);

      const totalRevenue = (payments.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
      const fundBalance = (fund.data ?? []).reduce((sum, f) => sum + Number(f.amount), 0);

      setStats({
        admins: admins.count ?? 0,
        students: students.count ?? 0,
        centers: centers.count ?? 0,
        payments: (payments.data ?? []).length,
        totalRevenue,
        fundBalance,
      });
    };
    load();
  }, []);

  const cards = [
    { label: 'Total Admins', value: stats.admins.toLocaleString(), icon: <Shield className="h-4 w-4" /> },
    { label: 'Total Centers', value: stats.centers.toLocaleString(), icon: <Building2 className="h-4 w-4" /> },
    { label: 'Total Students', value: stats.students.toLocaleString(), icon: <Users className="h-4 w-4" /> },
    { label: 'Total Payments', value: stats.payments.toLocaleString(), icon: <CreditCard className="h-4 w-4" /> },
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toFixed(2)}`, icon: <BarChart3 className="h-4 w-4" /> },
    { label: 'Scholarship Fund', value: `₹${stats.fundBalance.toFixed(2)}`, icon: <Wallet className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">Super Admin Dashboard</h1>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="card-shadow rounded-lg bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                {c.icon}
                <span className="text-xs font-medium uppercase tracking-wider">{c.label}</span>
              </div>
              <p className="text-xl font-bold tabular-nums text-foreground">{c.value}</p>
            </div>
          ))}
        </div>

      </div>
    </DashboardLayout>
  );
}
