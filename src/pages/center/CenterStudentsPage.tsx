import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';

export default function CenterStudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: center } = await supabase
        .from('centers')
        .select('center_code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (center?.center_code) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, class, created_at')
          .eq('center_code', center.center_code)
          .order('created_at', { ascending: false });
        setStudents(data ?? []);
      }
    };
    load();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">Students</h1>

        <div className="card-shadow rounded-lg bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Class</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-muted-foreground">No students yet</td>
                  </tr>
                ) : (
                  students.map((s, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-foreground">{s.full_name ?? '—'}</td>
                      <td className="px-4 py-3 font-mono">{s.class ?? '—'}</td>
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
