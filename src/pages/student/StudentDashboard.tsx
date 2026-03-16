import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { BookOpen, CreditCard, Award, Wallet, Users, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileData {
  full_name: string | null;
  profile_completed: boolean | null;
  class: number | null;
  center_code: string | null;
  referral_code: string | null;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [examPaid, setExamPaid] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [referredCount, setReferredCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    const load = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, profile_completed, class, center_code, referral_code')
        .eq('user_id', user.id)
        .maybeSingle();
      setProfile(profileData as ProfileData | null);

      const { data: paymentData } = await supabase
        .from('payment_orders')
        .select('status')
        .eq('user_id', user.id)
        .eq('order_type', 'exam_fee')
        .eq('status', 'verified')
        .maybeSingle();
      setExamPaid(!!paymentData);

      const { data: attemptData } = await supabase
        .from('exam_attempts')
        .select('is_completed')
        .eq('student_id', user.id)
        .eq('is_completed', true)
        .maybeSingle();
      setExamCompleted(!!attemptData);

      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      setWalletBalance(Number(walletData?.balance ?? 0));

      // Referral earnings from commissions
      const { data: commissions } = await supabase
        .from('commissions')
        .select('commission_amount')
        .eq('student_id', user.id)
        .eq('role', 'referrer');
      
      const earnings = (commissions ?? []).reduce((sum, c) => sum + Number(c.commission_amount), 0);
      setReferralEarnings(earnings);
      setReferredCount((commissions ?? []).length);
    };
    load();
  }, [user]);

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast.success('Referral code copied!');
    }
  };

  const getExamFee = (studentClass: number | null) => {
    if (!studentClass) return 0;
    if (studentClass <= 5) return 250;
    if (studentClass <= 8) return 300;
    return 350;
  };

  const steps = [
    { label: 'Complete Profile', done: profile?.profile_completed ?? false, action: () => navigate('/student/profile') },
    { label: `Pay Exam Fee (₹${getExamFee(profile?.class ?? null)})`, done: examPaid, action: () => navigate('/student/payment') },
    { label: 'Take Exam', done: examCompleted, action: () => navigate('/student/exam') },
    { label: 'View Results', done: examCompleted, action: () => navigate('/student/results') },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-base font-semibold text-foreground">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">Scholarship Examination 2026</p>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatusCard
            icon={<BookOpen className="h-4 w-4" />}
            label="Exam Status"
            value={examCompleted ? 'Completed' : examPaid ? 'Ready' : 'Locked'}
            variant={examCompleted ? 'success' : examPaid ? 'info' : 'muted'}
          />
          <StatusCard
            icon={<CreditCard className="h-4 w-4" />}
            label="Payment"
            value={examPaid ? 'Verified' : 'Pending'}
            variant={examPaid ? 'success' : 'warning'}
          />
          <StatusCard
            icon={<Award className="h-4 w-4" />}
            label="Certificate"
            value={examCompleted ? 'Available' : 'Locked'}
            variant={examCompleted ? 'success' : 'muted'}
          />
          <StatusCard
            icon={<Wallet className="h-4 w-4" />}
            label="Wallet"
            value={`₹${walletBalance.toFixed(2)}`}
            variant="default"
          />
          <StatusCard
            icon={<Users className="h-4 w-4" />}
            label="Referral Earnings"
            value={`₹${referralEarnings.toFixed(2)}`}
            variant="success"
          />
          <StatusCard
            icon={<Users className="h-4 w-4" />}
            label="Referred Students"
            value={referredCount.toString()}
            variant="default"
          />
        </div>

        {/* Referral Code Card */}
        {profile?.referral_code && (
          <div className="card-shadow rounded-lg bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-2">🔗 Your Referral Code</h2>
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg font-bold text-primary">{profile.referral_code}</span>
              <button
                onClick={copyReferralCode}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors"
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Share this code with friends. You earn ₹50 when they register and pay the exam fee!
            </p>
          </div>
        )}

        {/* Steps */}
        <div className="card-shadow rounded-lg bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Your Journey</h2>
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-3 cursor-pointer group"
                onClick={step.action}
              >
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-mono ${
                    step.done
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {step.done ? '✓' : i + 1}
                </div>
                <span
                  className={`text-sm ${
                    step.done ? 'text-muted-foreground line-through' : 'text-foreground group-hover:text-accent'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatusCard({
  icon,
  label,
  value,
  variant,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  variant: 'success' | 'warning' | 'info' | 'muted' | 'default';
}) {
  const colors: Record<string, string> = {
    success: 'text-primary',
    warning: 'text-warning',
    info: 'text-accent',
    muted: 'text-muted-foreground',
    default: 'text-foreground',
  };

  return (
    <div className="card-shadow rounded-lg bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-sm font-semibold ${colors[variant]}`}>{value}</p>
    </div>
  );
}
