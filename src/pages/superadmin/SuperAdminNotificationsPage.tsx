import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Bell, Send, Loader2, RefreshCw, Search } from 'lucide-react';

interface Template {
  id: string; template_name: string; title: string; message: string;
  days_before_exam: number; is_active: boolean;
}
interface Notification {
  id: string; user_id: string; title: string; message: string;
  channel: string; delivery_status: string; is_read: boolean;
  sent_at: string; template_id: string | null; scheduled_exam_id: string | null;
}

export default function SuperAdminNotificationsPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');

  const load = async () => {
    setLoading(true);
    const [t, n] = await Promise.all([
      supabase.from('notification_templates').select('*').order('days_before_exam', { ascending: false }),
      supabase.from('notifications').select('*').order('sent_at', { ascending: false }).limit(100),
    ]);
    setTemplates((t.data as any[]) ?? []);
    setNotifications((n.data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleTemplate = async (t: Template) => {
    await supabase.from('notification_templates').update({ is_active: !t.is_active } as any).eq('id', t.id);
    toast({ title: t.is_active ? 'Template disabled' : 'Template enabled' }); load();
  };

  const startEdit = (t: Template) => {
    setEditingTemplate(t);
    setEditTitle(t.title);
    setEditMessage(t.message);
  };

  const saveEdit = async () => {
    if (!editingTemplate) return;
    await supabase.from('notification_templates').update({
      title: editTitle, message: editMessage,
    } as any).eq('id', editingTemplate.id);
    setEditingTemplate(null);
    toast({ title: 'Template updated' }); load();
  };

  const triggerNotifications = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-exam-notifications', {
        body: { manual: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: 'Notifications Sent!',
        description: `Sent: ${data.total_sent}, Skipped: ${data.total_skipped}`,
      });
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const filteredNotifications = notifications.filter(n =>
    !searchQuery ||
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.user_id.includes(searchQuery)
  );

  const stats = {
    total: notifications.length,
    sent: notifications.filter(n => n.delivery_status === 'sent').length,
    read: notifications.filter(n => n.is_read).length,
    failed: notifications.filter(n => n.delivery_status === 'failed').length,
  };

  if (loading) return <DashboardLayout><div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold text-foreground">Notifications</h1>
          </div>
          <Button onClick={triggerNotifications} disabled={sending} size="sm">
            {sending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Sending...</> : <><Send className="h-4 w-4 mr-1" /> Send Now</>}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Sent', value: stats.total, color: 'text-foreground' },
            { label: 'Delivered', value: stats.sent, color: 'text-primary' },
            { label: 'Read', value: stats.read, color: 'text-primary' },
            { label: 'Failed', value: stats.failed, color: 'text-destructive' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="logs">Notification Logs</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            {editingTemplate && (
              <Card className="border-2 border-primary/30">
                <CardHeader className="pb-3"><CardTitle className="text-sm">Edit Template: {editingTemplate.template_name}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Title</Label>
                    <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Message (use {'{{exam_date}}'} for date)</Label>
                    <Textarea value={editMessage} onChange={e => setEditMessage(e.target.value)} rows={3} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveEdit} size="sm">Save</Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingTemplate(null)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Template</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">Days Before</TableHead>
                    <TableHead className="text-xs">Active</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs font-medium">{t.template_name}</TableCell>
                      <TableCell className="text-xs">{t.title}</TableCell>
                      <TableCell className="text-xs">{t.days_before_exam === 0 ? 'Exam Day' : `${t.days_before_exam} days`}</TableCell>
                      <TableCell><Switch checked={t.is_active} onCheckedChange={() => toggleTemplate(t)} /></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => startEdit(t)}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by title, message or user ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Button variant="ghost" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
            </div>

            {filteredNotifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications sent yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Title</TableHead>
                      <TableHead className="text-xs">Channel</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Read</TableHead>
                      <TableHead className="text-xs">Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotifications.map(n => (
                      <TableRow key={n.id}>
                        <TableCell className="text-xs max-w-[200px] truncate">{n.title}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{n.channel}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={n.delivery_status === 'sent' ? 'default' : n.delivery_status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                            {n.delivery_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{n.is_read ? '✓' : '—'}</TableCell>
                        <TableCell className="text-xs">{new Date(n.sent_at).toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
