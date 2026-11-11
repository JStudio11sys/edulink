// EduLink — billing Edge Function (DEMO payments)
//
// Actions:
//   { "action": "start_trial" }                                   → 7-day free trial (once per teacher)
//   { "action": "pay", "plan": "monthly"|"yearly",
//     "method": "gcash", "number": "09xxxxxxxxx" }                 → DEMO payment: no money moves,
//                                                                    the plan is simply activated.
// Later: replace the "pay" branch with a real gateway (e.g. PayMongo GCash checkout + webhook).
//
// Deploy with "Verify JWT" OFF (the function checks the login itself).

import { createClient } from "npm:@supabase/supabase-js@2";

const PRICES = { monthly: 199, yearly: 1499 } as const; // ₱
const TRIAL_DAYS = 7;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (message: string, status = 400) => json({ error: message }, status);

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
function addPeriod(from: Date, plan: "monthly" | "yearly") {
  const d = new Date(from);
  if (plan === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData } = await asCaller.auth.getUser();
  if (!userData.user) return fail("Not signed in", 401);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: profile } = await admin.from("profiles").select("role").eq("id", userData.user.id).single();
  if (profile?.role !== "teacher") return fail("Only teacher accounts have plans.", 403);

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON");
  }

  const { data: current } = await admin.from("subscriptions").select("*").eq("teacher_id", userData.user.id).maybeSingle();
  const now = new Date();

  if (body.action === "start_trial") {
    if (current?.trial_used) return fail("You've already used your free trial. Please choose a plan.");
    const row = {
      teacher_id: userData.user.id,
      plan: "trial",
      status: "active",
      trial_used: true,
      current_period_end: addDays(now, TRIAL_DAYS).toISOString(),
    };
    const { data, error } = await admin.from("subscriptions").upsert(row, { onConflict: "teacher_id" }).select().single();
    if (error) return fail(error.message, 500);
    return json(data);
  }

  if (body.action === "pay") {
    const plan = body.plan as "monthly" | "yearly";
    if (plan !== "monthly" && plan !== "yearly") return fail("Choose monthly or yearly.");
    if (body.method !== "gcash") return fail("Only GCash is available.");
    const digits = String(body.number ?? "").replace(/\D/g, "");
    if (!/^(09\d{9}|639\d{9})$/.test(digits)) return fail("Enter a valid GCash mobile number, e.g. 09171234567.");

    // Extend from the later of now / current paid end (keeps unused paid time)
    const currentEnd = current && current.plan !== "trial" ? new Date(current.current_period_end) : now;
    const start = currentEnd > now ? currentEnd : now;
    const reference = `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const row = {
      teacher_id: userData.user.id,
      plan,
      status: "active",
      trial_used: true,
      current_period_end: addPeriod(start, plan).toISOString(),
      last_payment: {
        method: "gcash",
        number: `•••• ${digits.slice(-4)}`,
        amount: PRICES[plan],
        reference,
        paid_at: now.toISOString(),
        demo: true,
      },
    };
    const { data, error } = await admin.from("subscriptions").upsert(row, { onConflict: "teacher_id" }).select().single();
    if (error) return fail(error.message, 500);
    return json(data);
  }

  return fail("Unknown action.");
});
