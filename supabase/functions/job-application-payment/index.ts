import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    if (!RAZORPAY_KEY_ID) throw new Error("RAZORPAY_KEY_ID not configured");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) throw new Error("RAZORPAY_KEY_SECRET not configured");

    const body = await req.json();
    const { action } = body;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "create-order") {
      // Create Razorpay order for job application
      const amount = 250;
      const receipt = `job_${Date.now()}`.substring(0, 40);

      const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
        },
        body: JSON.stringify({
          amount: amount * 100, // paise
          currency: "INR",
          receipt,
        }),
      });

      const razorpayOrder = await razorpayRes.json();
      if (!razorpayRes.ok) throw new Error(`Razorpay error: ${JSON.stringify(razorpayOrder)}`);

      return new Response(
        JSON.stringify({
          razorpay_order_id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key_id: RAZORPAY_KEY_ID,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify-and-save") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, application_data } = body;

      // Verify signature
      const crypto = await import("https://deno.land/std@0.168.0/crypto/mod.ts");
      const encoder = new TextEncoder();
      const key = await globalThis.crypto.subtle.importKey(
        "raw",
        encoder.encode(RAZORPAY_KEY_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBuffer = await globalThis.crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`)
      );
      const generatedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (generatedSignature !== razorpay_signature) {
        throw new Error("Payment verification failed: Invalid signature");
      }

      // Save application
      const { data, error } = await serviceClient
        .from("job_applications")
        .insert({
          full_name: application_data.full_name,
          father_name: application_data.father_name,
          contact_number: application_data.contact_number,
          alternate_number: application_data.alternate_number || null,
          email: application_data.email,
          state: application_data.state,
          district: application_data.district,
          block: application_data.block,
          village: application_data.village,
          full_address: application_data.full_address,
          pin_code: application_data.pin_code,
          designation: application_data.designation,
          work_experience: application_data.work_experience || null,
          date_of_birth: application_data.date_of_birth,
          photo_url: application_data.photo_url || null,
          payment_status: "paid",
          razorpay_order_id,
          razorpay_payment_id,
          amount: 250,
          terms_accepted: true,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, application_id: data.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
