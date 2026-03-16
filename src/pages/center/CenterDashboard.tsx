import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, Wallet, Building2, TrendingUp, Clock } from 'lucide-react';

export default function CenterDashboard() {
  const { user } = useAuth();
  const [center, setCenter] = useState<any>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralIncome, setReferralIncome] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: centerData } = await supabase
        .from('centers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setCenter(centerData);

      if (centerData?.center_code) {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('center_code', centerData.center_code);
        setStudentCount(count ?? 0);
      }

      const { data: wallet } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .eq('role', 'center')
        .maybeSingle();
      setWalletBalance(Number(wallet?.balance ?? 0));

      // Calculate referral income from wallet transactions
      if (wallet?.id) {
        const { data: transactions } = await supabase
          .from('wallet_transactions')
          .select('amount')
          .eq('wallet_id', wallet.id)
          .eq('type', 'credit');
        const totalIncome = (transactions ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
        setReferralIncome(totalIncome);

        // Pending withdrawals
        const { data: withdrawals } = await supabase
          .from('wallet_transactions')
          .select('amount')
          .eq('wallet_id', wallet.id)
          .eq('type', 'withdrawal_pending');
        const totalPending = (withdrawals ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
        setPendingWithdrawals(totalPending);
      }
    };
    load();
  }, [user]);

  const cards = [
    {
      label: 'Center Code',
      value: center?.center_code ?? '—',
      icon: <Building2 className="h-4 w-4" />,
      mono: true,
    },
    {
      label: 'Total Students Joined',
      value: studentCount.toString(),
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: 'Referral Income',
      value: `₹${referralIncome.toFixed(2)}`,
      icon: <TrendingUp className="h-4 w-4" />,
      highlight: true,
    },
    {
      label: 'Wallet Balance',
      value: `₹${walletBalance.toFixed(2)}`,
      icon: <Wallet className="h-4 w-4" />,
      highlight: true,
    },
    {
      label: 'Pending Withdrawals',
      value: `₹${pendingWithdrawals.toFixed(2)}`,
      icon: <Clock className="h-4 w-4" />,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-base font-semibold text-foreground">Center Dashboard</h1>
          <p className="text-sm text-muted-foreground">{center?.center_name ?? 'Loading...'}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="card-shadow rounded-lg bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                {c.icon}
                <span className="text-xs font-medium uppercase tracking-wider">{c.label}</span>
              </div>
              <p className={`text-lg font-bold tabular-nums ${c.mono ? 'font-mono' : ''} ${c.highlight ? 'text-primary' : 'text-foreground'}`}>
                {c.value}
              </p>
            </div>
          ))}
        </div>

        {/* Referral info */}
        <div className="card-shadow rounded-lg bg-card p-6">
          <h3 className="text-sm font-medium text-foreground mb-2">📋 Referral System</h3>
          <p className="text-sm text-muted-foreground">
            जब कोई student आपके Center Code (<span className="font-mono font-medium text-foreground">{center?.center_code ?? '...'}</span>) से register करके exam fee pay करता है, तो आपको <span className="font-medium text-primary">₹30</span> referral income मिलता है।
          </p>
        </div>

        {!center?.payment_verified && (
          <div className="card-shadow rounded-lg bg-card p-6 border-l-4 border-destructive">
            <p className="text-sm text-foreground font-medium">⚠️ Payment Required</p>
            <p className="text-sm text-muted-foreground mt-1">
              ₹500 registration fee pay करें। बिना payment के Center Code और Profile unlock नहीं होगा।
            </p>
            <button
              onClick={() => window.location.href = '/center/payment'}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Pay Now →
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
