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

        {/* Scholarship Prize Distribution */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Scholarship Prize Distribution</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Total Pool: ₹1,00,000 (from 1000 students × ₹100). Top 100 students win!
          </p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { rank: 'RANK 1', prize: '₹10,000' },
              { rank: 'RANK 2', prize: '₹7,000' },
              { rank: 'RANK 3', prize: '₹5,000' },
            ].map((t) => (
              <div key={t.rank} className="card-shadow rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
                <p className="text-xs font-semibold text-primary uppercase">{t.rank}</p>
                <p className="text-xl font-bold tabular-nums text-foreground mt-1">{t.prize}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { rank: 'Rank 4–10', category: 'ELITE RANK', students: 7, per: '₹2,500/student', total: '₹17,500' },
              { rank: 'Rank 11–25', category: 'ADVANCED RANK', students: 15, per: '₹1,500/student', total: '₹22,500' },
              { rank: 'Rank 26–50', category: 'MERIT RANK', students: 25, per: '₹820/student', total: '₹20,500' },
              { rank: 'Rank 51–100', category: 'PARTICIPATION', students: 50, per: '₹350/student', total: '₹17,500' },
            ].map((t) => (
              <div key={t.rank} className="card-shadow rounded-lg bg-card p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.rank}</p>
                  <p className="text-xs text-muted-foreground">{t.category} • {t.students} students</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums text-foreground">{t.per}</p>
                  <p className="text-xs text-muted-foreground">Total: {t.total}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="card-shadow rounded-lg bg-card p-4 text-center border-2 border-primary/30">
            <p className="text-sm font-bold text-foreground">Grand Total: <span className="text-primary">₹1,00,000</span></p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
