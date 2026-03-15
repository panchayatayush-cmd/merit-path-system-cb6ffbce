import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, Building2, CreditCard, BookOpen } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, centers: 0, payments: 0, questions: 0 });

  useEffect(() => {
    const load = async () => {
      const [students, centers, payments, questions] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('centers').select('id', { count: 'exact', head: true }),
        supabase.from('payment_orders').select('id', { count: 'exact', head: true }).eq('status', 'verified'),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        students: students.count ?? 0,
        centers: centers.count ?? 0,
        payments: payments.count ?? 0,
        questions: questions.count ?? 0,
      });
    };
    load();
  }, []);

  const cards = [
    { label: 'Students', value: stats.students, icon: <Users className="h-4 w-4" /> },
    { label: 'Centers', value: stats.centers, icon: <Building2 className="h-4 w-4" /> },
    { label: 'Payments', value: stats.payments, icon: <CreditCard className="h-4 w-4" /> },
    { label: 'Questions', value: stats.questions, icon: <BookOpen className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">Admin Dashboard</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="card-shadow rounded-lg bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                {c.icon}
                <span className="text-xs font-medium uppercase tracking-wider">{c.label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
