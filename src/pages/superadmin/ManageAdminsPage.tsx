import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, UserPlus } from 'lucide-react';

export default function ManageAdminsPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', role: 'admin' });

  const loadAdmins = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id, role, created_at')
      .in('role', ['admin', 'super_admin'])
      .order('created_at', { ascending: false });
    setAdmins(data ?? []);
  };

  useEffect(() => { loadAdmins(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: { email: form.email, password: form.password, role: form.role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${form.role} account created: ${form.email}`);
      setForm({ email: '', password: '', role: 'admin' });
      loadAdmins();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-base font-semibold text-foreground">Manage Admins</h1>

        {/* Create Admin Form */}
        <form onSubmit={handleCreate} className="card-shadow rounded-lg bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Create New Admin</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Admin'}
          </Button>
        </form>

        {/* Existing Admins */}
        <div className="card-shadow rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Existing Admins ({admins.length})</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">User ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">No admins yet</td></tr>
              ) : (
                admins.map((a, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{a.user_id.slice(0, 12)}...</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${a.role === 'super_admin' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'}`}>
                        {a.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
