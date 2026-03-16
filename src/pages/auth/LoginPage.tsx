import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user, role } = useAuth();
  const navigate = useNavigate();

  // Redirect after role is loaded
  useEffect(() => {
    if (user && role) {
      const dashboardMap: Record<string, string> = {
        student: '/student',
        center: '/center',
        admin: '/admin',
        super_admin: '/super-admin',
      };
      navigate(dashboardMap[role] ?? '/', { replace: true });
    }
  }, [user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      toast.success('Login successful');
    } catch (error: any) {
      toast.error(error?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md card-shadow rounded-lg bg-card p-8 animate-fade-in">
        <h1 className="text-xl font-semibold text-foreground mb-1">Sign In</h1>
        <p className="text-sm text-muted-foreground mb-6">Scholarship Examination 2026</p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Enter your password"
            />
          </div>

          <div className="flex justify-end">
            <Link to="/auth/forgot-password" className="text-sm text-accent hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/auth/register" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
