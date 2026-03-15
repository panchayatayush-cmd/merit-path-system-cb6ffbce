import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';

export default function AdminResultsPage() {
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('exam_attempts')
      .select('*')
      .eq('is_completed', true)
      .order('score', { ascending: false })
      .then(({ data }) => setResults(data ?? []));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-base font-semibold text-foreground">Exam Results ({results.length})</h1>
        <div className="card-shadow rounded-lg bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Rank</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Score</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Correct</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Wrong</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No results</td></tr>
                ) : (
                  results.map((r, i) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">#{i + 1}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-primary">{r.score}</td>
                      <td className="px-4 py-3 font-mono">{r.correct_answers}</td>
                      <td className="px-4 py-3 font-mono">{r.wrong_answers}</td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
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
