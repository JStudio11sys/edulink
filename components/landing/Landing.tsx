"use client";

import {
  ArrowRight,
  BookOpenCheck,
  Camera,
  Check,
  ChevronDown,
  ClipboardCheck,
  Layers,
  Lock,
  Menu,
  PenLine,
  ScanText,
  Smartphone,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { snappy, spring } from "@/lib/motion";
import { CURRENCY, PLANS, SCHOOL_PLANS } from "@/lib/pricing";
import { useUI } from "@/lib/store";
import { SchoolBooking } from "./SchoolBooking";
import { Logo } from "../Logo";
import { Credit } from "../Credit";

/** Public landing page (signed-out visitors). "Log in" / "Start free trial" go to the auth screens. */
export function Landing({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <TopBar onLogin={onLogin} onSignup={onSignup} />
      <main>
        <Hero onLogin={onLogin} onSignup={onSignup} />
        <Features />
        <HowItWorks />
        <Pricing onSignup={onSignup} />
        <Faq />
        <FinalCta onSignup={onSignup} />
      </main>
      <Footer onLogin={onLogin} />
    </div>
  );
}

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/* ---------------- Top bar ---------------- */
function TopBar({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        scrolled ? "bg-canvas/80 shadow-[0_1px_0_rgba(0,0,0,0.05)] backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5 lg:h-20">
        <a href="#top" className="flex items-center gap-2.5" aria-label="EduLink home">
          <Logo size={36} />
          <span className="text-xl font-medium tracking-tight text-[#3b3b3b]">EduLink</span>
        </a>
        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="rounded-full px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-white">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <button onClick={onLogin} className="h-11 rounded-full px-5 text-sm font-medium hover:bg-white">
            Log in
          </button>
          <motion.button whileTap={{ scale: 0.96 }} transition={snappy} onClick={onSignup} className="h-11 rounded-full bg-ink px-5 text-sm font-medium text-white">
            Start free trial
          </motion.button>
        </div>
        <button
          onClick={() => setMenu(true)}
          className="ml-auto grid size-11 place-items-center rounded-full bg-white ring-1 ring-line lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menu && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={() => setMenu(false)} />
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="absolute inset-x-0 top-0 rounded-b-[30px] bg-white px-5 pt-4 pb-6 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5">
                  <Logo size={34} />
                  <span className="text-lg font-medium text-[#3b3b3b]">EduLink</span>
                </span>
                <button onClick={() => setMenu(false)} className="grid size-11 place-items-center rounded-full bg-soft" aria-label="Close menu">
                  <X className="size-5" />
                </button>
              </div>
              <nav className="mt-4 flex flex-col">
                {NAV.map((n) => (
                  <a key={n.href} href={n.href} onClick={() => setMenu(false)} className="flex min-h-14 items-center border-b border-line text-lg font-medium last:border-0">
                    {n.label}
                  </a>
                ))}
              </nav>
              <div className="mt-5 grid gap-2">
                <button onClick={() => { setMenu(false); onSignup(); }} className="h-12 rounded-2xl bg-ink font-medium text-white">
                  Start free trial
                </button>
                <button onClick={() => { setMenu(false); onLogin(); }} className="h-12 rounded-2xl bg-soft font-medium">
                  Log in
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ---------------- Hero ---------------- */
function Hero({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const { scrollY } = useScroll();
  const floatY = useTransform(scrollY, [0, 500], [0, -60]);

  return (
    <section id="top" className="relative overflow-clip">
      {/* soft colour blobs */}
      <motion.div aria-hidden className="pointer-events-none absolute -top-40 -left-32 size-[520px] rounded-full bg-lilac/30 blur-3xl" animate={{ x: [0, 40, 0], y: [0, 20, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div aria-hidden className="pointer-events-none absolute top-40 -right-40 size-[520px] rounded-full bg-mint/40 blur-3xl" animate={{ x: [0, -40, 0], y: [0, -20, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-16 lg:pb-28">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.05 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-lilac-deep ring-1 ring-line"
          >
            <Sparkles className="size-3.5" /> AI checking for handwritten work
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.12 }}
            className="mt-5 text-[40px] leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-[64px]"
          >
            Grade handwritten papers in <span className="bg-gradient-to-r from-[#2FB3B0] via-[#8CBF6C] to-[#F0B429] bg-clip-text text-transparent">minutes</span>, not hours.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.2 }}
            className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2"
          >
            Snap your students&apos; test papers. EduLink reads the handwriting, checks it against your answer key and suggests rubric
            scores for essays — you review and confirm. Then generate and download your E-Class Record with every score filled in
            automatically. No more manual encoding.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.28 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <motion.button whileTap={{ scale: 0.97 }} transition={snappy} onClick={onSignup} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-ink px-7 font-medium text-white shadow-[0_18px_40px_-16px_rgba(22,22,26,0.6)]">
              Start your 7-day free trial <ArrowRight className="size-4" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} transition={snappy} onClick={onLogin} className="h-14 rounded-2xl bg-white px-7 font-medium ring-1 ring-line hover:bg-soft">
              Log in
            </motion.button>
          </motion.div>
          <p className="mt-4 text-sm text-muted">No card needed · Works on phone, tablet and computer</p>
        </div>

        <motion.div style={{ y: floatY }}>
          <HeroDemo />
        </motion.div>
      </div>
    </section>
  );
}

/** Animated story: snap a paper on a phone → transcribe → AI score → class record. Loops. */
const SCENES = [
  { id: "snap", label: "Snap", ms: 3000 },
  { id: "read", label: "Read", ms: 3400 },
  { id: "score", label: "Score", ms: 4800 },
  { id: "record", label: "Record", ms: 4600 },
] as const;
type SceneId = (typeof SCENES)[number]["id"];

const DEMO_ANSWERS = ["T", "F", "T", "F", "F", "F", "T", "T", "T", "T"];
const DEMO_KEY = ["T", "F", "T", "T", "F", "F", "T", "F", "T", "T"];

function HeroDemo() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setI((n) => (n + 1) % SCENES.length), SCENES[i].ms);
    return () => clearTimeout(t);
  }, [i]);
  const scene: SceneId = SCENES[i].id;

  return (
    <div className="relative mx-auto max-w-md lg:max-w-none">
      {/* Step chips */}
      <div className="mb-4 flex justify-center gap-1.5 lg:justify-start">
        {SCENES.map((s, k) => (
          <button
            key={s.id}
            onClick={() => setI(k)}
            className={cn(
              "relative flex h-9 items-center gap-1.5 overflow-hidden rounded-full px-3 text-xs font-semibold transition-colors",
              k === i ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line",
            )}
          >
            {k === i && (
              <motion.span
                key={`bar-${i}`}
                className="absolute inset-y-0 left-0 bg-white/15"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: s.ms / 1000, ease: "linear" }}
              />
            )}
            <span className="relative">{k + 1}</span>
            <span className="relative">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="relative h-[420px] sm:h-[440px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.94, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.03, filter: "blur(8px)" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {scene === "snap" && <SnapScene />}
            {scene === "read" && <ReadScene />}
            {scene === "score" && <ScoreScene />}
            {scene === "record" && <RecordScene />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Handwritten paper (used in the phone and the score scene). */
function DemoPaper({ small = false, marks = 0 }: { small?: boolean; marks?: number }) {
  return (
    <div className={cn("rounded-[18px] bg-[#fffdf6] ring-1 ring-black/5", small ? "p-3" : "p-6")}>
      <p className={cn("font-[cursive] text-[#c0392b]", small ? "text-sm" : "text-xl")}>Pedro Penduko</p>
      <div className={cn("grid grid-cols-2", small ? "mt-2 gap-x-4 gap-y-1" : "mt-4 gap-x-8 gap-y-2.5")}>
        {DEMO_ANSWERS.map((a, k) => (
          <div key={k} className={cn("flex items-center gap-2 border-b border-[#e8e2cf]", small ? "pb-0.5" : "pb-1")}>
            <span className={cn("font-[cursive] text-[#c0392b]", small ? "text-xs" : "text-lg")}>
              {k + 1}. {a}
            </span>
            <AnimatePresence>
              {k < marks && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={snappy} className="ml-auto">
                  {a === DEMO_KEY[k] ? (
                    <Check className="size-5 text-mint-deep" strokeWidth={3} />
                  ) : (
                    <X className="size-5 text-red-500" strokeWidth={3} />
                  )}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-[400px] w-[214px] rounded-[42px] bg-ink p-2 shadow-[0_40px_80px_-30px_rgba(20,20,40,0.5)] sm:h-[420px] sm:w-[224px]">
      <div className="absolute top-3 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
      <div className="relative h-full overflow-hidden rounded-[34px]">{children}</div>
    </div>
  );
}

/* 1 — Snap the paper with the phone camera */
function SnapScene() {
  return (
    <div className="relative">
      <Phone>
        <div className="absolute inset-0 bg-[#2a2a30]">
          <motion.div
            className="absolute inset-x-5 top-16"
            initial={{ rotate: -4, scale: 1.08 }}
            animate={{ rotate: -1, scale: 1 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <DemoPaper small />
          </motion.div>
          {/* frame guides */}
          <div className="absolute inset-x-3 top-12 bottom-24 rounded-2xl border-2 border-white/60" />
          <p className="absolute inset-x-0 top-[34px] text-center text-[10px] font-medium text-white/80">Page 1 — fit the paper</p>
          {/* shutter */}
          <div className="absolute inset-x-0 bottom-6 flex justify-center">
            <motion.span
              className="grid size-14 place-items-center rounded-full border-4 border-white"
              animate={{ scale: [1, 1, 0.82, 1] }}
              transition={{ duration: 0.5, delay: 1.5, times: [0, 0.3, 0.6, 1] }}
            >
              <span className="size-10 rounded-full bg-white" />
            </motion.span>
          </div>
          {/* flash */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0.95, 0] }}
            transition={{ duration: 0.8, delay: 1.6, times: [0, 0.05, 0.25, 1] }}
          />
        </div>
      </Phone>
      <FloatChip delay={0.4} className="-top-3 -left-6">
        <Camera className="size-4 text-lilac-deep" /> Snap with your phone
      </FloatChip>
    </div>
  );
}

/* 2 — Transcribe the handwriting */
function ReadScene() {
  const lines = ["Pedro Penduko", ...DEMO_ANSWERS.map((a, k) => `${k + 1}. ${a}`)];
  return (
    <div className="relative">
      <Phone>
        <div className="absolute inset-0 flex flex-col bg-white px-3 pt-10">
          <div className="relative overflow-hidden rounded-xl">
            <div className="origin-top scale-[0.85]">
              <DemoPaper small />
            </div>
            <motion.div
              className="pointer-events-none absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-lilac/50 to-transparent"
              animate={{ top: ["-20%", "100%"] }}
              transition={{ duration: 1.3, repeat: 1, ease: "easeInOut" }}
            />
          </div>
          <p className="mt-2 flex items-center gap-1 text-[9px] font-semibold tracking-wide text-muted uppercase">
            <ScanText className="size-3" /> Transcribed text
          </p>
          <div className="mt-1 flex-1 rounded-xl bg-soft p-2 font-mono text-[10px] leading-[1.45]">
            {lines.map((l, k) => (
              <motion.p key={k} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + k * 0.17, duration: 0.25 }}>
                {l}
              </motion.p>
            ))}
          </div>
        </div>
      </Phone>
      <FloatChip delay={0.3} className="-top-3 -right-6">
        <ScanText className="size-4 text-lilac-deep" /> Handwriting read in seconds
      </FloatChip>
    </div>
  );
}

/* 3 — AI scoring against the key */
function ScoreScene() {
  const [marks, setMarks] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMarks((n) => Math.min(n + 1, DEMO_ANSWERS.length)), 330);
    return () => clearInterval(t);
  }, []);
  const score = DEMO_ANSWERS.slice(0, marks).filter((a, k) => a === DEMO_KEY[k]).length;

  return (
    <div className="relative w-full max-w-[460px]">
      <div className="-rotate-2">
        <div className="shadow-[0_40px_80px_-30px_rgba(20,20,40,0.35)]">
          <DemoPaper marks={marks} />
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ...spring, delay: 0.3 }}
        className="absolute -right-2 -bottom-8 w-52 rounded-[24px] bg-white p-4 shadow-[0_30px_60px_-24px_rgba(20,20,40,0.35)] ring-1 ring-black/5 sm:-right-6"
      >
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <Sparkles className="size-3.5 text-lilac-deep" /> AI score
        </p>
        <div className="mt-1 flex items-end gap-1.5">
          <motion.span key={score} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={snappy} className="text-4xl leading-none font-semibold tabular-nums">
            {score}
          </motion.span>
          <span className="pb-1 text-muted">/ 10</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-soft">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-[#2FB3B0] to-[#8CBF6C]" animate={{ width: `${score * 10}%` }} transition={spring} />
        </div>
        <p className="mt-2 text-[11px] text-muted">{marks < DEMO_ANSWERS.length ? "Checking against your key…" : "Ready for you to confirm ✓"}</p>
      </motion.div>
    </div>
  );
}

/* 4 — Class record fills in */
const RECORD = [
  { name: "Cruz, Ana", ww: 9, pt: 18, st: 27 },
  { name: "Reyes, Bea", ww: 8, pt: 19, st: 25 },
  { name: "Dela Cruz, Carla", ww: 10, pt: 17, st: 28 },
  { name: "Penduko, Pedro", ww: 7, pt: 16, st: 24, me: true },
  { name: "Santos, Miguel", ww: 8, pt: 18, st: 26 },
];

function RecordScene() {
  return (
    <div className="relative w-full max-w-[480px]">
      <div className="overflow-hidden rounded-[26px] bg-white shadow-[0_40px_80px_-30px_rgba(20,20,40,0.35)] ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-sm font-semibold">Class record</p>
            <p className="text-xs text-muted">English 7 · Grade 7 – Bethany</p>
          </div>
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring, delay: 2.6 }}
            className="flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-[11px] font-semibold text-mint-deep"
          >
            <Check className="size-3.5" strokeWidth={3} /> Updated
          </motion.span>
        </div>
        <div className="grid grid-cols-[1.6fr_repeat(3,1fr)] gap-2 px-5 pt-3 pb-1 text-[10px] font-semibold tracking-wide text-muted uppercase">
          <span>Student</span>
          <span className="text-center">WW · 10</span>
          <span className="text-center">PT · 20</span>
          <span className="text-center">ST · 30</span>
        </div>
        <div className="px-3 pb-3">
          {RECORD.map((r, k) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.2 + k * 0.12 }}
              className={cn("grid grid-cols-[1.6fr_repeat(3,1fr)] items-center gap-2 rounded-xl px-2 py-2 text-sm", r.me && "bg-lilac-soft")}
            >
              <span className={cn("truncate", r.me && "font-semibold")}>{r.name}</span>
              {[r.ww, r.pt, r.st].map((v, c) => (
                <motion.span
                  key={c}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...snappy, delay: r.me && c === 0 ? 1.9 : 0.6 + k * 0.12 + c * 0.08 }}
                  className={cn(
                    "mx-auto grid h-7 w-10 place-items-center rounded-lg text-center font-semibold tabular-nums",
                    r.me && c === 0 ? "bg-ink text-white" : "bg-soft",
                  )}
                >
                  {v}
                </motion.span>
              ))}
            </motion.div>
          ))}
        </div>
      </div>
      <FloatChip delay={1.9} className="-right-4 -bottom-5">
        <ClipboardCheck className="size-4 text-lilac-deep" /> Pedro&apos;s 7/10 added
      </FloatChip>
    </div>
  );
}

