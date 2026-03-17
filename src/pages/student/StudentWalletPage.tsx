import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import WithdrawButton from '@/components/WithdrawButton';
import WithdrawalHistory from '@/components/WithdrawalHistory';
import BankDetailsForm from '@/components/BankDetailsForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Users, Wallet, TrendingUp } from 'lucide-react';

export default function StudentWalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (wallet) {
      setWalletId(wallet.id);
      setBalance(Number(wallet.balance));
      const { data: txns } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false });
      setTransactions(txns ?? []);

      const { data: wr } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setWithdrawals((wr as any[]) ?? []);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Split transactions by type using metadata or description
  const scholarshipTxns = transactions.filter(t =>
    t.description?.toLowerCase().includes('scholarship') ||
    t.description?.toLowerCase().includes('prize') ||
    t.description?.toLowerCase().includes('reward') ||
    t.description?.toLowerCase().includes('competition')
  );
  const referralTxns = transactions.filter(t =>
    t.description?.toLowerCase().includes('referral')
  );

  const scholarshipBalance = scholarshipTxns.reduce((sum, t) =>
    sum + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount)), 0
  );
  const referralBalance = referralTxns.reduce((sum, t) =>
    sum + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount)), 0
  );
  const totalEarnings = scholarshipBalance + referralBalance;
  const referralCount = referralTxns.filter(t => t.type === 'credit').length;

  const TransactionList = ({ items }: { items: any[] }) => (
    items.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-4">No transactions yet.</p>
    ) : (
      <div className="space-y-3">
        {items.map((txn) => (
          <div key={txn.id} className="flex justify-between items-center text-sm pb-2 border-b border-border last:border-0">
            <div>
              <p className="text-foreground">{txn.description ?? 'Transaction'}</p>
              <p className="text-xs font-mono text-muted-foreground">
                {new Date(txn.created_at).toLocaleDateString()}
              </p>
            </div>
            <span className={`font-mono font-semibold ${txn.type === 'credit' ? 'text-primary' : 'text-destructive'}`}>
              {txn.type === 'credit' ? '+' : '-'}₹{Number(txn.amount).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    )
  );

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-base font-semibold text-foreground">My Wallet</h1>

        {/* Total Earnings Card */}
        <div className="card-shadow rounded-lg bg-card p-6 text-center border border-primary/20">
          <div className="flex items-center justify-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Earnings</p>
          </div>
          <p className="text-3xl font-bold tabular-nums tracking-tighter text-primary">
            ₹{totalEarnings.toFixed(2)}
          </p>
        </div>

        {/* Wallet Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Scholarship Wallet */}
          <div className="card-shadow rounded-lg bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-accent-foreground" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Scholarship Wallet</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-foreground">₹{scholarshipBalance.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Prizes & Rewards</p>
          </div>

          {/* Referral Wallet */}
          <div className="card-shadow rounded-lg bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-accent-foreground" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Referral Wallet</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-foreground">₹{referralBalance.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{referralCount} successful referrals × ₹70</p>
          </div>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="withdraw" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="withdraw" className="flex-1">Withdraw</TabsTrigger>
            <TabsTrigger value="bank" className="flex-1">Bank Details</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
          </TabsList>

          <TabsContent value="withdraw" className="space-y-4">
            <div className="card-shadow rounded-lg bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-2">Withdraw from Referral Wallet</h2>
              <p className="text-xs text-muted-foreground mb-4">You can withdraw your referral earnings. Bank details must be saved first.</p>
              {walletId && (
                <WithdrawButton walletId={walletId} balance={referralBalance} onSuccess={load} />
              )}
            </div>

            <div className="card-shadow rounded-lg bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Withdrawal Requests</h2>
              <WithdrawalHistory requests={withdrawals} />
            </div>
          </TabsContent>

          <TabsContent value="bank">
            <div className="card-shadow rounded-lg bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Bank Account Details</h2>
              <BankDetailsForm />
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="card-shadow rounded-lg bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Scholarship Transactions</h2>
              <TransactionList items={scholarshipTxns} />
            </div>
            <div className="card-shadow rounded-lg bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Referral Transactions</h2>
              <TransactionList items={referralTxns} />
            </div>
            <div className="card-shadow rounded-lg bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">All Transactions</h2>
              <TransactionList items={transactions} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
