import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Wallet, Users, Shield, Building2, Trophy, Globe } from 'lucide-react';

export default function SuperAdminFundPage() {
  const [funds, setFunds] = useState({
    superAdminWallet: 0,
    adminWallet: 0,
    studentWallet: 0,
    centerWallet: 0,
    scholarshipFund: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [wallets, fund, revenue] = await Promise.all([
        supabase.from('wallets').select('balance, role'),
        supabase.from('scholarship_fund').select('amount'),
        supabase.from('payment_orders').select('amount').eq('status', 'verified'),
      ]);

      const w = wallets.data ?? [];
      const superAdminWallet = w.filter(x => x.role === 'super_admin').reduce((s, x) => s + Number(x.balance), 0);
      const adminWallet = w.filter(x => x.role === 'admin').reduce((s, x) => s + Number(x.balance), 0);
      const studentWallet = w.filter(x => x.role === 'student').reduce((s, x) => s + Number(x.balance), 0);
      const centerWallet = w.filter(x => x.role === 'center').reduce((s, x) => s + Number(x.balance), 0);
      const scholarshipFund = (fund.data ?? []).reduce((s, f) => s + Number(f.amount), 0);
      const totalRevenue = (revenue.data ?? []).reduce((s, r) => s + Number(r.amount), 0);

      setFunds({ superAdminWallet, adminWallet, studentWallet, centerWallet, scholarshipFund, totalRevenue });
      setLoading(false);
    };
    load();
  }, []);

  const cards = [
    { label: 'Super Admin Wallet', value: funds.superAdminWallet, icon: <Shield className="h-5 w-5" />, color: 'text-primary' },
    { label: 'Admin Wallet', value: funds.adminWallet, icon: <Users className="h-5 w-5" />, color: 'text-primary' },
    { label: 'Student Wallet', value: funds.studentWallet, icon: <Users className="h-5 w-5" />, color: 'text-primary' },
    { label: 'Center Wallet', value: funds.centerWallet, icon: <Building2 className="h-5 w-5" />, color: 'text-primary' },
    { label: 'Scholarship Fund', value: funds.scholarshipFund, icon: <Trophy className="h-5 w-5" />, color: 'text-primary' },
    { label: 'Total Website Revenue', value: funds.totalRevenue, icon: <Globe className="h-5 w-5" />, color: 'text-primary' },
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map(c => (
                <div key={c.label} className="card-shadow rounded-lg bg-card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg bg-primary/10 ${c.color}`}>{c.icon}</div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-foreground">₹{c.value.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="card-shadow rounded-lg bg-card p-5 border-2 border-primary/30 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Total Platform Funds</p>
              <p className="text-3xl font-bold tabular-nums text-primary">₹{grandTotal.toFixed(2)}</p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
