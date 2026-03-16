import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function SuperAdminWithdrawalsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('withdrawal_requests' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setRequests((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    setProcessing(id);
    const { error } = await supabase
      .from('withdrawal_requests' as any)
      .update({
        status,
        admin_note: notes[id] || null,
        processed_by: user.id,
        processed_at: new Date().toISOString(),
      } as any)
      .eq('id', id);

    if (error) {
      toast.error('Failed: ' + error.message);
    } else {
      toast.success(`Request ${status}`);
      load();
    }
    setProcessing(null);
  };

  const pending = requests.filter(r => r.status === 'pending');
  const processed = requests.filter(r => r.status !== 'pending');

  const statusVariant = (s: string) => {
    if (s === 'approved') return 'default' as const;
    if (s === 'rejected') return 'destructive' as const;
    return 'secondary' as const;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">Withdrawal Requests</h1>

        {/* Pending */}
        <div className="card-shadow rounded-lg bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Pending ({pending.length})</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {pending.map((r) => (
                <div key={r.id} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-lg font-bold tabular-nums text-foreground">₹{Number(r.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">UPI: <span className="font-mono">{r.upi_id}</span></p>
                      <p className="text-xs font-mono text-muted-foreground">User: {r.user_id?.slice(0, 12)}...</p>
                      <p className="text-xs font-mono text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant="secondary">pending</Badge>
                  </div>
                  <Input
                    placeholder="Admin note (optional)"
                    value={notes[r.id] || ''}
                    onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAction(r.id, 'approved')}
                      disabled={processing === r.id}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(r.id, 'rejected')}
                      disabled={processing === r.id}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Processed */}
        <div className="card-shadow rounded-lg bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Processed ({processed.length})</h2>
          {processed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No processed requests</p>
          ) : (
            <div className="space-y-3">
              {processed.map((r) => (
                <div key={r.id} className="flex justify-between items-start text-sm pb-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground">₹{Number(r.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">UPI: {r.upi_id}</p>
                    <p className="text-xs font-mono text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                    {r.admin_note && <p className="text-xs text-muted-foreground">Note: {r.admin_note}</p>}
                  </div>
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
