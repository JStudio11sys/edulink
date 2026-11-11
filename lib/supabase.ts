import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && key);

// When env vars are missing (e.g. a deploy without them) the app shows a setup notice instead of crashing.
export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url!, key!)
  : (null as unknown as SupabaseClient);

/** Usernames log in as "<username>@edulink.com" (never emailed). Teachers who signed up use their real email. */
export const EMAIL_DOMAIN = "edulink.com";
export const toEmail = (login: string) => {
  const v = login.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${EMAIL_DOMAIN}`;
};
