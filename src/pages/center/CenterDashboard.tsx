import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import CenterShareCard from '@/components/CenterShareCard';
import { Users, Wallet, Building2, TrendingUp, Clock, UserCheck, UserX, ShieldCheck } from 'lucide-react';

export default function CenterDashboard() {
  const { user } = useAuth();
  const [center, setCenter] = useState<any>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [paidStudents, setPaidStudents] = useState(0);
  const [unpaidStudents, setUnpaidStudents] = useState(0);
  const [adminName, setAdminName] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralIncome, setReferralIncome] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: centerData } = await supabase.from('centers').select('*').eq('user_id', user.id).maybeSingle();
      setCenter(centerData);

      if (centerData?.center_code) {
        // Get all students with this center code
        const { data: students } = await supabase.from('profiles').select('user_id').eq('center_code', centerData.center_code);
        const totalStudents = students?.length ?? 0;
        setStudentCount(totalStudents);

        // Count paid students (those who have a successful payment_order of type exam_fee)
        if (students && students.length > 0) {
          const studentIds = students.map(s => s.user_id);
          const { count: paidCount } = await supabase
            .from('payment_orders')
            .select('id', { count: 'exact', head: true })
            .in('user_id', studentIds)
            .eq('order_type', 'exam_fee')
            .eq('status', 'paid');
          setPaidStudents(paidCount ?? 0);
          setUnpaidStudents(totalStudents - (paidCount ?? 0));
        }
      }

      // Fetch admin name
      if (centerData?.admin_id) {
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('full_name')
          .eq('user_id', centerData.admin_id)
          .maybeSingle();
        setAdminName(adminRole?.full_name || '');
      }

      const { data: wallet } = await supabase.from('wallets').select('id, balance').eq('user_id', user.id).eq('role', 'center').maybeSingle();
      setWalletBalance(Number(wallet?.balance ?? 0));

      if (wallet?.id) {
        const { data: transactions } = await supabase.from('wallet_transactions').select('amount').eq('wallet_id', wallet.id).eq('type', 'credit');
        setReferralIncome((transactions ?? []).reduce((sum, t) => sum + Number(t.amount), 0));

        const { data: withdrawals } = await supabase.from('wallet_transactions').select('amount').eq('wallet_id', wallet.id).eq('type', 'withdrawal_pending');
        setPendingWithdrawals((withdrawals ?? []).reduce((sum, t) => sum + Number(t.amount), 0));
      }
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

        {/* Center Code Banner */}
        {center?.center_code && (
          <div className="card-shadow rounded-lg bg-primary/10 border border-primary/20 p-6 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Your Center Code</p>
            <p className="text-3xl font-bold font-mono text-primary tracking-widest">{center.center_code}</p>
            {adminName && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Admin: {adminName}
              </p>
            )}
          </div>
        )}

        {/* Stats Cards - Numbers Only */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card-shadow rounded-lg bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Students</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{studentCount}</p>
          </div>
          <div className="card-shadow rounded-lg bg-card p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <UserCheck className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Paid Students</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-emerald-600">{paidStudents}</p>
          </div>
          <div className="card-shadow rounded-lg bg-card p-4">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <UserX className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Unpaid Students</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-destructive">{unpaidStudents}</p>
          </div>
        </div>

        {/* Wallet Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card-shadow rounded-lg bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Referral Income</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-primary">₹{referralIncome.toFixed(2)}</p>
          </div>
          <div className="card-shadow rounded-lg bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Wallet Balance</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-primary">₹{walletBalance.toFixed(2)}</p>
          </div>
          <div className="card-shadow rounded-lg bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Pending Withdrawals</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-foreground">₹{pendingWithdrawals.toFixed(2)}</p>
          </div>
        </div>

        {/* Center Share Card */}
        {center?.payment_verified && center?.center_code && (
          <CenterShareCard centerCode={center.center_code} />
        )}

        {!center?.payment_verified && (
          <div className="card-shadow rounded-lg bg-card p-6 border-l-4 border-destructive">
            <p className="text-sm text-foreground font-medium">⚠️ Payment Required</p>
            <p className="text-sm text-muted-foreground mt-1">₹500 registration fee pay करें। Payment के बाद आपका Center Code share करने के लिए available होगा।</p>
            <button onClick={() => window.location.href = '/center/payment'} className="mt-3 text-sm font-medium text-primary hover:underline">Pay Now →</button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
