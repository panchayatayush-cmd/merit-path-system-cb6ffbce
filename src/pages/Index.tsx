import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  BookOpen, Shield, Award, Users, Trophy, Gift, TrendingUp, Star,
  ChevronRight, Mail, Phone, MapPin, Clock, MessageSquare,
} from 'lucide-react';
import gphdmLogo from '@/assets/gphdm-logo.jpg';




const features = [
  { icon: <BookOpen className="h-5 w-5" />, title: 'Class 1–12 Coverage', desc: 'Comprehensive examination for all school levels with age-appropriate questions.' },
  { icon: <Clock className="h-5 w-5" />, title: 'Timed Assessment', desc: '60 questions with 10s per question, testing quick thinking.' },
  { icon: <TrendingUp className="h-5 w-5" />, title: 'Merit-Based Rankings', desc: 'Class-wise rankings based on score, accuracy, and time taken.' },
  { icon: <Trophy className="h-5 w-5" />, title: 'Scholarship Awards', desc: 'Top 100 ranks eligible for scholarships in every class.' },
  { icon: <Award className="h-5 w-5" />, title: 'Verified Certificates', desc: 'QR-coded certificates with public verification system.' },
  { icon: <Shield className="h-5 w-5" />, title: 'Secure & Fair', desc: 'One attempt per student with strict fraud prevention measures.' },
];

