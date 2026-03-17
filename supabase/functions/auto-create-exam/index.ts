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
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check if called manually by super admin or by cron
    const authHeader = req.headers.get("Authorization");
    const body = await req.json().catch(() => ({}));
    const isManual = body.manual === true;

    if (isManual && authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const examToken = authHeader.replace("Bearer ", "");
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser(examToken);
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

      const totalAvailable = questions?.length || 0;
      const numQ = Math.min(60, totalAvailable); // Default 60 questions

      if (numQ === 0) {
        // Try to auto-generate from PDF syllabus if available
        if (lovableKey) {
          const { data: syllabus } = await adminClient
            .from("syllabus_pdfs")
            .select("extracted_text")
            .eq("class_id", classId)
            .order("uploaded_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (syllabus?.extracted_text) {
            // Auto-generate 60 questions from syllabus
            const { data: cls } = await adminClient.from("syllabus_classes").select("class_name").eq("id", classId).single();
            const syllabusText = syllabus.extracted_text.substring(0, 15000);

            const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  { role: "system", content: "Generate exam questions STRICTLY from the provided syllabus content for Indian school students." },
                  { role: "user", content: `Generate exactly 60 MCQ questions for ${cls?.class_name}.\n\nSYLLABUS:\n${syllabusText}\n\nReturn JSON array with: question_text, options (4 items), correct_option (0-indexed), topic_name.` },
                ],
                tools: [{
                  type: "function",
                  function: {
                    name: "return_questions",
                    description: "Return generated exam questions",
                    parameters: {
                      type: "object",
                      properties: {
                        questions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              question_text: { type: "string" },
                              options: { type: "array", items: { type: "string" } },
                              correct_option: { type: "integer" },
                              topic_name: { type: "string" },
                            },
                            required: ["question_text", "options", "correct_option", "topic_name"],
                          },
                        },
                      },
                      required: ["questions"],
                    },
                  },
                }],
                tool_choice: { type: "function", function: { name: "return_questions" } },
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
              let genQuestions: any[] = [];
              if (toolCall?.function?.arguments) {
                genQuestions = JSON.parse(toolCall.function.arguments).questions || [];
              }

              if (genQuestions.length > 0) {
                // Get default subject/topic
                let subId: string | undefined;
                let topId: string | undefined;
                const { data: sub } = await adminClient.from("syllabus_subjects").select("id").eq("class_id", classId).limit(1).maybeSingle();
                if (sub) {
                  subId = sub.id;
                  const { data: top } = await adminClient.from("syllabus_topics").select("id").eq("class_id", classId).eq("subject_id", subId).limit(1).maybeSingle();
                  topId = top?.id;
                }
                if (!subId) {
                  const { data: ns } = await adminClient.from("syllabus_subjects").insert({ class_id: classId, subject_name: "General" }).select("id").single();
                  subId = ns?.id;
                }
                if (!topId && subId) {
                  const { data: nt } = await adminClient.from("syllabus_topics").insert({ class_id: classId, subject_id: subId, topic_name: "Syllabus PDF", status: "approved" }).select("id").single();
                  topId = nt?.id;
                }

                if (subId && topId) {
                  const rows = genQuestions.map((q: any) => ({
                    class_id: classId, subject_id: subId, topic_id: topId,
                    question_text: q.question_text, question_type: "mcq", difficulty: schedule.difficulty || "medium",
                    options: q.options, correct_option: q.correct_option, is_approved: true, generated_by: "ai_auto",
                  }));
                  await adminClient.from("ai_generated_questions").insert(rows);

                  // Re-fetch approved questions
                  const { data: newQ } = await adminClient.from("ai_generated_questions").select("id").eq("class_id", classId).eq("is_approved", true);
                  if (newQ?.length) {
                    const shuffled = newQ.sort(() => Math.random() - 0.5).slice(0, 60);
                    const { data: exam, error: examErr } = await adminClient.from("scheduled_exams").insert({
                      schedule_id: schedule.id, class_id: classId, exam_date: examDateStr,
                      exam_duration_minutes: schedule.exam_duration_minutes, total_questions: shuffled.length, status: "scheduled",
                    }).select().single();

                    if (!examErr && exam) {
                      const links = shuffled.map((q: any, i: number) => ({
                        scheduled_exam_id: exam.id, question_id: q.id, question_order: i + 1,
                      }));
                      await adminClient.from("scheduled_exam_questions").insert(links);
                      results.push({ class_id: classId, status: "created", exam_id: exam.id, questions: shuffled.length, auto_generated: true });
                      continue;
                    }
                  }
                }
              }
            }
          }
        }
        results.push({ class_id: classId, status: "skipped", reason: "No approved questions available" });
        continue;
      }

      // Randomly pick 60 questions
      const shuffled = questions!.sort(() => Math.random() - 0.5).slice(0, numQ);

      const { data: exam, error: examErr } = await adminClient
        .from("scheduled_exams")
        .insert({
          schedule_id: schedule.id, class_id: classId, exam_date: examDateStr,
          exam_duration_minutes: schedule.exam_duration_minutes, total_questions: numQ, status: "scheduled",
        })
        .select()
        .single();

      if (examErr) {
        results.push({ class_id: classId, status: "error", reason: examErr.message });
        continue;
      }

      const questionLinks = shuffled.map((q, i) => ({
        scheduled_exam_id: exam.id, question_id: q.id, question_order: i + 1,
      }));

      const { error: linkErr } = await adminClient.from("scheduled_exam_questions").insert(questionLinks);

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
