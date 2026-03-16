import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const data = encoder.encode(`${orderId}|${paymentId}`);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const expectedSignature = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expectedSignature === signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) throw new Error("RAZORPAY_KEY_SECRET not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, db_order_id } = await req.json();

    // Verify signature
    const isValid = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      RAZORPAY_KEY_SECRET
    );

    if (!isValid) throw new Error("Invalid payment signature");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update payment order
    const { data: updatedOrder, error: updateError } = await serviceClient
      .from("payment_orders")
      .update({
        status: "verified",
        razorpay_payment_id,
        razorpay_signature,
      })
      .eq("id", db_order_id)
      .eq("user_id", user.id)
      .select("amount, order_type")
      .single();

    if (updateError) throw updateError;

    const amount = Number(updatedOrder?.amount ?? 0);
    const orderType = updatedOrder?.order_type;

    // If center registration, activate center
    if (orderType === "center_registration") {
      await serviceClient
        .from("centers")
        .update({ is_active: true, payment_verified: true })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ success: true, message: "Center payment verified and activated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exam fee distribution below

    // Distribute payment: Student ₹50, Center ₹75, Admin ₹25, Super Admin ₹75, rest → scholarship
    // Get student's center_code to find center user
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("center_code")
      .eq("user_id", user.id)
      .single();

    // Credit student wallet
    const { data: studentWallet } = await serviceClient
      .from("wallets")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "student")
      .single();

    if (studentWallet) {
      const { data: currentWallet } = await serviceClient
        .from("wallets")
        .select("balance")
        .eq("id", studentWallet.id)
        .single();
      
      await serviceClient.from("wallet_transactions").insert({
        wallet_id: studentWallet.id,
        amount: 50,
        type: "credit",
        description: "Exam fee cashback",
      });
      await serviceClient
        .from("wallets")
        .update({ balance: Number(currentWallet?.balance ?? 0) + 50 })
        .eq("id", studentWallet.id);
    }

    // Credit center wallet if center_code exists
    if (profile?.center_code) {
      const { data: center } = await serviceClient
        .from("centers")
        .select("user_id")
        .eq("center_code", profile.center_code)
        .single();

      if (center) {
        const { data: centerWallet } = await serviceClient
          .from("wallets")
          .select("id, balance")
          .eq("user_id", center.user_id)
          .eq("role", "center")
          .single();

        if (centerWallet) {
          await serviceClient.from("wallet_transactions").insert({
            wallet_id: centerWallet.id,
            amount: 75,
            type: "credit",
            description: "Student exam fee commission",
          });
          await serviceClient
            .from("wallets")
            .update({ balance: Number(centerWallet.balance) + 75 })
            .eq("id", centerWallet.id);
        }
      }
    }

    // Scholarship fund
    const scholarshipAmount = amount - 50 - 75 - 25 - 75;
    if (scholarshipAmount > 0) {
      await serviceClient.from("scholarship_fund").insert({
        amount: scholarshipAmount,
        source: "exam_fee",
        payment_order_id: db_order_id,
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Payment verified and distributed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
