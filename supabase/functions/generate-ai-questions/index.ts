import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    // Verify user is super_admin
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    if (roleData?.role !== "super_admin") throw new Error("Only super admin can generate questions");

    const { class_id, subject_id, lesson_id, num_questions, difficulty, question_type } = await req.json();

    if (!class_id || !num_questions || !lesson_id) {
      throw new Error("Missing required fields: class_id, lesson_id, num_questions");
    }

    // Fetch lesson with its extracted PDF text
    const { data: lesson, error: lessonErr } = await adminClient
      .from("syllabus_lessons")
      .select("lesson_name, extracted_text, subject_id, class_id")
      .eq("id", lesson_id)
      .single();

    if (lessonErr || !lesson) throw new Error("Lesson not found");
    if (!lesson.extracted_text) throw new Error("No syllabus PDF text found for this lesson. Please upload a syllabus PDF first.");

    // Fetch class name
    const { data: cls } = await adminClient.from("syllabus_classes").select("class_name, class_number").eq("id", class_id).single();

    const syllabusContext = lesson.extracted_text.substring(0, 15000);
    const diffLabel = difficulty || "medium";
    const qType = question_type || "mcq";
    const numQ = Math.min(num_questions, 60);

    const systemPrompt = `You are an expert exam question generator for Indian school students. Generate exam questions STRICTLY from the provided syllabus content. Each question must be factually accurate, age-appropriate, and directly based on the syllabus material provided. Do NOT generate questions on topics outside the given syllabus.`;

    const userPrompt = `Generate exactly ${numQ} ${qType === 'mcq' ? 'multiple choice (MCQ)' : 'true/false'} questions for ${cls?.class_name || 'the class'}, Lesson: "${lesson.lesson_name}".

SYLLABUS CONTENT (generate questions ONLY from this):
${syllabusContext}

Difficulty: ${diffLabel}

For MCQ: provide exactly 4 options. For true/false: provide exactly 2 options ["True", "False"].

Return ONLY a JSON array (no markdown, no explanation). Each item must have:
- "question_text": string
- "options": string array
- "correct_option": number (0-indexed)
- "topic_name": string (the topic/chapter this question relates to)

Example: [{"question_text":"What is...","options":["A","B","C","D"],"correct_option":0,"topic_name":"Chapter 1"}]`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
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

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let questions: any[] = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      questions = parsed.questions || [];
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) questions = JSON.parse(jsonMatch[0]);
    }

    if (!questions.length) throw new Error("AI returned no questions");

    // Get or create a topic for storage
    const usedSubjectId = subject_id || lesson.subject_id;
    let topicId: string;

    const { data: existingTopic } = await adminClient
      .from("syllabus_topics")
      .select("id")
      .eq("class_id", class_id)
      .eq("subject_id", usedSubjectId)
      .limit(1)
      .maybeSingle();

    if (existingTopic) {
      topicId = existingTopic.id;
    } else {
      const { data: newTopic } = await adminClient
        .from("syllabus_topics")
        .insert({ class_id, subject_id: usedSubjectId, topic_name: lesson.lesson_name, status: "approved" })
        .select("id")
        .single();
      topicId = newTopic?.id;
    }

    if (!topicId) throw new Error("Could not create topic for questions");

    const insertRows = questions.map((q: any) => ({
      class_id,
      subject_id: usedSubjectId,
      topic_id: topicId,
      lesson_id,
      question_text: q.question_text,
      question_type: qType,
      difficulty: diffLabel,
      options: q.options,
      correct_option: q.correct_option,
      is_approved: false,
      generated_by: "ai",
    }));

    const { data: inserted, error: insertError } = await adminClient
      .from("ai_generated_questions")
      .insert(insertRows)
      .select();

    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

    return new Response(JSON.stringify({ success: true, count: inserted?.length || 0, questions: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ai-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
