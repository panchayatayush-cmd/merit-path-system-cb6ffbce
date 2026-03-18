import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Users } from 'lucide-react';

export default function CenterStudentsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, paid: 0, unpaid: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: center } = await supabase
        .from('centers')
        .select('center_code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (center?.center_code) {
        const { data: students } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('center_code', center.center_code);

        const total = students?.length ?? 0;

        if (total > 0) {
          const userIds = (students ?? []).map(s => s.user_id);
          const { data: payments } = await supabase
            .from('payment_orders')
            .select('user_id')
            .in('user_id', userIds)
            .eq('status', 'verified')
            .eq('order_type', 'exam_fee');
          const paid = new Set((payments ?? []).map(p => p.user_id)).size;
          setStats({ total, paid, unpaid: total - paid });
        } else {
          setStats({ total: 0, paid: 0, unpaid: 0 });
        }
      }
    };
    load();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5" /> Students
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-shadow rounded-lg bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Total Students</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">{stats.total}</p>
          </div>
          <div className="card-shadow rounded-lg bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Paid</p>
            <p className="text-2xl font-bold tabular-nums text-primary">{stats.paid}</p>
          </div>
          <div className="card-shadow rounded-lg bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Unpaid</p>
            <p className="text-2xl font-bold tabular-nums text-destructive">{stats.unpaid}</p>
          </div>
        </div>

        <div className="card-shadow rounded-lg bg-card p-5">
          <p className="text-xs text-muted-foreground">
            For student privacy, only aggregate counts are shown. Contact Super Admin for detailed student data.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
