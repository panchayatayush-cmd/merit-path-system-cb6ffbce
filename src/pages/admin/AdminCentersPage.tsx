import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AdminCentersPage() {
  const [centers, setCenters] = useState<any[]>([]);

  const loadCenters = async () => {
    const { data } = await supabase
      .from('centers')
      .select('id, center_name, center_code, is_active, created_at')
      .order('created_at', { ascending: false });
    setCenters(data ?? []);
  };

  useEffect(() => { loadCenters(); }, []);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('centers')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update center status');
      return;
    }
    toast.success(`Center ${currentStatus ? 'suspended' : 'activated'}`);
    loadCenters();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">Center Monitoring ({centers.length})</h1>
        <div className="card-shadow rounded-lg bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Center Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {centers.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No centers</td></tr>
                ) : (
                  centers.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-foreground">{c.center_name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{c.center_code}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${c.is_active ? 'text-primary' : 'text-destructive'}`}>
                          {c.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant={c.is_active ? 'destructive' : 'default'}
                          onClick={() => toggleStatus(c.id, c.is_active)}
                          className="text-xs"
                        >
                          {c.is_active ? 'Suspend' : 'Activate'}
                        </Button>
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
