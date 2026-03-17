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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller }, error: callerError } = await anonClient.auth.getUser(token);
    if (callerError || !caller) throw new Error("Unauthorized");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: callerRole } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!callerRole) throw new Error("Only super admins can manage admin accounts");

    const body = await req.json();
    const { action } = body;

    // CREATE ADMIN
    if (!action || action === "create") {
      const { email, password, role, full_name, mobile } = body;
      if (!email || !password) throw new Error("Missing email or password");
      if (!["admin", "super_admin"].includes(role)) throw new Error("Invalid role");

      const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError) throw createError;

      const { error: roleError } = await serviceClient
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role, full_name: full_name || null, mobile: mobile || null });
      if (roleError) throw roleError;

      // Also update profiles table
      await serviceClient
        .from("profiles")
        .update({ full_name: full_name || null, mobile: mobile || null })
        .eq("user_id", newUser.user.id);

      return new Response(
        JSON.stringify({ success: true, user_id: newUser.user.id, email, role }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UPDATE ADMIN
    if (action === "update") {
      const { user_id, full_name, email, mobile, password, is_disabled } = body;
      if (!user_id) throw new Error("Missing user_id");

      // Update auth user if email or password changed
      const authUpdate: any = {};
      if (email) authUpdate.email = email;
      if (password) authUpdate.password = password;
      if (typeof is_disabled === "boolean") {
        authUpdate.ban_duration = is_disabled ? "876000h" : "none";
      }

      if (Object.keys(authUpdate).length > 0) {
        const { error: authErr } = await serviceClient.auth.admin.updateUserById(user_id, authUpdate);
        if (authErr) throw authErr;
      }

      // Update user_roles
      const roleUpdate: any = {};
      if (full_name !== undefined) roleUpdate.full_name = full_name || null;
      if (mobile !== undefined) roleUpdate.mobile = mobile || null;
      if (typeof is_disabled === "boolean") roleUpdate.is_disabled = is_disabled;

      if (Object.keys(roleUpdate).length > 0) {
        await serviceClient
          .from("user_roles")
          .update(roleUpdate)
          .eq("user_id", user_id)
          .in("role", ["admin", "super_admin"]);
      }

      // Update profiles
      const profileUpdate: any = {};
      if (full_name !== undefined) profileUpdate.full_name = full_name || null;
      if (email) profileUpdate.email = email;
      if (mobile !== undefined) profileUpdate.mobile = mobile || null;
      if (Object.keys(profileUpdate).length > 0) {
        await serviceClient.from("profiles").update(profileUpdate).eq("user_id", user_id);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // LIST ADMINS (with email from auth)
    if (action === "list") {
      const { data: roles } = await serviceClient
        .from("user_roles")
        .select("user_id, role, created_at, is_disabled, full_name, mobile")
        .in("role", ["admin", "super_admin"])
        .order("created_at", { ascending: false });

      const admins = [];
      for (const r of roles ?? []) {
        let email = "";
        try {
          const { data: { user } } = await serviceClient.auth.admin.getUserById(r.user_id);
          email = user?.email ?? "";
        } catch {}
        admins.push({ ...r, email });
      }

      return new Response(
        JSON.stringify({ admins }),
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
