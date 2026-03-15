import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { BookOpen, Shield, Award } from 'lucide-react';

export default function Index() {
  const { user, role } = useAuth();

  const dashboardMap: Record<string, string> = {
    student: '/student',
    center: '/center',
    admin: '/admin',
    super_admin: '/super-admin',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-foreground tracking-tight">Scholarship Exam</h1>
          <div className="flex gap-2">
            {user && role ? (
              <Link to={dashboardMap[role] ?? '/'}>
                <Button variant="outline" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth/login">
                  <Button variant="outline" size="sm">Sign In</Button>
                </Link>
                <Link to="/auth/register">
                  <Button size="sm">Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-16 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-widest text-primary mb-3">
            2024 Scholarship Program
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tighter leading-tight">
            Scholarship Examination 2024: Secure your future.
          </h2>
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed max-w-lg">
            Register, complete your profile, pay the exam fee, and take the 60-question scholarship exam.
            Top scorers receive certificates and scholarship funding.
          </p>
          <div className="flex gap-3 mt-8">
            <Link to="/auth/register">
              <Button size="lg">Register as Student</Button>
            </Link>
            <Link to="/verify">
              <Button variant="outline" size="lg">Verify Certificate</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-5xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <BookOpen className="h-5 w-5 text-primary mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">60-Question Exam</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Timed questions with auto-progression. One attempt, no going back. Pure merit.
            </p>
          </div>
          <div>
            <Shield className="h-5 w-5 text-primary mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">Secure & Transparent</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Razorpay-verified payments. Transparent wallet system. Every transaction recorded.
            </p>
          </div>
          <div>
            <Award className="h-5 w-5 text-primary mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">Digital Certificates</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Auto-generated certificates with QR code verification. Download and share instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Fees */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h3 className="text-sm font-semibold text-foreground mb-6">Exam Fees</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { classes: 'Class 1–5', fee: '₹250' },
              { classes: 'Class 6–8', fee: '₹300' },
              { classes: 'Class 9–12', fee: '₹350' },
            ].map((item) => (
              <div key={item.classes} className="card-shadow rounded-lg bg-card p-6 text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{item.classes}</p>
                <p className="text-2xl font-bold tabular-nums tracking-tighter text-foreground mt-2">{item.fee}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© 2024 Scholarship Examination</span>
          <Link to="/verify" className="text-accent hover:underline">Verify Certificate</Link>
        </div>
      </footer>
    </div>
  );
}
