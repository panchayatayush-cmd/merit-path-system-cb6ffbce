import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const testUsers = [
    { email: "student@test.com", password: "student123", role: "student" as const },
    { email: "center@test.com", password: "center123", role: "center" as const },
    { email: "admin@test.com", password: "admin123", role: "admin" as const },
    { email: "superadmin@test.com", password: "superadmin123", role: "super_admin" as const },
  ];

  const results = [];

  for (const u of testUsers) {
    // Create auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });

    if (authErr) {
      results.push({ email: u.email, status: "error", message: authErr.message });
      continue;
    }

    const userId = authData.user.id;

    // Assign role
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: u.role });

    // Create profile
    await supabaseAdmin.from("profiles").insert({ user_id: userId, email: u.email });

    // Create wallet
    await supabaseAdmin.from("wallets").insert({ user_id: userId, role: u.role, balance: 0 });

    // If center, create center record
    if (u.role === "center") {
      const { data: code } = await supabaseAdmin.rpc("generate_center_code");
      await supabaseAdmin.from("centers").insert({
        user_id: userId,
        center_name: "Test Center",
        center_code: code ?? "CTR1001",
        email: u.email,
        is_active: true,
        payment_verified: true,
      });
    }

    results.push({ email: u.email, role: u.role, status: "created" });
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
