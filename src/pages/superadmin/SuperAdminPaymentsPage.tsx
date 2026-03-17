import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';

export default function SuperAdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Fetch payments
      const { data: orders } = await supabase
        .from('payment_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!orders || orders.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }

      // Get unique user_ids and fetch their profiles
      const userIds = [...new Set(orders.map((o) => o.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, mobile')
        .in('user_id', userIds);

      const profileMap: Record<string, { full_name: string | null; mobile: string | null }> = {};
      (profiles ?? []).forEach((p) => {
        profileMap[p.user_id] = { full_name: p.full_name, mobile: p.mobile };
      });

      const enriched = orders.map((o) => ({
        ...o,
        student_name: profileMap[o.user_id]?.full_name ?? '—',
        student_mobile: profileMap[o.user_id]?.mobile ?? '—',
      }));

      setPayments(enriched);
      setLoading(false);
    };
    load();
  }, []);

  const totalRevenue = payments
    .filter((p) => p.status === 'verified')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-foreground">All Payments</h1>
          <div className="text-sm text-muted-foreground">
            Total Revenue: <span className="font-bold text-primary">₹{totalRevenue.toFixed(2)}</span>
          </div>
        </div>

        <div className="card-shadow rounded-lg bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Student Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Mobile Number</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No payments yet</td></tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-foreground font-medium">{p.student_name}</td>
                      <td className="px-4 py-3 font-mono text-foreground">{p.student_mobile}</td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">
                        {p.razorpay_payment_id ? p.razorpay_payment_id.slice(-8).toUpperCase() : p.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">₹{Number(p.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-foreground">Razorpay</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          p.status === 'verified'
                            ? 'bg-primary/10 text-primary'
                            : p.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {p.status === 'verified' ? 'Success' : p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
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
