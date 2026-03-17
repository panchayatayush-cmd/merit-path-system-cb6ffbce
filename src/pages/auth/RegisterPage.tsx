import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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
  // Student-specific fields
  const [studentCenterCode, setStudentCenterCode] = useState('');
  const [studentReferralCode, setStudentReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, refreshRole } = useAuth();
  const navigate = useNavigate();

  // Auto-detect referral codes from URL params
  const refFromUrl = searchParams.get('ref') ?? '';
  const centerFromUrl = searchParams.get('center') ?? '';

  useEffect(() => {
    if (refFromUrl) {
      setStudentReferralCode(refFromUrl);
    }
    if (centerFromUrl) {
      setStudentCenterCode(centerFromUrl);
    }
  }, [refFromUrl, centerFromUrl]);

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
      // --- Pre-signup validation for student codes ---
      let validatedCenterCode: string | null = null;
      let validatedReferredBy: string | null = null;

      if (role === 'student') {
        // Validate Center Code if provided
        if (studentCenterCode.trim()) {
          const code = studentCenterCode.trim().toUpperCase();
          const { data: isValid } = await supabase.rpc('validate_center_code', { _code: code });
          if (!isValid) {
            toast.error('Invalid Center Code. Please check and try again.');
            setLoading(false);
            return;
          }
          validatedCenterCode = code;
        }

        // Validate Student Referral Code if provided
        if (studentReferralCode.trim()) {
          const refCode = studentReferralCode.trim();
          const { data: isValid } = await supabase.rpc('validate_referral_code', { _code: refCode });
          if (!isValid) {
            toast.error('Invalid Student Referral Code. Please check and try again.');
            setLoading(false);
            return;
          }
          validatedReferredBy = refCode;
        }
      }

      // --- Sign up ---
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) throw signUpError;

      const session = data.session;
      if (!session?.user) throw new Error('Registration failed – no session. Please try again.');
      const userId = session.user.id;

      // Prevent self-referral
      if (validatedReferredBy) {
        const { data: selfCheck } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('user_id', userId)
          .maybeSingle();
        if (selfCheck?.referral_code === validatedReferredBy) {
          validatedReferredBy = null;
          toast.warning('You cannot use your own referral code.');
        }
      }

      // Assign role
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: role,
      });
      if (roleError) throw roleError;

      // If center, create center record
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

      // Create wallet
      await supabase.from('wallets').insert({
        user_id: userId,
        role: role,
        balance: 0,
      });

      // For students: store center_code & referred_by (NO referral code generation - that happens after payment)
      if (role === 'student') {
        await supabase
          .from('profiles')
          .update({
            center_code: validatedCenterCode,
            referred_by: validatedReferredBy,
          })
          .eq('user_id', userId);
      }

      // Refresh role in AuthContext so RoleGuard works
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
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ChevronLeft className="h-3 w-3" /> Home
        </Link>
        <h1 className="text-xl font-semibold text-foreground mb-1">Create Account</h1>
        <p className="text-sm text-muted-foreground mb-6">Scholarship Examination 2026</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role selector */}
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
              Student
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
              Center
            </button>
          </div>

          {role === 'center' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="centerName">Center Name</Label>
                <Input
                  id="centerName"
                  value={centerName}
                  onChange={(e) => setCenterName(e.target.value)}
                  required
                  placeholder="Enter center name"
                />
              </div>
              <div>
                <Label htmlFor="adminCenterCode">Admin Center Code (Optional)</Label>
                <Input
                  id="adminCenterCode"
                  value={adminCenterCode}
                  onChange={(e) => setAdminCenterCode(e.target.value)}
                  placeholder="Enter admin's center code"
                />
                <p className="text-xs text-muted-foreground mt-1">Admin का Center Code डालें जिसने आपको register किया है।</p>
              </div>
            </div>
          )}

          {role === 'student' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="studentCenterCode">Center Code (Optional)</Label>
                <Input
                  id="studentCenterCode"
                  value={studentCenterCode}
                  onChange={(e) => !centerFromUrl && setStudentCenterCode(e.target.value)}
                  readOnly={!!centerFromUrl}
                  placeholder="Enter center code"
                  className={centerFromUrl ? 'bg-muted cursor-not-allowed' : ''}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {centerFromUrl
                    ? '✅ Center Code automatically applied from link.'
                    : 'अगर आप किसी Center से जुड़े हैं तो उनका Center Code डालें।'}
                </p>
              </div>
              <div>
                <Label htmlFor="studentReferralCode">Student Referral Code (Optional)</Label>
                <Input
                  id="studentReferralCode"
                  value={studentReferralCode}
                  onChange={(e) => !refFromUrl && setStudentReferralCode(e.target.value)}
                  readOnly={!!refFromUrl}
                  placeholder="Enter student referral code"
                  className={refFromUrl ? 'bg-muted cursor-not-allowed' : ''}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {refFromUrl
                    ? '✅ Referral Code automatically applied from link.'
                    : 'किसी Student का Referral Code डालें अगर आपके पास है।'}
                </p>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Min 6 characters"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
