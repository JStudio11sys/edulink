// EduLink — login Edge Function
//
// Lets people sign in with their USERNAME (teachers can also use their email
// directly in the app). The username is turned into the account's email on the
// server, so a teacher's email is never revealed to someone who knows only their
// username.
//
// Deploy with "Verify JWT" OFF (people logging in aren't signed in yet).
//
// Body: { "username": "...", "password": "..." }
// Returns the session: { "access_token", "refresh_token" }  (or { error, needs_confirmation })

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const WRONG = "Wrong email/username or password.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let username = "";
  let password = "";
  try {
    const b = await req.json();
    username = String(b.username ?? "").trim().toLowerCase();
    password = String(b.password ?? "");
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!username || !password) return json({ error: WRONG }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // username → account email (server side only)
  const { data: profile } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (!profile) return json({ error: WRONG }, 400);
  const { data: user } = await admin.auth.admin.getUserById(profile.id);
  const email = user?.user?.email;
  if (!email) return json({ error: WRONG }, 400);

  // Sign in with Supabase Auth on the user's behalf
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
      // pass the visitor's IP so Supabase's login rate limit applies per person
      "X-Forwarded-For": req.headers.get("x-forwarded-for") ?? "",
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = String(data?.msg ?? data?.error_description ?? data?.message ?? "");
    if (/not confirmed/i.test(msg))
      // Password was right but the email isn't confirmed yet → the app shows the code step
      return json({ error: "Please confirm your email first.", needs_confirmation: true, email }, 400);
    if (res.status === 429) return json({ error: "Too many tries. Please wait a moment." }, 429);
    return json({ error: WRONG }, 400);
  }

  return json({ access_token: data.access_token, refresh_token: data.refresh_token });
});