function FloatChip({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: [0, -5, 0] }}
      transition={{ opacity: { delay }, y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay } }}
      className={cn("absolute flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-medium whitespace-nowrap shadow-lg ring-1 ring-black/5", className)}
    >
      {children}
    </motion.div>
  );
}

/* ---------------- Reveal helper ---------------- */
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 160, damping: 24, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold tracking-wide text-lilac-deep uppercase">{eyebrow}</p>
      <h2 className="mt-2 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-3 text-lg text-ink-2">{text}</p>}
    </Reveal>
  );
}

/* ---------------- Features ---------------- */
const FEATURES: { icon: LucideIcon; title: string; text: string; tone: string }[] = [
  { icon: Camera, title: "Snap every page", text: "Take photos of each page in order — or upload them. Works with your phone's camera.", tone: "bg-sky" },
  { icon: ScanText, title: "Reads handwriting", text: "AI turns messy handwriting into text, word for word, without correcting the student.", tone: "bg-lilac-soft" },
  { icon: ClipboardCheck, title: "Auto-scores with your key", text: "True/False, Multiple choice and Matching are checked against your private answer key.", tone: "bg-mint" },
  { icon: PenLine, title: "Essay rubric suggestions", text: "Suggested points per rubric criterion with a reason — you adjust and confirm.", tone: "bg-peach" },
  { icon: Layers, title: "Organised your way", text: "Sections, subjects and the four categories: Written Work, Performance Task, Summative, Assessment.", tone: "bg-lilac-soft" },
  { icon: Users, title: "Face-to-face or at home", text: "Capture papers yourself in class, or let students submit photos of their homework.", tone: "bg-mint" },
  { icon: Smartphone, title: "A student app", text: "Students see their to-dos, submit work and read your feedback — on any phone.", tone: "bg-sky" },
  { icon: Lock, title: "Private by design", text: "Answer keys and scores are visible to you only. Students see your feedback, never the key.", tone: "bg-peach" },
];

