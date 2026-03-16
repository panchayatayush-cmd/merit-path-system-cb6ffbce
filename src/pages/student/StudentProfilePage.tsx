import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Camera, Loader2 } from 'lucide-react';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const MAX_SIZE = 300;

function resizeAndCompress(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      if (w > MAX_SIZE || h > MAX_SIZE) {
        if (w > h) { h = Math.round(h * MAX_SIZE / w); w = MAX_SIZE; }
        else { w = Math.round(w * MAX_SIZE / h); h = MAX_SIZE; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/jpeg',
        0.8
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Invalid image')); };
    img.src = url;
  });
}

export default function StudentProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    father_name: '',
    class: '',
    mobile: '',
    school_name: '',
    school_mobile: '',
    school_address: '',
    school_village: '',
    school_block: '',
    school_tahsil: '',
    school_district: '',
    school_state: '',
    school_pin_code: '',
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
            school_village: (data as any).school_village ?? '',
            school_block: (data as any).school_block ?? '',
            school_tahsil: (data as any).school_tahsil ?? '',
            school_district: (data as any).school_district ?? '',
            school_state: (data as any).school_state ?? '',
            school_pin_code: (data as any).school_pin_code ?? '',
            village: data.village ?? '',
            block: data.block ?? '',
            tahsil: data.tahsil ?? '',
            district: data.district ?? '',
            state: data.state ?? '',
            pin_code: data.pin_code ?? '',
            center_code: data.center_code ?? '',
          });
          setPhotoUrl(data.photo_url ?? null);
        }
      });
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setUploading(true);
    try {
      const compressed = await resizeAndCompress(file);
      const path = `${user.id}/photo.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from('student-photos')
        .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('student-photos')
        .getPublicUrl(path);

      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ photo_url: url }).eq('user_id', user.id);
      setPhotoUrl(url);
      toast.success('Photo uploaded successfully');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (form.center_code) {
      const { data: center } = await supabase
        .from('centers')
        .select('id')
        .eq('center_code', form.center_code.toUpperCase())
        .maybeSingle();
      if (!center) {
        toast.error('Invalid center code. Please enter a valid center code.');
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

  const personalFields: { label: string; key: string; type?: string; required?: boolean; options?: string[] }[] = [
    { label: 'Full Name', key: 'full_name', required: true },
    { label: 'Father / Guardian Name', key: 'father_name', required: true },
    { label: 'Class (1-12)', key: 'class', type: 'number', required: true },
    { label: 'Mobile Number', key: 'mobile', required: true },
  ];

  const addressFields: { label: string; key: string; type?: string; required?: boolean; options?: string[] }[] = [
    { label: 'Village / Town', key: 'village', required: true },
    { label: 'Block', key: 'block' },
    { label: 'Tahsil', key: 'tahsil' },
    { label: 'District', key: 'district', required: true },
    { label: 'State', key: 'state', required: true, options: STATES },
    { label: 'PIN Code', key: 'pin_code', required: true },
  ];

  const schoolFields: { label: string; key: string; type?: string; required?: boolean; options?: string[] }[] = [
    { label: 'School Name', key: 'school_name', required: true },
    { label: 'School Mobile', key: 'school_mobile' },
    { label: 'School Address', key: 'school_address' },
  ];

  const centerFields: { label: string; key: string; type?: string; required?: boolean; options?: string[] }[] = [
    { label: 'Center Code', key: 'center_code', required: true },
  ];

  const renderField = (field: { label: string; key: string; type?: string; required?: boolean; options?: string[] }) => (
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
  );
  const initials = form.full_name
    ? form.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-base font-semibold text-foreground mb-1">Complete Your Profile</h1>
        <p className="text-sm text-muted-foreground mb-6">All required fields must be filled before taking the exam.</p>

        <form onSubmit={handleSubmit} className="card-shadow rounded-lg bg-card p-6 pb-32 space-y-6">
          {/* Photo Upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
              <Avatar className="h-24 w-24 border-2 border-primary/20">
                {photoUrl ? (
                  <AvatarImage src={photoUrl} alt="Student photo" />
                ) : null}
                <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">Click to upload photo (max 300×300, auto-compressed)</p>
          </div>

          {/* Personal Details */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">👤 Personal Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {personalFields.map((field) => renderField(field))}
            </div>
          </div>

          {/* User Address */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">🏠 Your Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addressFields.map((field) => renderField(field))}
            </div>
          </div>

          {/* School Details */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">🏫 School Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {schoolFields.map((field) => renderField(field))}
            </div>
          </div>

          {/* Center Code */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">📋 Center</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {centerFields.map((field) => renderField(field))}
            </div>
          </div>

          {/* Sticky Save Button above mobile bottom nav */}
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