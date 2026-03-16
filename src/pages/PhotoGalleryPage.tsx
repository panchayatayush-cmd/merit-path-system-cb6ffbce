import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Image as ImageIcon } from 'lucide-react';
import gphdmLogo from '@/assets/gphdm-logo.jpg';

interface GalleryPhoto {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
}

export default function PhotoGalleryPage() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);

  useEffect(() => {
    supabase
      .from('gallery_photos')
      .select('id, title, description, image_url')
      .order('display_order', { ascending: true })
      .then(({ data }) => setPhotos((data as GalleryPhoto[]) ?? []));
  }, []);

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
        {photos.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Photos will be added soon. Stay tuned!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {photos.map((photo) => (
              <div key={photo.id} className="card-shadow rounded-xl bg-card overflow-hidden group">
                <img src={photo.image_url} alt={photo.title} className="w-full aspect-[4/3] object-cover" />
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1">{photo.title}</h3>
                  {photo.description && <p className="text-xs text-muted-foreground leading-relaxed">{photo.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
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
