import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Download, Eye, Briefcase } from 'lucide-react';
import jsPDF from 'jspdf';

interface JobApp {
  id: string;
  full_name: string;
  father_name: string;
  contact_number: string;
  alternate_number: string | null;
  email: string;
  state: string;
  district: string;
  block: string;
  village: string;
  full_address: string;
  pin_code: string;
  designation: string;
  work_experience: string | null;
  date_of_birth: string;
  photo_url: string | null;
  payment_status: string;
  razorpay_payment_id: string | null;
  amount: number;
  created_at: string;
}

export default function SuperAdminJobApplicationsPage() {
  const [apps, setApps] = useState<JobApp[]>([]);
  const [search, setSearch] = useState('');
  const [filterDesignation, setFilterDesignation] = useState('all');
  const [selected, setSelected] = useState<JobApp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('job_applications')
        .select('*')
        .order('created_at', { ascending: false });
      setApps((data as any[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = apps.filter(a => {
    const matchSearch = !search.trim() || 
      a.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.contact_number.includes(search);
    const matchDesignation = filterDesignation === 'all' || a.designation === filterDesignation;
    return matchSearch && matchDesignation;
  });

  const downloadPDF = (app: JobApp) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('GPHDM - Job Application', 20, 20);
    doc.setFontSize(10);
    let y = 35;
    const addLine = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value || '—', 75, y);
      y += 8;
    };
    addLine('Full Name', app.full_name);
    addLine('Father Name', app.father_name);
    addLine('Contact', app.contact_number);
    addLine('Alternate', app.alternate_number || '—');
    addLine('Email', app.email);
    addLine('DOB', app.date_of_birth);
    addLine('Designation', app.designation);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Address:', 20, y); y += 8;
    doc.setFont('helvetica', 'normal');
    addLine('State', app.state);
    addLine('District', app.district);
    addLine('Block', app.block);
    addLine('Village', app.village);
    addLine('Full Address', app.full_address);
    addLine('Pin Code', app.pin_code);
    y += 5;
    addLine('Experience', app.work_experience || '—');
    addLine('Payment', `₹${app.amount} - ${app.payment_status}`);
    addLine('Payment ID', app.razorpay_payment_id || '—');
    addLine('Applied On', new Date(app.created_at).toLocaleDateString());
    doc.save(`application_${app.full_name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> Job Applications ({filtered.length})
          </h1>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
            </div>
            <Select value={filterDesignation} onValueChange={setFilterDesignation}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Designations</SelectItem>
                <SelectItem value="District Manager (Media Prabhari)">District Manager</SelectItem>
                <SelectItem value="Panchayat Sakhi (Kosha Adhyaksh)">Panchayat Sakhi</SelectItem>
                <SelectItem value="Exam Center Head">Exam Center Head</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="card-shadow rounded-lg bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Designation</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No applications found</td></tr>
                  ) : filtered.map((a, i) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{a.full_name}</td>
                      <td className="px-4 py-3 text-xs">{a.designation}</td>
                      <td className="px-4 py-3 font-mono text-xs">{a.contact_number}</td>
                      <td className="px-4 py-3">
                        <Badge className={a.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}>
                          {a.payment_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(a)}><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => downloadPDF(a)}><Download className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground text-xs">Full Name</span><p className="font-medium">{selected.full_name}</p></div>
                  <div><span className="text-muted-foreground text-xs">Father Name</span><p className="font-medium">{selected.father_name}</p></div>
                  <div><span className="text-muted-foreground text-xs">Contact</span><p className="font-mono">{selected.contact_number}</p></div>
                  <div><span className="text-muted-foreground text-xs">Alt. Number</span><p className="font-mono">{selected.alternate_number || '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">Email</span><p>{selected.email}</p></div>
                  <div><span className="text-muted-foreground text-xs">DOB</span><p>{selected.date_of_birth}</p></div>
                  <div><span className="text-muted-foreground text-xs">Designation</span><p className="font-medium">{selected.designation}</p></div>
                  <div><span className="text-muted-foreground text-xs">Payment</span><p>₹{selected.amount} - {selected.payment_status}</p></div>
                </div>
                <div className="border-t border-border pt-3">
                  <span className="text-muted-foreground text-xs">Address</span>
                  <p>{selected.full_address}, {selected.village}, {selected.block}, {selected.district}, {selected.state} - {selected.pin_code}</p>
                </div>
                {selected.work_experience && (
                  <div className="border-t border-border pt-3">
                    <span className="text-muted-foreground text-xs">Work Experience</span>
                    <p>{selected.work_experience}</p>
                  </div>
                )}
                <Button onClick={() => downloadPDF(selected)} className="w-full gap-2">
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
