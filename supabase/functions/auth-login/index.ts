import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let email = "";
  try {
    const body = await req.json();
    email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || null;
    const userAgent = req.headers.get("user-agent");

    await admin.from("login_attempts").insert({
      email,
      success: !error,
      error_code: error?.code || null,
      error_message: error?.message || null,
      ip_address: ip,
      user_agent: userAgent,
      auth_user_id: data.user?.id || null,
    });

    if (error || !data.session) {
      return new Response(JSON.stringify({ error: error?.message || "Invalid login." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("active")
      .eq("id", data.user.id)
      .single();

    if (profile?.active === false) {
      await admin.auth.admin.signOut(data.session.access_token);
      return new Response(JSON.stringify({ error: "This account is deactivated." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Login failed." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
