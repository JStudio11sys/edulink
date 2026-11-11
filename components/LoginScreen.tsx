"use client";

import { ArrowLeft, Check, Eye, EyeOff, Loader2, MailCheck, X } from "lucide-react";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { softSpring, spring } from "@/lib/motion";
import { capitalizeWords } from "@/lib/names";
import { suggestUsername } from "@/lib/format";
import { resendCode, signUpTeacher, usernameAvailable, validUsername, verifyCode } from "@/lib/signup";
import { Logo } from "./Logo";
import { ErrorNote, Field, PrimaryButton, inputCls } from "./ui";
import { Credit } from "./Credit";

export type Mode = "login" | "signup" | "verify";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function LoginScreen({ initialMode = "login", onBack }: { initialMode?: "login" | "signup"; onBack?: () => void } = {}) {
  const { signIn, notice } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [login, setLogin] = useState(""); // login: email or username
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const shake = useAnimationControls();

  /* ---- username availability (debounced) ---- */
  const [avail, setAvail] = useState<"idle" | "checking" | "free" | "taken" | "invalid">("idle");
  useEffect(() => {
    if (mode !== "signup" || !username) return setAvail("idle");
    if (!validUsername(username)) return setAvail("invalid");
    setAvail("checking");
    const t = setTimeout(() => {
      usernameAvailable(username)
        .then((ok) => setAvail(ok ? "free" : "taken"))
        .catch(() => setAvail("idle"));
    }, 400);
    return () => clearTimeout(t);
  }, [username, mode]);

  /* ---- resend cooldown ---- */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const fail = (m: string) => {
    setError(m);
    setBusy(false);
    shake.start({ x: [0, -12, 10, -8, 6, -3, 0], transition: { duration: 0.45 } });
  };

  const goVerify = (forEmail: string, sent: boolean) => {
    setEmail(forEmail);
    setCode("");
    setMode("verify");
    setError(null);
    setInfo(sent ? `We sent a 6-digit code to ${forEmail}.` : null);
    if (sent) setCooldown(30);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        const r = await signIn(login, password);
        if (r.confirmEmail) {
          setBusy(false);
          return goVerify(r.confirmEmail, false);
        }
        if (r.error) return fail(r.error);
        return; // signed in — the app takes over
      }
      if (mode === "signup") {
        const r = await signUpTeacher({ fullName, username, email, password });
        setBusy(false);
        if (r.needsCode) goVerify(email.trim().toLowerCase(), true);
        return;
      }
      // verify
      await verifyCode(email, code);
      // signed in — the app takes over (plan chooser for new teachers)
    } catch (e) {
      fail(msg(e));
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await resendCode(email);
      setInfo(`A new code was sent to ${email}.`);
      setCooldown(30);
    } catch (e) {
      setError(msg(e));
    }
  };

  const valid =
    mode === "login"
      ? login.trim() && password
      : mode === "signup"
        ? fullName.trim() && avail === "free" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && password.length >= 8
        : /^\d{6}$/.test(code);

  const switchMode = (m: "login" | "signup") => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
      transition={{ duration: 0.35 }}
      className={`relative flex min-h-dvh items-center justify-center overflow-clip px-4 py-10 ${onBack ? "pt-20 sm:pt-10" : ""}`}
    >
      {/* soft moving color blobs */}
      <motion.div aria-hidden className="pointer-events-none absolute -top-32 -left-24 size-[420px] rounded-full bg-lilac/40 blur-3xl" animate={{ x: [0, 40, 0], y: [0, 30, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div aria-hidden className="pointer-events-none absolute -right-24 -bottom-32 size-[460px] rounded-full bg-mint/50 blur-3xl" animate={{ x: [0, -40, 0], y: [0, -30, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />

      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-[max(16px,env(safe-area-inset-top))] left-4 z-10 flex h-11 items-center gap-1.5 rounded-full bg-white/80 px-4 text-sm font-medium shadow-sm ring-1 ring-black/5 backdrop-blur hover:bg-white"
        >
          <ArrowLeft className="size-4" /> Home
        </button>
      )}

      <motion.div animate={shake} className="relative w-full max-w-[420px]">
        <motion.form
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...softSpring, delay: 0.05 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !busy) submit();
          }}
          className="rounded-[32px] bg-white/90 p-7 shadow-[0_40px_100px_-30px_rgba(20,20,40,0.35)] ring-1 ring-black/5 backdrop-blur-xl sm:p-8"
        >
          {/* Full logo */}
          <div className="flex items-center justify-center gap-3">
            <motion.div initial={{ scale: 0.5, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring, delay: 0.15 }}>
              <Logo size={56} />
            </motion.div>
            <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.25 }} className="text-[38px] leading-none font-medium tracking-tight text-[#3b3b3b]">
              EduLink
            </motion.span>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
              {/* ---------- Sign in ---------- */}
              {mode === "login" && (
                <div className="mt-7 space-y-4">
                  <Field label="Email or username">
                    <input
                      autoFocus
                      value={login}
                      onChange={(e) => setLogin(e.target.value.trim())}
                      autoCapitalize="none"
                      autoComplete="username"
                      spellCheck={false}
                      className={inputCls}
                    />
                  </Field>
                  <PasswordInput value={password} onChange={setPassword} show={show} onShow={setShow} autoComplete="current-password" />
                  <ErrorNote message={error ?? notice} />
                  <PrimaryButton type="submit" className="w-full" disabled={!valid} loading={busy}>
                    Sign in
                  </PrimaryButton>
                </div>
              )}

              {/* ---------- Create account ---------- */}
              {mode === "signup" && (
                <>
                  <h1 className="mt-6 text-[24px] leading-tight font-semibold tracking-tight">Create your teacher account</h1>
                  <p className="mt-1 text-sm text-muted">Start with a free week. No card needed.</p>
                  <div className="mt-6 space-y-4">
                    <Field label="Full name">
                      <input
                        autoFocus
                        value={fullName}
                        onChange={(e) => {
                          const v = capitalizeWords(e.target.value);
                          setFullName(v);
                          if (!usernameTouched) setUsername(suggestUsername(v));
                        }}
                        autoComplete="name"
                        placeholder="e.g. Anna Goodman"
                        className={inputCls}
                      />
                    </Field>
                    <Field
                      label="Username"
                      hint={
                        avail === "invalid"
                          ? "3–32 characters: lowercase letters, numbers, dot, dash or underscore."
                          : "You can sign in with this or your email."
                      }
                    >
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted">@</span>
                        <input
                          value={username}
                          onChange={(e) => {
                            setUsernameTouched(true);
                            setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""));
                          }}
                          autoCapitalize="none"
                          autoComplete="username"
                          spellCheck={false}
                          className={`${inputCls} pr-28 pl-8`}
                        />
                        <span className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 text-xs font-medium">
                          {avail === "checking" && <Loader2 className="size-4 animate-spin text-muted" />}
                          {avail === "free" && (
                            <span className="flex items-center gap-1 text-mint-deep">
                              <Check className="size-4" /> Available
                            </span>
                          )}
                          {avail === "taken" && (
                            <span className="flex items-center gap-1 text-red-500">
                              <X className="size-4" /> Taken
                            </span>
                          )}
                        </span>
                      </div>
                    </Field>
                    <Field label="Email" hint="We'll send a code to confirm it.">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value.trim())}
                        autoCapitalize="none"
                        autoComplete="email"
                        spellCheck={false}
                        className={inputCls}
                      />
                    </Field>
                    <PasswordInput value={password} onChange={setPassword} show={show} onShow={setShow} autoComplete="new-password" hint="At least 8 characters." />
                    <ErrorNote message={error} />
                    <PrimaryButton type="submit" className="w-full" disabled={!valid} loading={busy}>
                      Create account
                    </PrimaryButton>
                  </div>
                </>
              )}

              {/* ---------- Email code ---------- */}
              {mode === "verify" && (
                <>
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={spring}
                    className="mx-auto mt-6 grid size-14 place-items-center rounded-2xl bg-mint"
                  >
                    <MailCheck className="size-7 text-mint-deep" />
                  </motion.div>
                  <h1 className="mt-4 text-center text-[24px] leading-tight font-semibold tracking-tight">Check your email</h1>
                  <p className="mt-1 text-center text-sm text-muted">
                    Enter the 6-digit code we sent to <span className="font-medium text-ink">{email}</span>.
                  </p>
                  <div className="mt-6 space-y-4">
                    <input
                      autoFocus
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="••••••"
                      aria-label="6-digit code"
                      className={`${inputCls} h-16 text-center font-mono text-3xl tracking-[0.5em]`}
                    />
                    {info && !error && <p className="text-center text-xs text-muted">{info}</p>}
                    <ErrorNote message={error} />
                    <PrimaryButton type="submit" className="w-full" disabled={!valid} loading={busy}>
                      Confirm
                    </PrimaryButton>
                    <div className="flex items-center justify-between text-sm">
                      <button type="button" onClick={() => switchMode("signup")} className="flex h-11 items-center px-1 text-muted hover:text-ink">
                        Wrong email?
                      </button>
                      <button
                        type="button"
                        onClick={resend}
                        disabled={cooldown > 0}
                        className="flex h-11 items-center px-1 font-medium text-lilac-deep disabled:text-muted"
                      >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : "Send a new code"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {mode !== "verify" && (
                <p className="mt-5 text-center text-sm text-muted">
                  {mode === "login" ? (
                    <>
                      Are you a teacher?{" "}
                      <button type="button" onClick={() => switchMode("signup")} className="font-medium text-lilac-deep">
                        Create an account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button type="button" onClick={() => switchMode("login")} className="font-medium text-lilac-deep">
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.form>
        <div className="mt-4 text-center">
          <Credit />
        </div>
      </motion.div>
    </motion.div>
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  onShow,
  autoComplete,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onShow: (v: boolean) => void;
  autoComplete: string;
  hint?: string;
}) {
  return (
    <Field label="Password" hint={hint}>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`${inputCls} pr-12`}
        />
        <button
          type="button"
          onClick={() => onShow(!show)}
          className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center text-muted hover:text-ink"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>
    </Field>
  );
}
