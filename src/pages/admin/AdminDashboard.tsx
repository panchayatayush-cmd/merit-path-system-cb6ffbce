import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, Building2, BookOpen } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, centers: 0, exams: 0 });

  useEffect(() => {
    const load = async () => {
      const [students, centers, exams] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('centers').select('id', { count: 'exact', head: true }),
        supabase.from('exam_attempts').select('id', { count: 'exact', head: true }).eq('is_completed', true),
      ]);

      setStats({
        students: students.count ?? 0,
        centers: centers.count ?? 0,
        exams: exams.count ?? 0,
      });
    };
    load();
  }, []);

  const cards = [
    { label: 'Total Students', value: stats.students.toLocaleString(), icon: <Users className="h-4 w-4" /> },
    { label: 'Total Centers', value: stats.centers.toLocaleString(), icon: <Building2 className="h-4 w-4" /> },
    { label: 'Total Exams Conducted', value: stats.exams.toLocaleString(), icon: <BookOpen className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform overview — aggregated statistics only.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="card-shadow rounded-lg bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                {c.icon}
                <span className="text-xs font-medium uppercase tracking-wider">{c.label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="card-shadow rounded-lg bg-card p-5">
          <p className="text-xs text-muted-foreground">
            As an Admin, you can view aggregated platform statistics and monitor center status. 
            For detailed data, financial management, or question management, please contact the Super Admin.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
