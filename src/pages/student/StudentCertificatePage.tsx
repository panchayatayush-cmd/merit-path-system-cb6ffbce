import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export default function StudentCertificatePage() {
  const { user } = useAuth();
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

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
          rank: 0,
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

  const downloadPDF = useCallback(async () => {
    if (!certificate) return;
    setDownloading(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();

      // Background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, w, h, 'F');

      // Decorative border
      doc.setDrawColor(16, 185, 129); // emerald-500
      doc.setLineWidth(2);
      doc.rect(8, 8, w - 16, h - 16);
      doc.setLineWidth(0.5);
      doc.rect(12, 12, w - 24, h - 24);

      // Corner accents
      const cornerSize = 15;
      doc.setLineWidth(1.5);
      // Top-left
      doc.line(8, 8 + cornerSize, 8, 8); doc.line(8, 8, 8 + cornerSize, 8);
      // Top-right
      doc.line(w - 8 - cornerSize, 8, w - 8, 8); doc.line(w - 8, 8, w - 8, 8 + cornerSize);
      // Bottom-left
      doc.line(8, h - 8 - cornerSize, 8, h - 8); doc.line(8, h - 8, 8 + cornerSize, h - 8);
      // Bottom-right
      doc.line(w - 8 - cornerSize, h - 8, w - 8, h - 8); doc.line(w - 8, h - 8 - cornerSize, w - 8, h - 8);

      // Title
      doc.setFontSize(12);
      doc.setTextColor(107, 114, 128);
      doc.text('SCHOLARSHIP EXAMINATION', w / 2, 30, { align: 'center' });

      doc.setFontSize(28);
      doc.setTextColor(16, 185, 129);
      doc.text('Certificate of Achievement', w / 2, 44, { align: 'center' });

      // Divider line
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.5);
      doc.line(w / 2 - 50, 50, w / 2 + 50, 50);

      // "This is to certify that"
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128);
      doc.text('This is to certify that', w / 2, 62, { align: 'center' });

      // Student name
      doc.setFontSize(22);
      doc.setTextColor(17, 24, 39);
      doc.text(certificate.student_name, w / 2, 75, { align: 'center' });

      // Father name & class
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128);
      if (certificate.father_name) {
        doc.text(`S/D of ${certificate.father_name}`, w / 2, 84, { align: 'center' });
      }
      if (certificate.class) {
        doc.text(`Class: ${certificate.class}`, w / 2, 92, { align: 'center' });
      }

      // Achievement text
      doc.setFontSize(11);
      doc.setTextColor(75, 85, 99);
      doc.text(
        'has successfully completed the Scholarship Examination and achieved:',
        w / 2, 105, { align: 'center' }
      );

      // Score & Rank boxes
      const boxY = 112;
      const boxW = 50;
      const boxH = 25;
      // Score box
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(w / 2 - boxW - 10, boxY, boxW, boxH, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('SCORE', w / 2 - boxW / 2 - 10, boxY + 8, { align: 'center' });
      doc.setFontSize(18);
      doc.setTextColor(16, 185, 129);
      doc.text(`${certificate.score ?? 0}`, w / 2 - boxW / 2 - 10, boxY + 20, { align: 'center' });

      // Rank box
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(w / 2 + 10, boxY, boxW, boxH, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('RANK', w / 2 + boxW / 2 + 10, boxY + 8, { align: 'center' });
      doc.setFontSize(18);
      doc.setTextColor(16, 185, 129);
      doc.text(`${certificate.rank ?? '-'}`, w / 2 + boxW / 2 + 10, boxY + 20, { align: 'center' });

      // QR Code
      const verifyUrl = certificate.qr_code_data || `${window.location.origin}/verify/${certificate.certificate_id}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1 });
      doc.addImage(qrDataUrl, 'PNG', w - 55, h - 55, 35, 35);

      // Certificate ID & year
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Certificate ID: ${certificate.certificate_id}`, 20, h - 22);
      doc.text(`Year: ${certificate.year ?? new Date().getFullYear()}`, 20, h - 16);
      doc.text('Scan QR code to verify', w - 37.5, h - 17, { align: 'center' });

      // Exam name
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(certificate.exam_name ?? 'Scholarship Examination 2024', w / 2, h - 22, { align: 'center' });

      doc.save(`Certificate_${certificate.certificate_id}.pdf`);
      toast.success('Certificate downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  }, [certificate]);

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

            <Button onClick={downloadPDF} disabled={downloading} className="w-full gap-2">
              <Download className="h-4 w-4" />
              {downloading ? 'Preparing PDF...' : 'Download Certificate PDF'}
            </Button>

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
