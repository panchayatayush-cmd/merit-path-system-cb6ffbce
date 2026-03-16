import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Wallet } from 'lucide-react';

export default function SuperAdminWalletsPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('wallets')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200);
      setWallets(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

  const roleCounts = wallets.reduce((acc: Record<string, { count: number; balance: number }>, w) => {
    if (!acc[w.role]) acc[w.role] = { count: 0, balance: 0 };
    acc[w.role].count++;
    acc[w.role].balance += Number(w.balance);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">All Wallets</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="card-shadow rounded-lg bg-card p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Balance</span>
            <p className="text-xl font-bold tabular-nums text-primary mt-1">₹{totalBalance.toFixed(2)}</p>
          </div>
          {Object.entries(roleCounts).map(([role, data]) => (
            <div key={role} className="card-shadow rounded-lg bg-card p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{role} ({data.count})</span>
              <p className="text-lg font-bold tabular-nums text-foreground mt-1">₹{data.balance.toFixed(2)}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card-shadow rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">User ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Balance</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : wallets.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No wallets yet</td></tr>
              ) : (
                wallets.map((w) => (
                  <tr key={w.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{w.user_id.slice(0, 12)}...</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        w.role === 'super_admin' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'
                      }`}>
                        {w.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-foreground">₹{Number(w.balance).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {new Date(w.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
