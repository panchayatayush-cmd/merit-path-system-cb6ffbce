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

// Commission amounts (₹300 total for exam fee)
const EXAM_COMMISSION = {
  REFERRER: 70,
  CENTER: 40,
  ADMIN: 30,
  SUPER_ADMIN: 60,
  SCHOLARSHIP: 100,
};

// Commission amounts for center registration (₹500 total)
const CENTER_REG_COMMISSION = {
  ADMIN: 200,
  SUPER_ADMIN: 300,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) throw new Error("RAZORPAY_KEY_SECRET not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, db_order_id } = await req.json();

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

    // Prevent duplicate payouts
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

    // If center registration (self-signup by center owner), activate center AND distribute ₹500
    if (orderType === "center_registration") {
      // Activate center
      const { data: centerData } = await serviceClient
        .from("centers")
        .update({ is_active: true, payment_verified: true })
        .eq("user_id", user.id)
        .select("admin_id, center_code")
        .single();

      // 1. Credit ADMIN ₹200 (the admin whose code was used)
      if (centerData?.admin_id) {
        await creditWallet(serviceClient, centerData.admin_id, "admin", CENTER_REG_COMMISSION.ADMIN, "Center registration commission - ₹200");

        await serviceClient.from("commissions").insert({
          student_id: user.id,
          center_code: centerData.center_code,
          payment_id: db_order_id,
          role: "admin",
          commission_amount: CENTER_REG_COMMISSION.ADMIN,
          description: "Admin commission from center owner registration fee",
        });
      }

      // 2. Credit SUPER ADMIN ₹300
      const { data: superAdminRoles } = await serviceClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");

      if (superAdminRoles && superAdminRoles.length > 0) {
        const perSA = CENTER_REG_COMMISSION.SUPER_ADMIN / superAdminRoles.length;
        for (const sa of superAdminRoles) {
          await creditWallet(serviceClient, sa.user_id, "super_admin", perSA, "Center registration share - ₹300");

          await serviceClient.from("commissions").insert({
            student_id: user.id,
            center_code: centerData?.center_code ?? null,
            payment_id: db_order_id,
            role: "super_admin",
            commission_amount: perSA,
            description: "Super Admin share from center owner registration fee",
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Center payment verified, activated, and commissions distributed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If admin_center_creation, distribute ₹200 to admin and ₹300 to super admin
    if (orderType === "admin_center_creation") {
      // Credit ADMIN ₹200
      await creditWallet(serviceClient, user.id, "admin", CENTER_REG_COMMISSION.ADMIN, "Center creation commission - ₹200");
      await serviceClient.from("commissions").insert({
        student_id: user.id,
        payment_id: db_order_id,
        role: "admin",
        commission_amount: CENTER_REG_COMMISSION.ADMIN,
        description: "Admin share from center creation fee",
      });

      // Credit SUPER ADMIN ₹300
      const { data: superAdminRoles } = await serviceClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");

      if (superAdminRoles && superAdminRoles.length > 0) {
        const perSA = CENTER_REG_COMMISSION.SUPER_ADMIN / superAdminRoles.length;
        for (const sa of superAdminRoles) {
          await creditWallet(serviceClient, sa.user_id, "super_admin", perSA, "Center creation share - ₹300");
          await serviceClient.from("commissions").insert({
            student_id: user.id,
            payment_id: db_order_id,
            role: "super_admin",
            commission_amount: perSA,
            description: "Super Admin share from admin center creation fee",
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Admin center creation payment verified and commissions distributed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== EXAM FEE DISTRIBUTION (₹300 total) =====
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("center_code, referred_by, referral_code")
      .eq("user_id", user.id)
      .single();

    // 1. Credit REFERRING student ₹70
    if (profile?.referred_by) {
      const { data: referrerProfile } = await serviceClient
        .from("profiles")
        .select("user_id")
        .eq("referral_code", profile.referred_by)
        .single();

      if (referrerProfile) {
        await creditWallet(serviceClient, referrerProfile.user_id, "student", EXAM_COMMISSION.REFERRER, "Referral commission - student referred");

        await serviceClient.from("commissions").insert({
          student_id: referrerProfile.user_id,
          referral_code: profile.referred_by,
          center_code: profile.center_code,
          payment_id: db_order_id,
          role: "referrer",
          commission_amount: EXAM_COMMISSION.REFERRER,
          description: "Referral commission from student exam fee",
        });

        // Send notification to referring student
        await serviceClient.from("notifications").insert({
          user_id: referrerProfile.user_id,
          title: "₹70 Referral Reward Received!",
          message: "You have received ₹70 referral reward because a student registered and paid the exam fee using your referral link. Check your wallet in the dashboard.",
          channel: "in_app",
        });
      }
    }

    // 2. Credit CENTER owner ₹40
    if (profile?.center_code) {
      const { data: center } = await serviceClient
        .from("centers")
        .select("user_id")
        .eq("center_code", profile.center_code)
        .single();

      if (center) {
        await creditWallet(serviceClient, center.user_id, "center", EXAM_COMMISSION.CENTER, "Student exam fee commission");

        await serviceClient.from("commissions").insert({
          student_id: user.id,
          referral_code: profile.referred_by ?? null,
          center_code: profile.center_code,
          payment_id: db_order_id,
          role: "center",
          commission_amount: EXAM_COMMISSION.CENTER,
          description: "Center commission from student exam fee",
        });

        // Send notification to center owner
        await serviceClient.from("notifications").insert({
          user_id: center.user_id,
          title: "₹40 Referral Reward Received!",
          message: "You have received ₹40 referral reward because a student registered and paid the exam fee using your center code.",
          channel: "in_app",
        });
      }
    }

    // 3. Credit ADMIN wallets ₹30 (split among all admins)
    const { data: adminRoles } = await serviceClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminRoles && adminRoles.length > 0) {
      const perAdmin = EXAM_COMMISSION.ADMIN / adminRoles.length;
      for (const admin of adminRoles) {
        await creditWallet(serviceClient, admin.user_id, "admin", perAdmin, "Admin commission from exam fee");

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

    // 4. Credit SUPER ADMIN ₹60
    const { data: superAdminRoles } = await serviceClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    if (superAdminRoles && superAdminRoles.length > 0) {
      const perSuperAdmin = EXAM_COMMISSION.SUPER_ADMIN / superAdminRoles.length;
      for (const sa of superAdminRoles) {
        await creditWallet(serviceClient, sa.user_id, "super_admin", perSuperAdmin, "Super Admin commission from exam fee");

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

    // 5. Scholarship fund ₹100
    await serviceClient.from("scholarship_fund").insert({
      amount: EXAM_COMMISSION.SCHOLARSHIP,
      source: "exam_fee",
      payment_order_id: db_order_id,
    });

    // Generate referral code for the paying student (only after payment)
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

// Helper to credit wallet
async function creditWallet(
  client: any,
  userId: string,
  role: string,
  amount: number,
  description: string
) {
  const { data: wallet } = await client
    .from("wallets")
    .select("id, balance")
    .eq("user_id", userId)
    .eq("role", role)
    .single();

  if (wallet) {
    await client.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      amount,
      type: "credit",
      description,
    });
    await client
      .from("wallets")
      .update({ balance: Number(wallet.balance) + amount })
      .eq("id", wallet.id);
  }
}
