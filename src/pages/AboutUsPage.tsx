import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, Target, Eye, Heart, Award, BookOpen, Shield, ChevronLeft } from 'lucide-react';
import gphdmLogo from '@/assets/gphdm-logo.jpg';

const values = [
  { icon: <Award className="h-5 w-5" />, title: 'Merit-Based Excellence', desc: 'We believe in recognizing and rewarding genuine academic talent through fair, transparent examinations.' },
  { icon: <Users className="h-5 w-5" />, title: 'Equal Opportunity', desc: 'Every student from Class 1–12, regardless of background, deserves a chance to shine and earn scholarships.' },
  { icon: <Shield className="h-5 w-5" />, title: 'Transparency & Trust', desc: 'All results, rankings, and financial distributions are automated and verifiable — no manual interference.' },
  { icon: <Heart className="h-5 w-5" />, title: 'Community Empowerment', desc: 'We work through Gram Panchayats to reach students in every village and town across India.' },
  { icon: <BookOpen className="h-5 w-5" />, title: 'Quality Assessment', desc: '60 carefully curated, timed questions that test quick thinking and real knowledge across all subjects.' },
  { icon: <Target className="h-5 w-5" />, title: 'Growth Through Referrals', desc: 'Our referral system lets students, centers, and partners earn while spreading educational opportunities.' },
];

const stats = [
  { label: 'Students Empowered', value: '50K+' },
  { label: 'Scholarship Pool', value: '₹25L+' },
  { label: 'States Covered', value: '28+' },
  { label: 'Partner Centers', value: '500+' },
];

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={gphdmLogo} alt="GPHDM Logo" className="h-8 w-8 rounded-full object-cover" />
            <span className="text-sm font-bold text-foreground">GPHDM National Scholarship</span>
          </Link>
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-1">
              <ChevronLeft className="h-3 w-3" /> Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tighter mb-4">About Us</h1>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Gram Panchayat Help Desk Mission (GPHDM) is dedicated to empowering students across India through merit-based scholarship examinations. We believe every child deserves the opportunity to showcase their talent and be rewarded for excellence.
        </p>
      </section>

      {/* Mission & Vision */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-8">
          <div className="card-shadow rounded-xl bg-card p-8">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Our Mission</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To identify, nurture, and reward academic excellence among students from Class 1 to 12 across India. Through our scholarship examination platform, we aim to provide financial support and recognition to deserving students, enabling them to pursue their educational dreams without barriers.
            </p>
          </div>
          <div className="card-shadow rounded-xl bg-card p-8">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Our Vision</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To become India's most trusted and transparent scholarship platform that reaches every village and town through the Gram Panchayat network. We envision a future where no talented student is left behind due to financial constraints, and every achiever is celebrated and supported.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold tabular-nums text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-xl font-bold text-foreground tracking-tight text-center mb-10">Our Core Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {values.map((v) => (
              <div key={v.title} className="card-shadow rounded-xl bg-card p-6">
                <div className="text-primary mb-3">{v.icon}</div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{v.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-foreground tracking-tight mb-3">Join Our Mission</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Whether you're a student, educator, or institution — be part of India's largest scholarship movement.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/auth/register"><Button size="lg">Register as Student</Button></Link>
            <Link to="/auth/register"><Button size="lg" variant="outline">Become a Center Partner</Button></Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          © 2026 Gram Panchayat Help Desk Mission. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
