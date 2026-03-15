import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    question_text: '',
    class_group: '1-5',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: '0',
    time_limit: '10',
    points: '1',
  });

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });
    setQuestions(data ?? []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('questions').insert({
        question_text: form.question_text,
        class_group: form.class_group,
        options: [form.option_a, form.option_b, form.option_c, form.option_d],
        correct_option: parseInt(form.correct_option),
        time_limit: parseInt(form.time_limit),
        points: parseInt(form.points),
      });
      if (error) throw error;
      toast.success('Question added');
      setShowForm(false);
      setForm({
        question_text: '', class_group: '1-5', option_a: '', option_b: '',
        option_c: '', option_d: '', correct_option: '0', time_limit: '10', points: '1',
      });
      loadQuestions();
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to add question');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-foreground">Questions ({questions.length})</h1>
          <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'default'}>
            {showForm ? 'Cancel' : 'Add Question'}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card-shadow rounded-lg bg-card p-6 space-y-4">
            <div>
              <Label>Question Text</Label>
              <Input
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Class Group</Label>
                <select
                  value={form.class_group}
                  onChange={(e) => setForm({ ...form, class_group: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="1-5">Class 1-5</option>
                  <option value="6-8">Class 6-8</option>
                  <option value="9-12">Class 9-12</option>
                </select>
              </div>
              <div>
                <Label>Time Limit (seconds)</Label>
                <Input
                  type="number"
                  value={form.time_limit}
                  onChange={(e) => setForm({ ...form, time_limit: e.target.value })}
                  min="5" max="30"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['A', 'B', 'C', 'D'].map((letter, i) => (
                <div key={letter}>
                  <Label>Option {letter}</Label>
                  <Input
                    value={(form as any)[`option_${letter.toLowerCase()}`]}
                    onChange={(e) => setForm({ ...form, [`option_${letter.toLowerCase()}`]: e.target.value })}
                    required
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Correct Option</Label>
                <select
                  value={form.correct_option}
                  onChange={(e) => setForm({ ...form, correct_option: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="0">A</option>
                  <option value="1">B</option>
                  <option value="2">C</option>
                  <option value="3">D</option>
                </select>
              </div>
              <div>
                <Label>Points</Label>
                <Input
                  type="number"
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: e.target.value })}
                  min="1"
                />
              </div>
            </div>
            <Button type="submit">Save Question</Button>
          </form>
        )}

        <div className="card-shadow rounded-lg bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Question</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Group</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Timer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Points</th>
                </tr>
              </thead>
              <tbody>
                {questions.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No questions yet</td></tr>
                ) : (
                  questions.map((q) => (
                    <tr key={q.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-foreground max-w-xs truncate">{q.question_text}</td>
                      <td className="px-4 py-3 font-mono text-xs">{q.class_group}</td>
                      <td className="px-4 py-3 font-mono text-xs">{q.time_limit}s</td>
                      <td className="px-4 py-3 font-mono text-xs">{q.points}</td>
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
