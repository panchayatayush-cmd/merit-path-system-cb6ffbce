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

    // Check if manual trigger by super admin
    const body = await req.json().catch(() => ({}));
    const isManual = body.manual === true;

    if (isManual) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (!user) throw new Error("Unauthorized");
        const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
        if (roleData?.role !== "super_admin") throw new Error("Only super admin");
      }
    }

    // Get active notification templates
    const { data: templates } = await adminClient
      .from("notification_templates")
      .select("*")
      .eq("is_active", true);

    if (!templates?.length) {
      return new Response(JSON.stringify({ message: "No active templates" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get upcoming scheduled exams (within next 5 days)
    const today = new Date();
    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(today.getDate() + 5);

    const todayStr = today.toISOString().split("T")[0];
    const futureStr = fiveDaysLater.toISOString().split("T")[0];

    const { data: upcomingExams } = await adminClient
      .from("scheduled_exams")
      .select("*, syllabus_classes(id, class_name, class_number)")
      .in("status", ["scheduled", "active"])
      .gte("exam_date", todayStr)
      .lte("exam_date", futureStr);

    if (!upcomingExams?.length) {
      return new Response(JSON.stringify({ message: "No upcoming exams in next 5 days" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;
    let totalSkipped = 0;
    const results: any[] = [];

    for (const exam of upcomingExams) {
      const examDate = new Date(exam.exam_date);
      const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Find matching template for this day count
      const matchingTemplate = templates.find(t => t.days_before_exam === daysUntilExam);
      if (!matchingTemplate) {
        results.push({ exam_id: exam.id, days: daysUntilExam, status: "no_template" });
        continue;
      }

      // Get class info
      const classInfo = exam.syllabus_classes as any;
      if (!classInfo?.class_number) {
        results.push({ exam_id: exam.id, status: "no_class_info" });
        continue;
      }

      // Get all students in this class
      const { data: students } = await adminClient
        .from("profiles")
        .select("user_id")
        .eq("class", classInfo.class_number);

      if (!students?.length) {
        results.push({ exam_id: exam.id, class: classInfo.class_name, status: "no_students" });
        continue;
      }

      // Check for duplicate notifications (same exam + template)
      const { data: existingNotifs } = await adminClient
        .from("notifications")
        .select("user_id")
        .eq("scheduled_exam_id", exam.id)
        .eq("template_id", matchingTemplate.id);

      const alreadyNotified = new Set((existingNotifs ?? []).map(n => n.user_id));

      // Format message with exam date
      const formattedDate = examDate.toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      });
      const title = matchingTemplate.title;
      const message = matchingTemplate.message.replace(/\{\{exam_date\}\}/g, formattedDate);

      // Create notifications for students not yet notified
      const newNotifications = students
        .filter(s => !alreadyNotified.has(s.user_id))
        .map(s => ({
          user_id: s.user_id,
          template_id: matchingTemplate.id,
          scheduled_exam_id: exam.id,
          title,
          message,
          channel: "in_app" as const,
          delivery_status: "sent" as const,
          is_read: false,
        }));

      if (newNotifications.length > 0) {
        // Insert in batches of 100
        for (let i = 0; i < newNotifications.length; i += 100) {
          const batch = newNotifications.slice(i, i + 100);
          const { error } = await adminClient.from("notifications").insert(batch);
          if (error) {
            console.error("Insert error:", error);
            results.push({ exam_id: exam.id, status: "partial_error", error: error.message });
          }
        }
        totalSent += newNotifications.length;
      }

      totalSkipped += alreadyNotified.size;
      results.push({
        exam_id: exam.id,
        class: classInfo.class_name,
        days_until: daysUntilExam,
        template: matchingTemplate.template_name,
        sent: newNotifications.length,
        skipped: alreadyNotified.size,
        status: "done",
      });
    }

    return new Response(JSON.stringify({
      success: true,
      total_sent: totalSent,
      total_skipped: totalSkipped,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-exam-notifications error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
