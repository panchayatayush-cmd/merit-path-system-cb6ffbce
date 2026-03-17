import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';

export default function AdminMyCentersPage() {
  const { user } = useAuth();
  const [centers, setCenters] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('centers')
        .select('id, center_name, owner_name, center_code, status, mobile, address, created_at')
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });
      setCenters(data ?? []);
    };
    load();
  }, [user]);

  const statusColor = (s: string) => {
    if (s === 'approved') return 'default';
    if (s === 'rejected') return 'destructive';
    return 'secondary';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">My Centers ({centers.length})</h1>
        <div className="card-shadow rounded-lg bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Center Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Owner</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Center Code</th>
                </tr>
              </thead>
              <tbody>
                {centers.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No centers created yet</td></tr>
                ) : (
                  centers.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-foreground">{c.center_name}</td>
                      <td className="px-4 py-3">{c.owner_name || '-'}</td>
                      <td className="px-4 py-3">{c.mobile || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusColor(c.status)}>{c.status?.toUpperCase()}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {c.status === 'approved' && c.center_code !== 'PENDING' ? c.center_code : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
