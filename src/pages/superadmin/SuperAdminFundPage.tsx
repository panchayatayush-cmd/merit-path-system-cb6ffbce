import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Wallet, Users, Shield, Building2, Trophy, Globe, ArrowDownCircle } from 'lucide-react';

interface WalletCard {
  label: string;
  balance: number;
  icon: React.ReactNode;
  role: string;
}

export default function SuperAdminFundPage() {
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [scholarshipTotal, setScholarshipTotal] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [withdrawals, setWithdrawals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [wallets, fund, revenue, wd] = await Promise.all([
        supabase.from('wallets').select('balance, role'),
        supabase.from('scholarship_fund').select('amount'),
        supabase.from('payment_orders').select('amount').eq('status', 'verified'),
        supabase.from('withdrawal_requests').select('amount, status, wallet_id').eq('status', 'approved'),
      ]);

      const w = wallets.data ?? [];
      const sumByRole = (role: string) => w.filter(x => x.role === role).reduce((s, x) => s + Number(x.balance), 0);

      // Get wallet role mapping for withdrawals
      const { data: allWallets } = await supabase.from('wallets').select('id, role');
      const walletRoleMap: Record<string, string> = {};
      (allWallets ?? []).forEach(wl => { walletRoleMap[wl.id] = wl.role; });

      // Calculate withdrawals by role
      const wdByRole: Record<string, number> = { student: 0, admin: 0, center: 0, super_admin: 0 };
      (wd.data ?? []).forEach(r => {
        const role = walletRoleMap[r.wallet_id];
        if (role && wdByRole[role] !== undefined) {
          wdByRole[role] += Number(r.amount);
        }
      });
      setWithdrawals(wdByRole);

      setCards([
        { label: 'Student Referral Wallet', balance: sumByRole('student'), icon: <Users className="h-5 w-5" />, role: 'student' },
        { label: 'Admin Wallet', balance: sumByRole('admin'), icon: <Shield className="h-5 w-5" />, role: 'admin' },
        { label: 'Center Wallet', balance: sumByRole('center'), icon: <Building2 className="h-5 w-5" />, role: 'center' },
        { label: 'Super Admin Wallet', balance: sumByRole('super_admin'), icon: <Wallet className="h-5 w-5" />, role: 'super_admin' },
      ]);

      setScholarshipTotal((fund.data ?? []).reduce((s, f) => s + Number(f.amount), 0));
      setTotalRevenue((revenue.data ?? []).reduce((s, r) => s + Number(r.amount), 0));
      setLoading(false);
    };
    load();
  }, []);

  const grandTotal = cards.reduce((s, c) => s + c.balance, 0) + scholarshipTotal + totalRevenue;

  const withdrawalCards = [
    { label: 'Student Withdrawal Wallet', amount: withdrawals.student ?? 0, icon: <Users className="h-5 w-5" />, role: 'student' },
    { label: 'Admin Withdrawal Wallet', amount: withdrawals.admin ?? 0, icon: <Shield className="h-5 w-5" />, role: 'admin' },
    { label: 'Center Withdrawal Wallet', amount: withdrawals.center ?? 0, icon: <Building2 className="h-5 w-5" />, role: 'center' },
    { label: 'Super Admin Withdrawal Wallet', amount: withdrawals.super_admin ?? 0, icon: <Wallet className="h-5 w-5" />, role: 'super_admin' },
    { label: 'Scholarship Withdrawal Wallet', amount: 0, icon: <Trophy className="h-5 w-5" />, role: 'scholarship' },
    { label: 'Website Withdrawal Wallet', amount: 0, icon: <Globe className="h-5 w-5" />, role: 'website' },
  ];

  const totalWithdrawn = withdrawalCards.reduce((s, c) => s + c.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">💰 Fund Management</h1>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading fund data...</p>
        ) : (
          <>
            {/* Section 1: Platform Wallet Balances */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Platform Wallet Balances</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map(c => (
                  <div key={c.role} className="card-shadow rounded-lg bg-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">{c.icon}</div>
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-foreground">₹{c.balance.toFixed(2)}</p>
                  </div>
                ))}
                <div className="card-shadow rounded-lg bg-card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><Trophy className="h-5 w-5" /></div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Scholarship Fund</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-foreground">₹{scholarshipTotal.toFixed(2)}</p>
                </div>
                <div className="card-shadow rounded-lg bg-card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><Globe className="h-5 w-5" /></div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Website Revenue</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-foreground">₹{totalRevenue.toFixed(2)}</p>
                </div>
              </div>
              <div className="card-shadow rounded-lg bg-card p-5 border-2 border-primary/30 text-center mt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Total Platform Funds</p>
                <p className="text-3xl font-bold tabular-nums text-primary">₹{grandTotal.toFixed(2)}</p>
              </div>
            </div>

            {/* Section 2: Withdrawal Wallet Summary */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Withdrawal Wallet Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {withdrawalCards.map(c => (
                  <div key={c.role} className="card-shadow rounded-lg bg-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-destructive/10 text-destructive"><ArrowDownCircle className="h-5 w-5" /></div>
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-foreground">₹{c.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Total Withdrawn */}
            <div className="card-shadow rounded-lg bg-card p-5 border-2 border-destructive/30 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Total Withdrawn Funds</p>
              <p className="text-3xl font-bold tabular-nums text-destructive">₹{totalWithdrawn.toFixed(2)}</p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
