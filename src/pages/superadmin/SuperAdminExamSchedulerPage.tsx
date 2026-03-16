import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Play, Pause, RefreshCw, Loader2, Plus, Trash2 } from 'lucide-react';

interface SyllabusClass { id: string; class_name: string; class_number: number; }
interface ExamSchedule {
  id: string; class_id: string; exam_day: number; exam_duration_minutes: number;
  num_questions: number; difficulty: string; question_type: string; is_active: boolean;
}
interface ScheduledExam {
  id: string; schedule_id: string; class_id: string; exam_date: string;
  exam_duration_minutes: number; total_questions: number; status: string; created_at: string;
}

export default function SuperAdminExamSchedulerPage() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<SyllabusClass[]>([]);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [exams, setExams] = useState<ScheduledExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  // New schedule form
  const [newClassId, setNewClassId] = useState('');
  const [newDay, setNewDay] = useState('5');
  const [newDuration, setNewDuration] = useState('60');
  const [newNumQ, setNewNumQ] = useState('30');
  const [newDifficulty, setNewDifficulty] = useState('mixed');
  const [newQType, setNewQType] = useState('mcq');

  const load = async () => {
    setLoading(true);
    const [c, s, e] = await Promise.all([
      supabase.from('syllabus_classes').select('*').order('class_number'),
      supabase.from('exam_schedules').select('*').order('created_at'),
      supabase.from('scheduled_exams').select('*').order('exam_date', { ascending: false }).limit(50),
    ]);
    setClasses((c.data as any[]) ?? []);
    setSchedules((s.data as any[]) ?? []);
    setExams((e.data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.class_name || 'Unknown';

  const addSchedule = async () => {
    if (!newClassId) { toast({ title: 'Select a class', variant: 'destructive' }); return; }
    const { error } = await supabase.from('exam_schedules').insert({
      class_id: newClassId,
      exam_day: parseInt(newDay),
      exam_duration_minutes: parseInt(newDuration),
      num_questions: parseInt(newNumQ),
      difficulty: newDifficulty,
      question_type: newQType,
      is_active: true,
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Schedule created!' }); setNewClassId(''); load();
  };

  const toggleSchedule = async (schedule: ExamSchedule) => {
    await supabase.from('exam_schedules').update({ is_active: !schedule.is_active } as any).eq('id', schedule.id);
    toast({ title: schedule.is_active ? 'Schedule paused' : 'Schedule resumed' }); load();
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from('exam_schedules').delete().eq('id', id);
    toast({ title: 'Schedule deleted' }); load();
  };

  const triggerExam = async () => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-create-exam', {
        body: { manual: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const created = data?.results?.filter((r: any) => r.status === 'created')?.length || 0;
      const skipped = data?.results?.filter((r: any) => r.status === 'skipped')?.length || 0;
      toast({ title: 'Exam Triggered!', description: `Created: ${created}, Skipped: ${skipped}` });
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setTriggering(false);
    }
  };

  const updateExamStatus = async (examId: string, status: string) => {
    await supabase.from('scheduled_exams').update({ status } as any).eq('id', examId);
    toast({ title: `Exam ${status}` }); load();
  };

  const scheduledClasses = schedules.map(s => s.class_id);
  const availableClasses = classes.filter(c => !scheduledClasses.includes(c.id));

  if (loading) return <DashboardLayout><div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold text-foreground">Monthly Exam Scheduler</h1>
          </div>
          <Button onClick={triggerExam} disabled={triggering} size="sm">
            {triggering ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating...</> : <><Play className="h-4 w-4 mr-1" /> Trigger Now</>}
          </Button>
        </div>

        {/* Add Schedule */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Add Exam Schedule</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Class</Label>
                <Select value={newClassId} onValueChange={setNewClassId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Exam Day (of month)</Label>
                <Input type="number" min="1" max="28" value={newDay} onChange={e => setNewDay(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" min="15" max="180" value={newDuration} onChange={e => setNewDuration(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Questions</Label>
                <Input type="number" min="5" max="100" value={newNumQ} onChange={e => setNewNumQ(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Difficulty</Label>
                <Select value={newDifficulty} onValueChange={setNewDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={newQType} onValueChange={setNewQType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={addSchedule} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Schedule</Button>
          </CardContent>
        </Card>

        {/* Active Schedules */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Exam Schedules ({schedules.length})</CardTitle></CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No schedules yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Class</TableHead>
                      <TableHead className="text-xs">Day</TableHead>
                      <TableHead className="text-xs">Duration</TableHead>
                      <TableHead className="text-xs">Questions</TableHead>
                      <TableHead className="text-xs">Difficulty</TableHead>
                      <TableHead className="text-xs">Active</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs font-medium">{getClassName(s.class_id)}</TableCell>
                        <TableCell className="text-xs">{s.exam_day}th</TableCell>
                        <TableCell className="text-xs">{s.exam_duration_minutes} min</TableCell>
                        <TableCell className="text-xs">{s.num_questions}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{s.difficulty}</Badge></TableCell>
                        <TableCell>
                          <Switch checked={s.is_active} onCheckedChange={() => toggleSchedule(s)} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteSchedule(s.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exam History */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Exam History ({exams.length})</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load}><RefreshCw className="h-3 w-3" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {exams.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No exams generated yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Class</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Duration</TableHead>
                      <TableHead className="text-xs">Questions</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exams.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs font-medium">{getClassName(e.class_id)}</TableCell>
                        <TableCell className="text-xs">{new Date(e.exam_date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell className="text-xs">{e.exam_duration_minutes} min</TableCell>
                        <TableCell className="text-xs">{e.total_questions}</TableCell>
                        <TableCell>
                          <Badge variant={e.status === 'active' ? 'default' : e.status === 'completed' ? 'secondary' : e.status === 'cancelled' ? 'destructive' : 'outline'} className="text-xs">
                            {e.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {e.status === 'scheduled' && (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => updateExamStatus(e.id, 'active')}>
                                  <Play className="h-3 w-3 mr-1" /> Activate
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => updateExamStatus(e.id, 'cancelled')}>
                                  <Pause className="h-3 w-3 mr-1" /> Cancel
                                </Button>
                              </>
                            )}
                            {e.status === 'active' && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => updateExamStatus(e.id, 'completed')}>
                                Complete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
