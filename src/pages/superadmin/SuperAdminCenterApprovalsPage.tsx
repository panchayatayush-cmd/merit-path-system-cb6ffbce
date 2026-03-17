import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SuperAdminCenterApprovalsPage() {
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const loadCenters = async () => {
    const { data } = await supabase
      .from('centers')
      .select('id, center_name, owner_name, mobile, address, email, status, admin_id, center_code, created_at')
      .order('created_at', { ascending: false });
    setCenters(data ?? []);
  };

  useEffect(() => { loadCenters(); }, []);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    setLoading(id);
    try {
      if (action === 'approved') {
        // Generate center code
        const { data: code } = await supabase.rpc('generate_center_code');
        const { error } = await supabase
          .from('centers')
          .update({ status: 'approved', center_code: code, is_active: true })
          .eq('id', id);
        if (error) throw error;

        // Distribute payment: ₹200 admin, ₹300 super admin
        // Find the center to get admin_id
        const center = centers.find(c => c.id === id);
        if (center?.admin_id) {
          // Credit admin wallet via edge function or direct (wallets are managed server-side)
          // The payment was already distributed during razorpay-verify-payment
          // So we just approve the center here
        }

        toast.success(`Center approved! Code: ${code}`);
      } else {
        const { error } = await supabase
          .from('centers')
          .update({ status: 'rejected' })
          .eq('id', id);
        if (error) throw error;
        toast.success('Center rejected');
      }
      loadCenters();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setLoading(null);
    }
  };

  const pending = centers.filter(c => c.status === 'pending');
  const approved = centers.filter(c => c.status === 'approved');
  const rejected = centers.filter(c => c.status === 'rejected');

  const CenterTable = ({ items, showActions }: { items: any[]; showActions?: boolean }) => (
    <div className="card-shadow rounded-lg bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Center Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Owner</th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Address</th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Code</th>
              {showActions && <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={showActions ? 6 : 5} className="text-center py-8 text-muted-foreground">No centers</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{c.center_name}</td>
                  <td className="px-4 py-3">{c.owner_name || c.contact_person || '-'}</td>
                  <td className="px-4 py-3">{c.mobile || '-'}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate">{c.address || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {c.status === 'approved' && c.center_code !== 'PENDING' ? c.center_code : '—'}
                  </td>
                  {showActions && (
                    <td className="px-4 py-3 space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(c.id, 'approved')}
                        disabled={loading === c.id}
                        className="text-xs"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(c.id, 'rejected')}
                        disabled={loading === c.id}
                        className="text-xs"
                      >
                        Reject
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">Center Approvals</h1>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <CenterTable items={pending} showActions />
          </TabsContent>
          <TabsContent value="approved" className="mt-4">
            <CenterTable items={approved} />
          </TabsContent>
          <TabsContent value="rejected" className="mt-4">
            <CenterTable items={rejected} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
