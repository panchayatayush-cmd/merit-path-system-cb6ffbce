import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';

export default function StudentResultsPage() {
  const { user } = useAuth();
  const [attempt, setAttempt] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('exam_attempts')
      .select('*')
      .eq('student_id', user.id)
      .eq('is_completed', true)
      .maybeSingle()
      .then(({ data }) => setAttempt(data));
  }, [user]);

  if (!attempt) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No exam results available yet.</p>
        </div>
      </DashboardLayout>
    );
  }

  const percentage = attempt.total_questions > 0
    ? Math.round((attempt.correct_answers / attempt.total_questions) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-base font-semibold text-foreground">Exam Results</h1>

        <div className="card-shadow rounded-lg bg-card p-6 space-y-4">
          <div className="text-center pb-4 border-b border-border">
            <p className="text-4xl font-bold tabular-nums tracking-tighter text-primary">{attempt.score}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Score</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold tabular-nums text-primary">{attempt.correct_answers}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums text-foreground">{attempt.wrong_answers}</p>
              <p className="text-xs text-muted-foreground">Wrong</p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums text-foreground">{percentage}%</p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Total Questions</span>
              <span className="font-mono">{attempt.total_questions}</span>
            </div>
            <div className="flex justify-between">
              <span>Started</span>
              <span className="font-mono">{new Date(attempt.start_time).toLocaleString()}</span>
            </div>
            {attempt.end_time && (
              <div className="flex justify-between">
                <span>Completed</span>
                <span className="font-mono">{new Date(attempt.end_time).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
