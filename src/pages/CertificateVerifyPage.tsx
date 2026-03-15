import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function CertificateVerifyPage() {
  const [certId, setCertId] = useState('');
  const [certificate, setCertificate] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check URL params
  const pathParts = window.location.pathname.split('/');
  const urlCertId = pathParts[pathParts.length - 1];

  const verify = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    const { data } = await supabase
      .from('certificates')
      .select('*')
      .eq('certificate_id', id.toUpperCase())
      .maybeSingle();
    
    if (data) {
      setCertificate(data);
    } else {
      setNotFound(true);
      setCertificate(null);
    }
    setLoading(false);
  };

  // Auto-verify if URL has cert ID
  if (urlCertId && urlCertId !== 'verify' && !certificate && !notFound && !loading) {
    verify(urlCertId);
  }

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">Certificate Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter the certificate ID to verify</p>
        </div>

        <div className="card-shadow rounded-lg bg-card p-6 space-y-4">
          <div className="flex gap-2">
            <Input
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              placeholder="e.g. CERT-ABC123"
              className="font-mono"
            />
            <Button onClick={() => verify(certId)} disabled={loading}>
              {loading ? '...' : 'Verify'}
            </Button>
          </div>

          {notFound && (
            <p className="text-sm text-destructive text-center">Certificate not found.</p>
          )}

          {certificate && (
            <div className="border-t border-border pt-4 space-y-2 text-sm animate-fade-in">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium text-foreground">{certificate.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Class</span>
                <span className="font-mono text-foreground">{certificate.class}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Score</span>
                <span className="font-mono font-bold text-primary">{certificate.score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rank</span>
                <span className="font-mono text-foreground">#{certificate.rank || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exam</span>
                <span className="text-foreground">{certificate.exam_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Year</span>
                <span className="font-mono text-foreground">{certificate.year}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-primary font-medium text-center">✓ Certificate Verified</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-center">
          <button onClick={() => navigate('/')} className="text-sm text-accent hover:underline">
            Back to Home
          </button>
        </p>
      </div>
    </div>
  );
}
