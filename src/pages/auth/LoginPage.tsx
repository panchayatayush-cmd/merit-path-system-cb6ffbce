import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
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
  const { t } = useLanguage();
  const navigate = useNavigate();

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
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-3 w-3" /> {t('home')}
          </Link>
          <LanguageToggle />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-1">{t('signIn')}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t('scholarshipExam2026')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder={t('emailPlaceholder')} />
          </div>

          <div>
            <Label htmlFor="password">{t('password')}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder={t('enterYourPassword')} />
          </div>

          <div className="flex justify-end">
            <Link to="/auth/forgot-password" className="text-sm text-accent hover:underline">
              {t('forgotPassword')}
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('signingIn') : t('signIn')}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('dontHaveAccount')}{' '}
          <Link to="/auth/register" className="text-accent hover:underline">
            {t('createOne')}
          </Link>
        </p>
      </div>
    </div>
  );
}
