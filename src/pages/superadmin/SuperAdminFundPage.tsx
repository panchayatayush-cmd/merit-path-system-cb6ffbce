import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Wallet, Users, Shield, Building2, Trophy, Globe, ChevronDown, ChevronUp } from 'lucide-react';

interface WalletCard {
  label: string;
  balance: number;
  txnCount: number;
  icon: React.ReactNode;
  color: string;
  role: string;
}

interface WalletTxn {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

export default function SuperAdminFundPage() {
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [scholarshipTotal, setScholarshipTotal] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [txns, setTxns] = useState<WalletTxn[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [wallets, txnCounts, fund, revenue] = await Promise.all([
        supabase.from('wallets').select('balance, role'),
        supabase.from('wallet_transactions').select('wallet_id, id'),
        supabase.from('scholarship_fund').select('amount'),
        supabase.from('payment_orders').select('amount').eq('status', 'verified'),
      ]);

      const w = wallets.data ?? [];
      // Get all wallet ids per role for txn counting
      const { data: allWallets } = await supabase.from('wallets').select('id, role');
      const walletIdsByRole: Record<string, string[]> = {};
      (allWallets ?? []).forEach(wl => {
        if (!walletIdsByRole[wl.role]) walletIdsByRole[wl.role] = [];
        walletIdsByRole[wl.role].push(wl.id);
      });

      const txnList = txnCounts.data ?? [];
      const countByRole = (role: string) => {
        const ids = walletIdsByRole[role] ?? [];
        return txnList.filter(t => ids.includes(t.wallet_id)).length;
      };

      const sumByRole = (role: string) => w.filter(x => x.role === role).reduce((s, x) => s + Number(x.balance), 0);

      const cardData: WalletCard[] = [
        { label: 'Student Referral Wallet', balance: sumByRole('student'), txnCount: countByRole('student'), icon: <Users className="h-5 w-5" />, color: 'bg-primary/10 text-primary', role: 'student' },
        { label: 'Admin Wallet', balance: sumByRole('admin'), txnCount: countByRole('admin'), icon: <Shield className="h-5 w-5" />, color: 'bg-primary/10 text-primary', role: 'admin' },
        { label: 'Center Wallet', balance: sumByRole('center'), txnCount: countByRole('center'), icon: <Building2 className="h-5 w-5" />, color: 'bg-primary/10 text-primary', role: 'center' },
        { label: 'Super Admin Wallet', balance: sumByRole('super_admin'), txnCount: countByRole('super_admin'), icon: <Wallet className="h-5 w-5" />, color: 'bg-primary/10 text-primary', role: 'super_admin' },
      ];

      setCards(cardData);
      setScholarshipTotal((fund.data ?? []).reduce((s, f) => s + Number(f.amount), 0));
      setTotalRevenue((revenue.data ?? []).reduce((s, r) => s + Number(r.amount), 0));
      setLoading(false);
    };
    load();
  }, []);

  const toggleTxns = async (role: string) => {
    if (expandedRole === role) {
      setExpandedRole(null);
      return;
    }
    setExpandedRole(role);
    setTxnLoading(true);

    const { data: roleWallets } = await supabase.from('wallets').select('id').eq('role', role as any);
    const ids = (roleWallets ?? []).map(w => w.id);

    if (ids.length > 0) {
      const { data } = await supabase
        .from('wallet_transactions')
        .select('id, amount, type, description, created_at')
        .in('wallet_id', ids)
        .order('created_at', { ascending: false })
        .limit(50);
      setTxns(data ?? []);
    } else {
      setTxns([]);
    }
    setTxnLoading(false);
  };

  const grandTotal = cards.reduce((s, c) => s + c.balance, 0) + scholarshipTotal;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">💰 Fund Management</h1>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading fund data...</p>
        ) : (
          <>
            {/* Wallet Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cards.map(c => (
                <div key={c.role} className="space-y-0">
                  <div
                    className="card-shadow rounded-lg bg-card p-5 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
                    onClick={() => toggleTxns(c.role)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${c.color}`}>{c.icon}</div>
                        <div>
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</span>
                          <p className="text-xs text-muted-foreground">{c.txnCount} transactions</p>
                        </div>
                      </div>
                      {expandedRole === c.role ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-foreground">₹{c.balance.toFixed(2)}</p>
                  </div>

                  {expandedRole === c.role && (
                    <div className="border border-border border-t-0 rounded-b-lg bg-muted/30 p-3 max-h-60 overflow-y-auto">
                      {txnLoading ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
                      ) : txns.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No transactions yet.</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground">
                              <th className="text-left pb-2 font-medium">Date</th>
                              <th className="text-left pb-2 font-medium">Description</th>
                              <th className="text-right pb-2 font-medium">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {txns.map(t => (
                              <tr key={t.id} className="border-t border-border/50">
                                <td className="py-1.5 text-muted-foreground">{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                                <td className="py-1.5 text-foreground">{t.description || '-'}</td>
                                <td className={`py-1.5 text-right font-semibold tabular-nums ${t.type === 'credit' ? 'text-green-600' : 'text-destructive'}`}>
                                  {t.type === 'credit' ? '+' : '-'}₹{Number(t.amount).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Scholarship & Revenue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Website Revenue</span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-foreground">₹{totalRevenue.toFixed(2)}</p>
              </div>
            </div>

            {/* Grand Total */}
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
