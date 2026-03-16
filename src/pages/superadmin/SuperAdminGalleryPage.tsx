import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

interface GalleryPhoto {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  display_order: number;
  created_at: string;
}

export default function SuperAdminGalleryPage() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('gallery_photos')
      .select('*')
      .order('display_order', { ascending: true });
    setPhotos((data as GalleryPhoto[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    if (!file || !title.trim() || !user) return;
    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const fileName = `gallery/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        // Try creating bucket if it doesn't exist
        await supabase.storage.createBucket('gallery', { public: true });
        const { error: retryError } = await supabase.storage
          .from('gallery')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });
        if (retryError) throw retryError;
      }

      const { data: urlData } = supabase.storage.from('gallery').getPublicUrl(fileName);

      const { error: insertError } = await supabase.from('gallery_photos').insert({
        title: title.trim(),
        description: description.trim() || null,
        image_url: urlData.publicUrl,
        uploaded_by: user.id,
        display_order: photos.length,
      });

      if (insertError) throw insertError;

      toast.success('Photo added successfully!');
      setTitle('');
      setDescription('');
      setFile(null);
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    if (!confirm(`Delete "${photo.title}"?`)) return;

    // Extract file path from URL
    const urlParts = photo.image_url.split('/gallery/');
    if (urlParts.length > 1) {
      await supabase.storage.from('gallery').remove([`gallery/${urlParts[urlParts.length - 1]}`]);
    }

    const { error } = await supabase.from('gallery_photos').delete().eq('id', photo.id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Photo deleted');
      load();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-foreground">Photo Gallery Management</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> Add Photo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Photo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Input placeholder="Photo title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
                <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <Button onClick={handleUpload} disabled={uploading || !file || !title.trim()} className="w-full">
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {photos.length === 0 ? (
          <div className="card-shadow rounded-lg bg-card p-12 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No photos yet. Add your first photo!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="card-shadow rounded-lg bg-card overflow-hidden">
                <img src={photo.image_url} alt={photo.title} className="w-full aspect-[4/3] object-cover" />
                <div className="p-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{photo.title}</p>
                    {photo.description && <p className="text-xs text-muted-foreground mt-0.5">{photo.description}</p>}
                  </div>
                  <button onClick={() => handleDelete(photo)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors flex-shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
