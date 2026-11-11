// EduLink — signup-teacher Edge Function
//
// Public sign-up for individual teachers (email + password).
// Creates the login and a "teacher" profile. Students are still created by
// their teacher (manage-users). Later: trial / subscription checks go here.
//
// Deploy with "Verify JWT" OFF (people signing up aren't logged in yet).
//
// Body (JSON): { "full_name": "...", "email": "...", "password": "..." }
// Returns:     { "ok": true }

import { createClient } from "npm:@supabase/supabase-js@2";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (message: string, status = 400) => json({ error: message }, status);

/** "maria.santos@school.edu" → "maria.santos" (+ digits if taken) */
async function uniqueUsername(admin: ReturnType<typeof createClient>, email: string) {
  const base =
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, ".")
      .replace(/^[._-]+|[._-]+$/g, "")
      .slice(0, 24) || "teacher";
  const padded = base.length < 3 ? `${base}.teacher` : base;
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? padded : `${padded}${Math.floor(100 + Math.random() * 9900)}`;
    const { data } = await admin.from("profiles").select("id").eq("username", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${padded}${Date.now().toString().slice(-6)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON");
  }

  const fullName = body.full_name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!fullName) return fail("Please enter your full name.");
  if (!email || !EMAIL_RE.test(email)) return fail("Please enter a valid email address.");
  if (email.endsWith("@edulink.com")) return fail("Please use your own email address.");
  if (password.length < 8) return fail("Password must be at least 8 characters.");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    const taken = /already|registered|exists/i.test(error.message);
    return fail(taken ? "An account with this email already exists. Try logging in." : error.message);
  }

  const username = await uniqueUsername(admin, email);
  const { error: profileErr } = await admin
    .from("profiles")
    .insert({ id: created.user.id, role: "teacher", full_name: fullName, username });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id); // roll back
    return fail(profileErr.message, 500);
  }

  return json({ ok: true });
});
