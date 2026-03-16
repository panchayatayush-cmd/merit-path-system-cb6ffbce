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

    // Prevent duplicate payouts - check if already verified
    const { data: existingOrder } = await serviceClient
      .from("payment_orders")
      .select("status")
      .eq("id", db_order_id)
      .single();

    if (existingOrder?.status === "verified") {
      return new Response(
        JSON.stringify({ success: true, message: "Payment already verified" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // ===== EXAM FEE DISTRIBUTION (₹300 total) =====
    // Student (referring): ₹50, Center: ₹30, Admin: ₹20, Super Admin: ₹75, Scholarship: ₹125

    // Get student's profile for center_code and referred_by
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("center_code, referred_by, referral_code")
      .eq("user_id", user.id)
      .single();

    // 1. Credit REFERRING student ₹50 (if referred_by exists)
    if (profile?.referred_by) {
      const { data: referrerProfile } = await serviceClient
        .from("profiles")
        .select("user_id")
        .eq("referral_code", profile.referred_by)
        .single();

      if (referrerProfile) {
        const { data: referrerWallet } = await serviceClient
          .from("wallets")
          .select("id, balance")
          .eq("user_id", referrerProfile.user_id)
          .eq("role", "student")
          .single();

        if (referrerWallet) {
          await serviceClient.from("wallet_transactions").insert({
            wallet_id: referrerWallet.id,
            amount: 50,
            type: "credit",
            description: "Referral commission - student referred",
          });
          await serviceClient
            .from("wallets")
            .update({ balance: Number(referrerWallet.balance) + 50 })
            .eq("id", referrerWallet.id);
        }

        // Log commission
        await serviceClient.from("commissions").insert({
          student_id: referrerProfile.user_id,
          referral_code: profile.referred_by,
          center_code: profile.center_code,
          payment_id: db_order_id,
          role: "referrer",
          commission_amount: 50,
          description: "Referral commission from student exam fee",
        });
      }
    }

    // 2. Credit CENTER owner ₹30
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
            amount: 30,
            type: "credit",
            description: "Student exam fee commission",
          });
          await serviceClient
            .from("wallets")
            .update({ balance: Number(centerWallet.balance) + 30 })
            .eq("id", centerWallet.id);
        }

        // Log commission
        await serviceClient.from("commissions").insert({
          student_id: user.id,
          referral_code: profile.referred_by ?? null,
          center_code: profile.center_code,
          payment_id: db_order_id,
          role: "center",
          commission_amount: 30,
          description: "Center commission from student exam fee",
        });
      }
    }

    // 3. Credit ADMIN wallets ₹20 (split among all admins)
    const { data: adminRoles } = await serviceClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminRoles && adminRoles.length > 0) {
      const perAdmin = 20 / adminRoles.length;
      for (const admin of adminRoles) {
        const { data: adminWallet } = await serviceClient
          .from("wallets")
          .select("id, balance")
          .eq("user_id", admin.user_id)
          .eq("role", "admin")
          .single();

        if (adminWallet) {
          await serviceClient.from("wallet_transactions").insert({
            wallet_id: adminWallet.id,
            amount: perAdmin,
            type: "credit",
            description: "Admin commission from exam fee",
          });
          await serviceClient
            .from("wallets")
            .update({ balance: Number(adminWallet.balance) + perAdmin })
            .eq("id", adminWallet.id);
        }

        await serviceClient.from("commissions").insert({
          student_id: user.id,
          center_code: profile?.center_code ?? null,
          payment_id: db_order_id,
          role: "admin",
          commission_amount: perAdmin,
          description: "Admin commission from exam fee",
        });
      }
    }

    // 4. Credit SUPER ADMIN ₹75
    const { data: superAdminRoles } = await serviceClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    if (superAdminRoles && superAdminRoles.length > 0) {
      const perSuperAdmin = 75 / superAdminRoles.length;
      for (const sa of superAdminRoles) {
        const { data: saWallet } = await serviceClient
          .from("wallets")
          .select("id, balance")
          .eq("user_id", sa.user_id)
          .eq("role", "super_admin")
          .single();

        if (saWallet) {
          await serviceClient.from("wallet_transactions").insert({
            wallet_id: saWallet.id,
            amount: perSuperAdmin,
            type: "credit",
            description: "Super Admin commission from exam fee",
          });
          await serviceClient
            .from("wallets")
            .update({ balance: Number(saWallet.balance) + perSuperAdmin })
            .eq("id", saWallet.id);
        }

        await serviceClient.from("commissions").insert({
          student_id: user.id,
          center_code: profile?.center_code ?? null,
          payment_id: db_order_id,
          role: "super_admin",
          commission_amount: perSuperAdmin,
          description: "Super Admin commission from exam fee",
        });
      }
    }

    // 5. Scholarship fund ₹125
    await serviceClient.from("scholarship_fund").insert({
      amount: 125,
      source: "exam_fee",
      payment_order_id: db_order_id,
    });

    // Generate referral code for the paying student if not already set
    if (!profile?.referral_code) {
      const { data: refCode } = await serviceClient.rpc("generate_referral_code");
      if (refCode) {
        await serviceClient
          .from("profiles")
          .update({ referral_code: refCode })
          .eq("user_id", user.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Payment verified and commissions distributed" }),
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
