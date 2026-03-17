import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShuffledQuestion,
  applyShuffleOrders,
  generateShuffleOrders,
} from '@/lib/examShuffle';

interface RawQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_option: number;
  time_limit: number;
  points: number;
}

export default function ExamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'locked' | 'ready' | 'active' | 'completed'>('loading');
  const [rawQuestions, setRawQuestions] = useState<RawQuestion[]>([]);
  const [questions, setQuestions] = useState<ShuffledQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartRef = useRef<number>(Date.now());
  const answeringRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    checkEligibility();
  }, [user]);

  const checkEligibility = async () => {
    if (!user) return;

    // Check if already completed
    const { data: attempt } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('student_id', user.id)
      .eq('is_completed', true)
      .maybeSingle();

    if (attempt) {
      setStatus('completed');
      setScore(attempt.score ?? 0);
      setCorrect(attempt.correct_answers ?? 0);
      setWrong(attempt.wrong_answers ?? 0);
      return;
    }

    // Check for an in-progress attempt (resume on refresh)
    const { data: activeAttempt } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('student_id', user.id)
      .eq('is_completed', false)
      .maybeSingle();

    // Check payment
    const { data: payment } = await supabase
      .from('payment_orders')
      .select('status')
      .eq('user_id', user.id)
      .eq('order_type', 'exam_fee')
      .eq('status', 'verified')
      .maybeSingle();

    if (!payment) {
      setStatus('locked');
      return;
    }

    // Get profile for class group
    const { data: profile } = await supabase
      .from('profiles')
      .select('class')
      .eq('user_id', user.id)
      .maybeSingle();

    const studentClass = profile?.class ?? 1;
    let classGroup = '1-5';
    if (studentClass >= 6 && studentClass <= 8) classGroup = '6-8';
    else if (studentClass >= 9) classGroup = '9-12';

    // Load questions
    const { data: questionsData } = await supabase
      .from('questions')
      .select('id, question_text, options, correct_option, time_limit, points')
      .eq('class_group', classGroup)
      .eq('is_active', true)
      .limit(60);

    if (!questionsData || questionsData.length === 0) {
      toast.error('No questions available for your class group');
      setStatus('locked');
      return;
    }

    const raw: RawQuestion[] = questionsData.map(q => ({
      ...q,
      options: Array.isArray(q.options) ? q.options as string[] : [],
    }));
    setRawQuestions(raw);

    // If there's an active attempt, try to resume with saved session
    if (activeAttempt) {
      const { data: session } = await supabase
        .from('exam_sessions')
        .select('question_order, option_orders')
        .eq('student_id', user.id)
        .eq('attempt_id', activeAttempt.id)
        .maybeSingle();

      if (session) {
        const shuffled = applyShuffleOrders(
          raw,
          session.question_order as number[],
          session.option_orders as Record<string, number[]>
        );
        setQuestions(shuffled);
        setAttemptId(activeAttempt.id);

        // Figure out how many answered already
        const { count } = await supabase
          .from('exam_answers')
          .select('id', { count: 'exact', head: true })
          .eq('attempt_id', activeAttempt.id);

        const answered = count ?? 0;
        if (answered >= shuffled.length) {
          // All answered, complete
          await completeExam(activeAttempt.id, shuffled.length);
          return;
        }

        setCurrentIndex(answered);
        setTimeLeft(shuffled[answered]?.time_limit ?? 10);
        questionStartRef.current = Date.now();
        setStatus('active');
        startTimer();
        return;
      }
    }

    setStatus('ready');
  };

  const startExam = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('exam_attempts')
      .insert({ student_id: user.id, total_questions: rawQuestions.length })
      .select()
      .single();

    if (error) {
      toast.error('Failed to start exam');
      return;
    }

    // Generate and save shuffled orders
    const { questionOrder, optionOrders } = generateShuffleOrders(rawQuestions.length);

    await supabase.from('exam_sessions').insert({
      student_id: user.id,
      attempt_id: data.id,
      question_order: questionOrder,
      option_orders: optionOrders,
    });

    const shuffled = applyShuffleOrders(rawQuestions, questionOrder, optionOrders);
    setQuestions(shuffled);
    setAttemptId(data.id);
    setStatus('active');
    setCurrentIndex(0);
    setTimeLeft(shuffled[0]?.time_limit ?? 10);
    questionStartRef.current = Date.now();
    startTimer();
  };

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAnswer(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const completeExam = async (aId: string, totalQ: number) => {
    // Aggregate from exam_answers
    const { data: answers } = await supabase
      .from('exam_answers')
      .select('is_correct')
      .eq('attempt_id', aId);

    const c = answers?.filter(a => a.is_correct).length ?? 0;
    const w = (answers?.length ?? 0) - c;
    // Calculate score from questions points - need to sum
    const finalScore = c; // simplified: 1 point per correct

    await supabase
      .from('exam_attempts')
      .update({
        is_completed: true,
        end_time: new Date().toISOString(),
        score: finalScore,
        correct_answers: c,
        wrong_answers: w,
      })
      .eq('id', aId);

    setScore(finalScore);
    setCorrect(c);
    setWrong(w);
    setStatus('completed');
    toast.success('Exam completed!');
  };

  const handleAnswer = async (selectedOption: number) => {
    if (!attemptId || !user || answeringRef.current) return;
    answeringRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const question = questions[currentIndex];
    if (!question) { answeringRef.current = false; return; }

    const timeTaken = Math.round((Date.now() - questionStartRef.current) / 1000);
    const isCorrect = selectedOption >= 0 && selectedOption === question.correctOption;

    await supabase.from('exam_answers').insert({
      attempt_id: attemptId,
      question_id: question.id,
      selected_option: selectedOption >= 0 ? selectedOption : null,
      is_correct: isCorrect,
      time_taken: timeTaken,
    });

    if (isCorrect) {
      setScore((prev) => prev + question.points);
      setCorrect((prev) => prev + 1);
    } else {
      setWrong((prev) => prev + 1);
    }

    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      await supabase
        .from('exam_attempts')
        .update({
          is_completed: true,
          end_time: new Date().toISOString(),
          score: score + (isCorrect ? question.points : 0),
          correct_answers: correct + (isCorrect ? 1 : 0),
          wrong_answers: wrong + (isCorrect ? 0 : 1),
          time_taken: Math.round((Date.now() - questionStartRef.current) / 1000),
        })
        .eq('id', attemptId);

      setStatus('completed');
      toast.success('Exam completed!');
      answeringRef.current = false;
      return;
    }

    setCurrentIndex(nextIndex);
    setTimeLeft(questions[nextIndex]?.time_limit ?? 10);
    questionStartRef.current = Date.now();
    startTimer();
    answeringRef.current = false;
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (status === 'locked') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="card-shadow rounded-lg bg-card p-8 text-center max-w-md">
          <h1 className="text-lg font-semibold text-foreground mb-2">Exam Locked</h1>
          <p className="text-sm text-muted-foreground mb-4">Please complete your payment to unlock the exam.</p>
          <Button onClick={() => navigate('/student/payment')}>Go to Payment</Button>
        </div>
      </div>
    );
  }

  if (status === 'ready') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="card-shadow rounded-lg bg-card p-8 text-center max-w-md">
          <h1 className="text-lg font-semibold text-foreground mb-2">Scholarship Examination</h1>
          <div className="text-sm text-muted-foreground space-y-1 mb-6">
            <p>{rawQuestions.length} Questions</p>
            <p>5–10 seconds per question</p>
            <p>No back navigation</p>
            <p>One attempt only</p>
            <p className="text-xs mt-2 text-primary">🔀 Questions & options are randomized for each student</p>
          </div>
          <Button onClick={startExam} className="w-full">Start Exam</Button>
        </div>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="card-shadow rounded-lg bg-card p-8 text-center max-w-md animate-fade-in">
          <h1 className="text-lg font-semibold text-foreground mb-4">Exam Completed</h1>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-2xl font-bold tabular-nums text-primary">{score}</p>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-primary">{correct}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{wrong}</p>
              <p className="text-xs text-muted-foreground">Wrong</p>
            </div>
          </div>
          <div className="space-y-2">
            <Button onClick={() => navigate('/student/results')} className="w-full">View Results</Button>
            <Button onClick={() => navigate('/student/certificate')} variant="outline" className="w-full">
              Get Certificate
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Active exam
  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Q{currentIndex + 1}/{questions.length}
          </span>
          <div className={`text-2xl font-bold tabular-nums tracking-tighter ${timeLeft <= 3 ? 'text-destructive' : 'text-foreground'}`}>
            {String(timeLeft).padStart(2, '0')}s
          </div>
        </div>
        <motion.div
          className="h-0.5 bg-primary origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-xl w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h2 className="text-base font-medium text-foreground leading-relaxed">
                {question?.question_text}
              </h2>
              <div className="space-y-2">
                {question?.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all duration-150 text-sm text-foreground active:scale-[0.98]"
                  >
                    <span className="font-mono text-xs text-muted-foreground mr-3">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
