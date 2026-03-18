import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Download, Eye, Briefcase, Share2, FileSpreadsheet, Calendar, CheckCircle, Clock } from 'lucide-react';
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
  status: string;
}

const DESIGNATIONS = [
  'General Manager / Media Prabhari (GMM)',
  'District Manager / Media Prabhari (DMM)',
  'Panchayat Sakhi / Kosha Adhyaksh (PSK)',
  'Exam Center Head (ECH)',
];

export default function SuperAdminJobApplicationsPage() {
  const [apps, setApps] = useState<JobApp[]>([]);
  const [search, setSearch] = useState('');
  const [filterDesignation, setFilterDesignation] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [selected, setSelected] = useState<JobApp | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('job_applications')
      .select('*')
      .order('created_at', { ascending: false });
    setApps((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = apps.filter(a => {
    const matchSearch = !search.trim() ||
      a.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.contact_number.includes(search);
    const matchDesignation = filterDesignation === 'all' || a.designation === filterDesignation;
    const matchPayment = filterPayment === 'all' || a.payment_status === filterPayment;
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchDate = !filterDate || a.created_at.startsWith(filterDate);
    return matchSearch && matchDesignation && matchPayment && matchStatus && matchDate;
  });

  const updateStatus = async (app: JobApp, newStatus: string) => {
    const { error } = await supabase
      .from('job_applications')
      .update({ status: newStatus } as any)
      .eq('id', app.id);
    if (error) {
      toast.error('Failed to update status');
      return;
    }
    setApps(prev => prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a));
    if (selected?.id === app.id) setSelected({ ...selected, status: newStatus });
    toast.success(`Status updated to ${newStatus}`);
  };

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
    addLine('Status', app.status);
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
    const text = `📋 *Job Application Details*\n\n👤 Name: ${app.full_name}\n📞 Mobile: ${app.contact_number}\n💼 Designation: ${app.designation}\n📍 Location: ${app.district}, ${app.state}\n📊 Status: ${app.status === 'approved' ? '✅ Approved' : '⏳ Pending'}\n💰 Payment: ${app.payment_status === 'paid' ? '✅ Paid' : '❌ Unpaid'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const exportCSV = () => {
    if (filtered.length === 0) { toast.error('No applications to export'); return; }
    const headers = ['Full Name', 'Father Name', 'Contact', 'Alternate', 'Email', 'DOB', 'Designation', 'State', 'District', 'Block', 'Village', 'Full Address', 'Pin Code', 'Work Experience', 'Payment Status', 'Payment ID', 'Amount', 'Status', 'Applied Date'];
    const rows = filtered.map(a => [
      a.full_name, a.father_name, a.contact_number, a.alternate_number || '', a.email,
      a.date_of_birth, a.designation, a.state, a.district, a.block, a.village,
      a.full_address, a.pin_code, a.work_experience || '', a.payment_status,
      a.razorpay_payment_id || '', String(a.amount), a.status, new Date(a.created_at).toLocaleDateString()
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
  const approvedCount = filtered.filter(a => a.status === 'approved').length;
  const pendingCount = filtered.filter(a => a.status !== 'approved').length;

  const shortAddress = (a: JobApp) => [a.village, a.block, a.district, a.state].filter(Boolean).join(', ');

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{paidCount}</p>
            <p className="text-xs text-muted-foreground">Paid</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold text-primary">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
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
              {DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPayment} onValueChange={setFilterPayment}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Payment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Unpaid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
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
                    <th className="text-left px-3 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">#</th>
                    <th className="text-left px-3 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Applicant</th>
                    <th className="text-left px-3 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Designation</th>
                    <th className="text-left px-3 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Mobile</th>
                    <th className="text-left px-3 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment</th>
                    <th className="text-left px-3 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-left px-3 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No applications found</td></tr>
                  ) : filtered.map((a, i) => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {a.photo_url ? (
                            <img src={a.photo_url} alt="" className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                              {a.full_name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{a.full_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{shortAddress(a)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground max-w-[140px] truncate">{a.designation}</td>
                      <td className="px-3 py-3 font-mono text-xs">{a.contact_number}</td>
                      <td className="px-3 py-3">
                        <Badge className={a.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}>
                          {a.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-3">
                        <Select value={a.status} onValueChange={v => updateStatus(a, v)}>
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" /> Pending</span>
                            </SelectItem>
                            <SelectItem value="approved">
                              <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" /> Approved</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelected(a)} title="View"><Eye className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => downloadPDF(a)} title="PDF"><Download className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => shareWhatsApp(a)} title="WhatsApp"><Share2 className="h-4 w-4 text-green-600" /></Button>
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
                {selected.photo_url && (
                  <div className="flex justify-center">
                    <img src={selected.photo_url} alt={selected.full_name} className="w-24 h-24 rounded-full object-cover border-2 border-border" />
                  </div>
                )}

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

                <div className="border-t border-border pt-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Additional Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem label="Designation" value={selected.designation} />
                    <DetailItem label="Work Experience" value={selected.work_experience || '—'} />
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment & Status</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-muted-foreground text-xs">Payment</span>
                      <p>
                        <Badge className={selected.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}>
                          {selected.payment_status === 'paid' ? '✅ Paid' : '❌ Unpaid'}
                        </Badge>
                      </p>
                    </div>
                    <DetailItem label="Amount" value={`₹${selected.amount}`} />
                    <DetailItem label="Payment ID" value={selected.razorpay_payment_id || '—'} />
                    <DetailItem label="Applied On" value={new Date(selected.created_at).toLocaleDateString()} />
                    <div>
                      <span className="text-muted-foreground text-xs">Application Status</span>
                      <div className="mt-1">
                        <Select value={selected.status} onValueChange={v => updateStatus(selected, v)}>
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending"><span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" /> Pending</span></SelectItem>
                            <SelectItem value="approved"><span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" /> Approved</span></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

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
