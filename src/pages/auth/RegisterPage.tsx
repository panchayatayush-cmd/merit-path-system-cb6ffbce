import { useState } from 'react';
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

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<RegisterRole>('student');
  const [centerName, setCenterName] = useState('');
  const [adminCenterCode, setAdminCenterCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshRole } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const refFromUrl = searchParams.get('ref') ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      let validatedReferredBy: string | null = null;
      let referrerCenterCode: string | null = null;

      if (role === 'student' && refFromUrl.trim()) {
        const refCode = refFromUrl.trim();
        const { data: isValid } = await supabase.rpc('validate_referral_code', { _code: refCode });
        if (isValid) {
          validatedReferredBy = refCode;
          const { data: referrerProfile } = await supabase
            .from('profiles')
            .select('center_code')
            .eq('referral_code', refCode)
            .maybeSingle();
          if (referrerProfile?.center_code) {
            referrerCenterCode = referrerProfile.center_code;
          }
        }
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) throw signUpError;

      const session = data.session;
      if (!session?.user) throw new Error('Registration failed – no session. Please try again.');
      const userId = session.user.id;

      if (validatedReferredBy) {
        const { data: selfCheck } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('user_id', userId)
          .maybeSingle();
        if (selfCheck?.referral_code === validatedReferredBy) {
          validatedReferredBy = null;
          referrerCenterCode = null;
        }
      }

      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: role,
      });
      if (roleError) throw roleError;

      if (role === 'center') {
        const { data: codeData } = await supabase.rpc('generate_center_code');
        const centerCode = codeData ?? `CTR${Math.floor(1000 + Math.random() * 9000)}`;

        let adminId: string | null = null;
        if (adminCenterCode.trim()) {
          const { data: adminCenter } = await supabase
            .from('centers')
            .select('user_id')
            .eq('center_code', adminCenterCode.trim().toUpperCase())
            .maybeSingle();
          if (adminCenter) {
            adminId = adminCenter.user_id;
          }
        }

        const { error: centerError } = await supabase.from('centers').insert({
          user_id: userId,
          center_name: centerName,
          center_code: centerCode,
          email: email,
          admin_id: adminId,
        } as any);
        if (centerError) throw centerError;
      }

      await supabase.from('wallets').insert({
        user_id: userId,
        role: role,
        balance: 0,
      });

      if (role === 'student') {
        await supabase
          .from('profiles')
          .update({
            center_code: referrerCenterCode,
            referred_by: validatedReferredBy,
          })
          .eq('user_id', userId);
      }

      await refreshRole();
      toast.success('Registration successful!');
      navigate(role === 'student' ? '/student/profile' : '/center');
    } catch (error: any) {
      toast.error(error?.message ?? 'Registration failed');
    } finally {
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

        {refFromUrl && (
          <div className="mb-4 rounded-md border border-emerald-400 bg-emerald-50 px-3 py-2.5 text-sm" style={{ color: '#065f46' }}>
            <p className="font-semibold">{t('referralDetected')}</p>
            <p className="mt-0.5">{t('referralAutoApply')}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                role === 'student'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {t('student')}
            </button>
            <button
              type="button"
              onClick={() => setRole('center')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                role === 'center'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {t('center')}
            </button>
          </div>

          {role === 'center' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="centerName">{t('centerName')}</Label>
                <Input id="centerName" value={centerName} onChange={(e) => setCenterName(e.target.value)} required placeholder={t('enterCenterName')} />
              </div>
              <div>
                <Label htmlFor="adminCenterCode">{t('adminCenterCode')}</Label>
                <Input id="adminCenterCode" value={adminCenterCode} onChange={(e) => setAdminCenterCode(e.target.value)} placeholder={t('enterAdminCenterCode')} />
                <p className="text-xs text-muted-foreground mt-1">{t('adminCenterCodeHint')}</p>
              </div>
            </div>
          )}

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

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('alreadyHaveAccount')}{' '}
          <Link to="/auth/login" className="text-accent hover:underline">
            {t('signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
