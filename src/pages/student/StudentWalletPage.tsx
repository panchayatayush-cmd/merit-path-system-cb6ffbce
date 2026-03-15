import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';

export default function StudentWalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (wallet) {
        setBalance(Number(wallet.balance));
        const { data: txns } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', wallet.id)
          .order('created_at', { ascending: false });
        setTransactions(txns ?? []);
      }
    };
    load();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-base font-semibold text-foreground">Wallet</h1>

        <div className="card-shadow rounded-lg bg-card p-6 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Balance</p>
          <p className="text-3xl font-bold tabular-nums tracking-tighter text-foreground mt-1">
            ₹{balance.toFixed(2)}
          </p>
        </div>

        <div className="card-shadow rounded-lg bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Transaction History</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions yet.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn) => (
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
