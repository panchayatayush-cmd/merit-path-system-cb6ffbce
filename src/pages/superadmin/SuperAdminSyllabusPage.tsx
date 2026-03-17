import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, BookOpen, ChevronDown, ChevronRight, Upload, FileText, Loader2 } from 'lucide-react';

interface SyllabusClass { id: string; class_name: string; class_number: number; is_active: boolean; }
interface Subject { id: string; class_id: string; subject_name: string; is_active: boolean; }
interface Lesson { id: string; class_id: string; subject_id: string; lesson_name: string; pdf_file_path: string; file_name: string | null; extracted_text: string | null; created_at: string; }

export default function SuperAdminSyllabusPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [classes, setClasses] = useState<SyllabusClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassNumber, setNewClassNumber] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newLessonName, setNewLessonName] = useState('');
  const [pendingLessonFile, setPendingLessonFile] = useState<File | null>(null);
  const [addingLessonFor, setAddingLessonFor] = useState<{ classId: string; subjectId: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [c, s, l] = await Promise.all([
      supabase.from('syllabus_classes').select('*').order('class_number'),
      supabase.from('syllabus_subjects').select('*').order('subject_name'),
      supabase.from('syllabus_lessons' as any).select('*').order('created_at'),
    ]);
    setClasses((c.data as any[]) ?? []);
    setSubjects((s.data as any[]) ?? []);
    setLessons((l.data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addClass = async () => {
    if (!newClassName.trim() || !newClassNumber.trim()) return;
    const num = parseInt(newClassNumber);
    const exists = classes.find(c => c.class_number === num);
    if (exists) {
      toast({ title: 'Error', description: `Class ${num} already exists (${exists.class_name})`, variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('syllabus_classes').insert({
      class_name: newClassName.trim(),
      class_number: num,
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

  const addLesson = async (classId: string, subjectId: string) => {
    if (!newLessonName.trim() || !pendingLessonFile) {
      toast({ title: 'Error', description: 'Lesson name and PDF are both required', variant: 'destructive' });
      return;
    }
    const file = pendingLessonFile;
    if (file.type !== 'application/pdf') {
      toast({ title: 'Error', description: 'Only PDF files allowed', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Max file size is 10MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${classId}/${subjectId}/${Date.now()}_${safeName}`;
      const { error: uploadErr } = await supabase.storage.from('syllabus-pdfs').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      // Parse PDF
      const { data: parseData, error: parseErr } = await supabase.functions.invoke('parse-syllabus-pdf', {
        body: { class_id: classId, file_path: filePath, file_name: file.name },
      });
      if (parseErr) throw parseErr;
      if (parseData?.error) throw new Error(parseData.error);

      // Get extracted text from the syllabus_pdfs record that parse-syllabus-pdf created
      const { data: pdfRecord } = await supabase.from('syllabus_pdfs' as any).select('extracted_text').eq('pdf_file_path', filePath).maybeSingle();

      // Create lesson
      const { error: lessonErr } = await supabase.from('syllabus_lessons' as any).insert({
        class_id: classId,
        subject_id: subjectId,
        lesson_name: newLessonName.trim(),
        pdf_file_path: filePath,
        file_name: file.name,
        extracted_text: (pdfRecord as any)?.extracted_text || null,
      });
      if (lessonErr) throw lessonErr;

      toast({ title: 'Lesson added', description: `PDF processed: ${parseData?.text_length || 0} characters extracted` });
      setNewLessonName(''); setPendingLessonFile(null); setAddingLessonFor(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const deleteClass = async (id: string) => {
    await supabase.from('syllabus_classes').delete().eq('id', id);
    toast({ title: 'Class deleted' }); load();
  };

  const deleteSubject = async (id: string) => {
    await supabase.from('syllabus_subjects').delete().eq('id', id);
    toast({ title: 'Subject deleted' }); load();
  };

  const deleteLesson = async (lesson: Lesson) => {
    await supabase.storage.from('syllabus-pdfs').remove([lesson.pdf_file_path]);
    await supabase.from('syllabus_lessons' as any).delete().eq('id', lesson.id);
    toast({ title: 'Lesson deleted' }); load();
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
            const classLessons = lessons.filter(l => l.class_id === cls.id);
            return (
              <Card key={cls.id}>
                <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedClass(isExpanded ? null : cls.id)}>
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium text-sm text-foreground">{cls.class_name}</span>
                    <Badge variant={cls.is_active ? 'default' : 'secondary'} className="text-xs">{cls.is_active ? 'Active' : 'Inactive'}</Badge>
                    <span className="text-xs text-muted-foreground">{classSubjects.length} subjects • {classLessons.length} lessons</span>
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
                      const subLessons = lessons.filter(l => l.subject_id === sub.id);
                      const isAddingHere = addingLessonFor?.classId === cls.id && addingLessonFor?.subjectId === sub.id;
                      return (
                        <div key={sub.id} className="border rounded-md bg-muted/30">
                          <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setExpandedSubject(isSubExpanded ? null : sub.id)}>
                            <div className="flex items-center gap-2">
                              {isSubExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              <span className="text-sm font-medium text-foreground">{sub.subject_name}</span>
                              <span className="text-xs text-muted-foreground">{subLessons.length} lessons</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); deleteSubject(sub.id); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>

                          {isSubExpanded && (
                            <div className="px-3 pb-3 space-y-2">
                              {/* Add Lesson Form */}
                              {isAddingHere ? (
                                <div className="border rounded-lg p-3 bg-background space-y-2">
                                  <Input placeholder="Lesson name (e.g. Chapter 5 - Conservation)" value={newLessonName} onChange={e => setNewLessonName(e.target.value)} className="h-8 text-sm" />
                                  <div className="flex items-center gap-2">
                                    <input ref={fileInputRef} type="file" accept=".pdf" onChange={e => setPendingLessonFile(e.target.files?.[0] || null)} className="text-xs flex-1" />
                                  </div>
                                  {!pendingLessonFile && (
                                    <p className="text-xs text-destructive">⚠️ Syllabus PDF is mandatory for each lesson</p>
                                  )}
                                  <div className="flex gap-2">
                                    <Button onClick={() => addLesson(cls.id, sub.id)} size="sm" className="h-7 text-xs" disabled={uploading || !pendingLessonFile || !newLessonName.trim()}>
                                      {uploading ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading...</> : <><Upload className="h-3 w-3 mr-1" /> Save Lesson</>}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAddingLessonFor(null); setNewLessonName(''); setPendingLessonFile(null); }}>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => setAddingLessonFor({ classId: cls.id, subjectId: sub.id })}>
                                  <Plus className="h-3 w-3 mr-1" /> Add Lesson with PDF
                                </Button>
                              )}

                              {/* Lessons list */}
                              {subLessons.map(lesson => (
                                <div key={lesson.id} className="flex items-center justify-between py-2 px-3 bg-background rounded text-sm border">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <FileText className="h-4 w-4 text-primary shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">{lesson.lesson_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        📄 {lesson.file_name || 'PDF'} • {lesson.extracted_text ? `${lesson.extracted_text.length} chars` : 'Processing...'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="default" className="text-xs">✅ PDF</Badge>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteLesson(lesson)}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              {subLessons.length === 0 && !isAddingHere && (
                                <p className="text-xs text-muted-foreground text-center py-2">No lessons yet. Add a lesson with syllabus PDF.</p>
                              )}
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
