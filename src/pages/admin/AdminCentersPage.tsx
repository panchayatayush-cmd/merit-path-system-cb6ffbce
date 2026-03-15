import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';

export default function AdminCentersPage() {
  const [centers, setCenters] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('centers')
      .select('center_name, center_code, contact_person, email, is_active, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setCenters(data ?? []));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">All Centers ({centers.length})</h1>
        <div className="card-shadow rounded-lg bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {centers.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No centers</td></tr>
                ) : (
                  centers.map((c, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-foreground">{c.center_name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{c.center_code}</td>
                      <td className="px-4 py-3 text-xs">{c.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${c.is_active ? 'text-primary' : 'text-warning'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
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
