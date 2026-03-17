import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { BookOpen, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Lesson {
  id: string;
  lesson_name: string;
  pdf_file_path: string;
  file_name: string | null;
  subject_name: string;
}

export default function StudentSyllabusPage() {
  const { user } = useAuth();
  const [studentClass, setStudentClass] = useState<number | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get student's class
      const { data: profile } = await supabase
        .from('profiles')
        .select('class')
        .eq('user_id', user.id)
        .maybeSingle();

      const cls = profile?.class ?? null;
      setStudentClass(cls);

      if (!cls) { setLoading(false); return; }

      // Get class ID
      const { data: classData } = await supabase
        .from('syllabus_classes')
        .select('id')
        .eq('class_number', cls)
        .eq('is_active', true)
        .maybeSingle();

      if (!classData) { setLoading(false); return; }

      // Get subjects for this class
      const { data: subjects } = await supabase
        .from('syllabus_subjects')
        .select('id, subject_name')
        .eq('class_id', classData.id)
        .eq('is_active', true);

      if (!subjects || subjects.length === 0) { setLoading(false); return; }

      // Get lessons
      const { data: lessonsData } = await supabase
        .from('syllabus_lessons')
        .select('id, lesson_name, pdf_file_path, file_name, subject_id')
        .eq('class_id', classData.id);

      const subjectMap: Record<string, string> = {};
      subjects.forEach(s => { subjectMap[s.id] = s.subject_name; });

      const mapped = (lessonsData ?? []).map(l => ({
        ...l,
        subject_name: subjectMap[l.subject_id] ?? 'Unknown',
      }));

      setLessons(mapped);
      setLoading(false);
    };
    load();
  }, [user]);

  const openPdf = (path: string) => {
    const { data } = supabase.storage.from('syllabus-pdfs').getPublicUrl(path);
    window.open(data.publicUrl, '_blank');
  };

  // Group by subject
  const grouped = lessons.reduce<Record<string, Lesson[]>>((acc, l) => {
    if (!acc[l.subject_name]) acc[l.subject_name] = [];
    acc[l.subject_name].push(l);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-base font-semibold text-foreground">📚 Syllabus</h1>
          {studentClass && (
            <p className="text-sm text-muted-foreground mt-1">Class {studentClass} Syllabus</p>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading syllabus...</p>
        ) : !studentClass ? (
          <div className="card-shadow rounded-lg bg-card p-8 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Please complete your profile and select your class to view the syllabus.</p>
          </div>
        ) : lessons.length === 0 ? (
          <div className="card-shadow rounded-lg bg-card p-8 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No syllabus available for Class {studentClass} yet.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([subject, subLessons]) => (
            <div key={subject} className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                {subject}
              </h2>
              <div className="space-y-2">
                {subLessons.map(lesson => (
                  <div key={lesson.id} className="card-shadow rounded-lg bg-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{lesson.lesson_name}</p>
                        {lesson.file_name && (
                          <p className="text-xs text-muted-foreground">{lesson.file_name}</p>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openPdf(lesson.pdf_file_path)}>
                      <Download className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
