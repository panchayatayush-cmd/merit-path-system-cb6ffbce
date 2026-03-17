import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SuperAdminCenterApprovalsPage() {
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const loadCenters = async () => {
    const { data } = await supabase
      .from('centers')
      .select('id, center_name, owner_name, mobile, address, email, status, admin_id, center_code, payment_utr, created_at')
      .order('created_at', { ascending: false });
    setCenters(data ?? []);
  };

  useEffect(() => { loadCenters(); }, []);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    setLoading(id);
    try {
      const center = centers.find(c => c.id === id);

      if (action === 'approved') {
        // Generate center code
        const { data: code } = await supabase.rpc('generate_center_code');
        const { error } = await supabase
          .from('centers')
          .update({ status: 'approved', center_code: code, is_active: true, payment_verified: true })
          .eq('id', id);
        if (error) throw error;

        // Distribute ₹200 to admin, ₹300 to super admin
        if (center?.admin_id) {
          await distributeRevenue(center.admin_id);
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

  const distributeRevenue = async (adminId: string) => {
    try {
      // Credit admin ₹200
      const { data: adminWallet } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', adminId)
        .eq('role', 'admin')
        .single();

      if (adminWallet) {
        await supabase.from('wallets').update({ balance: Number(adminWallet.balance) + 200 }).eq('id', adminWallet.id);
      }

      // Credit super admin ₹300 - get current user (super admin)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: saWallet } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', user.id)
          .eq('role', 'super_admin')
          .single();

        if (saWallet) {
          await supabase.from('wallets').update({ balance: Number(saWallet.balance) + 300 }).eq('id', saWallet.id);
        }
      }
    } catch (err) {
      console.error('Revenue distribution error:', err);
    }
  };

  const pending = centers.filter(c => c.status === 'pending');
  const approved = centers.filter(c => c.status === 'approved');
  const rejected = centers.filter(c => c.status === 'rejected');

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

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
              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">UTR</th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Code</th>
              {showActions && <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={showActions ? 8 : 7} className="text-center py-8 text-muted-foreground">No centers</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{c.center_name}</td>
                  <td className="px-4 py-3">{c.owner_name || '-'}</td>
                  <td className="px-4 py-3">{c.mobile || '-'}</td>
                  <td className="px-4 py-3 max-w-[150px] truncate">{c.address || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.payment_utr || '-'}</td>
                  <td className="px-4 py-3 text-xs">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {c.status === 'approved' && c.center_code !== 'PENDING' ? c.center_code : '—'}
                  </td>
                  {showActions && (
                    <td className="px-4 py-3 space-x-2">
                      <Button size="sm" onClick={() => handleAction(c.id, 'approved')} disabled={loading === c.id} className="text-xs">
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleAction(c.id, 'rejected')} disabled={loading === c.id} className="text-xs">
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
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
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