const faqItems = [
  { q: 'How do I register for the scholarship examination?', a: 'Visit the Register page, fill your details, pay ₹300 via Razorpay, and complete your profile to unlock the exam.' },
  { q: 'Can I edit my registration details after submission?', a: 'Yes, you can update your profile from your Student Dashboard before taking the exam.' },
  { q: 'When are the examination dates?', a: 'Examinations are available year-round. Once registered and payment is verified, you can take the exam anytime.' },
  { q: 'Can I retake the examination if I fail?', a: 'No, each student gets only one attempt. This ensures fair, merit-based ranking.' },
  { q: 'When will the results be declared?', a: 'Results are available immediately after completing the exam on your Student Dashboard.' },
  { q: 'How does the referral system work?', a: 'Share your unique referral code. When someone registers using it, you earn ₹70 + bonus marks in ranking.' },
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
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={gphdmLogo} alt="GPHDM Logo" className="h-10 w-10 rounded-full object-cover" />
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">GPHDM National Scholarship</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Gram Panchayat Help Desk Mission</p>
            </div>
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
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <Star className="h-3 w-3" />
              REGISTRATION OPEN FOR 2026
            </div>
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground tracking-tighter leading-tight">
              GPHDM National<br />
              <span className="text-primary">Scholarship Exam</span>
            </h2>
            <p className="text-sm font-semibold text-foreground mt-2">Through Gram Panchayat Help Desk Mission</p>
            <p className="text-sm font-bold text-accent mt-1">EXAMINATION MANAGED BY S.V. MEDIA FILMS PRODUCTION</p>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed max-w-lg">
              Empowering students across India through merit-based scholarships. Our mission is to recognize and reward academic excellence while providing equal opportunities for all. Register now for Class 1–12 examinations.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link to="/auth/register">
                <Button size="lg" className="gap-2">
                  Students Register Now <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/verify">
                <Button variant="outline" size="lg">Verify Certificate</Button>
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <img src={gphdmLogo} alt="GPHDM Logo" className="h-48 w-48 lg:h-64 lg:w-64 rounded-2xl object-cover shadow-lg" />
          </div>
        </div>
      </section>

      {/* Why Choose GPHDM */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h3 className="text-2xl font-bold text-foreground tracking-tight mb-2">Why Choose GPHDM?</h3>
          <p className="text-sm text-muted-foreground mb-10 max-w-xl mx-auto">
            Our examination portal provides a fair, transparent, and rewarding platform. Experience a next-generation platform designed for excellence.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="card-shadow rounded-xl bg-card p-6 text-left">
                <div className="text-primary mb-3">{f.icon}</div>
                <h4 className="text-sm font-semibold text-foreground mb-1">{f.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border">
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

      {/* Examination Donation */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h3 className="text-2xl font-bold text-primary tracking-tight mb-2">Examination Donation</h3>
          <p className="text-sm text-muted-foreground mb-10 max-w-xl mx-auto">
            Affordable donation structure for all students. Accessible intelligence assessment for everyone.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { label: 'PRIMARY', classes: 'Class 1–5', amount: '₹250', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800' },
              { label: 'MIDDLE', classes: 'Class 6–8', amount: '₹300', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800' },
              { label: 'SENIOR', classes: 'Class 9–12', amount: '₹350', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800' },
            ].map((tier) => (
              <div key={tier.label} className={`card-shadow rounded-xl ${tier.bg} border ${tier.border} p-6 text-center`}>
                <div className="h-10 w-10 mx-auto mb-3 rounded-lg bg-card card-shadow flex items-center justify-center text-primary font-bold text-lg">₹</div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">{tier.label}</p>
                <p className="text-sm font-semibold text-foreground mb-2">{tier.classes}</p>
                <p className="text-3xl font-bold tabular-nums text-foreground">{tier.amount}</p>
              </div>
            ))}
          </div>
          <Link to="/auth/register" className="inline-block mt-8">
            <Button size="lg" className="gap-2">Register Now <ChevronRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </section>



      {/* Center Code Partner Program */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
                PARTNERSHIP PROGRAM
              </div>
              <h3 className="text-xl font-bold text-foreground tracking-tight mb-2">
                Earn with CenterCode Referral Program
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Join our referral network and earn rewards for every successful registration. Transform your institute into an excellence hub.
              </p>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Eligible Categories</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {['All Educational Institutions', 'Social Workers', 'NGOs', 'Coaching Institutes', 'Others'].map((c) => (
                  <span key={c} className="text-xs px-3 py-1 rounded-full bg-card card-shadow text-foreground">{c}</span>
                ))}
              </div>
              <Link to="/auth/register">
                <Button variant="outline" size="sm">Register as Center</Button>
              </Link>
            </div>
            <div className="card-shadow rounded-xl bg-card p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">How It Works</p>
              {[
                { n: '1', title: 'Apply Now', desc: 'Become an approved partner' },
                { n: '2', title: 'Access Code', desc: 'Get your unique Center Code' },
                { n: '3', title: 'Share & Grow', desc: 'Refer students securely' },
                { n: '4', title: 'Earn Legacy', desc: 'Instant payouts per student' },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-3 mb-3 last:mb-0">
                  <span className="flex-shrink-0 h-7 w-7 rounded-md bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{s.n}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ranking System */}
      <section className="border-t border-border">
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

      {/* Scholarship Rewards By Category */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h3 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2">Scholarship Rewards By Category</h3>
          <p className="text-sm text-muted-foreground mb-10 max-w-xl mx-auto">
            Attractive scholarship amounts across all educational categories.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { label: 'CLASS 1–5', title: 'Primary', range: '₹2,000 – ₹10,000', positions: '100+ Ranks', color: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', btnClass: 'bg-accent text-accent-foreground hover:bg-accent/90' },
              { label: 'CLASS 6–8', title: 'Junior', range: '₹2,500 – ₹12,000', positions: '100+ Ranks', color: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', btnClass: 'bg-primary text-primary-foreground hover:bg-primary/90' },
              { label: 'CLASS 9–12', title: 'Senior', range: '₹3,000 – ₹15,000', positions: '100+ Ranks', color: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', btnClass: 'bg-purple-500 text-white hover:bg-purple-600' },
            ].map((cat) => (
              <div key={cat.label} className={`card-shadow rounded-xl ${cat.color} border ${cat.border} p-6 text-left`}>
                <span className="inline-block text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-card card-shadow text-foreground mb-3">{cat.label}</span>
                <h4 className="text-xl font-bold text-foreground mb-4">{cat.title}</h4>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">Scholarship Range:</p>
                    <p className="text-sm font-bold tabular-nums text-foreground">{cat.range}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">Eligible Positions:</p>
                    <p className="text-sm font-bold tabular-nums text-foreground">{cat.positions}</p>
                  </div>
                </div>
                <Link to="/auth/register">
                  <button className={`w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${cat.btnClass}`}>
                    Enrol Now <ChevronRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* FAQ */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h3 className="text-xl font-bold text-foreground tracking-tight mb-8 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqItems.map((faq, i) => (
              <details key={i} className="card-shadow rounded-lg bg-card group">
                <summary className="p-4 cursor-pointer flex items-start gap-3 text-sm font-semibold text-foreground list-none">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  {faq.q}
                </summary>
                <p className="px-4 pb-4 pl-13 text-xs text-muted-foreground leading-relaxed ml-9">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact + CTA */}
      <section className="border-t border-border bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h3 className="text-2xl font-bold tracking-tight mb-2">आज ही रजिस्टर करें!</h3>
          <p className="text-sm opacity-90 mb-6 max-w-md mx-auto">
            GPHDM छात्रवृत्ति परीक्षा में भाग लें और अपनी प्रतिभा को पहचान दिलाएं। छात्रवृत्ति जीतने का सुनहरा अवसर पाएं!
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/auth/register">
              <Button size="lg" variant="secondary" className="gap-2">
                <Gift className="h-4 w-4" /> Register for Exam
              </Button>
            </Link>
            <Link to="/auth/login">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                Already Registered? Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Info Bar */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <p className="text-xs font-semibold text-foreground">Phone</p>
              <a href="tel:+919120057559" className="text-sm text-muted-foreground hover:text-foreground">+91 9120057559</a>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <p className="text-xs font-semibold text-foreground">Email</p>
              <a href="mailto:grampanchayathelp@gmail.com" className="text-sm text-muted-foreground hover:text-foreground">grampanchayathelp@gmail.com</a>
            </div>
            <div className="flex flex-col items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <p className="text-xs font-semibold text-foreground">Address</p>
              <p className="text-sm text-muted-foreground">Uttar Pradesh, India</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <img src={gphdmLogo} alt="GPHDM Logo" className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-bold text-foreground">Gram Panchayat Help Desk Mission</p>
                  <p className="text-[10px] text-muted-foreground">Uttar Pradesh, India</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Empowering students across India through merit-based scholarships. Our mission is to recognize and reward academic excellence while providing equal opportunities for all.
              </p>
            </div>
            {/* Quick Links */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Quick Links</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
                <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
                <li><Link to="/gallery" className="hover:text-foreground transition-colors">Photo Gallery</Link></li>
                <li><Link to="/auth/register" className="hover:text-foreground transition-colors">Register Now</Link></li>
                <li><Link to="/verify" className="hover:text-foreground transition-colors">Verify Certificate</Link></li>
                <li><Link to="/auth/login" className="hover:text-foreground transition-colors">Login</Link></li>
              </ul>
            </div>
            {/* Contact */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Contact Us</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><Mail className="h-3 w-3" /> grampanchayathelp@gmail.com</li>
                <li className="flex items-center gap-2"><Phone className="h-3 w-3" /> +91 9120057559</li>
                <li className="flex items-center gap-2"><MapPin className="h-3 w-3" /> Uttar Pradesh, India</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-6 text-center text-xs text-muted-foreground">
            © 2026 Gram Panchayat Help Desk Mission. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
