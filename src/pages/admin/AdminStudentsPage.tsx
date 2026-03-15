import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('full_name, class, mobile, email, center_code, profile_completed, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setStudents(data ?? []));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">All Students ({students.length})</h1>
        <div className="card-shadow rounded-lg bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Class</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Center</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Profile</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No students</td></tr>
                ) : (
                  students.map((s, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-foreground">{s.full_name ?? '—'}</td>
                      <td className="px-4 py-3 font-mono">{s.class ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{s.center_code ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${s.profile_completed ? 'text-primary' : 'text-warning'}`}>
                          {s.profile_completed ? 'Complete' : 'Incomplete'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()}
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
