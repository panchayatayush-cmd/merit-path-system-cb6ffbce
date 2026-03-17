import { useEffect, useState, useRef } from 'react';
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
import { Sparkles, Upload, Plus, Check, X, Loader2, FileText, Trash2, RefreshCw } from 'lucide-react';

interface SyllabusClass { id: string; class_name: string; class_number: number; }
interface SyllabusPdf { id: string; class_id: string; pdf_file_path: string; extracted_text: string | null; file_name: string | null; uploaded_at: string; }
interface AIQuestion { id: string; question_text: string; question_type: string; difficulty: string; options: any; correct_option: number; is_approved: boolean; class_id: string; created_at: string; }

export default function SuperAdminAIExamPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [classes, setClasses] = useState<SyllabusClass[]>([]);
  const [syllabi, setSyllabi] = useState<SyllabusPdf[]>([]);
  const [questions, setQuestions] = useState<AIQuestion[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [numQuestions, setNumQuestions] = useState('60');
  const [difficulty, setDifficulty] = useState('medium');
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    const [c, s, q] = await Promise.all([
      supabase.from('syllabus_classes').select('*').order('class_number'),
      supabase.from('syllabus_pdfs' as any).select('*').order('uploaded_at', { ascending: false }),
      supabase.from('ai_generated_questions').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setClasses((c.data as any[]) ?? []);
    setSyllabi((s.data as any[]) ?? []);
    setQuestions((q.data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getClassName = (id: string) => classes.find(c => c.id === id)?.class_name || 'Unknown';
  const getClassSyllabus = (classId: string) => syllabi.find(s => s.class_id === classId);

  // PDF Upload
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClass) {
      toast({ title: 'Error', description: 'Select a class first', variant: 'destructive' });
      return;
    }
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
      const filePath = `${selectedClass}/${Date.now()}_${safeName}`;
      const { error: uploadErr } = await supabase.storage.from('syllabus-pdfs').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      // Parse PDF with AI
      const { data, error } = await supabase.functions.invoke('parse-syllabus-pdf', {
        body: { class_id: selectedClass, file_path: filePath, file_name: file.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Syllabus Uploaded!', description: `Text extracted: ${data.text_length} characters` });
      load();
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // AI Generate
  const generateQuestions = async () => {
    if (!selectedClass) {
      toast({ title: 'Error', description: 'Select a class first', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-questions', {
        body: {
          class_id: selectedClass,
          num_questions: parseInt(numQuestions),
          difficulty,
          question_type: 'mcq',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Questions Generated!', description: `${data.count} questions created from syllabus` });
      load();
    } catch (e: any) {
      toast({ title: 'Generation Failed', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  // Manual Add
  const addManualQuestion = async () => {
    if (!selectedClass || !manualQ || !manualA || !manualB || !manualC || !manualD) {
      toast({ title: 'Error', description: 'Fill all fields', variant: 'destructive' });
      return;
    }
    setAddingManual(true);
    try {
      // Need a subject and topic for the question
      let subjectId: string;
      let topicId: string;

      const { data: existingSub } = await supabase.from('syllabus_subjects').select('id').eq('class_id', selectedClass).limit(1).maybeSingle();
      if (existingSub) {
        subjectId = existingSub.id;
      } else {
        const { data: newSub, error } = await supabase.from('syllabus_subjects').insert({ class_id: selectedClass, subject_name: 'General' } as any).select('id').single();
        if (error) throw error;
        subjectId = newSub.id;
      }

      const { data: existingTopic } = await supabase.from('syllabus_topics').select('id').eq('class_id', selectedClass).eq('subject_id', subjectId).limit(1).maybeSingle();
      if (existingTopic) {
        topicId = existingTopic.id;
      } else {
        const { data: newTopic, error } = await supabase.from('syllabus_topics').insert({ class_id: selectedClass, subject_id: subjectId, topic_name: 'Manual', status: 'approved' } as any).select('id').single();
        if (error) throw error;
        topicId = newTopic.id;
      }

      const { error } = await supabase.from('ai_generated_questions').insert({
        class_id: selectedClass,
        subject_id: subjectId,
        topic_id: topicId,
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

  const deleteSyllabus = async (syllabus: SyllabusPdf) => {
    await supabase.storage.from('syllabus-pdfs').remove([syllabus.pdf_file_path]);
    await supabase.from('syllabus_pdfs' as any).delete().eq('id', syllabus.id);
    toast({ title: 'Syllabus deleted' });
    load();
  };

  const filteredQuestions = selectedClass ? questions.filter(q => q.class_id === selectedClass) : questions;
  const classQuestionCount = selectedClass ? filteredQuestions.length : 0;
  const approvedCount = filteredQuestions.filter(q => q.is_approved).length;

  if (loading) return <DashboardLayout><div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold text-foreground">AI Exam & Syllabus Management</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>

        {/* Class Selector */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Select Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {selectedClass && (
                <div className="flex gap-4 pt-5">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{classQuestionCount}</p>
                    <p className="text-xs text-muted-foreground">Questions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{approvedCount}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{getClassSyllabus(selectedClass) ? '✅' : '❌'}</p>
                    <p className="text-xs text-muted-foreground">Syllabus</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedClass && (
          <Tabs defaultValue="syllabus" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="syllabus" className="text-xs">📄 Syllabus PDF</TabsTrigger>
              <TabsTrigger value="ai-generate" className="text-xs">🤖 AI Generate</TabsTrigger>
              <TabsTrigger value="manual" className="text-xs">✏️ Manual Add</TabsTrigger>
              <TabsTrigger value="questions" className="text-xs">📋 Questions ({filteredQuestions.length})</TabsTrigger>
            </TabsList>

            {/* Syllabus PDF Tab */}
            <TabsContent value="syllabus">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Syllabus PDF - {getClassName(selectedClass)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const existing = getClassSyllabus(selectedClass);
                    if (existing) {
                      return (
                        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-primary" />
                              <div>
                                <p className="text-sm font-medium text-foreground">{existing.file_name || 'syllabus.pdf'}</p>
                                <p className="text-xs text-muted-foreground">
                                  Uploaded: {new Date(existing.uploaded_at).toLocaleDateString('en-IN')} •
                                  {existing.extracted_text ? ` ${existing.extracted_text.length} chars extracted` : ' Processing...'}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => deleteSyllabus(existing)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          {existing.extracted_text && (
                            <div className="bg-background rounded p-3 max-h-40 overflow-y-auto">
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{existing.extracted_text.substring(0, 1000)}...</p>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{getClassSyllabus(selectedClass) ? 'Replace Syllabus PDF' : 'Upload Syllabus PDF'}</p>
                      <p className="text-xs text-muted-foreground">PDF format, max 10MB. AI will extract text for question generation.</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="outline">
                      {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing PDF...</> : <><Upload className="h-4 w-4 mr-2" /> Select PDF</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Generate Tab */}
            <TabsContent value="ai-generate">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Generate Questions with AI</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!getClassSyllabus(selectedClass) && (
                    <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                      ⚠️ No syllabus PDF uploaded for {getClassName(selectedClass)}. Please upload a syllabus PDF first.
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
                  <Button onClick={generateQuestions} disabled={generating || !getClassSyllabus(selectedClass)} className="w-full" size="lg">
                    {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating from Syllabus...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate {numQuestions} Questions with AI</>}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    AI will generate questions strictly from the uploaded syllabus PDF content.
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
                    <div className="space-y-1.5">
                      <Label className="text-xs">Option A</Label>
                      <Input placeholder="Option A" value={manualA} onChange={e => setManualA(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Option B</Label>
                      <Input placeholder="Option B" value={manualB} onChange={e => setManualB(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Option C</Label>
                      <Input placeholder="Option C" value={manualC} onChange={e => setManualC(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Option D</Label>
                      <Input placeholder="Option D" value={manualD} onChange={e => setManualD(e.target.value)} />
                    </div>
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
                  <p className="text-xs text-muted-foreground text-center">
                    Manually added questions are auto-approved. You can add up to 60 questions per exam.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Questions List Tab */}
            <TabsContent value="questions">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Questions for {getClassName(selectedClass)} ({filteredQuestions.length})</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="default" className="text-xs">{approvedCount} Approved</Badge>
                      <Badge variant="secondary" className="text-xs">{filteredQuestions.length - approvedCount} Pending</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No questions for this class yet. Use AI Generate or Manual Add.</p>
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
                                <TableCell className="text-xs max-w-[250px]">
                                  <span className="line-clamp-2">{q.question_text}</span>
                                </TableCell>
                                <TableCell className="text-xs max-w-[200px]">
                                  <div className="space-y-0.5">
                                    {opts.map((o: string, i: number) => (
                                      <span key={i} className={`block text-xs ${i === q.correct_option ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                                        {String.fromCharCode(65 + i)}) {o}
                                      </span>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {String.fromCharCode(65 + q.correct_option)}
                                  </Badge>
                                </TableCell>
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

        {/* All Classes Syllabus Overview */}
        {!selectedClass && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Class-wise Syllabus Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Class</TableHead>
                      <TableHead className="text-xs">Syllabus PDF</TableHead>
                      <TableHead className="text-xs">Questions</TableHead>
                      <TableHead className="text-xs">Approved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map(cls => {
                      const pdf = syllabi.find(s => s.class_id === cls.id);
                      const clsQ = questions.filter(q => q.class_id === cls.id);
                      const clsApproved = clsQ.filter(q => q.is_approved);
                      return (
                        <TableRow key={cls.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedClass(cls.id)}>
                          <TableCell className="text-xs font-medium">{cls.class_name}</TableCell>
                          <TableCell>
                            {pdf ? (
                              <Badge variant="default" className="text-xs">✅ {pdf.file_name}</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">❌ Not uploaded</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{clsQ.length}</TableCell>
                          <TableCell className="text-xs">{clsApproved.length}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {classes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No classes created yet. Go to Syllabus Management to add classes.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
