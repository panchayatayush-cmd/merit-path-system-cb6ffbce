import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function StudentPaymentPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ class: number | null; profile_completed: boolean | null; full_name: string | null; mobile: string | null; email: string | null } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Load Razorpay script
    if (!document.getElementById('razorpay-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => setScriptLoaded(true);
      document.body.appendChild(script);
    } else {
      setScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('class, profile_completed, full_name, mobile, email')
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
      toast.error('कृपया पहले अपनी प्रोफ़ाइल पूरी करें');
      return;
    }

    if (!scriptLoaded) {
      toast.error('Payment gateway लोड हो रहा है, कृपया थोड़ा इंतज़ार करें');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create Razorpay order via edge function
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'razorpay-create-order',
        {
          body: { amount: fee, order_type: 'exam_fee' },
        }
      );

      if (orderError) throw new Error(orderError.message);
      if (orderData?.error) throw new Error(orderData.error);

      // Step 2: Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GPHDM EXAMS',
        description: 'Exam Fee Payment',
        order_id: orderData.razorpay_order_id,
        prefill: {
          name: profile?.full_name ?? '',
          email: profile?.email ?? user.email ?? '',
          contact: profile?.mobile ?? '',
        },
        theme: { color: '#10b981' },
        handler: async (response: any) => {
          // Step 3: Verify payment
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'razorpay-verify-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  db_order_id: orderData.db_order_id,
                },
              }
            );

            if (verifyError) throw new Error(verifyError.message);
            if (verifyData?.error) throw new Error(verifyData.error);

            setPaymentStatus('verified');
            toast.success('Payment verified successfully! ✅');
          } catch (err: any) {
            toast.error(err?.message ?? 'Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast.info('Payment cancelled');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      rzp.open();
    } catch (error: any) {
      toast.error(error?.message ?? 'Payment failed');
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
