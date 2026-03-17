import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Wallet, Users, Shield, Building2, Trophy, Globe, History, IndianRupee } from 'lucide-react';

interface DistributionRow {
  paymentId: string;
  studentName: string;
  totalAmount: number;
  referrerAmount: number;
  adminAmount: number;
  centerAmount: number;
  superAdminAmount: number;
  scholarshipAmount: number;
  date: string;
}

export default function SuperAdminFundPage() {
  const [funds, setFunds] = useState({
    superAdminWallet: 0,
    adminWallet: 0,
    studentWallet: 0,
    centerWallet: 0,
    scholarshipFund: 0,
    totalRevenue: 0,
  });
  const [distributions, setDistributions] = useState<DistributionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Fetch wallet totals and revenue in parallel
      const [wallets, fund, revenue, commissions, payments] = await Promise.all([
        supabase.from('wallets').select('balance, role'),
        supabase.from('scholarship_fund').select('amount'),
        supabase.from('payment_orders').select('amount').eq('status', 'verified'),
        supabase.from('commissions').select('payment_id, role, commission_amount, created_at, student_id'),
        supabase.from('payment_orders').select('id, amount, user_id, created_at').eq('status', 'verified').eq('order_type', 'exam_fee'),
      ]);

      const w = wallets.data ?? [];
      const superAdminWallet = w.filter(x => x.role === 'super_admin').reduce((s, x) => s + Number(x.balance), 0);
      const adminWallet = w.filter(x => x.role === 'admin').reduce((s, x) => s + Number(x.balance), 0);
      const studentWallet = w.filter(x => x.role === 'student').reduce((s, x) => s + Number(x.balance), 0);
      const centerWallet = w.filter(x => x.role === 'center').reduce((s, x) => s + Number(x.balance), 0);
      const scholarshipFund = (fund.data ?? []).reduce((s, f) => s + Number(f.amount), 0);
      const totalRevenue = (revenue.data ?? []).reduce((s, r) => s + Number(r.amount), 0);

      setFunds({ superAdminWallet, adminWallet, studentWallet, centerWallet, scholarshipFund, totalRevenue });

      // Build distribution history from commissions grouped by payment_id
      const paymentList = payments.data ?? [];
      const commissionList = commissions.data ?? [];
      const scholarshipList = fund.data ?? [];

      // Get student names
      const studentIds = [...new Set(paymentList.map(p => p.user_id))];
      let profileMap: Record<string, string> = {};
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', studentIds.slice(0, 50));
        (profiles ?? []).forEach(p => { profileMap[p.user_id] = p.full_name || 'Unknown'; });
      }

      const distRows: DistributionRow[] = paymentList.map(pay => {
        const payCommissions = commissionList.filter(c => c.payment_id === pay.id);
        const referrerAmount = payCommissions.filter(c => c.role === 'referrer').reduce((s, c) => s + Number(c.commission_amount), 0);
        const adminAmount = payCommissions.filter(c => c.role === 'admin').reduce((s, c) => s + Number(c.commission_amount), 0);
        const centerAmount = payCommissions.filter(c => c.role === 'center').reduce((s, c) => s + Number(c.commission_amount), 0);
        const superAdminAmount = payCommissions.filter(c => c.role === 'super_admin').reduce((s, c) => s + Number(c.commission_amount), 0);
        const scholarshipAmount = 100; // Fixed ₹100 per exam fee

        return {
          paymentId: pay.id.slice(0, 8).toUpperCase(),
          studentName: profileMap[pay.user_id] || 'Unknown',
          totalAmount: Number(pay.amount),
          referrerAmount,
          adminAmount,
          centerAmount,
          superAdminAmount,
          scholarshipAmount,
          date: new Date(pay.created_at).toLocaleDateString('en-IN'),
        };
      });

      setDistributions(distRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    };
    load();
  }, []);

  const cards = [
    { label: 'Student Referral Wallet', value: funds.studentWallet, icon: <Users className="h-5 w-5" />, color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Admin Wallet', value: funds.adminWallet, icon: <Shield className="h-5 w-5" />, color: 'bg-orange-500/10 text-orange-600' },
    { label: 'Center Wallet', value: funds.centerWallet, icon: <Building2 className="h-5 w-5" />, color: 'bg-green-500/10 text-green-600' },
    { label: 'Super Admin Wallet', value: funds.superAdminWallet, icon: <Wallet className="h-5 w-5" />, color: 'bg-purple-500/10 text-purple-600' },
    { label: 'Scholarship Fund', value: funds.scholarshipFund, icon: <Trophy className="h-5 w-5" />, color: 'bg-yellow-500/10 text-yellow-600' },
    { label: 'Total Website Revenue', value: funds.totalRevenue, icon: <Globe className="h-5 w-5" />, color: 'bg-red-500/10 text-red-600' },
  ];

  const grandTotal = funds.superAdminWallet + funds.adminWallet + funds.studentWallet + funds.centerWallet + funds.scholarshipFund;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">💰 Fund Management</h1>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading fund data...</p>
        ) : (
          <>
            {/* Wallet Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map(c => (
                <div key={c.label} className="card-shadow rounded-lg bg-card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${c.color}`}>{c.icon}</div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-foreground">₹{c.value.toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* Grand Total */}
            <div className="card-shadow rounded-lg bg-card p-5 border-2 border-primary/30 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Total Platform Funds</p>
              <p className="text-3xl font-bold tabular-nums text-primary">₹{grandTotal.toFixed(2)}</p>
            </div>

            {/* Distribution History */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Payment Distribution History</h2>
              </div>

              {distributions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No payment distributions yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Payment ID</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Referral</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Admin</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Center</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Super Admin</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Scholarship</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distributions.map((d, i) => (
                        <tr key={i} className="border-t border-border hover:bg-muted/30">
                          <td className="p-3 font-mono text-foreground">{d.paymentId}</td>
                          <td className="p-3 text-foreground">{d.studentName}</td>
                          <td className="p-3 text-right font-semibold tabular-nums text-foreground">₹{d.totalAmount}</td>
                          <td className="p-3 text-right tabular-nums text-blue-600">₹{d.referrerAmount}</td>
                          <td className="p-3 text-right tabular-nums text-orange-600">₹{d.adminAmount}</td>
                          <td className="p-3 text-right tabular-nums text-green-600">₹{d.centerAmount}</td>
                          <td className="p-3 text-right tabular-nums text-purple-600">₹{d.superAdminAmount}</td>
                          <td className="p-3 text-right tabular-nums text-yellow-600">₹{d.scholarshipAmount}</td>
                          <td className="p-3 text-muted-foreground">{d.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
