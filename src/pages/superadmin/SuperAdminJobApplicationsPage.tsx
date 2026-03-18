import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Download, Eye, Briefcase, Share2, FileSpreadsheet, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

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
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterDate, setFilterDate] = useState('');
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
    const matchPayment = filterPayment === 'all' || a.payment_status === filterPayment;
    const matchDate = !filterDate || a.created_at.startsWith(filterDate);
    return matchSearch && matchDesignation && matchPayment && matchDate;
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

  const shareWhatsApp = (app: JobApp) => {
    const text = `📋 *Job Application Details*\n\n👤 Name: ${app.full_name}\n📞 Mobile: ${app.contact_number}\n💼 Designation: ${app.designation}\n📍 Location: ${app.district}, ${app.state}\n📧 Email: ${app.email}\n💰 Payment: ${app.payment_status === 'paid' ? '✅ Paid' : '❌ Unpaid'}\n📅 Applied: ${new Date(app.created_at).toLocaleDateString()}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.error('No applications to export');
      return;
    }
    const headers = ['Full Name', 'Father Name', 'Contact', 'Alternate', 'Email', 'DOB', 'Designation', 'State', 'District', 'Block', 'Village', 'Full Address', 'Pin Code', 'Work Experience', 'Payment Status', 'Payment ID', 'Amount', 'Applied Date'];
    const rows = filtered.map(a => [
      a.full_name, a.father_name, a.contact_number, a.alternate_number || '', a.email,
      a.date_of_birth, a.designation, a.state, a.district, a.block, a.village,
      a.full_address, a.pin_code, a.work_experience || '', a.payment_status,
      a.razorpay_payment_id || '', String(a.amount), new Date(a.created_at).toLocaleDateString()
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `job_applications_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success(`Exported ${filtered.length} applications`);
  };

  const paidCount = filtered.filter(a => a.payment_status === 'paid').length;
  const unpaidCount = filtered.length - paidCount;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> Job Applications ({filtered.length})
          </h1>
          <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{paidCount}</p>
            <p className="text-xs text-muted-foreground">Paid</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{unpaidCount}</p>
            <p className="text-xs text-muted-foreground">Unpaid</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, email, mobile..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterDesignation} onValueChange={setFilterDesignation}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Designation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Designations</SelectItem>
              <SelectItem value="District Manager (Media Prabhari)">District Manager</SelectItem>
              <SelectItem value="Panchayat Sakhi (Kosha Adhyaksh)">Panchayat Sakhi</SelectItem>
              <SelectItem value="Exam Center Head">Exam Center Head</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPayment} onValueChange={setFilterPayment}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Payment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Unpaid</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="pl-9 w-40" />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="rounded-lg bg-card border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Full Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Designation</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Mobile</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Reg. Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No applications found</td></tr>
                  ) : filtered.map((a, i) => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{a.full_name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{a.designation}</td>
                      <td className="px-4 py-3 font-mono text-xs">{a.contact_number}</td>
                      <td className="px-4 py-3">
                        <Badge className={a.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}>
                          {a.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelected(a)} title="View Details"><Eye className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => downloadPDF(a)} title="Download PDF"><Download className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => shareWhatsApp(a)} title="Share on WhatsApp"><Share2 className="h-4 w-4 text-green-600" /></Button>
                        </div>
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
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" /> Application Details
              </DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4 text-sm">
                {/* Photo */}
                {selected.photo_url && (
                  <div className="flex justify-center">
                    <img src={selected.photo_url} alt={selected.full_name} className="w-24 h-24 rounded-full object-cover border-2 border-border" />
                  </div>
                )}

                {/* Personal Details */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Personal Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem label="Full Name" value={selected.full_name} />
                    <DetailItem label="Father Name" value={selected.father_name} />
                    <DetailItem label="Mobile" value={selected.contact_number} />
                    <DetailItem label="Alternate" value={selected.alternate_number || '—'} />
                    <DetailItem label="Email" value={selected.email} />
                    <DetailItem label="Date of Birth" value={selected.date_of_birth} />
                  </div>
                </div>

                {/* Address */}
                <div className="border-t border-border pt-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Full Address</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem label="State" value={selected.state} />
                    <DetailItem label="District" value={selected.district} />
                    <DetailItem label="Block" value={selected.block} />
                    <DetailItem label="Village" value={selected.village} />
                    <DetailItem label="Pin Code" value={selected.pin_code} />
                  </div>
                  <div className="mt-2">
                    <DetailItem label="Full Address" value={selected.full_address} />
                  </div>
                </div>

                {/* Additional Details */}
                <div className="border-t border-border pt-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Additional Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem label="Designation" value={selected.designation} />
                    <DetailItem label="Work Experience" value={selected.work_experience || '—'} />
                  </div>
                </div>

                {/* Payment */}
                <div className="border-t border-border pt-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Status</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-muted-foreground text-xs">Status</span>
                      <p>
                        <Badge className={selected.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}>
                          {selected.payment_status === 'paid' ? '✅ Paid' : '❌ Unpaid'}
                        </Badge>
                      </p>
                    </div>
                    <DetailItem label="Amount" value={`₹${selected.amount}`} />
                    <DetailItem label="Payment ID" value={selected.razorpay_payment_id || '—'} />
                    <DetailItem label="Applied On" value={new Date(selected.created_at).toLocaleDateString()} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => downloadPDF(selected)} className="flex-1 gap-2" size="sm">
                    <Download className="h-4 w-4" /> Download PDF
                  </Button>
                  <Button onClick={() => shareWhatsApp(selected)} variant="outline" className="flex-1 gap-2 text-green-600 border-green-200 hover:bg-green-50" size="sm">
                    <Share2 className="h-4 w-4" /> WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="font-medium text-foreground break-words">{value}</p>
    </div>
  );
}
