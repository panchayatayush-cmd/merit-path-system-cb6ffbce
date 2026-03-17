import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Search } from 'lucide-react';

interface StudentRow {
  full_name: string | null;
  mobile: string | null;
  class: number | null;
  school_name: string | null;
  center_code: string | null;
  referred_by: string | null;
  created_at: string;
  user_id: string;
}

export default function AdminCenterStudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [centerCodes, setCenterCodes] = useState<string[]>([]);
  const [paidStudentIds, setPaidStudentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const fetchStudents = async () => {
      setLoading(true);

      // Get all center codes owned by this admin
      const { data: centers } = await supabase
        .from('centers')
        .select('center_code')
        .eq('admin_id', user.id)
        .eq('status', 'approved');

      const codes = (centers ?? []).map(c => c.center_code).filter(Boolean);
      setCenterCodes(codes);

      if (codes.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Get students linked to these center codes
      const { data: profiles } = await supabase
        .from('profiles')
        .select('full_name, mobile, class, school_name, center_code, referred_by, created_at, user_id')
        .in('center_code', codes);

      const rows = (profiles ?? []) as StudentRow[];
      setStudents(rows);

      // Check payment status for these students
      if (rows.length > 0) {
        const userIds = rows.map(r => r.user_id);
        const { data: payments } = await supabase
          .from('payment_orders')
          .select('user_id')
          .in('user_id', userIds)
          .eq('status', 'paid')
          .eq('order_type', 'exam_fee');

        setPaidStudentIds(new Set((payments ?? []).map(p => p.user_id)));
      }

      setLoading(false);
    };

    fetchStudents();
  }, [user]);

  const filtered = students.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.full_name ?? '').toLowerCase().includes(q) ||
      (s.mobile ?? '').includes(q) ||
      (s.school_name ?? '').toLowerCase().includes(q) ||
      (s.center_code ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5" /> My Center Students
            </h1>
            <p className="text-sm text-muted-foreground">
              Students linked to your centers ({filtered.length} total)
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, school..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading students...</div>
        ) : centerCodes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            You don't have any approved centers yet. Create and get a center approved first.
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No students found linked to your centers.
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>School Name</TableHead>
                  <TableHead>Center Code</TableHead>
                  <TableHead>Exam Fee</TableHead>
                  <TableHead>Referral Code</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s, i) => (
                  <TableRow key={s.user_id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.full_name || '—'}</TableCell>
                    <TableCell>{s.mobile || '—'}</TableCell>
                    <TableCell>{s.class ?? '—'}</TableCell>
                    <TableCell>{s.school_name || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{s.center_code}</Badge></TableCell>
                    <TableCell>
                      {paidStudentIds.has(s.user_id) ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Paid</Badge>
                      ) : (
                        <Badge variant="secondary">Unpaid</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{s.referred_by || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
