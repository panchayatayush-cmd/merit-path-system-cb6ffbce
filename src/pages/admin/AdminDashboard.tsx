import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, Building2, CreditCard, BookOpen, Wallet } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, centers: 0, payments: 0, questions: 0, earnings: 0 });

  useEffect(() => {
    const load = async () => {
      const [students, centers, payments, questions] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('centers').select('id', { count: 'exact', head: true }),
        supabase.from('payment_orders').select('id', { count: 'exact', head: true }).eq('status', 'verified'),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
      ]);

      let earnings = 0;
      if (user) {
        const { data: commissions } = await supabase.from('commissions').select('commission_amount').eq('role', 'admin');
        earnings = (commissions ?? []).reduce((s, c) => s + Number(c.commission_amount), 0);
      }

      setStats({
        students: students.count ?? 0,
        centers: centers.count ?? 0,
        payments: payments.count ?? 0,
        questions: questions.count ?? 0,
        earnings,
      });
    };
    load();
  }, [user]);

  const cards = [
    { label: 'Students', value: stats.students.toString(), icon: <Users className="h-4 w-4" /> },
    { label: 'Centers', value: stats.centers.toString(), icon: <Building2 className="h-4 w-4" /> },
    { label: 'Payments', value: stats.payments.toString(), icon: <CreditCard className="h-4 w-4" /> },
    { label: 'Questions', value: stats.questions.toString(), icon: <BookOpen className="h-4 w-4" /> },
    { label: 'Admin Earnings', value: `₹${stats.earnings.toFixed(2)}`, icon: <Wallet className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">Admin Dashboard</h1>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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

        {/* Commission Info */}
        <div className="card-shadow rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">💰 Commission Distribution (₹300 per exam)</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 text-sm">
            <div className="text-muted-foreground">Referring Student: <span className="font-semibold text-foreground">₹70</span></div>
            <div className="text-muted-foreground">Center: <span className="font-semibold text-foreground">₹40</span></div>
            <div className="text-muted-foreground">Admin: <span className="font-semibold text-primary">₹30</span></div>
            <div className="text-muted-foreground">Super Admin: <span className="font-semibold text-foreground">₹60</span></div>
            <div className="text-muted-foreground">Scholarship: <span className="font-semibold text-foreground">₹100</span></div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
