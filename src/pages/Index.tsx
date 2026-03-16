import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { BookOpen, Shield, Award, Users, Trophy, Gift, TrendingUp, Star, ChevronRight } from 'lucide-react';

const scholarshipTiers = [
  { rank: 'Rank 1', prize: '₹10,000', category: 'TOP RANK', highlight: true },
  { rank: 'Rank 2', prize: '₹7,000', category: 'TOP RANK', highlight: true },
  { rank: 'Rank 3', prize: '₹5,000', category: 'TOP RANK', highlight: true },
  { rank: 'Rank 4–10', prize: '₹2,500/student', category: 'ELITE RANK', students: 7, total: '₹17,500' },
  { rank: 'Rank 11–25', prize: '₹1,500/student', category: 'ADVANCED RANK', students: 15, total: '₹22,500' },
  { rank: 'Rank 26–50', prize: '₹820/student', category: 'MERIT RANK', students: 25, total: '₹20,500' },
  { rank: 'Rank 51–100', prize: '₹350/student', category: 'PARTICIPATION', students: 50, total: '₹17,500' },
];

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
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-bold text-foreground tracking-tight">Scholarship Platform</h1>
          </div>
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
      <section className="max-w-6xl mx-auto px-4 py-16 lg:py-24">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <Star className="h-3 w-3" />
            2026 Scholarship Program
          </div>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground tracking-tighter leading-tight">
            Compete. Refer. <span className="text-primary">Win Scholarships.</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed max-w-lg">
            Register for ₹300, take the scholarship exam, refer friends to earn bonus marks, and win prizes up to ₹10,000. Top 100 students share ₹1,00,000 scholarship pool.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/auth/register">
              <Button size="lg" className="gap-2">
                Register Now <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/verify">
              <Button variant="outline" size="lg">Verify Certificate</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h3 className="text-lg font-bold text-foreground mb-8 tracking-tight">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Register & Pay ₹300', desc: 'Create your account and pay the exam fee via Razorpay.' },
              { step: '02', title: 'Complete Profile', desc: 'Fill your personal and school details to unlock the exam.' },
              { step: '03', title: 'Take the Exam', desc: '60 timed questions. One attempt. Pure merit-based ranking.' },
              { step: '04', title: 'Win Scholarship', desc: 'Top 100 students share ₹1,00,000 prize pool based on rank.' },
            ].map((item) => (
              <div key={item.step} className="card-shadow rounded-lg bg-card p-5">
                <span className="text-xs font-mono font-bold text-primary">{item.step}</span>
                <h4 className="text-sm font-semibold text-foreground mt-2 mb-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Referral System */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground tracking-tight">Referral Earnings System</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-8 max-w-lg">
            Every student gets a unique referral code. When someone registers using your code, you earn ₹70 instantly + bonus marks in ranking!
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { role: 'Referring Student', amount: '₹70', icon: <Users className="h-4 w-4" /> },
              { role: 'Center Owner', amount: '₹40', icon: <Shield className="h-4 w-4" /> },
              { role: 'Admin', amount: '₹30', icon: <TrendingUp className="h-4 w-4" /> },
              { role: 'Super Admin', amount: '₹60', icon: <Star className="h-4 w-4" /> },
            ].map((item) => (
              <div key={item.role} className="card-shadow rounded-lg bg-card p-4 text-center">
                <div className="flex justify-center text-primary mb-2">{item.icon}</div>
                <p className="text-2xl font-bold tabular-nums text-foreground">{item.amount}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.role}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 card-shadow rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
            <p className="text-sm text-foreground font-semibold">
              Remaining ₹100 → <span className="text-primary">Scholarship Fund Pool</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Automatically added from every payment</p>
          </div>
        </div>
      </section>

      {/* Ranking System */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground tracking-tight">Ranking System</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Final Score = Exam Marks + Referral Bonus (1 Referral = +2 Marks, Max 20 Marks)
          </p>
          <div className="card-shadow rounded-lg bg-card p-5">
            <h4 className="text-sm font-semibold text-foreground mb-3">Example Calculation</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold tabular-nums text-foreground">80</p>
                <p className="text-xs text-muted-foreground">Exam Score</p>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-primary">+10</p>
                <p className="text-xs text-muted-foreground">Referral Bonus (5 referrals)</p>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-primary">= 90</p>
                <p className="text-xs text-muted-foreground">Final Score</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scholarship Distribution */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground tracking-tight">Scholarship Prize Distribution</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            Total Pool: ₹1,00,000 (from 1000 students × ₹100). Top 100 students win!
          </p>
          <div className="space-y-3">
            {/* Top 3 */}
            <div className="grid grid-cols-3 gap-3">
              {scholarshipTiers.filter(t => t.highlight).map((tier) => (
                <div key={tier.rank} className="card-shadow rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
                  <p className="text-xs font-semibold text-primary uppercase">{tier.rank}</p>
                  <p className="text-xl font-bold tabular-nums text-foreground mt-1">{tier.prize}</p>
                </div>
              ))}
            </div>
            {/* Other tiers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scholarshipTiers.filter(t => !t.highlight).map((tier) => (
                <div key={tier.rank} className="card-shadow rounded-lg bg-card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tier.rank}</p>
                    <p className="text-xs text-muted-foreground">{tier.category} • {tier.students} students</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-foreground">{tier.prize}</p>
                    <p className="text-xs text-muted-foreground">Total: {tier.total}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="card-shadow rounded-lg bg-card p-4 text-center border-2 border-primary/30">
              <p className="text-sm font-bold text-foreground">Grand Total: <span className="text-primary">₹1,00,000</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <BookOpen className="h-5 w-5 text-primary mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">60-Question Exam</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Timed questions with auto-progression. One attempt, no going back. Pure merit.
            </p>
          </div>
          <div>
            <Shield className="h-5 w-5 text-primary mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">Secure & Automated</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Razorpay-verified payments. Automatic commission distribution. No manual calculations.
            </p>
          </div>
          <div>
            <Award className="h-5 w-5 text-primary mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">Digital Certificates</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Auto-generated certificates with QR code verification. Download and share instantly.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h3 className="text-2xl font-bold text-foreground tracking-tight mb-3">Ready to Compete?</h3>
          <p className="text-sm text-muted-foreground mb-6">Register now, refer friends, and win scholarships up to ₹10,000!</p>
          <Link to="/auth/register">
            <Button size="lg" className="gap-2">
              <Gift className="h-4 w-4" /> Register for ₹300
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© 2026 Scholarship Platform</span>
          <Link to="/verify" className="hover:text-foreground transition-colors">Verify Certificate</Link>
        </div>
      </footer>
    </div>
  );
}
