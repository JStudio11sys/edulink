"use client";

import { Check, LogOut, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { PLAN_LABEL, access, getSubscription, payDemo, startTrial, type Subscription } from "@/lib/billing";
import { useQuery } from "@/lib/useQuery";
import { cn } from "@/lib/cn";
import { fmtDate } from "@/lib/format";
import { snappy, spring } from "@/lib/motion";
import { CURRENCY, PLANS } from "@/lib/pricing";
import { useUI } from "@/lib/store";
import { Credit } from "../Credit";
import { Logo } from "../Logo";
import { SheetHeader } from "../Sheet";
import { ErrorNote, Field, PrimaryButton, inputCls } from "../ui";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** The three plan cards. Trial is disabled once used. */
export function PlanCards({ sub, onDone }: { sub: Subscription | null; onDone: () => void }) {
  const { openSheet } = useUI();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trialUsed = !!sub?.trial_used;

  const choose = async (id: string) => {
    setError(null);
    if (id === "trial") {
      setBusy(true);
      try {
        await startTrial();
        onDone();
      } catch (e) {
        setError(msg(e));
      } finally {
        setBusy(false);
      }
      return;
    }
    openSheet(<GcashCheckout plan={id as "monthly" | "yearly"} onPaid={onDone} />);
  };

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-3">
        {PLANS.map((p, i) => {
          const disabled = p.id === "trial" && trialUsed;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.06 }}
              className={cn(
                "relative flex flex-col rounded-[26px] p-6",
                p.highlight ? "bg-ink text-white" : "bg-white",
                disabled && "opacity-50",
              )}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-[#2FB3B0] via-[#8CBF6C] to-[#F0B429] px-3 py-1 text-xs font-semibold text-white">
                  Best value
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className={cn("text-sm", p.highlight ? "text-white/70" : "text-muted")}>{p.blurb}</p>
              <p className="mt-4 flex items-end gap-1.5">
                <span className="text-4xl leading-none font-semibold">{p.id === "trial" ? "Free" : `${CURRENCY}${p.price.toLocaleString()}`}</span>
                <span className={cn("pb-1 text-sm", p.highlight ? "text-white/70" : "text-muted")}>{p.period}</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={cn("mt-0.5 size-4 shrink-0", p.highlight ? "text-mint" : "text-mint-deep")} strokeWidth={3} />
                    {f}
                  </li>
                ))}
              </ul>
              <motion.button
                whileTap={disabled ? undefined : { scale: 0.97 }}
                transition={snappy}
                disabled={disabled || busy}
                onClick={() => choose(p.id)}
                className={cn("mt-6 h-12 rounded-2xl font-medium disabled:cursor-not-allowed", p.highlight ? "bg-white text-ink" : "bg-ink text-white")}
              >
                {disabled ? "Trial already used" : p.id === "trial" ? "Start free trial" : `Pay with GCash`}
              </motion.button>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-3">
        <ErrorNote message={error} />
      </div>
    </>
  );
}

/** Full-screen plan page: shown to new teachers and when a trial/plan has ended. */
export function PlanPage({ sub, reason, onDone }: { sub: Subscription | null; reason: "new" | "trial_ended" | "plan_ended"; onDone: () => void }) {
  const { signOut } = useAuth();
  const title =
    reason === "new" ? "Choose your plan" : reason === "trial_ended" ? "Your free trial has ended" : "Your plan has ended";
  const text =
    reason === "new"
      ? "Start with a free week — no card needed. You can upgrade anytime."
      : `It ended on ${sub ? fmtDate(sub.current_period_end) : "—"}. Choose a plan to keep using EduLink. Your classes and students are safe.`;

  return (
    <div className="min-h-dvh overflow-y-auto bg-canvas px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <Logo size={36} />
            <span className="text-xl font-medium text-[#3b3b3b]">EduLink</span>
          </span>
          <button onClick={signOut} className="flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-muted hover:bg-white hover:text-ink">
            <LogOut className="size-4" /> Log out
          </button>
        </div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mx-auto mt-10 max-w-2xl text-center">
          <Sparkles className="mx-auto size-8 text-lilac-deep" />
          <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-ink-2">{text}</p>
        </motion.div>
        <div className="mt-10">
          <PlanCards sub={sub} onDone={onDone} />
        </div>
        <div className="mt-8 text-center">
          <Credit />
        </div>
      </div>
    </div>
  );
}

