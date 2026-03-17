import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type RegisterRole = 'student' | 'center';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const CENTER_FEE = 500;

const CENTER_TYPE_OPTIONS = [
  { value: 'school', label: 'School' },
  { value: 'coaching_center', label: 'Coaching Center' },
  { value: 'institute', label: 'Institute' },
  { value: 'other', label: 'Other' },
];

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<RegisterRole>('student');
  const [loading, setLoading] = useState(false);
  const { refreshRole } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Center-specific fields
  const [centerName, setCenterName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [adminCodeValid, setAdminCodeValid] = useState<boolean | null>(null);
  const [adminCodeLoading, setAdminCodeLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Address fields
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [fullAddress, setFullAddress] = useState('');

  // Institute fields
  const [centerType, setCenterType] = useState('school');
  const [instituteName, setInstituteName] = useState('');
  const [establishedYear, setEstablishedYear] = useState('');
  const [capacity, setCapacity] = useState('');

  const refFromUrl = searchParams.get('ref') ?? '';

  // Load Razorpay script for center registration
  useEffect(() => {
    if (role === 'center') {
      if (!document.getElementById('razorpay-script')) {
        const script = document.createElement('script');
        script.id = 'razorpay-script';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => setScriptLoaded(true);
        document.body.appendChild(script);
      } else {
        setScriptLoaded(true);
      }
    }
  }, [role]);

  // Validate admin code
  const validateAdminCode = async (code: string) => {
    if (!code.trim()) {
      setAdminCodeValid(null);
      setAdminName('');
      setAdminUserId(null);
      return;
    }
    setAdminCodeLoading(true);
    try {
      const { data, error } = await supabase.rpc('validate_admin_code', { _code: code.trim().toUpperCase() });
      if (error) throw error;
      if (data && data.length > 0 && data[0].is_valid) {
        setAdminCodeValid(true);
        setAdminName(data[0].admin_name || 'Admin');
        setAdminUserId(data[0].admin_user_id);
      } else {
        setAdminCodeValid(false);
        setAdminName('');
        setAdminUserId(null);
      }
    } catch {
      setAdminCodeValid(false);
      setAdminName('');
      setAdminUserId(null);
    } finally {
      setAdminCodeLoading(false);
    }
  };

  // Student registration
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      let validatedReferredBy: string | null = null;
      let referrerCenterCode: string | null = null;

      if (refFromUrl.trim()) {
        const refCode = refFromUrl.trim();
        const { data: isValid } = await supabase.rpc('validate_referral_code', { _code: refCode });
        if (isValid) {
          validatedReferredBy = refCode;
          const { data: referrerProfile } = await supabase
            .from('profiles').select('center_code').eq('referral_code', refCode).maybeSingle();
          if (referrerProfile?.center_code) referrerCenterCode = referrerProfile.center_code;
        }
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email, password, options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) throw signUpError;

      const session = data.session;
      if (!session?.user) throw new Error('Registration failed – no session.');
      const userId = session.user.id;

      if (validatedReferredBy) {
        const { data: selfCheck } = await supabase.from('profiles').select('referral_code').eq('user_id', userId).maybeSingle();
        if (selfCheck?.referral_code === validatedReferredBy) { validatedReferredBy = null; referrerCenterCode = null; }
      }

      await supabase.from('user_roles').insert({ user_id: userId, role: 'student' });
      await supabase.from('wallets').insert({ user_id: userId, role: 'student', balance: 0 });
      await supabase.from('profiles').update({ center_code: referrerCenterCode, referred_by: validatedReferredBy }).eq('user_id', userId);

      await refreshRole();
      toast.success('Registration successful!');
      navigate('/student/profile');
    } catch (error: any) {
      toast.error(error?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Center registration with Razorpay
  const handleCenterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (!adminCodeValid) { toast.error('Please enter a valid Admin Code'); return; }
    if (mobile.length !== 10) { toast.error('Mobile number must be 10 digits'); return; }
    if (pincode.length !== 6) { toast.error('Pincode must be 6 digits'); return; }
    if (!scriptLoaded) { toast.error('Payment gateway loading, please wait...'); return; }

    setLoading(true);
    try {
      // 1. Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email, password, options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) throw signUpError;

      const session = data.session;
      if (!session?.user) throw new Error('Registration failed – no session.');
      const userId = session.user.id;

      // 2. Assign center role
      const { error: roleError } = await supabase.from('user_roles').insert({ user_id: userId, role: 'center' });
      if (roleError) throw roleError;

      // 3. Create wallet
      await supabase.from('wallets').insert({ user_id: userId, role: 'center', balance: 0 });

      // 4. Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke('razorpay-create-order', {
        body: { amount: CENTER_FEE, order_type: 'center_registration' },
      });
      if (orderError) throw new Error(orderError.message);
      if (orderData?.error) throw new Error(orderData.error);

      // 5. Open Razorpay Checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GPHDM EXAMS',
        description: 'Center Registration Fee - ₹500',
        order_id: orderData.razorpay_order_id,
        prefill: { name: ownerName, email, contact: mobile },
        theme: { color: '#10b981' },
        handler: async (response: any) => {
          try {
            // Verify payment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay-verify-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                db_order_id: orderData.db_order_id,
              },
            });
            if (verifyError) throw new Error(verifyError.message);
            if (verifyData?.error) throw new Error(verifyData.error);

            // Generate center code
            const { data: codeData } = await supabase.rpc('generate_center_code');
            const centerCode = codeData || `CTR${Math.floor(1000 + Math.random() * 9000)}`;

            // Create center record - auto approved
            const { error: centerError } = await supabase.from('centers').insert({
              center_name: centerName,
              owner_name: ownerName,
              mobile,
              state,
              district,
              city,
              pincode,
              full_address: fullAddress,
              center_type: centerType,
              institute_name: instituteName,
              established_year: establishedYear ? parseInt(establishedYear) : null,
              capacity: capacity ? parseInt(capacity) : null,
              email,
              center_code: centerCode,
              user_id: userId,
              admin_id: adminUserId,
              status: 'approved',
              is_active: true,
              payment_verified: true,
            } as any);
            if (centerError) throw centerError;

            await refreshRole();
            toast.success(`Center registered! Code: ${centerCode} ✅`);
            navigate('/center');
          } catch (err: any) {
            toast.error(err?.message ?? 'Payment verification failed');
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast.info('Payment cancelled. Your account was created — please login and complete payment.');
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
      toast.error(error?.message ?? 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4 py-8">
      <div className="w-full max-w-md card-shadow rounded-lg bg-card p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-3 w-3" /> {t('home')}
          </Link>
          <LanguageToggle />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-1">{t('createAccount')}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t('scholarshipExam2026')}</p>

        {refFromUrl && role === 'student' && (
          <div className="mb-4 rounded-md border border-emerald-400 bg-emerald-50 px-3 py-2.5 text-sm" style={{ color: '#065f46' }}>
            <p className="font-semibold">{t('referralDetected')}</p>
            <p className="mt-0.5">{t('referralAutoApply')}</p>
          </div>
        )}

        {/* Role Tabs */}
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => setRole('student')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-150 ${role === 'student' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
            {t('student')}
          </button>
          <button type="button" onClick={() => setRole('center')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-150 ${role === 'center' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
            {t('center')}
          </button>
        </div>

        {/* Student Form */}
        {role === 'student' && (
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder={t('emailPlaceholder')} />
            </div>
            <div>
              <Label htmlFor="password">{t('password')}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder={t('minChars')} />
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder={t('confirmYourPassword')} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('creatingAccount') : t('createAccount')}
            </Button>
          </form>
        )}

        {/* Center Form */}
        {role === 'center' && (
          <form onSubmit={handleCenterSubmit} className="space-y-5">
            {/* Section: Basic Info */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-foreground border-b border-border pb-1 mb-2">Basic Info</legend>
              <div>
                <Label>Center Name <span className="text-destructive">*</span></Label>
                <Input value={centerName} onChange={(e) => setCenterName(e.target.value)} required placeholder="Enter center name" />
              </div>
              <div>
                <Label>Center Owner Name <span className="text-destructive">*</span></Label>
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required placeholder="Enter owner name" />
              </div>
              <div>
                <Label>Mobile Number <span className="text-destructive">*</span></Label>
                <Input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} required placeholder="10-digit mobile number" maxLength={10} />
              </div>
            </fieldset>

            {/* Section: Address Details */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-foreground border-b border-border pb-1 mb-2">Address Details</legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>State <span className="text-destructive">*</span></Label>
                  <Input value={state} onChange={(e) => setState(e.target.value)} required placeholder="State" />
                </div>
                <div>
                  <Label>District <span className="text-destructive">*</span></Label>
                  <Input value={district} onChange={(e) => setDistrict(e.target.value)} required placeholder="District" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City / Village <span className="text-destructive">*</span></Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} required placeholder="City / Village" />
                </div>
                <div>
                  <Label>Pincode <span className="text-destructive">*</span></Label>
                  <Input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} required placeholder="6-digit pincode" maxLength={6} />
                </div>
              </div>
              <div>
                <Label>Full Address</Label>
                <textarea
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="Enter full address (optional)"
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </fieldset>

            {/* Section: Institute Details */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-foreground border-b border-border pb-1 mb-2">Institute Details</legend>
              <div>
                <Label>Center Type <span className="text-destructive">*</span></Label>
                <select
                  value={centerType}
                  onChange={(e) => setCenterType(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {CENTER_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Institute Name <span className="text-destructive">*</span></Label>
                <Input value={instituteName} onChange={(e) => setInstituteName(e.target.value)} required placeholder="Enter institute / school name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Established Year</Label>
                  <Input type="number" value={establishedYear} onChange={(e) => setEstablishedYear(e.target.value)} placeholder="e.g. 2010" min={1900} max={2026} />
                </div>
                <div>
                  <Label>Total Capacity</Label>
                  <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 200" min={1} />
                </div>
              </div>
            </fieldset>

            {/* Section: Admin Linking */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-foreground border-b border-border pb-1 mb-2">Admin Linking</legend>
              <div>
                <Label>Admin Code <span className="text-destructive">*</span></Label>
                <Input
                  value={adminCode}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase();
                    setAdminCode(v);
                    setAdminCodeValid(null);
                    setAdminName('');
                  }}
                  onBlur={() => validateAdminCode(adminCode)}
                  required
                  placeholder="Enter admin code (e.g. ADM123456)"
                  className={adminCodeValid === false ? 'border-destructive' : adminCodeValid === true ? 'border-emerald-500' : ''}
                />
                {adminCodeLoading && <p className="text-xs text-muted-foreground mt-1">Validating...</p>}
                {adminCodeValid === false && <p className="text-xs text-destructive mt-1">Invalid Admin Code</p>}
                {adminCodeValid === true && <p className="text-xs text-emerald-600 mt-1">✓ Valid Admin Code</p>}
              </div>
              {adminCodeValid && (
                <div>
                  <Label>Admin Name</Label>
                  <Input value={adminName} readOnly className="bg-muted" />
                </div>
              )}
            </fieldset>

            {/* Section: Account Setup */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-foreground border-b border-border pb-1 mb-2">Account Setup</legend>
              <div>
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Enter email" />
              </div>
              <div>
                <Label>Password <span className="text-destructive">*</span></Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 6 characters" />
              </div>
              <div>
                <Label>Confirm Password <span className="text-destructive">*</span></Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Confirm password" />
              </div>
            </fieldset>

            <Button type="submit" className="w-full" disabled={loading || !adminCodeValid}>
              {loading ? 'Processing...' : 'Register & Pay ₹500'}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('alreadyHaveAccount')}{' '}
          <Link to="/auth/login" className="text-accent hover:underline">{t('signIn')}</Link>
        </p>
      </div>
    </div>
  );
}
