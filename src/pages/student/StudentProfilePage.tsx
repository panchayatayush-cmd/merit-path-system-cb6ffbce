import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export default function StudentProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    father_name: '',
    class: '',
    mobile: '',
    school_name: '',
    school_mobile: '',
    school_address: '',
    village: '',
    block: '',
    tahsil: '',
    district: '',
    state: '',
    pin_code: '',
    center_code: '',
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            full_name: data.full_name ?? '',
            father_name: data.father_name ?? '',
            class: data.class?.toString() ?? '',
            mobile: data.mobile ?? '',
            school_name: data.school_name ?? '',
            school_mobile: data.school_mobile ?? '',
            school_address: data.school_address ?? '',
            village: data.village ?? '',
            block: data.block ?? '',
            tahsil: data.tahsil ?? '',
            district: data.district ?? '',
            state: data.state ?? '',
            pin_code: data.pin_code ?? '',
            center_code: data.center_code ?? '',
          });
        }
      });
  }, [user]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate center code
    if (form.center_code) {
      const { data: center } = await supabase
        .from('centers')
        .select('id')
        .eq('center_code', form.center_code.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();
      if (!center) {
        toast.error('Invalid or inactive center code');
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...form,
          class: parseInt(form.class) || null,
          center_code: form.center_code.toUpperCase(),
          profile_completed: true,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Profile saved successfully');
      navigate('/student');
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const fields: { label: string; key: string; type?: string; required?: boolean; options?: string[] }[] = [
    { label: 'Full Name', key: 'full_name', required: true },
    { label: 'Father / Guardian Name', key: 'father_name', required: true },
    { label: 'Class (1-12)', key: 'class', type: 'number', required: true },
    { label: 'Mobile Number', key: 'mobile', required: true },
    { label: 'School Name', key: 'school_name', required: true },
    { label: 'School Mobile', key: 'school_mobile' },
    { label: 'School Address', key: 'school_address' },
    { label: 'Village', key: 'village' },
    { label: 'Block', key: 'block' },
    { label: 'Tahsil', key: 'tahsil' },
    { label: 'District', key: 'district', required: true },
    { label: 'State', key: 'state', required: true, options: STATES },
    { label: 'PIN Code', key: 'pin_code', required: true },
    { label: 'Center Code', key: 'center_code', required: true },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-base font-semibold text-foreground mb-1">Complete Your Profile</h1>
        <p className="text-sm text-muted-foreground mb-6">All required fields must be filled before taking the exam.</p>

        <form onSubmit={handleSubmit} className="card-shadow rounded-lg bg-card p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((field) => (
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
                    min={field.type === 'number' ? '1' : undefined}
                    max={field.type === 'number' ? '12' : undefined}
                  />
                )}
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
