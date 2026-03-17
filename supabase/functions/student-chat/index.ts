import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_MESSAGE_LIMIT = 50;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, checkLimit } = await req.json();

    // If client is just checking the remaining limit
    if (checkLimit) {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("role", "user")
        .gte("created_at", todayStart.toISOString())
        .in(
          "conversation_id",
          // subquery: get user's conversation ids
          (await supabase
            .from("chat_conversations")
            .select("id")
            .eq("user_id", user.id)
          ).data?.map((c: any) => c.id) ?? []
        );

      return new Response(
        JSON.stringify({ remaining: Math.max(0, DAILY_MESSAGE_LIMIT - (count ?? 0)), limit: DAILY_MESSAGE_LIMIT }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count today's user messages
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const convRes = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("user_id", user.id);
    const convIds = convRes.data?.map((c: any) => c.id) ?? [];

    let todayCount = 0;
    if (convIds.length > 0) {
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("role", "user")
        .gte("created_at", todayStart.toISOString())
        .in("conversation_id", convIds);
      todayCount = count ?? 0;
    }

    if (todayCount >= DAILY_MESSAGE_LIMIT) {
      return new Response(
        JSON.stringify({
          error: `Daily message limit reached (${DAILY_MESSAGE_LIMIT} messages). Please try again tomorrow.`,
          limitReached: true,
          remaining: 0,
          limit: DAILY_MESSAGE_LIMIT,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a friendly and helpful AI tutor for students preparing for the GPHDM Scholarship Examination 2026.

Your role:
- Help students understand exam topics and concepts
- Answer questions about exam preparation, study strategies, and time management
- Explain difficult concepts in simple Hindi and English (Hinglish is fine)
- Provide practice tips and motivation
- Guide students on exam format (60 MCQ questions, timed exam)

Rules:
- Keep answers concise and student-friendly
- Use simple language (mix of Hindi and English is okay)
- Focus on being helpful and encouraging
- If asked about specific exam questions or answers, explain concepts instead of giving direct answers
- Do not discuss topics unrelated to education and exam preparation
- Format responses with markdown for readability`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service limit reached. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Include remaining count in response headers
    const remaining = Math.max(0, DAILY_MESSAGE_LIMIT - todayCount - 1);

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Daily-Remaining": String(remaining),
        "X-Daily-Limit": String(DAILY_MESSAGE_LIMIT),
      },
    });
  } catch (e) {
    console.error("student-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
