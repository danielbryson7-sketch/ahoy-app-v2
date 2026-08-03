import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TABLES = [
  "profiles","posts","comments","post_reactions","notes","note_shares",
  "note_groups","note_group_members","note_group_shares","tallies","tally_events",
  "crew_statuses","flair_catalog","profile_featured_crew","profile_gallery",
  "profile_guestbook","login_attempts"
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: caller } = await admin
      .from("profiles")
      .select("is_admin, active")
      .eq("id", user.id)
      .single();

    if (!caller?.is_admin || caller.active === false) throw new Error("Admin access required");

    const body = await req.json();
    const action = body.action;

    if (action === "dashboard") {
      const [
        authUsersResult, profilesResult, loginResult,
        postsCount, notesCount, talliesCount
      ] = await Promise.all([
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        admin.from("profiles").select("*"),
        admin.from("login_attempts").select("*").order("attempted_at", { ascending: false }).limit(250),
        admin.from("posts").select("*", { count: "exact", head: true }),
        admin.from("notes").select("*", { count: "exact", head: true }),
        admin.from("tallies").select("*", { count: "exact", head: true }),
      ]);

      const profiles = profilesResult.data || [];
      const profileMap = new Map(profiles.map((p) => [p.id, p]));
      const users = (authUsersResult.data?.users || []).map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        banned_until: u.banned_until,
        ...(profileMap.get(u.id) || {}),
      }));

      const tables = [];
      for (const name of ALLOWED_TABLES) {
        const { count } = await admin.from(name).select("*", { count: "exact", head: true });
        tables.push({ name, count: count || 0 });
      }

      const loginAttempts = loginResult.data || [];
      return json({
        users,
        login_attempts: loginAttempts,
        tables,
        counts: {
          users: users.length,
          active_users: users.filter((u) => u.active !== false).length,
          posts: postsCount.count || 0,
          notes: notesCount.count || 0,
          tallies: talliesCount.count || 0,
          failed_logins: loginAttempts.filter((x) => !x.success).length,
        },
      });
    }

    if (action === "set_active") {
      if (body.user_id === user.id && body.active === false) throw new Error("You cannot deactivate your own account.");
      const { error } = await admin.from("profiles")
        .update({ active: Boolean(body.active), updated_at: new Date().toISOString() })
        .eq("id", body.user_id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "set_ban") {
      if (body.user_id === user.id && body.banned) throw new Error("You cannot ban your own account.");
      const { error } = await admin.auth.admin.updateUserById(body.user_id, {
        ban_duration: body.banned ? "876000h" : "none",
      });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "browse_table") {
      const table = String(body.table || "");
      if (!ALLOWED_TABLES.includes(table)) throw new Error("That table is not approved for the admin browser.");
      const limit = Math.min(Math.max(Number(body.limit || 100), 1), 500);
      const [{ data, error, count }] = await Promise.all([
        admin.from(table).select("*", { count: "exact" }).limit(limit),
      ]);
      if (error) throw error;
      return json({ table, count: count || 0, rows: data || [] });
    }

    throw new Error("Unknown admin action.");
  } catch (error) {
    return json({ error: error.message || "Admin request failed." }, 403);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
