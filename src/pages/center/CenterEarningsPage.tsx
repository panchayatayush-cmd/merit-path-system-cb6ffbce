import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import WithdrawButton from '@/components/WithdrawButton';
import WithdrawalHistory from '@/components/WithdrawalHistory';
import CenterBankDetailsForm from '@/components/CenterBankDetailsForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CenterEarningsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'withdraw';
  const [balance, setBalance] = useState(0);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [hasBankDetails, setHasBankDetails] = useState(false);

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
        .from('withdrawal_requests' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setWithdrawals((wr as any[]) ?? []);
    }

    // Check bank details
    const { data: bd } = await supabase
      .from('center_bank_details' as any)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    setHasBankDetails(!!bd);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-base font-semibold text-foreground">Earnings</h1>

        <div className="card-shadow rounded-lg bg-card p-6 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Earnings</p>
          <p className="text-3xl font-bold tabular-nums tracking-tighter text-primary mt-1">
            ₹{balance.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">₹40 per student referral</p>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            <TabsTrigger value="bank">Bank Details</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="withdraw" className="space-y-4 mt-4">
            {!hasBankDetails && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                ⚠ Please add your bank details first before requesting a withdrawal.
              </div>
            )}
            {walletId && (
              <WithdrawButton walletId={walletId} balance={balance} onSuccess={load} />
            )}
            <div className="card-shadow rounded-lg bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Withdrawal Requests</h2>
              <WithdrawalHistory requests={withdrawals} />
            </div>
          </TabsContent>

          <TabsContent value="bank" className="mt-4">
            <div className="card-shadow rounded-lg bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Bank Details</h2>
              <CenterBankDetailsForm />
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="card-shadow rounded-lg bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Transactions</h2>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions yet.</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((txn) => (
                    <div key={txn.id} className="flex justify-between items-center text-sm pb-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-foreground">{txn.description ?? 'Commission'}</p>
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
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
