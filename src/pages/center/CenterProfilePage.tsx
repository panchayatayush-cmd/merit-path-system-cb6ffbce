import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

type FieldDef = { label: string; key: string; type?: string; required?: boolean; options?: string[] };

export default function CenterProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState<boolean | null>(null);
  const [form, setForm] = useState({
    center_name: '',
    contact_person: '',
    mobile: '',
    email: '',
    address: '',
    owner_village: '',
    owner_block: '',
    owner_tahsil: '',
    owner_district: '',
    owner_state: '',
    owner_pin_code: '',
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Check payment status
      const { data: paymentData } = await supabase
        .from('payment_orders')
        .select('status')
        .eq('user_id', user.id)
        .eq('order_type', 'center_registration')
        .eq('status', 'verified')
        .limit(1)
        .maybeSingle();
      setPaymentVerified(paymentData?.status === 'verified');

      const { data } = await supabase
        .from('centers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setForm({
          center_name: data.center_name ?? '',
          contact_person: data.contact_person ?? '',
          mobile: data.mobile ?? '',
          email: data.email ?? '',
          address: data.address ?? '',
          owner_village: (data as any).owner_village ?? '',
          owner_block: (data as any).owner_block ?? '',
          owner_tahsil: (data as any).owner_tahsil ?? '',
          owner_district: (data as any).owner_district ?? '',
          owner_state: (data as any).owner_state ?? '',
          owner_pin_code: (data as any).owner_pin_code ?? '',
        });
      }
    };
    load();
  }, [user]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('centers')
        .update(form as any)
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('Profile saved successfully');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const centerFields: FieldDef[] = [
    { label: 'Center Name', key: 'center_name', required: true },
    { label: 'Contact Person', key: 'contact_person', required: true },
    { label: 'Mobile', key: 'mobile', required: true },
    { label: 'Email', key: 'email', type: 'email' },
  ];

  const ownerAddressFields: FieldDef[] = [
    { label: 'Address / Street', key: 'address' },
    { label: 'Village / Town', key: 'owner_village', required: true },
    { label: 'Block', key: 'owner_block' },
    { label: 'Tahsil', key: 'owner_tahsil' },
    { label: 'District', key: 'owner_district', required: true },
    { label: 'State', key: 'owner_state', required: true, options: STATES },
    { label: 'PIN Code', key: 'owner_pin_code', required: true },
  ];

  const renderField = (field: FieldDef) => (
    <div key={field.key}>
      <Label htmlFor={field.key}>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {field.options ? (
        <select
          id={field.key}
          value={(form as any)[field.key]}
          onChange={(e) => handleChange(field.key, e.target.value)}
          required={field.required}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Select {field.label}</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <Input
          id={field.key}
          type={field.type ?? 'text'}
          value={(form as any)[field.key]}
          onChange={(e) => handleChange(field.key, e.target.value)}
          required={field.required}
        />
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-base font-semibold text-foreground mb-1">Center Profile</h1>
        <p className="text-sm text-muted-foreground mb-6">Update your center and owner details.</p>

        <form onSubmit={handleSubmit} className="card-shadow rounded-lg bg-card p-6 pb-32 space-y-6">
          {/* Center Info */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">🏢 Center Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {centerFields.map((f) => renderField(f))}
            </div>
          </div>

          {/* Owner Address */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">🏠 Owner / Center Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ownerAddressFields.map((f) => renderField(f))}
            </div>
          </div>

          {/* Sticky Save */}
          <div className="fixed bottom-16 left-0 right-0 lg:relative lg:bottom-auto p-4 lg:p-0 bg-background/95 backdrop-blur-sm border-t border-border lg:border-0 lg:bg-transparent z-40">
            <Button type="submit" className="w-full lg:w-auto" disabled={loading}>
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
