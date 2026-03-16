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

    // Verify super_admin
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    if (roleData?.role !== "super_admin") throw new Error("Only super admin");

    const { class_id, file_path, file_name } = await req.json();
    if (!class_id || !file_path) throw new Error("Missing class_id or file_path");

    // Download the PDF from storage
    const { data: fileData, error: dlErr } = await adminClient.storage
      .from("syllabus-pdfs")
      .download(file_path);

    if (dlErr || !fileData) throw new Error(`PDF download failed: ${dlErr?.message}`);

    // Convert to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      for (let j = 0; j < chunk.length; j++) {
        binary += String.fromCharCode(chunk[j]);
      }
    }
    const base64 = btoa(binary);

    // Use AI to extract text from PDF
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a document text extractor. Extract ALL text content from the provided PDF document. Preserve the structure, headings, topics, chapters, and all educational content. Return ONLY the extracted text, no commentary.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text content from this PDF syllabus document. Include chapter names, topic names, subtopics, and all educational content.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`,
                },
              },
            ],
          },
        ],
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
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI extraction error:", status, errText);
      throw new Error("AI text extraction failed");
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices?.[0]?.message?.content || "";

    if (!extractedText.trim()) throw new Error("Could not extract text from PDF");

    // Delete existing syllabus for this class (one per class)
    await adminClient.from("syllabus_pdfs").delete().eq("class_id", class_id);

    // Store extracted content
    const { data: inserted, error: insertErr } = await adminClient
      .from("syllabus_pdfs")
      .insert({
        class_id,
        pdf_file_path: file_path,
        extracted_text: extractedText,
        file_name: file_name || "syllabus.pdf",
      })
      .select()
      .single();

    if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);

    return new Response(JSON.stringify({
      success: true,
      syllabus_id: inserted.id,
      text_length: extractedText.length,
      preview: extractedText.substring(0, 500),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-syllabus-pdf error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
