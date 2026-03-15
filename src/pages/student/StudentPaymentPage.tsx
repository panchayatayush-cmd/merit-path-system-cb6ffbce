import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function StudentPaymentPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ class: number | null; profile_completed: boolean | null } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('class, profile_completed')
        .eq('user_id', user.id)
        .maybeSingle();
      setProfile(profileData);

      const { data: paymentData } = await supabase
        .from('payment_orders')
        .select('status')
        .eq('user_id', user.id)
        .eq('order_type', 'exam_fee')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setPaymentStatus(paymentData?.status ?? null);
    };
    load();
  }, [user]);

  const getExamFee = (studentClass: number | null) => {
    if (!studentClass) return 0;
    if (studentClass <= 5) return 250;
    if (studentClass <= 8) return 300;
    return 350;
  };

  const fee = getExamFee(profile?.class ?? null);

  const handlePayment = async () => {
    if (!user || !profile?.profile_completed) {
      toast.error('Please complete your profile first');
      return;
    }

    setLoading(true);
    try {
      // Create payment order record
      const { data: order, error } = await supabase
        .from('payment_orders')
        .insert({
          user_id: user.id,
          order_type: 'exam_fee',
          amount: fee,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // For now, simulate payment verification (Razorpay integration needs API key setup)
      // In production, this would open Razorpay modal
      toast.info('Payment gateway integration requires Razorpay API keys. Simulating payment for demo.');

      // Simulate successful payment
      const { error: updateError } = await supabase
        .from('payment_orders')
        .update({
          status: 'verified',
          razorpay_payment_id: `sim_${Date.now()}`,
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      setPaymentStatus('verified');
      toast.success('Payment verified successfully!');
    } catch (error: any) {
      toast.error(error?.message ?? 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-base font-semibold text-foreground">Exam Payment</h1>
          <p className="text-sm text-muted-foreground">Pay the examination fee to unlock your exam.</p>
        </div>

        <div className="card-shadow rounded-lg bg-card p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Class</span>
              <span className="text-sm font-medium text-foreground">{profile?.class ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Exam Fee</span>
              <span className="text-lg font-bold tabular-nums text-foreground">₹{fee}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <span
                className={`text-sm font-semibold ${
                  paymentStatus === 'verified'
                    ? 'text-primary'
                    : paymentStatus === 'pending'
                    ? 'text-warning'
                    : 'text-destructive'
                }`}
              >
                {paymentStatus === 'verified' ? 'Payment Verified' : paymentStatus === 'pending' ? 'Pending' : 'Exam Locked'}
              </span>
            </div>
          </div>

          {paymentStatus !== 'verified' && (
            <Button
              onClick={handlePayment}
              className="w-full mt-6"
              disabled={loading || !profile?.profile_completed}
            >
              {loading ? 'Processing...' : `Pay ₹${fee}`}
            </Button>
          )}

          {paymentStatus === 'verified' && (
            <p className="mt-4 text-sm text-primary text-center font-medium">
              ✓ Your exam is now unlocked. Go to the Exam section to begin.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
