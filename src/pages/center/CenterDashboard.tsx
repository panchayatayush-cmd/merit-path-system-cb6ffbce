import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, Wallet, Building2 } from 'lucide-react';

export default function CenterDashboard() {
  const { user } = useAuth();
  const [center, setCenter] = useState<any>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

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
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      setWalletBalance(Number(wallet?.balance ?? 0));
    };
    load();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-base font-semibold text-foreground">Center Dashboard</h1>
          <p className="text-sm text-muted-foreground">{center?.center_name ?? 'Loading...'}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-shadow rounded-lg bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Center Code</span>
            </div>
            <p className="text-lg font-mono font-bold text-foreground">{center?.center_code ?? '—'}</p>
          </div>

          <div className="card-shadow rounded-lg bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Students</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-foreground">{studentCount}</p>
          </div>

          <div className="card-shadow rounded-lg bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Earnings</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-primary">₹{walletBalance.toFixed(2)}</p>
          </div>
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
