import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Image as ImageIcon } from 'lucide-react';
import gphdmLogo from '@/assets/gphdm-logo.jpg';

const galleryItems = [
  { title: 'Scholarship Examination 2025', desc: 'Students appearing for the national scholarship exam across multiple centers.', color: 'bg-primary/10' },
  { title: 'Prize Distribution Ceremony', desc: 'Top rank holders receiving their scholarship prizes and certificates.', color: 'bg-accent/10' },
  { title: 'Center Registration Drive', desc: 'New partner centers joining the GPHDM network across Uttar Pradesh.', color: 'bg-warning/10' },
  { title: 'Community Outreach Program', desc: 'Reaching students in rural areas through Gram Panchayat networks.', color: 'bg-success/10' },
  { title: 'Certificate Verification Event', desc: 'Demonstrating QR-based certificate verification at educational fairs.', color: 'bg-info/10' },
  { title: 'Student Referral Campaign', desc: 'Top referrers being recognized for helping grow the scholarship community.', color: 'bg-destructive/10' },
  { title: 'Annual Review Meeting', desc: 'Team reviewing scholarship distribution and planning for 2026.', color: 'bg-primary/10' },
  { title: 'Digital Literacy Workshop', desc: 'Training students on using the online examination platform.', color: 'bg-accent/10' },
  { title: 'Partner Center Inauguration', desc: 'Opening ceremony of new GPHDM examination centers in Bihar.', color: 'bg-warning/10' },
];

export default function PhotoGalleryPage() {
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
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tighter mb-4">Photo Gallery</h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
          A glimpse into our scholarship examinations, events, and community outreach programs across India.
        </p>
      </section>

      {/* Gallery Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {galleryItems.map((item, i) => (
            <div key={i} className="card-shadow rounded-xl bg-card overflow-hidden group">
              <div className={`aspect-[4/3] ${item.color} flex items-center justify-center`}>
                <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <p className="text-xs text-muted-foreground">More photos will be added as events take place. Stay tuned!</p>
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
