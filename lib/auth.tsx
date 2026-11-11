"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, supabaseConfigured, toEmail } from "./supabase";
import type { Profile } from "./types";

interface AuthState {
  loading: boolean;
  profile: Profile | null;
  /** Last signed-in profile; kept while the app fades out after logout. */
  lastProfile: Profile | null;
  notice: string | null;
  /** Email or username. confirmEmail is set when the account still needs its email code. */
  signIn: (login: string, password: string) => Promise<{ error: string | null; confirmEmail?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(supabaseConfigured);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastProfile, setLastProfile] = useState<Profile | null>(null);
  if (profile && profile !== lastProfile) setLastProfile(profile);

  useEffect(() => {
    if (!supabaseConfigured) return;

    const load = async (userId?: string) => {
      if (!userId) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (!data) {
        setNotice("This account has no EduLink profile. Ask your admin.");
        await supabase.auth.signOut();
        setProfile(null);
      } else {
        setProfile(data as Profile);
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      // Defer: Supabase recommends not awaiting other calls inside this callback.
      setTimeout(() => load(session?.user.id), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (login: string, password: string) => {
    setNotice(null);
    const value = login.trim().toLowerCase();
    const wrong = "Wrong email/username or password.";

    // Email → sign in directly
    if (value.includes("@")) {
      const { error } = await supabase.auth.signInWithPassword({ email: value, password });
      if (!error) return { error: null };
      if (/not confirmed/i.test(error.message)) return { error: "Please confirm your email first.", confirmEmail: value };
      return { error: /invalid/i.test(error.message) ? wrong : error.message };
    }

    // Username → the "login" function finds the account (without revealing its email) and returns a session
    const { data, error } = await supabase.functions.invoke("login", { body: { username: value, password } });
    if (!error && data?.access_token) {
      const { error: sessErr } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
      return { error: sessErr ? sessErr.message : null };
    }
    let payload: { error?: string; needs_confirmation?: boolean; email?: string } | null = null;
    try {
      payload = await (error as { context?: Response })?.context?.json();
    } catch {
      /* no body */
    }
    if (payload?.needs_confirmation) return { error: payload.error ?? "Please confirm your email first.", confirmEmail: payload.email };
    // Fallback if the login function isn't deployed yet: username accounts made by a teacher/admin
    if ((error as { context?: Response })?.context?.status === 404) {
      const { error: e2 } = await supabase.auth.signInWithPassword({ email: toEmail(value), password });
      return { error: e2 ? wrong : null };
    }
    return { error: payload?.error ?? wrong };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return (
    <Ctx.Provider value={{ loading, profile, lastProfile, notice, signIn, signOut }}>{children}</Ctx.Provider>
  );
}

export function useAuth() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useAuth must be used inside AuthProvider");
  return s;
}

/** Signed-in profile (only use under the signed-in shell). */
export function useMe() {
  const { profile, lastProfile } = useAuth();
  const me = profile ?? lastProfile;
  if (!me) throw new Error("Not signed in");
  return me;
}
