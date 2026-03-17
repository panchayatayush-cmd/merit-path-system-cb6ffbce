import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SuperAdminWithdrawalsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [centers, setCenters] = useState<Record<string, any>>({});
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    const reqs = (data as any[]) ?? [];
    setRequests(reqs);

    const userIds = [...new Set(reqs.map(r => r.user_id))];
    if (userIds.length > 0) {
      const [{ data: profs }, { data: ctrs }, { data: uroles }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, mobile').in('user_id', userIds),
        supabase.from('centers').select('user_id, center_name, center_code').in('user_id', userIds),
        supabase.from('user_roles').select('user_id, role').in('user_id', userIds),
      ]);
      const profMap: Record<string, any> = {};
      (profs ?? []).forEach(p => { profMap[p.user_id] = p; });
      setProfiles(profMap);
      const ctrMap: Record<string, any> = {};
      (ctrs ?? []).forEach(c => { ctrMap[c.user_id] = c; });
      setCenters(ctrMap);
      const roleMap: Record<string, string> = {};
      (uroles ?? []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
      setRoles(roleMap);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id: string, status: 'approved' | 'rejected' | 'completed') => {
    if (!user) return;
    setProcessing(id);
    const { error } = await supabase
      .from('withdrawal_requests')
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
  const approved = requests.filter(r => r.status === 'approved');
  const processed = requests.filter(r => r.status === 'rejected' || r.status === 'completed');

  const statusVariant = (s: string) => {
    if (s === 'approved') return 'default' as const;
    if (s === 'completed') return 'default' as const;
    if (s === 'rejected') return 'destructive' as const;
    return 'secondary' as const;
  };

  const getUserName = (userId: string) => {
    if (centers[userId]) return centers[userId].center_name;
    return profiles[userId]?.full_name || userId.slice(0, 12) + '...';
  };
  const getUserPhone = (userId: string) => profiles[userId]?.mobile || '-';
  const getCenterCode = (userId: string) => centers[userId]?.center_code || null;

  const parseBankDetails = (r: any) => {
    if (r.bank_details) {
      try { return JSON.parse(r.bank_details); } catch { return null; }
    }
    return null;
  };

  const renderRequestCard = (r: any, actions: React.ReactNode) => {
    const bank = parseBankDetails(r);
    const centerCode = getCenterCode(r.user_id);
    return (
      <div key={r.id} className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-lg font-bold tabular-nums text-foreground">₹{Number(r.amount).toFixed(2)}</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{getUserName(r.user_id)}</p>
              <Badge variant="outline" className="text-xs capitalize">{roles[r.user_id] || 'unknown'}</Badge>
            </div>
            {centerCode && <p className="text-xs text-muted-foreground">Center: <span className="font-mono">{centerCode}</span></p>}
            <p className="text-xs text-muted-foreground">Phone: {getUserPhone(r.user_id)}</p>
            {r.upi_id && <p className="text-xs text-muted-foreground">UPI: <span className="font-mono">{r.upi_id}</span></p>}
            {bank && (
              <div className="text-xs text-muted-foreground space-y-0.5 mt-1 p-2 bg-muted/50 rounded">
                <p><span className="font-medium">Account:</span> {bank.account_holder || bank.account_holder_name}</p>
                <p><span className="font-medium">Bank:</span> {bank.bank_name}</p>
                <p><span className="font-medium">A/C No:</span> <span className="font-mono">{bank.account_number}</span></p>
                <p><span className="font-medium">IFSC:</span> <span className="font-mono">{bank.ifsc_code}</span></p>
                {bank.branch_name && <p><span className="font-medium">Branch:</span> {bank.branch_name}</p>}
              </div>
            )}
            <p className="text-xs font-mono text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
            {r.admin_note && <p className="text-xs text-muted-foreground">Note: {r.admin_note}</p>}
          </div>
          <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
        </div>
        {actions}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">Withdrawal Requests</h1>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="processed">Completed/Rejected ({processed.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <div className="card-shadow rounded-lg bg-card p-6">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : pending.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No pending requests</p>
              ) : (
                <div className="space-y-4">
                  {pending.map((r) => renderRequestCard(r, (
                    <>
                      <Input
                        placeholder="Admin note (optional)"
                        value={notes[r.id] || ''}
                        onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAction(r.id, 'approved')} disabled={processing === r.id}>
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleAction(r.id, 'rejected')} disabled={processing === r.id}>
                          Reject
                        </Button>
                      </div>
                    </>
                  )))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            <div className="card-shadow rounded-lg bg-card p-6">
              {approved.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No approved requests awaiting completion</p>
              ) : (
                <div className="space-y-4">
                  {approved.map((r) => renderRequestCard(r, (
                    <>
                      <Input
                        placeholder="Admin note (optional)"
                        value={notes[r.id] || ''}
                        onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAction(r.id, 'completed')} disabled={processing === r.id}>
                          Mark Completed
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleAction(r.id, 'rejected')} disabled={processing === r.id}>
                          Reject
                        </Button>
                      </div>
                    </>
                  )))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="processed" className="mt-4">
            <div className="card-shadow rounded-lg bg-card p-6">
              {processed.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No processed requests</p>
              ) : (
                <div className="space-y-3">
                  {processed.map((r) => (
                    <div key={r.id} className="flex justify-between items-start text-sm pb-3 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium text-foreground">₹{Number(r.amount).toFixed(2)} — {getUserName(r.user_id)}</p>
                        {getCenterCode(r.user_id) && <p className="text-xs text-muted-foreground">Center: {getCenterCode(r.user_id)}</p>}
                        <p className="text-xs text-muted-foreground">{r.upi_id ? `UPI: ${r.upi_id}` : 'Bank Transfer'}</p>
                        <p className="text-xs font-mono text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                        {r.admin_note && <p className="text-xs text-muted-foreground">Note: {r.admin_note}</p>}
                      </div>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
