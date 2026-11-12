import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && key);

/**
 * View-only mode (admin viewing as a teacher): every request that would change data is refused here,
 * before it leaves the browser. Reading, signing in and photo links still work.
 */
let readOnly = false;
export const setReadOnly = (on: boolean) => {
  readOnly = on;
};
export const isReadOnly = () => readOnly;

const guardedFetch: typeof fetch = (input, init) => {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const allowed =
    method === "GET" ||
    method === "HEAD" ||
    href.includes("/auth/v1/") ||
    href.includes("/storage/v1/object/sign/");
  if (readOnly && !allowed) {
    const body = JSON.stringify({ message: "View only — you're viewing as a teacher.", error: "View only" });
    return Promise.resolve(new Response(body, { status: 403, headers: { "Content-Type": "application/json" } }));
  }
  return fetch(input, init);
};

// When env vars are missing (e.g. a deploy without them) the app shows a setup notice instead of crashing.
export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url!, key!, { global: { fetch: guardedFetch } })
  : (null as unknown as SupabaseClient);

/** Usernames log in as "<username>@edulink.com" (never emailed). Teachers who signed up use their real email. */
export const EMAIL_DOMAIN = "edulink.com";
export const toEmail = (login: string) => {
  const v = login.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${EMAIL_DOMAIN}`;
};
