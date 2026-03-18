import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Search, Award, Trophy } from 'lucide-react';
import gphdmLogo from '@/assets/gphdm-logo.jpg';

interface ResultData {
  full_name: string;
  class: number | null;
  score: number | null;
  total_questions: number | null;
  correct_answers: number | null;
  rank: number | null;
}

export default function PublicResultPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    if (!code.trim()) {
      toast.error('Please enter a student code');
      return;
    }
    setLoading(true);
    setResult(null);
    setNotFound(false);

    try {
      // Search by referral_code as student code
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, full_name, class, referral_code')
        .eq('referral_code', code.toUpperCase().trim())
        .maybeSingle();

      if (!profile) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Get latest completed exam attempt
      const { data: attempt } = await supabase
        .from('exam_attempts')
        .select('score, total_questions, correct_answers')
        .eq('student_id', profile.user_id)
        .eq('is_completed', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get rank from scholarship_winners
      const { data: winner } = await supabase
        .from('scholarship_winners')
        .select('rank')
        .eq('student_id', profile.user_id)
        .maybeSingle();

      setResult({
        full_name: profile.full_name ?? 'Student',
        class: profile.class,
        score: attempt?.score ?? null,
        total_questions: attempt?.total_questions ?? null,
        correct_answers: attempt?.correct_answers ?? null,
        rank: winner?.rank ?? null,
      });
    } catch {
      toast.error('Something went wrong');
    }
    setLoading(false);
  };

  const percentage = result?.score && result?.total_questions
    ? ((result.score / result.total_questions) * 100).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/"><ArrowLeft className="h-5 w-5 text-muted-foreground hover:text-foreground" /></Link>
          <img src={gphdmLogo} alt="GPHDM" className="h-8 w-8 rounded-full object-cover" />
          <div>
            <h1 className="text-sm font-bold text-foreground">Check Result</h1>
            <p className="text-[10px] text-muted-foreground">GPHDM Scholarship Examination</p>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-12 space-y-6">
        <div className="text-center">
          <Search className="h-12 w-12 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground">Result Lookup</h2>
          <p className="text-sm text-muted-foreground mt-1">Enter your Student Code (Referral Code) to check your result</p>
        </div>

        <div className="flex gap-2">
          <Input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="e.g. REF123456"
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? '...' : 'Check'}
          </Button>
        </div>

        {notFound && (
          <div className="card-shadow rounded-lg bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No result found for this code. Please check and try again.</p>
          </div>
        )}

        {result && (
          <div className="card-shadow rounded-lg bg-card p-6 space-y-4">
            <div className="text-center border-b border-border pb-4">
              <Award className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-bold text-foreground">{result.full_name}</h3>
              <p className="text-sm text-muted-foreground">Class {result.class ?? '—'}</p>
            </div>

            {result.score !== null ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Score</span>
                  <span className="text-lg font-bold tabular-nums text-foreground">{result.score}/{result.total_questions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Correct Answers</span>
                  <span className="text-sm font-medium text-foreground">{result.correct_answers}/{result.total_questions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Percentage</span>
                  <span className="text-lg font-bold tabular-nums text-primary">{percentage}%</span>
                </div>
                {result.rank && (
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground flex items-center gap-1"><Trophy className="h-4 w-4" /> Rank</span>
                    <span className="text-xl font-bold text-primary">#{result.rank}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">Exam not yet completed</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
