import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Plus, Check, X, Loader2, Trash2, RefreshCw, FileText } from 'lucide-react';

interface SyllabusClass { id: string; class_name: string; class_number: number; }
interface Subject { id: string; class_id: string; subject_name: string; }
interface Lesson { id: string; class_id: string; subject_id: string; lesson_name: string; file_name: string | null; extracted_text: string | null; }
interface AIQuestion { id: string; question_text: string; question_type: string; difficulty: string; options: any; correct_option: number; is_approved: boolean; class_id: string; lesson_id: string | null; subject_id: string; created_at: string; }

export default function SuperAdminAIExamPage() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<SyllabusClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [questions, setQuestions] = useState<AIQuestion[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [numQuestions, setNumQuestions] = useState('60');
  const [difficulty, setDifficulty] = useState('medium');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Manual question form
  const [manualQ, setManualQ] = useState('');
  const [manualA, setManualA] = useState('');
  const [manualB, setManualB] = useState('');
  const [manualC, setManualC] = useState('');
  const [manualD, setManualD] = useState('');
  const [manualCorrect, setManualCorrect] = useState('0');
  const [addingManual, setAddingManual] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, s, l, q] = await Promise.all([
      supabase.from('syllabus_classes').select('*').order('class_number'),
      supabase.from('syllabus_subjects').select('*').order('subject_name'),
      supabase.from('syllabus_lessons' as any).select('*').order('created_at'),
      supabase.from('ai_generated_questions').select('*').order('created_at', { ascending: false }).limit(500),
    ]);
    setClasses((c.data as any[]) ?? []);
    setSubjects((s.data as any[]) ?? []);
    setLessons((l.data as any[]) ?? []);
    setQuestions((q.data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Reset dependent selectors
  useEffect(() => { setSelectedSubject(''); setSelectedLesson(''); }, [selectedClass]);
  useEffect(() => { setSelectedLesson(''); }, [selectedSubject]);

  const getClassName = (id: string) => classes.find(c => c.id === id)?.class_name || 'Unknown';
  const filteredSubjects = subjects.filter(s => s.class_id === selectedClass);
  const filteredLessons = lessons.filter(l => l.class_id === selectedClass && l.subject_id === selectedSubject);
  const currentLesson = lessons.find(l => l.id === selectedLesson);

  const filteredQuestions = selectedLesson
    ? questions.filter(q => (q as any).lesson_id === selectedLesson)
    : selectedClass
      ? questions.filter(q => q.class_id === selectedClass)
      : questions;
  const approvedCount = filteredQuestions.filter(q => q.is_approved).length;

  // AI Generate
  const generateQuestions = async () => {
    if (!selectedLesson || !currentLesson) {
      toast({ title: 'Error', description: 'Select a lesson with uploaded PDF first', variant: 'destructive' });
      return;
    }
    if (!currentLesson.extracted_text) {
      toast({ title: 'Error', description: 'This lesson has no extracted PDF text. Please re-upload the syllabus PDF.', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-questions', {
        body: {
          class_id: selectedClass,
          subject_id: selectedSubject,
          lesson_id: selectedLesson,
          num_questions: parseInt(numQuestions),
          difficulty,
          question_type: 'mcq',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Questions Generated!', description: `${data.count} questions created from lesson syllabus PDF` });
      load();
    } catch (e: any) {
      toast({ title: 'Generation Failed', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  // Manual Add
  const addManualQuestion = async () => {
    if (!selectedLesson || !manualQ || !manualA || !manualB || !manualC || !manualD) {
      toast({ title: 'Error', description: 'Select a lesson and fill all fields', variant: 'destructive' });
      return;
    }
    setAddingManual(true);
    try {
      // Need a topic for the question - get or create one
      let topicId: string;
      const { data: existingTopic } = await supabase.from('syllabus_topics').select('id').eq('class_id', selectedClass).eq('subject_id', selectedSubject).limit(1).maybeSingle();
      if (existingTopic) {
        topicId = existingTopic.id;
      } else {
        const { data: newTopic, error } = await supabase.from('syllabus_topics').insert({ class_id: selectedClass, subject_id: selectedSubject, topic_name: currentLesson?.lesson_name || 'Manual', status: 'approved' } as any).select('id').single();
        if (error) throw error;
        topicId = newTopic.id;
      }

      const { error } = await supabase.from('ai_generated_questions').insert({
        class_id: selectedClass,
        subject_id: selectedSubject,
        topic_id: topicId,
        lesson_id: selectedLesson,
        question_text: manualQ,
        options: [manualA, manualB, manualC, manualD],
        correct_option: parseInt(manualCorrect),
        question_type: 'mcq',
        difficulty: 'medium',
        is_approved: true,
        generated_by: 'manual',
      } as any);
      if (error) throw error;

      toast({ title: 'Question Added!' });
      setManualQ(''); setManualA(''); setManualB(''); setManualC(''); setManualD(''); setManualCorrect('0');
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setAddingManual(false);
    }
  };

  const toggleApproval = async (q: AIQuestion) => {
    await supabase.from('ai_generated_questions').update({ is_approved: !q.is_approved } as any).eq('id', q.id);
    setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, is_approved: !item.is_approved } : item));
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from('ai_generated_questions').delete().eq('id', id);
    setQuestions(prev => prev.filter(q => q.id !== id));
    toast({ title: 'Question deleted' });
  };

  if (loading) return <DashboardLayout><div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold text-foreground">AI Exam & Question Management</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>

        {/* Class → Subject → Lesson Selector */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Select Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Select Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedClass}>
                  <SelectTrigger><SelectValue placeholder="Choose a subject" /></SelectTrigger>
                  <SelectContent>{filteredSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Select Lesson</Label>
                <Select value={selectedLesson} onValueChange={setSelectedLesson} disabled={!selectedSubject}>
                  <SelectTrigger><SelectValue placeholder="Choose a lesson" /></SelectTrigger>
                  <SelectContent>{filteredLessons.map(l => <SelectItem key={l.id} value={l.id}>{l.lesson_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {selectedLesson && currentLesson && (
              <div className="mt-4 p-3 border rounded-lg bg-muted/30 flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{currentLesson.lesson_name}</p>
                  <p className="text-xs text-muted-foreground">
                    📄 {currentLesson.file_name || 'PDF'} • {currentLesson.extracted_text ? `${currentLesson.extracted_text.length} chars extracted` : '⚠️ No text extracted'}
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{filteredQuestions.length}</p>
                    <p className="text-xs text-muted-foreground">Questions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{approvedCount}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                </div>
              </div>
            )}

            {filteredLessons.length === 0 && selectedSubject && (
              <div className="mt-4 p-3 border rounded-lg bg-destructive/10 text-destructive text-sm">
                ⚠️ No lessons found for this subject. Go to Syllabus Management to add lessons with PDF uploads first.
              </div>
            )}
          </CardContent>
        </Card>

        {selectedLesson && currentLesson && (
          <Tabs defaultValue="ai-generate" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ai-generate" className="text-xs">🤖 Generate with AI</TabsTrigger>
              <TabsTrigger value="manual" className="text-xs">✏️ Add Manually</TabsTrigger>
              <TabsTrigger value="questions" className="text-xs">📋 Questions ({filteredQuestions.length})</TabsTrigger>
            </TabsList>

            {/* AI Generate Tab */}
            <TabsContent value="ai-generate">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Generate Questions from Syllabus PDF</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!currentLesson.extracted_text && (
                    <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                      ⚠️ No extracted text found for this lesson's PDF. Please re-upload the syllabus PDF.
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Number of Questions</Label>
                      <Input type="number" min="1" max="60" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Difficulty</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={generateQuestions} disabled={generating || !currentLesson.extracted_text} className="w-full" size="lg">
                    {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating from Syllabus PDF...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate {numQuestions} Questions from PDF</>}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    AI will generate questions strictly from the uploaded syllabus PDF content of "{currentLesson.lesson_name}".
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manual Add Tab */}
            <TabsContent value="manual">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Add Questions Manually</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Question</Label>
                    <Textarea placeholder="Enter question text..." value={manualQ} onChange={e => setManualQ(e.target.value)} rows={2} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Option A</Label><Input placeholder="Option A" value={manualA} onChange={e => setManualA(e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Option B</Label><Input placeholder="Option B" value={manualB} onChange={e => setManualB(e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Option C</Label><Input placeholder="Option C" value={manualC} onChange={e => setManualC(e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Option D</Label><Input placeholder="Option D" value={manualD} onChange={e => setManualD(e.target.value)} /></div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Correct Answer</Label>
                    <Select value={manualCorrect} onValueChange={setManualCorrect}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Option A</SelectItem>
                        <SelectItem value="1">Option B</SelectItem>
                        <SelectItem value="2">Option C</SelectItem>
                        <SelectItem value="3">Option D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addManualQuestion} disabled={addingManual} className="w-full">
                    {addingManual ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</> : <><Plus className="h-4 w-4 mr-2" /> Add Question</>}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Questions List Tab */}
            <TabsContent value="questions">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Questions ({filteredQuestions.length})</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="default" className="text-xs">{approvedCount} Approved</Badge>
                      <Badge variant="secondary" className="text-xs">{filteredQuestions.length - approvedCount} Pending</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No questions for this lesson yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs w-8">#</TableHead>
                            <TableHead className="text-xs">Question</TableHead>
                            <TableHead className="text-xs">Options</TableHead>
                            <TableHead className="text-xs">Answer</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredQuestions.map((q, idx) => {
                            const opts = Array.isArray(q.options) ? q.options : [];
                            return (
                              <TableRow key={q.id}>
                                <TableCell className="text-xs">{idx + 1}</TableCell>
                                <TableCell className="text-xs max-w-[250px]"><span className="line-clamp-2">{q.question_text}</span></TableCell>
                                <TableCell className="text-xs max-w-[200px]">
                                  <div className="space-y-0.5">
                                    {opts.map((o: string, i: number) => (
                                      <span key={i} className={`block text-xs ${i === q.correct_option ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                                        {String.fromCharCode(65 + i)}) {o}
                                      </span>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell><Badge variant="outline" className="text-xs">{String.fromCharCode(65 + q.correct_option)}</Badge></TableCell>
                                <TableCell>
                                  <Badge variant={q.is_approved ? 'default' : 'secondary'} className="text-xs cursor-pointer" onClick={() => toggleApproval(q)}>
                                    {q.is_approved ? '✅ Approved' : '⏳ Pending'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleApproval(q)}>
                                      {q.is_approved ? <X className="h-3 w-3" /> : <Check className="h-3 w-3 text-primary" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteQuestion(q.id)}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Overview when no lesson selected */}
        {!selectedLesson && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">How to Generate Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>1️⃣ Go to <strong className="text-foreground">Syllabus Management</strong> → Add Classes, Subjects, and Lessons with PDF uploads</p>
                <p>2️⃣ Come back here → Select <strong className="text-foreground">Class → Subject → Lesson</strong></p>
                <p>3️⃣ Use <strong className="text-foreground">Generate with AI</strong> or <strong className="text-foreground">Add Manually</strong></p>
                <p className="text-xs">⚠️ AI questions are generated strictly from the uploaded syllabus PDF content. No PDF = No AI generation.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
