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

    const { class_id, subject_id, topic_ids, num_questions, difficulty, question_type } = await req.json();

    if (!class_id || !subject_id || !topic_ids?.length || !num_questions) {
      throw new Error("Missing required fields: class_id, subject_id, topic_ids, num_questions");
    }

    // Fetch approved topics
    const { data: topics } = await adminClient
      .from("syllabus_topics")
      .select("id, topic_name, subject_id")
      .in("id", topic_ids)
      .eq("status", "approved");

    if (!topics?.length) throw new Error("No approved topics found");

    // Fetch subject & class names
    const { data: subject } = await adminClient.from("syllabus_subjects").select("subject_name").eq("id", subject_id).single();
    const { data: cls } = await adminClient.from("syllabus_classes").select("class_name").eq("id", class_id).single();

    const topicNames = topics.map(t => t.topic_name).join(", ");
    const diffLabel = difficulty || "medium";
    const qType = question_type || "mcq";

    const systemPrompt = `You are an expert exam question generator for Indian school students. Generate exam questions strictly from the given syllabus topics. Each question must be factually accurate and age-appropriate.`;

    const userPrompt = `Generate exactly ${num_questions} ${qType === 'mcq' ? 'multiple choice (MCQ)' : 'true/false'} questions for ${cls?.class_name || 'the class'}, subject: ${subject?.subject_name || 'the subject'}.

Topics to cover: ${topicNames}
Difficulty: ${diffLabel}

For MCQ: provide exactly 4 options. For true/false: provide exactly 2 options ["True", "False"].

Return ONLY a JSON array (no markdown, no explanation). Each item must have:
- "question_text": string
- "options": string array
- "correct_option": number (0-indexed)
- "topic_name": string (which topic this question is from)

Example: [{"question_text":"What is...","options":["A","B","C","D"],"correct_option":0,"topic_name":"Algebra"}]`;

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
      // Fallback: try parsing content
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) questions = JSON.parse(jsonMatch[0]);
    }

    if (!questions.length) throw new Error("AI returned no questions");

    // Map topic names to IDs
    const topicMap = new Map(topics.map(t => [t.topic_name.toLowerCase(), t.id]));

    const insertRows = questions.map((q: any) => {
      const topicId = topicMap.get(q.topic_name?.toLowerCase()) || topics[0].id;
      return {
        class_id,
        subject_id,
        topic_id: topicId,
        question_text: q.question_text,
        question_type: qType,
        difficulty: diffLabel,
        options: q.options,
        correct_option: q.correct_option,
        is_approved: false,
        generated_by: "ai",
      };
    });

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
