import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Check, X, Loader2 } from 'lucide-react';

interface SyllabusClass { id: string; class_name: string; class_number: number; }
interface Subject { id: string; class_id: string; subject_name: string; }
interface Topic { id: string; class_id: string; subject_id: string; topic_name: string; status: string; }
interface AIQuestion { id: string; question_text: string; question_type: string; difficulty: string; options: string[]; correct_option: number; is_approved: boolean; topic_id: string; class_id: string; subject_id: string; created_at: string; }

export default function SuperAdminAIExamPage() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<SyllabusClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<AIQuestion[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState('10');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionType, setQuestionType] = useState('mcq');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [c, s, t, q] = await Promise.all([
        supabase.from('syllabus_classes').select('*').order('class_number'),
        supabase.from('syllabus_subjects').select('*').order('subject_name'),
        supabase.from('syllabus_topics').select('*').eq('status', 'approved').order('topic_name'),
        supabase.from('ai_generated_questions').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      setClasses((c.data as any[]) ?? []);
      setSubjects((s.data as any[]) ?? []);
      setTopics((t.data as any[]) ?? []);
      setQuestions((q.data as any[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const filteredSubjects = subjects.filter(s => s.class_id === selectedClass);
  const filteredTopics = topics.filter(t => t.subject_id === selectedSubject);

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev => prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]);
  };

  const generateQuestions = async () => {
    if (!selectedClass || !selectedSubject || !selectedTopics.length) {
      toast({ title: 'Error', description: 'Select class, subject and at least one topic', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-questions', {
        body: {
          class_id: selectedClass,
          subject_id: selectedSubject,
          topic_ids: selectedTopics,
          num_questions: parseInt(numQuestions),
          difficulty,
          question_type: questionType,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Questions Generated!', description: `${data.count} questions created successfully` });
      // Reload questions
      const { data: q } = await supabase.from('ai_generated_questions').select('*').order('created_at', { ascending: false }).limit(50);
      setQuestions((q as any[]) ?? []);
    } catch (e: any) {
      toast({ title: 'Generation Failed', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const toggleApproval = async (q: AIQuestion) => {
    await supabase.from('ai_generated_questions').update({ is_approved: !q.is_approved } as any).eq('id', q.id);
    setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, is_approved: !item.is_approved } : item));
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from('ai_generated_questions').delete().eq('id', id);
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  if (loading) return <DashboardLayout><div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold text-foreground">AI Exam Generator</h1>
        </div>

        {/* Generator Form */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Generate Questions with AI</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Class</Label>
                <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedSubject(''); setSelectedTopics([]); }}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Select value={selectedSubject} onValueChange={v => { setSelectedSubject(v); setSelectedTopics([]); }}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{filteredSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Number of Questions</Label>
                <Input type="number" min="1" max="50" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-1.5">
                <Label className="text-xs">Question Type</Label>
                <Select value={questionType} onValueChange={setQuestionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Topics Selection */}
            {filteredTopics.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Select Topics (Approved Only)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {filteredTopics.map(topic => (
                    <label key={topic.id} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border bg-muted/30 hover:bg-muted/50">
                      <Checkbox checked={selectedTopics.includes(topic.id)} onCheckedChange={() => toggleTopic(topic.id)} />
                      {topic.topic_name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={generateQuestions} disabled={generating} className="w-full">
              {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Questions</>}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Questions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Generated Questions ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No AI-generated questions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Question</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Difficulty</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map(q => (
                      <TableRow key={q.id}>
                        <TableCell className="text-xs max-w-[300px] truncate">{q.question_text}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{q.question_type}</Badge></TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{q.difficulty}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={q.is_approved ? 'default' : 'secondary'} className="text-xs">
                            {q.is_approved ? 'Approved' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleApproval(q)}>
                              {q.is_approved ? <X className="h-3 w-3" /> : <Check className="h-3 w-3 text-primary" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteQuestion(q.id)}>
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
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
