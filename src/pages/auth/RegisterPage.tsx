import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type RegisterRole = 'student' | 'center';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<RegisterRole>('student');
  const [centerName, setCenterName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, refreshRole } = useAuth();
  const navigate = useNavigate();

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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) throw signUpError;

      // With auto-confirm, session is returned immediately
      const session = data.session;
      if (!session?.user) throw new Error('Registration failed – no session. Please try again.');
      const userId = session.user.id;

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

        const { error: centerError } = await supabase.from('centers').insert({
          user_id: userId,
          center_name: centerName,
          center_code: centerCode,
          email: email,
        });
        if (centerError) throw centerError;
      }

      // Create wallet
      await supabase.from('wallets').insert({
        user_id: userId,
        role: role,
        balance: 0,
      });

      toast.success('Registration successful!');
      navigate(role === 'student' ? '/student/profile' : '/center');
    } catch (error: any) {
      toast.error(error?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md card-shadow rounded-lg bg-card p-8 animate-fade-in">
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
