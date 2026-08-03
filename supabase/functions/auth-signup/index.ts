import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let email = "";
  let displayName = "";

  try {
    const body = await req.json();
    email = String(body.email || "").trim().toLowerCase();
    displayName = String(body.display_name || "").trim();
    const password = String(body.password || "");

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || null;
    const userAgent = req.headers.get("user-agent");

    const { data, error } = await anon.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    await admin.from("auth_events").insert({
      event_type: "signup",
      email,
      success: !error,
      error_code: error?.code || null,
      error_message: error?.message || null,
      ip_address: ip,
      user_agent: userAgent,
      auth_user_id: data.user?.id || null,
      metadata: {
        display_name: displayName,
        source: "auth-signup",
      },
    });

    if (error) {
      return new Response(JSON.stringify({
        error: error.message,
        code: error.code || null,
      }), {
        status: error.status || 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify({
      user: data.user,
      access_token: data.session?.access_token || null,
      refresh_token: data.session?.refresh_token || null,
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    try {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers.get("cf-connecting-ip")
        || null;
      const userAgent = req.headers.get("user-agent");

      await admin.from("auth_events").insert({
        event_type: "signup",
        email: email || null,
        success: false,
        error_code: "edge_function_error",
        error_message: error.message || "Signup failed.",
        ip_address: ip,
        user_agent: userAgent,
        metadata: {
          display_name: displayName,
          source: "auth-signup",
        },
      });
    } catch {
      // Avoid masking the original signup error if logging itself fails.
    }

    return new Response(JSON.stringify({
      error: error.message || "Signup failed.",
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