/** DEMO GCash checkout — no money is charged. Swap for a real gateway later. */
export function GcashCheckout({ plan, onPaid }: { plan: "monthly" | "yearly"; onPaid: () => void }) {
  const { closeSheet } = useUI();
  const p = PLANS.find((x) => x.id === plan)!;
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Subscription | null>(null);
  const digits = number.replace(/\D/g, "");
  const valid = /^(09\d{9}|639\d{9})$/.test(digits);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const sub = await payDemo(plan, digits);
      setDone(sub);
    } catch (e) {
      setError(msg(e));
      setBusy(false);
    }
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 14 }}
          className="mx-auto grid size-20 place-items-center rounded-full bg-mint"
        >
          <Check className="size-10 text-mint-deep" strokeWidth={3} />
        </motion.div>
        <p className="mt-4 text-xl font-semibold">Payment received</p>
        <p className="mt-1 text-sm text-muted">
          {p.name} plan active until {fmtDate(done.current_period_end)}.
        </p>
        <p className="mt-3 inline-block rounded-full bg-soft px-3 py-1 font-mono text-xs">{done.last_payment?.reference}</p>
        <p className="mt-1 text-[11px] text-muted">Demo payment — no money was charged.</p>
        <PrimaryButton
          className="mt-6 w-full"
          onClick={() => {
            closeSheet();
            onPaid();
          }}
        >
          Continue to EduLink
        </PrimaryButton>
      </motion.div>
    );
  }

  return (
    <form
      className="space-y-5 pt-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !busy) pay();
      }}
    >
      <SheetHeader title="Pay with GCash" subtitle={`${p.name} plan`} />
      <div className="flex items-center justify-between rounded-[22px] bg-[#e8f1ff] p-4">
        <span className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#0a5bd8] text-white">
            <Smartphone className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-[#0a3f99]">GCash</span>
            <span className="block text-xs text-[#0a3f99]/70">{p.period === "per year" ? "1 year" : "1 month"} of EduLink</span>
          </span>
        </span>
        <span className="text-2xl font-semibold text-[#0a3f99]">
          {CURRENCY}
          {p.price.toLocaleString()}
        </span>
      </div>
      <Field label="GCash mobile number">
        <input
          autoFocus
          value={number}
          onChange={(e) => setNumber(e.target.value.replace(/[^\d+ ]/g, ""))}
          inputMode="tel"
          autoComplete="tel"
          placeholder="09XX XXX XXXX"
          className={`${inputCls} font-mono tracking-wide`}
        />
      </Field>
      <p className="flex items-start gap-2 rounded-2xl bg-peach/50 p-3 text-xs text-peach-deep">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        Demo checkout: no money is charged and no GCash login is needed. Real GCash payments will be connected later.
      </p>
      <ErrorNote message={error} />
      <PrimaryButton type="submit" className="w-full bg-[#0a5bd8]" disabled={!valid} loading={busy}>
        Pay {CURRENCY}
        {p.price.toLocaleString()}
      </PrimaryButton>
    </form>
  );
}

/** Current plan summary with an Upgrade / Change plan button (Profile page). */
export function PlanCard() {
  const { openSheet, closeSheet, dataVersion, bumpData } = useUI();
  const q = useQuery(() => getSubscription(), [dataVersion]);
  const sub = q.data ?? null;
  if (q.error || q.data === undefined) return null;
  const a = access(sub);

  return (
    <div className="w-full rounded-[22px] bg-soft p-4 text-left">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Your plan</p>
          <p className="mt-0.5 text-lg font-semibold">{sub ? PLAN_LABEL[sub.plan] : "No plan"}</p>
          <p className="text-sm text-muted">
            {sub
              ? a.ok
                ? `${a.daysLeft} day${a.daysLeft === 1 ? "" : "s"} left · until ${fmtDate(sub.current_period_end)}`
                : `Ended ${fmtDate(sub.current_period_end)}`
              : "—"}
          </p>
          {sub?.last_payment && (
            <p className="mt-1 text-xs text-muted">
              Last payment: GCash {sub.last_payment.number} · {CURRENCY}
              {sub.last_payment.amount.toLocaleString()} · {sub.last_payment.reference}
            </p>
          )}
        </div>
        <PrimaryButton
          className="shrink-0"
          onClick={() =>
            openSheet(
              <div className="pt-1">
                <SheetHeader title={sub?.plan === "trial" ? "Upgrade your plan" : "Change plan"} />
                <PlanCards
                  sub={sub}
                  onDone={() => {
                    closeSheet();
                    bumpData();
                  }}
                />
              </div>,
            )
          }
        >
          {sub?.plan === "trial" ? "Upgrade" : "Change"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/** Small trial countdown for the sidebar. */
export function TrialBadge({ onClick }: { onClick: () => void }) {
  const { dataVersion } = useUI();
  const q = useQuery(() => getSubscription(), [dataVersion]);
  const sub = q.data ?? null;
  if (!sub || sub.plan !== "trial") return null;
  const a = access(sub);
  if (!a.ok) return null;
  return (
    <button
      onClick={onClick}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2FB3B0]/15 to-[#F0B429]/20 px-3 py-2 text-left text-xs font-medium text-ink-2 transition-colors hover:from-[#2FB3B0]/25 xl:justify-between"
      title={`Free trial: ${a.daysLeft} days left`}
    >
      <span className="hidden xl:inline">
        Trial · {a.daysLeft} day{a.daysLeft === 1 ? "" : "s"} left
      </span>
      <span className="xl:hidden">{a.daysLeft}d</span>
      <span className="hidden font-semibold text-lilac-deep xl:inline">Upgrade</span>
    </button>
  );
}
