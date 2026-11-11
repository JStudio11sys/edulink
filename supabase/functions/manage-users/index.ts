// EduLink — manage-users Edge Function
//
// Creates, edits and deletes login accounts. Runs on Supabase with the
// service-role key (never shipped to the browser).
//
// Rules:
//   admin   → can create/edit/delete teachers and students (and other admins)
//   teacher → can create/edit/delete ONLY students they created
//   student → no access
//
// Body (JSON):
//   { "action": "create", "role": "teacher"|"student"|"admin", "full_name" | ("last_name" + "first_name"),
//     "sex"?: "female"|"male", "username": "...", "password": "..." }
//   { "action": "update", "id": "<uuid>", "full_name"?, "last_name"?, "first_name"?, "sex"?, "username"?, "password"? }
//   { "action": "delete", "id": "<uuid>" }

import { createClient } from "npm:@supabase/supabase-js@2";

const EMAIL_DOMAIN = "edulink.com";
const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const fail = (message: string, status = 400) => json({ error: message }, status);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Who is calling?
  const authHeader = req.headers.get("Authorization") ?? "";
  const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await asCaller.auth.getUser();
  if (userErr || !userData.user) return fail("Not signed in", 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: caller } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", userData.user.id)
    .single();
  if (!caller || caller.role === "student") return fail("Not allowed", 403);

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON");
  }

  const username = body.username?.trim().toLowerCase();
  const firstName = body.first_name?.trim();
  const lastName = body.last_name?.trim();
  const sex = body.sex;
  // Full name is built from first + last when given ("Pedro Penduko")
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : body.full_name?.trim();
  const password = body.password;

  if (username !== undefined && !USERNAME_RE.test(username))
    return fail("Username must be 3–32 characters: lowercase letters, numbers, dot, dash or underscore.");
  if (password !== undefined && password.length < 8) return fail("Password must be at least 8 characters.");
  if (fullName !== undefined && fullName.length === 0) return fail("Full name is required.");
  if (sex !== undefined && sex !== null && !["female", "male"].includes(sex)) return fail("Sex must be female or male.");

  /** Can the caller manage this existing account? */
  const canManage = async (id: string) => {
    const { data: target } = await admin.from("profiles").select("id, role, created_by").eq("id", id).single();
    if (!target) return { ok: false as const, msg: "Account not found" };
    if (caller.role === "admin") return { ok: true as const, target };
    if (target.role === "student" && target.created_by === caller.id) return { ok: true as const, target };
    return { ok: false as const, msg: "Not allowed" };
  };

  switch (body.action) {
    /* ---------- CREATE ---------- */
    case "create": {
      const role = body.role;
      if (!["admin", "teacher", "student"].includes(role)) return fail("Invalid role.");
      if (caller.role === "teacher" && role !== "student") return fail("Teachers can only create students.", 403);
      if (!username || !fullName || !password) return fail("Full name, username and password are required.");

      const { data: created, error } = await admin.auth.admin.createUser({
        email: `${username}@${EMAIL_DOMAIN}`,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, username },
      });
      if (error) {
        const taken = /already|registered|exists/i.test(error.message);
        return fail(taken ? "That username is already taken." : error.message);
      }

      const { error: profileErr } = await admin.from("profiles").insert({
        id: created.user.id,
        role,
        full_name: fullName,
        first_name: firstName ?? null,
        last_name: lastName ?? null,
        sex: sex ?? null,
        username,
        created_by: role === "student" ? caller.id : null,
      });
      if (profileErr) {
        await admin.auth.admin.deleteUser(created.user.id); // roll back
        return fail(profileErr.message);
      }
      return json({ id: created.user.id, username, full_name: fullName, role });
    }

    /* ---------- UPDATE ---------- */
    case "update": {
      if (!body.id) return fail("Missing id.");
      const check = await canManage(body.id);
      if (!check.ok) return fail(check.msg, 403);

      // Only username-style accounts (…@edulink.com) log in with their username;
      // teachers who signed up with their own email keep that email.
      const { data: existingUser } = await admin.auth.admin.getUserById(body.id);
      const usesUsernameLogin = (existingUser?.user?.email ?? "").endsWith(`@${EMAIL_DOMAIN}`);

      const authPatch: Record<string, unknown> = {};
      if (username && usesUsernameLogin) authPatch.email = `${username}@${EMAIL_DOMAIN}`;
      if (password) authPatch.password = password;
      if (username || fullName)
        authPatch.user_metadata = { full_name: fullName ?? undefined, username: username ?? undefined };

      if (Object.keys(authPatch).length) {
        if (authPatch.email) authPatch.email_confirm = true;
        const { error } = await admin.auth.admin.updateUserById(body.id, authPatch);
        if (error) {
          const taken = /already|registered|exists/i.test(error.message);
          return fail(taken ? "That username is already taken." : error.message);
        }
      }

      const profilePatch: Record<string, string | null> = {};
      if (username) profilePatch.username = username;
      if (fullName) profilePatch.full_name = fullName;
      if (firstName) profilePatch.first_name = firstName;
      if (lastName) profilePatch.last_name = lastName;
      if (sex !== undefined) profilePatch.sex = sex;
      if (Object.keys(profilePatch).length) {
        const { error } = await admin.from("profiles").update(profilePatch).eq("id", body.id);
        if (error) return fail(error.message);
      }
      return json({ ok: true });
    }

    /* ---------- DELETE ---------- */
    case "delete": {
      if (!body.id) return fail("Missing id.");
      if (body.id === caller.id) return fail("You can't delete your own account.");
      const check = await canManage(body.id);
      if (!check.ok) return fail(check.msg, 403);
      const { error } = await admin.auth.admin.deleteUser(body.id); // profile row cascades
      if (error) return fail(error.message);
      return json({ ok: true });
    }

    default:
      return fail("Unknown action.");
  }
});