function Features() {
  return (
    <section id="features" className="scroll-mt-20 px-5 py-20 lg:py-28">
      <SectionTitle eyebrow="Features" title="Everything you need to check papers fast" text="From the photo of a test paper to a confirmed score — in one place." />
      <div className="mx-auto mt-12 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 4) * 0.06}>
            <motion.div whileHover={{ y: -4 }} transition={snappy} className="h-full rounded-[26px] bg-white p-6">
              <span className={cn("grid size-12 place-items-center rounded-2xl", f.tone)}>
                <f.icon className="size-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{f.text}</p>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */
const STEPS = [
  { title: "Create the activity", text: "Pick the section, category and test parts. Add your answer key and essay rubric." },
  { title: "Capture the papers", text: "Snap each student's pages in class — or students submit their own from home." },
  { title: "Review the AI score", text: "See every item marked ✓ or ✗ and suggested essay points. Tap to fix anything." },
  { title: "Confirm & give feedback", text: "Confirm the score, add a comment and mark it Checked. Done." },
];

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 bg-white px-5 py-20 lg:py-28">
      <SectionTitle eyebrow="How it works" title="Four steps. That's it." />
      <div className="mx-auto mt-12 grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.08}>
            <div className="relative h-full rounded-[26px] bg-canvas p-6">
              <span className="grid size-11 place-items-center rounded-2xl bg-ink text-lg font-semibold text-white">{i + 1}</span>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{s.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Pricing ---------------- */
function Pricing({ onSignup }: { onSignup: () => void }) {
  const [edition, setEdition] = useState<"teacher" | "school">("teacher");
  const { openSheet } = useUI();
  // School Edition books a call (no sign-up); individual plans go to teacher sign-up
  const choose = (id: string, name: string) =>
    id === "school" || id === "school-premium" ? openSheet(<SchoolBooking plan={id} planName={name} />) : onSignup();
  const plans = edition === "teacher" ? PLANS : SCHOOL_PLANS;
  return (
    <section id="pricing" className="scroll-mt-20 px-5 py-20 lg:py-28">
      <SectionTitle
        eyebrow="Pricing"
        title={edition === "teacher" ? "Simple pricing for teachers" : "School Edition"}
        text={
          edition === "teacher"
            ? "For individual teachers. Start with a free week. Keep going monthly or save with a yearly plan."
            : "One package for your whole school. Your admin creates and manages every teacher and student account."
        }
      />
      {/* Individual / School Edition switch */}
      <div className="mt-8 flex justify-center">
        <div className="flex rounded-full bg-white p-1 ring-1 ring-line">
          {(
            [
              { id: "teacher", label: "Individual" },
              { id: "school", label: "School Edition" },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setEdition(o.id)}
              className={cn(
                "relative h-11 rounded-full px-5 text-sm font-medium transition-colors",
                edition === o.id ? "text-white" : "text-ink-2 hover:text-ink",
              )}
            >
              {edition === o.id && <motion.span layoutId="pricing-edition" transition={spring} className="absolute inset-0 rounded-full bg-ink" />}
              <span className="relative">{o.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div
        key={edition}
        className={cn("mx-auto mt-10 grid gap-4", edition === "teacher" ? "max-w-5xl lg:grid-cols-3" : "max-w-3xl lg:grid-cols-2")}
      >
        {plans.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.08}>
            <div
              className={cn(
                "relative flex h-full flex-col rounded-[28px] p-7",
                p.highlight ? "bg-ink text-white shadow-[0_40px_80px_-40px_rgba(22,22,26,0.7)]" : "bg-white",
              )}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-[#2FB3B0] via-[#8CBF6C] to-[#F0B429] px-3 py-1 text-xs font-semibold text-white">
                  {edition === "teacher" ? "Best value" : "For big schools"}
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className={cn("mt-1 text-sm", p.highlight ? "text-white/70" : "text-muted")}>{p.blurb}</p>
              <p className="mt-6 flex items-end gap-1.5">
                <span className="text-5xl leading-none font-semibold tracking-tight">
                  {p.id === "trial" ? "Free" : `${CURRENCY}${p.price.toLocaleString()}`}
                </span>
                <span className={cn("pb-1 text-sm", p.highlight ? "text-white/70" : "text-muted")}>{p.period}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[15px]">
                    <Check className={cn("mt-0.5 size-4 shrink-0", p.highlight ? "text-mint" : "text-mint-deep")} strokeWidth={3} />
                    {f}
                  </li>
                ))}
              </ul>
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={snappy}
                onClick={() => choose(p.id, p.name)}
                className={cn("mt-8 h-12 rounded-2xl font-medium", p.highlight ? "bg-white text-ink" : "bg-ink text-white")}
              >
                {p.cta}
              </motion.button>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
const FAQS = [
  { q: "Does it work with messy handwriting?", a: "Yes. The AI reads handwriting word for word, and marks anything unreadable so you can fix it. You always see the photo next to the text." },
  { q: "Do my students need accounts?", a: "Only for at-home work. You create their logins (username and password) in seconds. Face-to-face tests don't need student accounts at all — you capture the papers." },
  { q: "Can students see the answer key or scores?", a: "No. Answer keys and scores are stored privately for you. Students only see the test outline, your comments and the Checked mark." },
  { q: "What if the AI gets something wrong?", a: "Nothing is final until you confirm. Tap any item to flip ✓/✗, adjust essay points, or ask it to check again." },
  { q: "Which test types are supported?", a: "True/False, Multiple choice, Matching type and Essays with rubrics — mix them in one test. Activities without a test (like drawings or projects) work too." },
  { q: "Do I need a computer?", a: "No. EduLink works on phones, tablets and computers. Many teachers capture papers with their phone and review on a laptop." },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-20 bg-white px-5 py-20 lg:py-28">
      <SectionTitle eyebrow="FAQ" title="Questions teachers ask" />
      <div className="mx-auto mt-10 max-w-3xl space-y-2.5">
        {FAQS.map((f, i) => {
          const on = open === i;
          return (
            <Reveal key={f.q} delay={i * 0.04}>
              <div className="overflow-hidden rounded-[22px] bg-canvas">
                <button onClick={() => setOpen(on ? null : i)} className="flex min-h-16 w-full items-center justify-between gap-4 px-6 text-left">
                  <span className="text-[16px] font-semibold">{f.q}</span>
                  <motion.span animate={{ rotate: on ? 180 : 0 }} transition={spring}>
                    <ChevronDown className="size-5 text-muted" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
                      <p className="px-6 pb-5 text-[15px] leading-relaxed text-ink-2">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Final CTA + footer ---------------- */
function FinalCta({ onSignup }: { onSignup: () => void }) {
  return (
    <section className="px-5 py-20 lg:py-28">
      <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[36px] bg-ink px-6 py-14 text-center text-white sm:px-12">
        <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-[#2FB3B0]/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-[#F0B429]/30 blur-3xl" />
        <BookOpenCheck className="relative mx-auto size-10 text-mint" />
        <h2 className="relative mt-4 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">Get your weekends back.</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-lg text-white/75">Try EduLink free for 7 days with your real classes.</p>
        <motion.button whileTap={{ scale: 0.97 }} transition={snappy} onClick={onSignup} className="relative mt-8 inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-7 font-medium text-ink">
          Start free trial <ArrowRight className="size-4" />
        </motion.button>
      </Reveal>
    </section>
  );
}

function Footer({ onLogin }: { onLogin: () => void }) {
  return (
    <footer className="border-t border-line px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <span className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="font-medium text-[#3b3b3b]">EduLink</span>
        </span>
        <div className="flex flex-wrap items-center justify-center gap-1 text-sm text-muted">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="rounded-full px-3 py-2 hover:text-ink">
              {n.label}
            </a>
          ))}
          <button onClick={onLogin} className="rounded-full px-3 py-2 hover:text-ink">
            Log in
          </button>
        </div>
        <div className="flex flex-col items-center gap-0 sm:items-end">
          <p className="text-xs text-muted">© {new Date().getFullYear()} EduLink</p>
          <Credit />
        </div>
      </div>
    </footer>
  );
}
