import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function StudentCertificatePage() {
  const { user } = useAuth();
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('certificates')
      .select('*')
      .eq('student_id', user.id)
      .maybeSingle()
      .then(({ data }) => setCertificate(data));
  }, [user]);

  const generateCertificate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: attempt } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('student_id', user.id)
        .eq('is_completed', true)
        .maybeSingle();

      if (!attempt) {
        toast.error('Complete the exam first');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, father_name, class')
        .eq('user_id', user.id)
        .maybeSingle();

      const certId = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data, error } = await supabase
        .from('certificates')
        .insert({
          student_id: user.id,
          attempt_id: attempt.id,
          certificate_id: certId,
          student_name: profile?.full_name ?? 'Student',
          father_name: profile?.father_name ?? '',
          class: profile?.class ?? null,
          score: attempt.score,
          rank: 0, // Would be calculated server-side
          qr_code_data: `${window.location.origin}/verify/${certId}`,
        })
        .select()
        .single();

      if (error) throw error;
      setCertificate(data);
      toast.success('Certificate generated!');
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to generate certificate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-base font-semibold text-foreground">Certificate</h1>

        {!certificate ? (
          <div className="card-shadow rounded-lg bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Generate your certificate after completing the exam.
            </p>
            <Button onClick={generateCertificate} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Certificate'}
            </Button>
          </div>
        ) : (
          <div className="card-shadow rounded-lg bg-card p-6 space-y-4">
            {/* Certificate preview */}
            <div className="border-2 border-primary/20 rounded-lg p-6 text-center space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Certificate of Achievement</p>
              <h2 className="text-xl font-bold text-foreground">{certificate.student_name}</h2>
              <p className="text-sm text-muted-foreground">S/D of {certificate.father_name}</p>
              <p className="text-sm text-muted-foreground">Class: {certificate.class}</p>
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-foreground">{certificate.exam_name}</p>
                <p className="text-2xl font-bold tabular-nums text-primary mt-1">Score: {certificate.score}</p>
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-4">
                ID: {certificate.certificate_id}
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Verify at: {window.location.origin}/verify/{certificate.certificate_id}
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
