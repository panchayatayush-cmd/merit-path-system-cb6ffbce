import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle, Lock } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const CENTER_FEE = 500;

export default function CenterPaymentPage() {
  const { user } = useAuth();
  const [center, setCenter] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
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
      const { data: centerData } = await supabase
        .from('centers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setCenter(centerData);

      const { data: paymentData } = await supabase
        .from('payment_orders')
        .select('status')
        .eq('user_id', user.id)
        .eq('order_type', 'center_registration')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setPaymentStatus(paymentData?.status ?? null);
    };
    load();
  }, [user]);

  const handlePayment = async () => {
    if (!user) return;

    if (!scriptLoaded) {
      toast.error('Payment gateway लोड हो रहा है, कृपया थोड़ा इंतज़ार करें');
      return;
    }

    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'razorpay-create-order',
        {
          body: { amount: CENTER_FEE, order_type: 'center_registration' },
        }
      );

      if (orderError) throw new Error(orderError.message);
      if (orderData?.error) throw new Error(orderData.error);

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GPHDM EXAMS',
        description: 'Center Registration Fee - ₹500',
        order_id: orderData.razorpay_order_id,
        prefill: {
          name: center?.contact_person ?? '',
          email: center?.email ?? user.email ?? '',
          contact: center?.mobile ?? '',
        },
        theme: { color: '#10b981' },
        handler: async (response: any) => {
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
            toast.success('Payment verified! Your center is now active. ✅');
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
          <h1 className="text-base font-semibold text-foreground">Center Registration Payment</h1>
          <p className="text-sm text-muted-foreground">₹500 registration fee is required to activate your center.</p>
        </div>

        <div className="card-shadow rounded-lg bg-card p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Center Name</span>
              <span className="text-sm font-medium text-foreground">{center?.center_name ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Registration Fee</span>
              <span className="text-lg font-bold tabular-nums text-foreground">₹{CENTER_FEE}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <span
                className={`text-sm font-semibold flex items-center gap-1 ${
                  paymentStatus === 'verified'
                    ? 'text-primary'
                    : paymentStatus === 'pending'
                    ? 'text-warning'
                    : 'text-destructive'
                }`}
              >
                {paymentStatus === 'verified' ? (
                  <><CheckCircle className="h-4 w-4" /> Active</>
                ) : paymentStatus === 'pending' ? (
                  'Pending'
                ) : (
                  <><Lock className="h-4 w-4" /> Not Paid</>
                )}
              </span>
            </div>
          </div>

          {paymentStatus !== 'verified' && (
            <>
              <Button
                onClick={handlePayment}
                className="w-full mt-6"
                disabled={loading}
              >
                {loading ? 'Processing...' : `Pay ₹${CENTER_FEE}`}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                ⚠️ Center Code और Profile तब तक unlock नहीं होंगे जब तक payment नहीं हो जाता।
              </p>
            </>
          )}

          {paymentStatus === 'verified' && (
            <div className="mt-4 text-center space-y-2">
              <p className="text-sm text-primary font-medium">
                ✓ Your center is active! Center Code: <span className="font-mono font-bold">{center?.center_code ?? '—'}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                अब आप अपनी Profile complete कर सकते हैं और Students register कर सकते हैं।
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
