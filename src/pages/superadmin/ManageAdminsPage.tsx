import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, UserPlus, Pencil, Ban, CheckCircle, Eye, EyeOff, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface Admin {
  user_id: string;
  role: string;
  created_at: string;
  is_disabled: boolean;
  full_name: string | null;
  mobile: string | null;
  email: string;
  admin_code: string | null;
}

const emptyForm = { full_name: '', email: '', mobile: '', password: '', confirmPassword: '', role: 'admin' };

export default function ManageAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [showCreate, setShowCreate] = useState(false);
  const [editAdmin, setEditAdmin] = useState<Admin | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', mobile: '', password: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const loadAdmins = async () => {
    setListLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin', { body: { action: 'list' } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAdmins(data?.admins ?? []);
    } catch {
      toast.error('Failed to load admins');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { loadAdmins(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: { action: 'create', email: form.email, password: form.password, role: form.role, full_name: form.full_name, mobile: form.mobile },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const msg = data?.admin_code
        ? `Admin created! Admin Code: ${data.admin_code}`
        : `Admin created: ${form.email}`;
      toast.success(msg);
      setForm({ ...emptyForm });
      setShowCreate(false);
      loadAdmins();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (admin: Admin) => {
    setEditAdmin(admin);
    setEditForm({ full_name: admin.full_name ?? '', email: admin.email, mobile: admin.mobile ?? '', password: '' });
    setShowPassword(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAdmin) return;
    if (editForm.password && editForm.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setEditLoading(true);
    try {
      const body: any = { action: 'update', user_id: editAdmin.user_id };
      if (editForm.full_name !== (editAdmin.full_name ?? '')) body.full_name = editForm.full_name;
      if (editForm.email !== editAdmin.email) body.email = editForm.email;
      if (editForm.mobile !== (editAdmin.mobile ?? '')) body.mobile = editForm.mobile;
      if (editForm.password) body.password = editForm.password;
      const { data, error } = await supabase.functions.invoke('create-admin', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Admin updated successfully');
      setEditAdmin(null);
      loadAdmins();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update admin');
    } finally {
      setEditLoading(false);
    }
  };

  const toggleDisable = async (admin: Admin) => {
    const newState = !admin.is_disabled;
    try {
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: { action: 'update', user_id: admin.user_id, is_disabled: newState },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(newState ? 'Admin login disabled' : 'Admin login enabled');
      loadAdmins();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update status');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Admin Code copied!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Admin Management
          </h1>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-1" /> Create New Admin
          </Button>
        </div>

        <div className="rounded-lg bg-card border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">All Admins ({admins.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Admin Code</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : admins.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No admins found</td></tr>
                ) : (
                  admins.map((a) => (
                    <tr key={a.user_id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-foreground font-medium">{a.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        {a.admin_code ? (
                          <div className="flex items-center gap-1">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{a.admin_code}</code>
                            <button onClick={() => copyCode(a.admin_code!)} className="text-muted-foreground hover:text-foreground">
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-foreground">{a.email || '—'}</td>
                      <td className="px-4 py-3 text-foreground">{a.mobile || '—'}</td>
                      <td className="px-4 py-3">
                        {a.is_disabled ? (
                          <Badge variant="destructive" className="text-xs">Disabled</Badge>
                        ) : (
                          <Badge className="text-xs bg-green-600 hover:bg-green-700">Active</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon"
                            className={`h-8 w-8 ${a.is_disabled ? 'text-green-600' : 'text-destructive'}`}
                            onClick={() => toggleDisable(a)} title={a.is_disabled ? 'Enable Login' : 'Disable Login'}>
                            {a.is_disabled ? <CheckCircle className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Admin Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" /> Create New Admin
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Admin Name <span className="text-destructive">*</span></Label>
                <Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} required />
              </div>
              <div>
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input value={form.mobile} onChange={(e) => setForm(f => ({ ...f, mobile: e.target.value }))} />
              </div>
              <div>
                <Label>Password <span className="text-destructive">*</span></Label>
                <Input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
              </div>
              <div>
                <Label>Confirm Password <span className="text-destructive">*</span></Label>
                <Input type="password" value={form.confirmPassword} onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))} required minLength={6} />
              </div>
              <div>
                <Label>Role</Label>
                <select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">A unique Admin Code will be auto-generated for Admin role accounts.</p>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Admin'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Admin Dialog */}
        <Dialog open={!!editAdmin} onOpenChange={(o) => !o && setEditAdmin(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" /> Edit Admin
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label>Admin Name</Label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input value={editForm.mobile} onChange={(e) => setEditForm(f => ({ ...f, mobile: e.target.value }))} />
              </div>
              <div>
                <Label>New Password <span className="text-muted-foreground text-xs">(leave blank to keep current)</span></Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={editForm.password}
                    onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))} minLength={6} placeholder="••••••" />
                  <button type="button" className="absolute right-2 top-2.5 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditAdmin(null)}>Cancel</Button>
                <Button type="submit" disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
