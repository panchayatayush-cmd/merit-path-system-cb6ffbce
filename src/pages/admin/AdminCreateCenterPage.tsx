import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, ExternalLink, ArrowRight } from 'lucide-react';

const RAZORPAY_PAYMENT_LINK = 'https://razorpay.me/@grampanchayathelpdeskmission';

export default function AdminCreateCenterPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    center_name: '',
    owner_name: '',
    mobile: '',
    address: '',
    email: '',
  });
  const [utr, setUtr] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmitWithUTR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utr.trim()) {
      toast.error('Please enter the UTR / Transaction ID');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('centers').insert({
        center_name: form.center_name,
        owner_name: form.owner_name,
        mobile: form.mobile,
        address: form.address,
        email: form.email || null,
        payment_utr: utr.trim(),
        center_code: 'PENDING',
        user_id: user.id,
        admin_id: user.id,
        status: 'pending',
        is_active: false,
        payment_verified: false,
      });

      if (error) throw error;

      toast.success('Center request submitted! Awaiting Super Admin approval.');
      setForm({ center_name: '', owner_name: '', mobile: '', address: '', email: '' });
      setUtr('');
      setStep(1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit center request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-lg">
        <h1 className="text-base font-semibold text-foreground">Create New Center</h1>
        <p className="text-sm text-muted-foreground">
          Fill center details, pay ₹500 via payment link, and submit UTR for verification.
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`px-2 py-1 rounded ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1. Details</span>
          <ArrowRight className="h-3 w-3" />
          <span className={`px-2 py-1 rounded ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2. Payment</span>
          <ArrowRight className="h-3 w-3" />
          <span className={`px-2 py-1 rounded ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3. UTR</span>
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
              Next: Payment Instructions <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        )}

        {/* Step 2: Payment Instructions */}
        {step === 2 && (
          <div className="card-shadow rounded-lg bg-card p-5 space-y-4">
            <div className="bg-accent/50 rounded-md p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">💳 Center Creation Fee: ₹500</h3>
              <p className="text-xs text-muted-foreground">
                To create a center you must pay ₹500 center creation fee. Click the link below to complete payment via Razorpay.
              </p>
            </div>

            <a
              href={RAZORPAY_PAYMENT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Pay ₹500 Here
            </a>

            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-xs text-muted-foreground">
                <strong>Distribution:</strong> ₹200 → Admin Wallet | ₹300 → Super Admin Wallet
              </p>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-3">
                ✅ After successful payment, click below to enter your UTR / Transaction ID.
              </p>
              <Button onClick={() => setStep(3)} className="w-full">
                I have paid — Enter UTR <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="w-full text-xs">
              ← Back to details
            </Button>
          </div>
        )}

        {/* Step 3: UTR Submission */}
        {step === 3 && (
          <form onSubmit={handleSubmitWithUTR} className="card-shadow rounded-lg bg-card p-5 space-y-4">
            <div className="bg-accent/50 rounded-md p-3">
              <p className="text-xs text-muted-foreground">
                <strong>Center:</strong> {form.center_name} | <strong>Owner:</strong> {form.owner_name}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="utr">Payment UTR / Transaction ID *</Label>
              <Input
                id="utr"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="Enter UTR or Transaction ID"
                required
              />
              <p className="text-xs text-muted-foreground">
                You can find the UTR number in your payment confirmation SMS or bank statement.
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Submitting...' : 'Submit Center Request'}
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="w-full text-xs">
              ← Back to payment
            </Button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
