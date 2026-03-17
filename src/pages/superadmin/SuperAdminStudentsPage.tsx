import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, Search, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Student {
  full_name: string | null;
  mobile: string | null;
  email: string | null;
  class: number | null;
  school_name: string | null;
  school_mobile: string | null;
  school_address: string | null;
  state: string | null;
  district: string | null;
  center_code: string | null;
  referral_code: string | null;
  referred_by: string | null;
  created_at: string;
  user_id: string;
}

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export default function SuperAdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('full_name, mobile, email, class, school_name, school_mobile, school_address, state, district, center_code, referral_code, referred_by, created_at, user_id')
        .order('created_at', { ascending: false });

      const { data: paidOrders } = await supabase
        .from('payment_orders')
        .select('user_id')
        .eq('status', 'verified')
        .eq('order_type', 'exam_fee');

      const payMap: Record<string, boolean> = {};
      (paidOrders ?? []).forEach(p => { payMap[p.user_id] = true; });

      setStudents((profiles as Student[]) ?? []);
      setPayments(payMap);
      setLoading(false);
    };
    load();
  }, []);

  const districts = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.district) set.add(s.district); });
    return Array.from(set).sort();
  }, [students]);

  const filtered = useMemo(() => {
    return students.filter(s => {
      if (search) {
        const q = search.toLowerCase();
        const match = [s.full_name, s.mobile, s.email, s.school_name, s.center_code]
          .some(v => v?.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (filterState && s.state !== filterState) return false;
      if (filterDistrict && s.district !== filterDistrict) return false;
      if (filterClass && s.class?.toString() !== filterClass) return false;
      if (filterPayment === 'paid' && !payments[s.user_id]) return false;
      if (filterPayment === 'unpaid' && payments[s.user_id]) return false;
      return true;
    });
  }, [students, search, filterState, filterDistrict, filterClass, filterPayment, payments]);

  const downloadPDF = (data: Student[], title: string) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleDateString()}  |  Total: ${data.length}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [['#', 'Name', 'Phone', 'Class', 'School', 'State', 'District', 'Center', 'Payment', 'Registered']],
      body: data.map((s, i) => [
        i + 1,
        s.full_name ?? '—',
        s.mobile ?? '—',
        s.class?.toString() ?? '—',
        s.school_name ?? '—',
        s.state ?? '—',
        s.district ?? '—',
        s.center_code ?? '—',
        payments[s.user_id] ? 'Paid' : 'Unpaid',
        new Date(s.created_at).toLocaleDateString(),
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-base font-semibold text-foreground">All Students ({filtered.length})</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-3.5 w-3.5 mr-1" /> Filters
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadPDF(filtered, 'All Students Report')}>
              <Download className="h-3.5 w-3.5 mr-1" /> PDF
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email, school, center..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 card-shadow rounded-lg bg-card">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">State</label>
              <select value={filterState} onChange={e => setFilterState(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">All States</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">District</label>
              <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">All Districts</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Class</label>
              <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">All Classes</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment</label>
              <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="card-shadow rounded-lg bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Name', 'Phone', 'Email', 'Class', 'School', 'State', 'District', 'Center', 'Referral', 'Payment', 'Registered'].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">No students found</td></tr>
                ) : (
                  filtered.map((s, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{s.full_name ?? '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{s.mobile ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{s.email ?? '—'}</td>
                      <td className="px-3 py-2.5 font-mono">{s.class ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs max-w-[150px] truncate">{s.school_name ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{s.state ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{s.district ?? '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{s.center_code ?? '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{s.referred_by ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${payments[s.user_id] ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {payments[s.user_id] ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
