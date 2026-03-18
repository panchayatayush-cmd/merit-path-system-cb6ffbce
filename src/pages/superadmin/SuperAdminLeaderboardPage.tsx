import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Trophy, Plus, Pencil, Trash2 } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  student_name: string;
  score: number;
  rank: number;
  class: number | null;
  state: string | null;
  district: string | null;
}

export default function SuperAdminLeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeaderboardEntry | null>(null);
  const [form, setForm] = useState({ student_name: '', score: '', rank: '', class: '', state: '', district: '' });

  const load = async () => {
    const { data } = await supabase
      .from('leaderboard_entries')
      .select('*')
      .order('rank', { ascending: true })
      .limit(20);
    setEntries((data as any[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ student_name: '', score: '', rank: String(entries.length + 1), class: '', state: '', district: '' });
    setDialogOpen(true);
  };

  const openEdit = (e: LeaderboardEntry) => {
    setEditing(e);
    setForm({ student_name: e.student_name, score: String(e.score), rank: String(e.rank), class: String(e.class ?? ''), state: e.state ?? '', district: e.district ?? '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.student_name || !form.score || !form.rank) {
      toast.error('Name, Score, and Rank are required');
      return;
    }
    const payload = {
      student_name: form.student_name,
      score: parseInt(form.score),
      rank: parseInt(form.rank),
      class: form.class ? parseInt(form.class) : null,
      state: form.state || null,
      district: form.district || null,
    };

    if (editing) {
      const { error } = await supabase.from('leaderboard_entries').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Updated');
    } else {
      const { error } = await supabase.from('leaderboard_entries').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Added');
    }
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('leaderboard_entries').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted');
    load();
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5" /> Leaderboard Management
          </h1>
          <Button size="sm" onClick={openAdd} className="gap-1"><Plus className="h-4 w-4" /> Add Entry</Button>
        </div>

        <div className="card-shadow rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium uppercase text-muted-foreground">Rank</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase text-muted-foreground">Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase text-muted-foreground">Class</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase text-muted-foreground">State</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No entries yet</td></tr>
              ) : entries.map(e => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-bold text-primary">#{e.rank}</td>
                  <td className="px-4 py-3 font-medium">{e.student_name}</td>
                  <td className="px-4 py-3 font-mono">{e.score}</td>
                  <td className="px-4 py-3">{e.class ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{e.state ?? '—'}</td>
                  <td className="px-4 py-3 flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Edit Entry' : 'Add Entry'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Student Name *" value={form.student_name} onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Score *" type="number" value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))} />
                <Input placeholder="Rank *" type="number" value={form.rank} onChange={e => setForm(f => ({ ...f, rank: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input placeholder="Class" type="number" value={form.class} onChange={e => setForm(f => ({ ...f, class: e.target.value }))} />
                <Input placeholder="State" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                <Input placeholder="District" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave}>{editing ? 'Update' : 'Add'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
