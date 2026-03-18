import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import gphdmLogo from '@/assets/gphdm-logo.jpg';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const designations = [
  'General Manager / Media Prabhari (GMM)',
  'District Manager / Media Prabhari (DMM)',
  'Panchayat Sakhi / Kosha Adhyaksh (PSK)',
  'Exam Center Head (ECH)',
];

export default function JobApplicationPage() {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    father_name: '',
    contact_number: '',
    alternate_number: '',
    email: '',
    state: '',
    district: '',
    block: '',
    village: '',
    full_address: '',
    pin_code: '',
    designation: '',
    work_experience: '',
    date_of_birth: '',
  });

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

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const required = ['full_name', 'father_name', 'contact_number', 'email', 'state', 'district', 'block', 'village', 'full_address', 'pin_code', 'designation', 'date_of_birth'];
    for (const f of required) {
      if (!(form as any)[f]?.trim()) {
        toast.error(`Please fill: ${f.replace(/_/g, ' ')}`);
        return false;
      }
    }
    if (!termsAccepted) {
      toast.error('Please accept the terms and conditions');
      return false;
    }
    if (!/^\d{10}$/.test(form.contact_number)) {
      toast.error('Contact number must be 10 digits');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Please enter a valid email');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!scriptLoaded) {
      toast.error('Payment gateway loading, please wait...');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'job-application-payment',
        { body: { action: 'create-order' } }
      );

      if (orderError) throw new Error(orderError.message);
      if (orderData?.error) throw new Error(orderData.error);

      // Step 2: Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GPHDM',
        description: 'Job Application Fee - ₹250',
        order_id: orderData.razorpay_order_id,
        prefill: {
          name: form.full_name,
          email: form.email,
          contact: form.contact_number,
        },
        theme: { color: '#10b981' },
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'job-application-payment',
              {
                body: {
                  action: 'verify-and-save',
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  application_data: form,
                },
              }
            );

            if (verifyError) throw new Error(verifyError.message);
            if (verifyData?.error) throw new Error(verifyData.error);

            setSubmitted(true);
            toast.success('Application submitted successfully! ✅');
          } catch (err: any) {
            toast.error(err?.message ?? 'Verification failed');
          }
          setLoading(false);
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
      toast.error(error?.message ?? 'Something went wrong');
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle className="h-16 w-16 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Application Submitted!</h1>
          <p className="text-sm text-muted-foreground">
            Your application has been received and payment of ₹250 has been verified.
            We will contact you soon regarding the next steps.
          </p>
          <Link to="/">
            <Button variant="outline">← Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/">
            <ArrowLeft className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          </Link>
          <img src={gphdmLogo} alt="GPHDM" className="h-8 w-8 rounded-full object-cover" />
          <div>
            <h1 className="text-sm font-bold text-foreground">Job Application</h1>
            <p className="text-[10px] text-muted-foreground">GPHDM Position Application</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Personal Details */}
        <section className="card-shadow rounded-lg bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">Personal Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Full Name *</Label>
              <Input value={form.full_name} onChange={e => updateField('full_name', e.target.value)} placeholder="Enter full name" />
            </div>
            <div>
              <Label className="text-xs">Father Name *</Label>
              <Input value={form.father_name} onChange={e => updateField('father_name', e.target.value)} placeholder="Enter father name" />
            </div>
            <div>
              <Label className="text-xs">Contact Number *</Label>
              <Input value={form.contact_number} onChange={e => updateField('contact_number', e.target.value)} placeholder="10 digit number" maxLength={10} />
            </div>
            <div>
              <Label className="text-xs">Alternate Number</Label>
              <Input value={form.alternate_number} onChange={e => updateField('alternate_number', e.target.value)} placeholder="Optional" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Email *</Label>
              <Input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="your@email.com" />
            </div>
            <div>
              <Label className="text-xs">Date of Birth *</Label>
              <Input type="date" value={form.date_of_birth} onChange={e => updateField('date_of_birth', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="card-shadow rounded-lg bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">Address</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">State *</Label>
              <Input value={form.state} onChange={e => updateField('state', e.target.value)} placeholder="State" />
            </div>
            <div>
              <Label className="text-xs">District *</Label>
              <Input value={form.district} onChange={e => updateField('district', e.target.value)} placeholder="District" />
            </div>
            <div>
              <Label className="text-xs">Block *</Label>
              <Input value={form.block} onChange={e => updateField('block', e.target.value)} placeholder="Block" />
            </div>
            <div>
              <Label className="text-xs">Village *</Label>
              <Input value={form.village} onChange={e => updateField('village', e.target.value)} placeholder="Village" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Full Address *</Label>
              <Input value={form.full_address} onChange={e => updateField('full_address', e.target.value)} placeholder="Complete address" />
            </div>
            <div>
              <Label className="text-xs">Pin Code *</Label>
              <Input value={form.pin_code} onChange={e => updateField('pin_code', e.target.value)} placeholder="6 digit pin" maxLength={6} />
            </div>
          </div>
        </section>

        {/* Job Details */}
        <section className="card-shadow rounded-lg bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">Job Details</h2>
          <div>
            <Label className="text-xs">Designation *</Label>
            <Select value={form.designation} onValueChange={v => updateField('designation', v)}>
              <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
              <SelectContent>
                {designations.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Work Experience</Label>
            <Textarea value={form.work_experience} onChange={e => updateField('work_experience', e.target.value)} placeholder="Describe your relevant work experience..." rows={3} />
          </div>
        </section>

        {/* Terms */}
        <section className="card-shadow rounded-lg bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">Terms & Conditions</h2>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>• ₹250 is a non-refundable charity/application fee.</p>
            <p>• Selection is not guaranteed by submitting this application.</p>
            <p>• All disputes are subject to Varanasi jurisdiction.</p>
            <p>• Salary and target conditions as per organization policy.</p>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(v) => setTermsAccepted(v === true)}
            />
            <Label htmlFor="terms" className="text-xs text-foreground cursor-pointer">
              I accept all terms and conditions mentioned above. I understand that ₹250 is non-refundable.
            </Label>
          </div>
        </section>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={loading || !termsAccepted}
          className="w-full"
          size="lg"
        >
          {loading ? 'Processing...' : 'Apply & Pay ₹250'}
        </Button>
      </div>
    </div>
  );
}
