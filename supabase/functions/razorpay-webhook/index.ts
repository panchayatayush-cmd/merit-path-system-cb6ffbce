import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-razorpay-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Commission amounts
const EXAM_COMMISSION = { REFERRER: 70, CENTER: 40, ADMIN: 30, SUPER_ADMIN: 60, SCHOLARSHIP: 100 };
const CENTER_REG_COMMISSION = { ADMIN: 200, SUPER_ADMIN: 300 };

async function verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return expected === signature;
}

async function creditWallet(client: any, userId: string, role: string, amount: number, description: string) {
  const { data: wallet } = await client.from("wallets").select("id, balance").eq("user_id", userId).eq("role", role).single();
  if (wallet) {
    await client.from("wallet_transactions").insert({ wallet_id: wallet.id, amount, type: "credit", description });
    await client.from("wallets").update({ balance: Number(wallet.balance) + amount }).eq("id", wallet.id);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    if (!WEBHOOK_SECRET) throw new Error("RAZORPAY_WEBHOOK_SECRET not configured");

    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";

    const isValid = await verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: corsHeaders });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event === "payment.captured") {
      const payment = payload.payload?.payment?.entity;
      if (!payment) throw new Error("No payment entity in webhook");

      const razorpayOrderId = payment.order_id;
      const razorpayPaymentId = payment.id;

      // Find the payment order
      const { data: order } = await serviceClient
        .from("payment_orders")
        .select("id, user_id, order_type, status")
        .eq("razorpay_order_id", razorpayOrderId)
        .single();

      if (!order) {
        console.log("Order not found for razorpay_order_id:", razorpayOrderId);
        return new Response(JSON.stringify({ status: "ok", message: "Order not found, skipping" }), { headers: corsHeaders });
      }

      // Prevent duplicate processing
      if (order.status === "verified") {
        return new Response(JSON.stringify({ status: "ok", message: "Already verified" }), { headers: corsHeaders });
      }

      // Update payment status
      await serviceClient.from("payment_orders").update({
        status: "verified",
        razorpay_payment_id: razorpayPaymentId,
      }).eq("id", order.id);

      const userId = order.user_id;
      const orderType = order.order_type;

      // === CENTER REGISTRATION ===
      if (orderType === "center_registration") {
        const { data: centerData } = await serviceClient.from("centers").update({ is_active: true, payment_verified: true }).eq("user_id", userId).select("admin_id, center_code").single();

        if (centerData?.admin_id) {
          await creditWallet(serviceClient, centerData.admin_id, "admin", CENTER_REG_COMMISSION.ADMIN, "Center registration commission - ₹200");
          await serviceClient.from("commissions").insert({ student_id: userId, center_code: centerData.center_code, payment_id: order.id, role: "admin", commission_amount: CENTER_REG_COMMISSION.ADMIN, description: "Admin commission from center registration" });
        }

        const { data: saRoles } = await serviceClient.from("user_roles").select("user_id").eq("role", "super_admin");
        if (saRoles?.length) {
          const perSA = CENTER_REG_COMMISSION.SUPER_ADMIN / saRoles.length;
          for (const sa of saRoles) {
            await creditWallet(serviceClient, sa.user_id, "super_admin", perSA, "Center registration share - ₹300");
            await serviceClient.from("commissions").insert({ student_id: userId, center_code: centerData?.center_code, payment_id: order.id, role: "super_admin", commission_amount: perSA, description: "Super Admin share from center registration" });
          }
        }
      }

      // === ADMIN CENTER CREATION ===
      else if (orderType === "admin_center_creation") {
        await creditWallet(serviceClient, userId, "admin", CENTER_REG_COMMISSION.ADMIN, "Center creation commission - ₹200");
        await serviceClient.from("commissions").insert({ student_id: userId, payment_id: order.id, role: "admin", commission_amount: CENTER_REG_COMMISSION.ADMIN, description: "Admin share from center creation" });

        const { data: saRoles } = await serviceClient.from("user_roles").select("user_id").eq("role", "super_admin");
        if (saRoles?.length) {
          const perSA = CENTER_REG_COMMISSION.SUPER_ADMIN / saRoles.length;
          for (const sa of saRoles) {
            await creditWallet(serviceClient, sa.user_id, "super_admin", perSA, "Center creation share - ₹300");
            await serviceClient.from("commissions").insert({ student_id: userId, payment_id: order.id, role: "super_admin", commission_amount: perSA, description: "Super Admin share from center creation" });
          }
        }
      }

      // === EXAM FEE ===
      else if (orderType === "exam_fee") {
        const { data: profile } = await serviceClient.from("profiles").select("center_code, referred_by, referral_code").eq("user_id", userId).single();

        // Referrer ₹70
        if (profile?.referred_by) {
          const { data: referrer } = await serviceClient.from("profiles").select("user_id").eq("referral_code", profile.referred_by).single();
          if (referrer) {
            await creditWallet(serviceClient, referrer.user_id, "student", EXAM_COMMISSION.REFERRER, "Referral commission - student referred");
            await serviceClient.from("commissions").insert({ student_id: referrer.user_id, referral_code: profile.referred_by, center_code: profile.center_code, payment_id: order.id, role: "referrer", commission_amount: EXAM_COMMISSION.REFERRER, description: "Referral commission from exam fee" });
            await serviceClient.from("notifications").insert({ user_id: referrer.user_id, title: "₹70 Referral Reward Received!", message: "A student paid exam fee using your referral link. ₹70 credited to your wallet.", channel: "in_app" });
          }
        }

        // Center ₹40
        if (profile?.center_code) {
          const { data: center } = await serviceClient.from("centers").select("user_id").eq("center_code", profile.center_code).single();
          if (center) {
            await creditWallet(serviceClient, center.user_id, "center", EXAM_COMMISSION.CENTER, "Student exam fee commission");
            await serviceClient.from("commissions").insert({ student_id: userId, center_code: profile.center_code, payment_id: order.id, role: "center", commission_amount: EXAM_COMMISSION.CENTER, description: "Center commission from exam fee" });
            await serviceClient.from("notifications").insert({ user_id: center.user_id, title: "₹40 Commission Received!", message: "A student paid exam fee from your center. ₹40 credited.", channel: "in_app" });
          }
        }

        // Admin ₹30
        const { data: adminRoles } = await serviceClient.from("user_roles").select("user_id").eq("role", "admin");
        if (adminRoles?.length) {
          const perAdmin = EXAM_COMMISSION.ADMIN / adminRoles.length;
          for (const admin of adminRoles) {
            await creditWallet(serviceClient, admin.user_id, "admin", perAdmin, "Admin commission from exam fee");
            await serviceClient.from("commissions").insert({ student_id: userId, center_code: profile?.center_code, payment_id: order.id, role: "admin", commission_amount: perAdmin, description: "Admin commission from exam fee" });
          }
        }

        // Super Admin ₹60
        const { data: saRoles } = await serviceClient.from("user_roles").select("user_id").eq("role", "super_admin");
        if (saRoles?.length) {
          const perSA = EXAM_COMMISSION.SUPER_ADMIN / saRoles.length;
          for (const sa of saRoles) {
            await creditWallet(serviceClient, sa.user_id, "super_admin", perSA, "Super Admin commission from exam fee");
            await serviceClient.from("commissions").insert({ student_id: userId, center_code: profile?.center_code, payment_id: order.id, role: "super_admin", commission_amount: perSA, description: "Super Admin commission from exam fee" });
          }
        }

        // Scholarship fund ₹100
        await serviceClient.from("scholarship_fund").insert({ amount: EXAM_COMMISSION.SCHOLARSHIP, source: "exam_fee", payment_order_id: order.id });

        // Generate referral code
        if (!profile?.referral_code) {
          const { data: refCode } = await serviceClient.rpc("generate_referral_code");
          if (refCode) {
            await serviceClient.from("profiles").update({ referral_code: refCode }).eq("user_id", userId);
          }
        }
      }

      console.log(`Webhook: payment.captured processed for order ${order.id}`);
    }

    else if (event === "payment.failed") {
      const payment = payload.payload?.payment?.entity;
      if (payment?.order_id) {
        await serviceClient.from("payment_orders").update({ status: "failed" }).eq("razorpay_order_id", payment.order_id);
        console.log(`Webhook: payment.failed for order_id ${payment.order_id}`);
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
