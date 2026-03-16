import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';

interface SyllabusClass { id: string; class_name: string; class_number: number; is_active: boolean; }
interface Subject { id: string; class_id: string; subject_name: string; is_active: boolean; }
interface Topic { id: string; class_id: string; subject_id: string; topic_name: string; status: string; }

export default function SuperAdminSyllabusPage() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<SyllabusClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassNumber, setNewClassNumber] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [c, s, t] = await Promise.all([
      supabase.from('syllabus_classes').select('*').order('class_number'),
      supabase.from('syllabus_subjects').select('*').order('subject_name'),
      supabase.from('syllabus_topics').select('*').order('topic_name'),
    ]);
    setClasses((c.data as any[]) ?? []);
    setSubjects((s.data as any[]) ?? []);
    setTopics((t.data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addClass = async () => {
    if (!newClassName.trim() || !newClassNumber.trim()) return;
    const { error } = await supabase.from('syllabus_classes').insert({
      class_name: newClassName.trim(),
      class_number: parseInt(newClassNumber),
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewClassName(''); setNewClassNumber('');
    toast({ title: 'Class added' }); load();
  };

  const addSubject = async (classId: string) => {
    if (!newSubjectName.trim()) return;
    const { error } = await supabase.from('syllabus_subjects').insert({
      class_id: classId, subject_name: newSubjectName.trim(),
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewSubjectName(''); toast({ title: 'Subject added' }); load();
  };

  const addTopic = async (classId: string, subjectId: string) => {
    if (!newTopicName.trim()) return;
    const { error } = await supabase.from('syllabus_topics').insert({
      class_id: classId, subject_id: subjectId, topic_name: newTopicName.trim(), status: 'approved',
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewTopicName(''); toast({ title: 'Topic added' }); load();
  };

  const toggleTopicStatus = async (topic: Topic) => {
    const newStatus = topic.status === 'approved' ? 'disabled' : 'approved';
    await supabase.from('syllabus_topics').update({ status: newStatus } as any).eq('id', topic.id);
    toast({ title: `Topic ${newStatus}` }); load();
  };

  const deleteClass = async (id: string) => {
    await supabase.from('syllabus_classes').delete().eq('id', id);
    toast({ title: 'Class deleted' }); load();
  };

  const deleteSubject = async (id: string) => {
    await supabase.from('syllabus_subjects').delete().eq('id', id);
    toast({ title: 'Subject deleted' }); load();
  };

  const deleteTopic = async (id: string) => {
    await supabase.from('syllabus_topics').delete().eq('id', id);
    toast({ title: 'Topic deleted' }); load();
  };

  if (loading) return <DashboardLayout><div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold text-foreground">Syllabus Management</h1>
        </div>

        {/* Add Class */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Add New Class</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input placeholder="Class Name (e.g. Class 6)" value={newClassName} onChange={e => setNewClassName(e.target.value)} className="flex-1" />
              <Input placeholder="Number (e.g. 6)" type="number" value={newClassNumber} onChange={e => setNewClassNumber(e.target.value)} className="w-24" />
              <Button onClick={addClass} size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>
            </div>
          </CardContent>
        </Card>

        {/* Classes List */}
        <div className="space-y-3">
          {classes.map(cls => {
            const isExpanded = expandedClass === cls.id;
            const classSubjects = subjects.filter(s => s.class_id === cls.id);
            return (
              <Card key={cls.id}>
                <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedClass(isExpanded ? null : cls.id)}>
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium text-sm text-foreground">{cls.class_name}</span>
                    <Badge variant={cls.is_active ? 'default' : 'secondary'} className="text-xs">{cls.is_active ? 'Active' : 'Inactive'}</Badge>
                    <span className="text-xs text-muted-foreground">{classSubjects.length} subjects</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); deleteClass(cls.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    {/* Add Subject */}
                    <div className="flex gap-2">
                      <Input placeholder="Subject name (e.g. Mathematics)" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} className="flex-1" />
                      <Button onClick={() => addSubject(cls.id)} size="sm"><Plus className="h-4 w-4 mr-1" /> Subject</Button>
                    </div>

                    {classSubjects.map(sub => {
                      const isSubExpanded = expandedSubject === sub.id;
                      const subTopics = topics.filter(t => t.subject_id === sub.id);
                      return (
                        <div key={sub.id} className="border rounded-md bg-muted/30">
                          <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setExpandedSubject(isSubExpanded ? null : sub.id)}>
                            <div className="flex items-center gap-2">
                              {isSubExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              <span className="text-sm font-medium text-foreground">{sub.subject_name}</span>
                              <span className="text-xs text-muted-foreground">{subTopics.length} topics</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); deleteSubject(sub.id); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>

                          {isSubExpanded && (
                            <div className="px-3 pb-3 space-y-2">
                              <div className="flex gap-2">
                                <Input placeholder="Topic name" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} className="flex-1 h-8 text-sm" />
                                <Button onClick={() => addTopic(cls.id, sub.id)} size="sm" className="h-8 text-xs"><Plus className="h-3 w-3 mr-1" /> Topic</Button>
                              </div>
                              {subTopics.map(topic => (
                                <div key={topic.id} className="flex items-center justify-between py-1 px-2 bg-background rounded text-sm">
                                  <span className="text-foreground">{topic.topic_name}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={topic.status === 'approved' ? 'default' : 'secondary'}
                                      className="text-xs cursor-pointer"
                                      onClick={() => toggleTopicStatus(topic)}
                                    >
                                      {topic.status}
                                    </Badge>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteTopic(topic.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}
          {classes.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No classes yet. Add your first class above.</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}
