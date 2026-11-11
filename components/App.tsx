"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PersonalProvider } from "@/lib/personal";
import { UIProvider } from "@/lib/store";
import { supabaseConfigured } from "@/lib/supabase";
import { Landing } from "./landing/Landing";
import { LoginScreen } from "./LoginScreen";
import { Logo } from "./Logo";
import { Sheet } from "./Sheet";
import { AppShell } from "./shell/AppShell";

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <UIProvider>
          <PersonalScope>
            <Gate />
            {/* The sheet sits inside PersonalScope so note/task/class forms can use that data */}
            <Sheet />
          </PersonalScope>
        </UIProvider>
      </AuthProvider>
    </MotionConfig>
  );
}

/** Notes, tasks and timetable for the signed-in teacher/admin. Fresh state per user. */
function PersonalScope({ children }: { children: React.ReactNode }) {
  const { profile, lastProfile } = useAuth();
  const who = profile ?? lastProfile;
  return (
    <PersonalProvider key={who?.id ?? "signed-out"} enabled={!!profile && profile.role !== "student"}>
      {children}
    </PersonalProvider>
  );
}

/** The loading animation plays fully: icon pop + all letters + one bar sweep (ms from first paint). */
const SPLASH_MIN_MS = 2400;
const SPLASH_FADE_MS = 500;

/** "show" → (min time passed and app ready) → "leaving" (fade out) → "done". */
function useSplashPhase(ready: boolean) {
  const [minDone, setMinDone] = useState(false);
  const [phase, setPhase] = useState<"show" | "leaving" | "done">("show");

  useEffect(() => {
    // performance.now() counts from page start, so time already spent loading counts too
    const t = setTimeout(() => setMinDone(true), Math.max(0, SPLASH_MIN_MS - performance.now()));
    return () => clearTimeout(t);
  }, []);

  // Start fading once the app is ready and the animation has played
  useEffect(() => {
    if (phase === "show" && ready && minDone) setPhase("leaving");
  }, [ready, minDone, phase]);

  // After the fade, show the page
  useEffect(() => {
    if (phase !== "leaving") return;
    const t = setTimeout(() => setPhase("done"), SPLASH_FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  return phase;
}

function Gate() {
  const { loading, profile } = useAuth();
  const phase = useSplashPhase(!loading);

  if (!supabaseConfigured) return <SetupNotice />;
  // Splash fades out with plain CSS (not AnimatePresence, which could stall in dev mode).
  if (phase !== "done") return <Splash leaving={phase === "leaving"} />;

  return (
    <AnimatePresence mode="wait">
      {profile ? (
        <motion.div
          key={`app-${profile.id}`}
          className="min-h-dvh"
          initial={{ opacity: 0, scale: 1.02, filter: "blur(10px)" }}
          // Clear the filter afterwards: a filter on an ancestor breaks `position: fixed` (mobile layout).
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
          exit={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
          transition={{ duration: 0.4 }}
        >
          <AppShell />
        </motion.div>
      ) : (
        <SignedOut key="signed-out" />
      )}
    </AnimatePresence>
  );
}

function Splash({ leaving = false }: { leaving?: boolean }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-6 transition-[opacity,transform,filter] duration-[500ms] ease-out"
      style={leaving ? { opacity: 0, transform: "scale(0.96)", filter: "blur(6px)" } : undefined}
      role="status"
      aria-label="Loading EduLink"
    >
      <div className="flex items-center gap-3.5">
        <div className="splash-icon">
          <Logo size={64} />
        </div>
        <span className="splash-word text-[44px] leading-none font-medium tracking-tight text-[#3b3b3b]" aria-hidden>
          {"EduLink".split("").map((ch, i) => (
            <span key={i} style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
              {ch}
            </span>
          ))}
        </span>
      </div>
      <div className="h-1 w-32 overflow-hidden rounded-full bg-ink/5">
        <div className="splash-bar h-full w-1/3 rounded-full bg-gradient-to-r from-[#2FB3B0] via-[#8CBF6C] to-[#F0B429]" />
      </div>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="max-w-md rounded-card bg-white p-7 text-center">
        <Logo size={48} className="mx-auto" />
        <h1 className="mt-4 text-xl font-semibold">Supabase isn&apos;t configured</h1>
        <p className="mt-2 text-sm text-muted">
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (in .env.local locally, or in your
          host&apos;s environment variables), then rebuild.
        </p>
      </div>
    </div>
  );
}

/** Signed-out: landing page, or the login/sign-up card (#login / #signup in the address bar). */
function SignedOut() {
  const read = () => (typeof window === "undefined" ? "" : window.location.hash.replace("#", ""));
  const [view, setView] = useState(read);

  useEffect(() => {
    const on = () => setView(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const go = (v: "" | "login" | "signup") => {
    if (v) window.location.hash = v;
    else history.pushState(null, "", window.location.pathname + window.location.search);
    setView(v);
    window.scrollTo({ top: 0 });
  };

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {view === "login" || view === "signup" ? (
        <motion.div key={"auth-" + view} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <LoginScreen initialMode={view} onBack={() => go("")} />
        </motion.div>
      ) : (
        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <Landing onLogin={() => go("login")} onSignup={() => go("signup")} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
