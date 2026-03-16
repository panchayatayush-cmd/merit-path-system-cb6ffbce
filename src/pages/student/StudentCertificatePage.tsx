import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, Award, Star } from 'lucide-react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface Certificate {
  id: string;
  certificate_id: string;
  student_name: string;
  father_name: string | null;
  class: number | null;
  score: number | null;
  rank: number | null;
  certificate_type: string;
  exam_name: string | null;
  qr_code_data: string | null;
  year: number | null;
}

export default function StudentCertificatePage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('certificates')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCertificates((data as any[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  const downloadPDF = useCallback(async (cert: Certificate) => {
    setDownloading(cert.id);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();

      const isTopRank = cert.certificate_type === 'top_rank';
      const primaryColor: [number, number, number] = isTopRank ? [234, 179, 8] : [16, 185, 129];
      const bgTint: [number, number, number] = isTopRank ? [254, 252, 232] : [240, 253, 244];

      // Background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, w, h, 'F');

      // Border
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(2);
      doc.rect(8, 8, w - 16, h - 16);
      doc.setLineWidth(0.5);
      doc.rect(12, 12, w - 24, h - 24);

      // Corner accents
      const cs = 15;
      doc.setLineWidth(1.5);
      doc.line(8, 8 + cs, 8, 8); doc.line(8, 8, 8 + cs, 8);
      doc.line(w - 8 - cs, 8, w - 8, 8); doc.line(w - 8, 8, w - 8, 8 + cs);
      doc.line(8, h - 8 - cs, 8, h - 8); doc.line(8, h - 8, 8 + cs, h - 8);
      doc.line(w - 8 - cs, h - 8, w - 8, h - 8); doc.line(w - 8, h - 8 - cs, w - 8, h - 8);

      // Title
      doc.setFontSize(12);
      doc.setTextColor(107, 114, 128);
      doc.text('SCHOLARSHIP EXAMINATION', w / 2, 30, { align: 'center' });

      doc.setFontSize(28);
      doc.setTextColor(...primaryColor);
      const title = isTopRank ? 'Certificate of Excellence' : 'Certificate of Participation';
      doc.text(title, w / 2, 44, { align: 'center' });

      if (isTopRank) {
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text('★ TOP RANK ACHIEVER ★', w / 2, 54, { align: 'center' });
      }

      // Divider
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      const divY = isTopRank ? 58 : 50;
      doc.line(w / 2 - 50, divY, w / 2 + 50, divY);

      // "This is to certify that"
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128);
      doc.text('This is to certify that', w / 2, divY + 12, { align: 'center' });

      // Student name
      doc.setFontSize(22);
      doc.setTextColor(17, 24, 39);
      doc.text(cert.student_name, w / 2, divY + 25, { align: 'center' });

      // Father name & class
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128);
      let infoY = divY + 34;
      if (cert.father_name) {
        doc.text(`S/D of ${cert.father_name}`, w / 2, infoY, { align: 'center' });
        infoY += 8;
      }
      if (cert.class) {
        doc.text(`Class: ${cert.class}`, w / 2, infoY, { align: 'center' });
        infoY += 8;
      }

      // Achievement text
      doc.setFontSize(11);
      doc.setTextColor(75, 85, 99);
      const achText = isTopRank
        ? 'has demonstrated outstanding academic excellence in the Scholarship Examination:'
        : 'has successfully participated in the Scholarship Examination and achieved:';
      doc.text(achText, w / 2, infoY + 5, { align: 'center' });

      // Score & Rank boxes
      const boxY = infoY + 12;
      const boxW = 50;
      const boxH = 25;

      doc.setFillColor(...bgTint);
      doc.roundedRect(w / 2 - boxW - 10, boxY, boxW, boxH, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('SCORE', w / 2 - boxW / 2 - 10, boxY + 8, { align: 'center' });
      doc.setFontSize(18);
      doc.setTextColor(...primaryColor);
      doc.text(`${cert.score ?? 0}`, w / 2 - boxW / 2 - 10, boxY + 20, { align: 'center' });

      doc.setFillColor(...bgTint);
      doc.roundedRect(w / 2 + 10, boxY, boxW, boxH, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('RANK', w / 2 + boxW / 2 + 10, boxY + 8, { align: 'center' });
      doc.setFontSize(18);
      doc.setTextColor(...primaryColor);
      doc.text(`${cert.rank && cert.rank > 0 ? cert.rank : '-'}`, w / 2 + boxW / 2 + 10, boxY + 20, { align: 'center' });

      // QR Code
      const verifyUrl = `${window.location.origin}/verify/${cert.certificate_id}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1 });
      doc.addImage(qrDataUrl, 'PNG', w - 55, h - 55, 35, 35);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Certificate ID: ${cert.certificate_id}`, 20, h - 22);
      doc.text(`Year: ${cert.year ?? new Date().getFullYear()}`, 20, h - 16);
      doc.text('Scan QR code to verify', w - 37.5, h - 17, { align: 'center' });

      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(cert.exam_name ?? 'Scholarship Examination 2026', w / 2, h - 22, { align: 'center' });

      doc.save(`${isTopRank ? 'TopRank' : 'Participation'}_Certificate_${cert.certificate_id}.pdf`);
      toast.success('Certificate downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(null);
    }
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-base font-semibold text-foreground">My Certificates</h1>

        {certificates.length === 0 ? (
          <div className="card-shadow rounded-lg bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Certificates are generated automatically after exam completion.
            </p>
          </div>
        ) : (
          certificates.map(cert => {
            const isTopRank = cert.certificate_type === 'top_rank';
            return (
              <div key={cert.id} className="card-shadow rounded-lg bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  {isTopRank ? (
                    <Star className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Award className="h-5 w-5 text-primary" />
                  )}
                  <h2 className="text-sm font-semibold text-foreground">
                    {isTopRank ? 'Top Rank Certificate' : 'Participation Certificate'}
                  </h2>
                  <Badge variant={isTopRank ? 'default' : 'secondary'} className={`text-xs ${isTopRank ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}>
                    {isTopRank ? '🏆 Top Rank' : 'Participation'}
                  </Badge>
                </div>

                <div className="border-2 border-primary/20 rounded-lg p-5 text-center space-y-2">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {isTopRank ? 'Certificate of Excellence' : 'Certificate of Participation'}
                  </p>
                  <h3 className="text-lg font-bold text-foreground">{cert.student_name}</h3>
                  {cert.father_name && (
                    <p className="text-sm text-muted-foreground">S/D of {cert.father_name}</p>
                  )}
                  {cert.class && (
                    <p className="text-sm text-muted-foreground">Class: {cert.class}</p>
                  )}
                  <div className="pt-2 border-t border-border flex justify-center gap-8">
                    <div>
                      <p className="text-xl font-bold tabular-nums text-primary">{cert.score ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Score</p>
                    </div>
                    {isTopRank && cert.rank && cert.rank > 0 && (
                      <div>
                        <p className="text-xl font-bold tabular-nums text-yellow-500">#{cert.rank}</p>
                        <p className="text-xs text-muted-foreground">Rank</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground pt-2">
                    ID: {cert.certificate_id}
                  </p>
                </div>

                <Button
                  onClick={() => downloadPDF(cert)}
                  disabled={downloading === cert.id}
                  className="w-full gap-2"
                >
                  <Download className="h-4 w-4" />
                  {downloading === cert.id ? 'Preparing PDF...' : 'Download PDF'}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Verify: {window.location.origin}/verify/{cert.certificate_id}
                </p>
              </div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
