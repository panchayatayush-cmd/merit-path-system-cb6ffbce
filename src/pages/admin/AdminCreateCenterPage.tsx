import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function AdminCreateCenterPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    center_name: '',
    owner_name: '',
    mobile: '',
    address: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.center_name || !form.owner_name || !form.mobile || !form.address) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      // 1. Load Razorpay
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Payment gateway failed to load');

      // 2. Create Razorpay order
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'razorpay-create-order',
        {
          body: { amount: 500, order_type: 'admin_center_creation' },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (orderError || !orderData) throw new Error('Failed to create payment order');

      // 3. Open Razorpay
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GPHDM Center Creation',
        description: 'Center Creation Fee - ₹500',
        order_id: orderData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            // 4. Verify payment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'razorpay-verify-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  db_order_id: orderData.db_order_id,
                },
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            if (verifyError) throw verifyError;

            // 5. Create center request (pending approval)
            const { error: centerError } = await supabase.from('centers').insert({
              center_name: form.center_name,
              owner_name: form.owner_name,
              mobile: form.mobile,
              address: form.address,
              email: form.email || null,
              center_code: 'PENDING',
              user_id: user.id,
              admin_id: user.id,
              status: 'pending',
              is_active: false,
              payment_verified: true,
            });

            if (centerError) throw centerError;

            toast.success('Center request submitted! Awaiting Super Admin approval.');
            setForm({ center_name: '', owner_name: '', mobile: '', address: '', email: '' });
          } catch (err: any) {
            toast.error(err.message || 'Payment verification failed');
          }
        },
        prefill: { email: user.email },
        theme: { color: '#1a1a2e' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-lg">
        <h1 className="text-base font-semibold text-foreground">Create New Center</h1>
        <p className="text-sm text-muted-foreground">
          Fill center details and pay ₹500 creation fee. Center will be sent for Super Admin approval.
        </p>

        <form onSubmit={handleSubmit} className="card-shadow rounded-lg bg-card p-5 space-y-4">
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

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-3">
              💳 Center Creation Fee: <span className="font-semibold text-foreground">₹500</span> (₹200 Admin + ₹300 Super Admin)
            </p>
            <Button type="submit" disabled={loading} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : 'Pay ₹500 & Create Center'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
