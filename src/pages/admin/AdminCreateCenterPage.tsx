import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, ArrowRight, CreditCard } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const CENTER_FEE = 500;

export default function AdminCreateCenterPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    center_name: '',
    owner_name: '',
    mobile: '',
    address: '',
    email: '',
  });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.center_name || !form.owner_name || !form.mobile || !form.address) {
      toast.error('Please fill all required fields');
      return;
    }
    setStep(2);
  };

  const handlePayment = async () => {
    if (!user) return;
    if (!scriptLoaded) {
      toast.error('Payment gateway लोड हो रहा है, कृपया थोड़ा इंतज़ार करें');
      return;
    }

    setLoading(true);
    try {
      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'razorpay-create-order',
        { body: { amount: CENTER_FEE, order_type: 'admin_center_creation' } }
      );

      if (orderError) throw new Error(orderError.message);
      if (orderData?.error) throw new Error(orderData.error);

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GPHDM EXAMS',
        description: 'Center Creation Fee - ₹500',
        order_id: orderData.razorpay_order_id,
        prefill: {
          name: form.owner_name,
          email: form.email || user.email || '',
          contact: form.mobile,
        },
        theme: { color: '#10b981' },
        handler: async (response: any) => {
          try {
            // Verify payment
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

            // Payment verified — now create center
            const { data: codeData } = await supabase.rpc('generate_center_code');
            const centerCode = codeData || `CTR${Math.floor(1000 + Math.random() * 9000)}`;

            const { error: centerError } = await supabase.from('centers').insert({
              center_name: form.center_name,
              owner_name: form.owner_name,
              mobile: form.mobile,
              address: form.address,
              email: form.email || null,
              center_code: centerCode,
              user_id: user.id,
              admin_id: user.id,
              status: 'approved',
              is_active: true,
              payment_verified: true,
            });

            if (centerError) throw centerError;

            toast.success(`Center created successfully! Code: ${centerCode} ✅`);
            setForm({ center_name: '', owner_name: '', mobile: '', address: '', email: '' });
            setStep(1);
          } catch (err: any) {
            toast.error(err?.message ?? 'Payment verification failed');
          } finally {
            setLoading(false);
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
      <div className="space-y-6 max-w-lg">
        <h1 className="text-base font-semibold text-foreground">Create New Center</h1>
        <p className="text-sm text-muted-foreground">
          Fill center details and pay ₹500 via Razorpay to create center instantly.
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`px-2 py-1 rounded ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1. Details</span>
          <ArrowRight className="h-3 w-3" />
          <span className={`px-2 py-1 rounded ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2. Payment</span>
        </div>

        {/* Step 1: Center Details */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="card-shadow rounded-lg bg-card p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="center_name">Center Name *</Label>
              <Input id="center_name" name="center_name" value={form.center_name} onChange={handleChange} placeholder="Enter center name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="owner_name">Center Owner Name *</Label>
              <Input id="owner_name" name="owner_name" value={form.owner_name} onChange={handleChange} placeholder="Enter owner name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Phone Number *</Label>
              <Input id="mobile" name="mobile" value={form.mobile} onChange={handleChange} placeholder="Enter phone number" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Center Address *</Label>
              <Input id="address" name="address" value={form.address} onChange={handleChange} placeholder="Enter full address" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter email" />
            </div>
            <Button type="submit" className="w-full">
              Next: Pay ₹500 <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        )}

        {/* Step 2: Razorpay Payment */}
        {step === 2 && (
          <div className="card-shadow rounded-lg bg-card p-5 space-y-4">
            <div className="bg-accent/50 rounded-md p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">💳 Center Creation Fee: ₹500</h3>
              <p className="text-xs text-muted-foreground">
                Pay securely via Razorpay. Center will be created automatically after payment.
              </p>
            </div>

            <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
              <p><strong>Center:</strong> {form.center_name}</p>
              <p><strong>Owner:</strong> {form.owner_name}</p>
              <p><strong>Phone:</strong> {form.mobile}</p>
            </div>


            <Button onClick={handlePayment} disabled={loading} className="w-full">
              <CreditCard className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : 'Pay ₹500 Now'}
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="w-full text-xs">
              ← Back to details
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
