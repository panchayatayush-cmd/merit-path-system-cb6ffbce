import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check if called manually by super admin or by cron
    const authHeader = req.headers.get("Authorization");
    const body = await req.json().catch(() => ({}));
    const isManual = body.manual === true;

    if (isManual && authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (roleData?.role !== "super_admin") throw new Error("Only super admin");
    }

    // Get all active exam schedules
    const { data: schedules, error: schErr } = await adminClient
      .from("exam_schedules")
      .select("*, syllabus_classes(id, class_name, class_number)")
      .eq("is_active", true);

    if (schErr) throw new Error(`Schedules fetch failed: ${schErr.message}`);
    if (!schedules?.length) {
      return new Response(JSON.stringify({ message: "No active schedules found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const targetDate = body.target_date
      ? new Date(body.target_date)
      : new Date(now.getFullYear(), now.getMonth(), schedules[0]?.exam_day || 5);

    const examDateStr = targetDate.toISOString().split("T")[0];
    const results: any[] = [];

    for (const schedule of schedules) {
      const classId = schedule.class_id;

      // Check for duplicate exam
      const { data: existing } = await adminClient
        .from("scheduled_exams")
        .select("id")
        .eq("class_id", classId)
        .eq("exam_date", examDateStr)
        .maybeSingle();

      if (existing) {
        results.push({ class_id: classId, status: "skipped", reason: "Exam already exists for this date" });
        continue;
      }

      // Get approved questions for this class
      const { data: questions } = await adminClient
        .from("ai_generated_questions")
        .select("id")
        .eq("class_id", classId)
        .eq("is_approved", true);

      if (!questions?.length) {
        results.push({ class_id: classId, status: "skipped", reason: "No approved questions available" });
        continue;
      }

      // Randomly pick questions
      const numQ = Math.min(schedule.num_questions, questions.length);
      const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, numQ);

      // Create scheduled exam
      const { data: exam, error: examErr } = await adminClient
        .from("scheduled_exams")
        .insert({
          schedule_id: schedule.id,
          class_id: classId,
          exam_date: examDateStr,
          exam_duration_minutes: schedule.exam_duration_minutes,
          total_questions: numQ,
          status: "scheduled",
        })
        .select()
        .single();

      if (examErr) {
        results.push({ class_id: classId, status: "error", reason: examErr.message });
        continue;
      }

      // Link questions to exam
      const questionLinks = shuffled.map((q, i) => ({
        scheduled_exam_id: exam.id,
        question_id: q.id,
        question_order: i + 1,
      }));

      const { error: linkErr } = await adminClient
        .from("scheduled_exam_questions")
        .insert(questionLinks);

      if (linkErr) {
        results.push({ class_id: classId, status: "partial", reason: `Exam created but questions link failed: ${linkErr.message}` });
      } else {
        results.push({ class_id: classId, status: "created", exam_id: exam.id, questions: numQ });
      }
    }

    return new Response(JSON.stringify({ success: true, date: examDateStr, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-create-exam error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
