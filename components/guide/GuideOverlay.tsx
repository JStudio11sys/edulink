"use client";

import { Camera, ChevronLeft, ScanText, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GUIDE_STEPS, useGuide } from "@/lib/guide";
import { spring } from "@/lib/motion";
import { useIsDesktop } from "@/lib/useMedia";

type Box = { x: number; y: number; w: number; h: number };
const PAD = 8;
/** If the highlighted element can't be found this long, the guide lets go of the screen. */
const LOST_MS = 2500;

let guideCard: HTMLElement | null = null;

/** True when nothing (like an open sheet) is covering the element. */
function onTop(el: HTMLElement, r: DOMRect) {
  const cx = Math.min(Math.max(r.left + r.width / 2, 1), window.innerWidth - 1);
  const cy = Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 1);
  const hit = document.elementFromPoint(cx, cy);
  if (!hit) return true;
  return el.contains(hit) || hit.contains(el) || !!guideCard?.contains(hit);
}

/** First visible, uncovered element with this marker. */
function findTarget(name: string, checkTop = true): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-guide="${name}"]`);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (!checkTop || onTop(el, r))) return el;
  }
  return null;
}

/** Spotlight walkthrough: grays out the screen except the highlighted element, with an instruction card. */
export function GuideOverlay() {
  const guide = useGuide();
  const isDesktop = useIsDesktop();
  const [box, setBox] = useState<Box | null>(null);
  const [lost, setLost] = useState(false);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [cardH, setCardH] = useState(200);
  const [ready, setReady] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  const active = !!guide?.active;
  const index = guide?.index ?? 0;
  const step = GUIDE_STEPS[index];

  // Latest values for the listeners below
  const live = useRef({ guide, step, index, box, lost });
  live.current = { guide, step, index, box, lost };
  const advancedFor = useRef(-1);
  /** Step reached with Back: it doesn't move on by itself, it shows Next instead. */
  const manual = useRef(-1);
  useEffect(() => {
    if (manual.current !== index) manual.current = -1;
  }, [index]);

  // Track the target every frame (it may move, animate or scroll)
  useEffect(() => {
    if (!active) return;
    setBox(null);
    setLost(false);
    let raf = 0;
    let seenAt = performance.now();
    let scrolled = false;
    const tick = () => {
      setVp((v) => (v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight }));
      const s = GUIDE_STEPS[index];
      // The marker may be scrolled out of view — only check that it exists
      const ok = !s.require || !!findTarget(s.require.target, false);
      setReady((r) => (r === ok ? r : ok));

      // "appear" steps go on by themselves
      if (
        typeof s.advance === "object" &&
        advancedFor.current !== index &&
        manual.current !== index &&
        findTarget(s.advance.appear)
      ) {
        advancedFor.current = index;
        live.current.guide?.next();
        return;
      }

      const el = s.target ? findTarget(s.target) : null;
      if (el) {
        seenAt = performance.now();
        if (!scrolled) {
          scrolled = true;
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        const r = el.getBoundingClientRect();
        const x = Math.max(4, r.left - PAD);
        const y = Math.max(4, r.top - PAD);
        const w = Math.min(window.innerWidth - 4, r.right + PAD) - x;
        const h = Math.min(window.innerHeight - 4, r.bottom + PAD) - y;
        setBox((b) =>
          b && Math.abs(b.x - x) < 0.5 && Math.abs(b.y - y) < 0.5 && Math.abs(b.w - w) < 0.5 && Math.abs(b.h - h) < 0.5
            ? b
            : { x, y, w, h },
        );
        setLost(false);
      } else if (s.target) {
        setBox(null);
        if (performance.now() - seenAt > LOST_MS) setLost(true);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, index]);

  // Block taps outside the highlighted element; "click" steps go on when it's tapped
  useEffect(() => {
    if (!active) return;
    const inside = (e: Event, el: Element | null) => !!el && e.target instanceof Node && el.contains(e.target);
    const handler = (e: Event) => {
      const { step: s, index: i, box: b, lost: l, guide: g } = live.current;
      if (inside(e, cardRef.current)) return;
      if (l) return; // target missing → let the teacher move around freely
      const el = s.target ? findTarget(s.target) : null;
      if (s.target && !b) return; // target still appearing
      if (inside(e, el)) {
        if (e.type === "click" && s.advance === "click" && advancedFor.current !== i) {
          advancedFor.current = i;
          setTimeout(() => g?.next(), 0);
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };
    const types = ["pointerdown", "mousedown", "click"] as const;
    types.forEach((t) => window.addEventListener(t, handler, true));
    return () => types.forEach((t) => window.removeEventListener(t, handler, true));
  }, [active]);

  useLayoutEffect(() => {
    guideCard = cardRef.current;
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  });

  if (!guide || !active || typeof document === "undefined") return null;

  const showHole = !!step.target && !!box && !lost;
  const dimAll = !step.target;
  const cardW = Math.min(isDesktop ? 360 : 420, vp.w - 32);

  // Card position
  let pos: { left: number; top: number };
  if (showHole && box) {
    if (isDesktop) {
      const below = box.y + box.h + 14;
      const above = box.y - 14 - cardH;
      const midLeft = Math.min(Math.max(16, box.x + box.w / 2 - cardW / 2), vp.w - cardW - 16);
      const midTop = Math.min(Math.max(16, box.y + box.h / 2 - cardH / 2), vp.h - cardH - 16);
      if (below + cardH < vp.h - 16) pos = { left: midLeft, top: below };
      else if (above > 16) pos = { left: midLeft, top: above };
      else if (box.x + box.w + 14 + cardW < vp.w - 16) pos = { left: box.x + box.w + 14, top: midTop };
      else if (box.x - 14 - cardW > 16) pos = { left: box.x - 14 - cardW, top: midTop };
      // Big target: corner, so most of it stays visible (the sheet can still be scrolled)
      else pos = { left: vp.w - cardW - 16, top: vp.h - cardH - 16 };
    } else {
      const lower = box.y + box.h / 2 > vp.h / 2;
      pos = { left: (vp.w - cardW) / 2, top: lower ? 16 : vp.h - cardH - 16 };
    }
  } else if (dimAll) {
    pos = { left: (vp.w - cardW) / 2, top: Math.max(16, (vp.h - cardH) / 2) };
  } else {
    pos = { left: (vp.w - cardW) / 2, top: vp.h - cardH - 16 };
  }

  const last = guide.index === guide.total - 1;
  const showNext = step.advance === "next" || lost || (manual.current === guide.index && typeof step.advance === "object");

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[90]">
      {/* Dim layer with a hole around the target */}
      <AnimatePresence>
        {showHole && box && (
          <motion.div
            key="hole"
            initial={{ opacity: 0, x: box.x, y: box.y, width: box.w, height: box.h }}
            animate={{ opacity: 1, x: box.x, y: box.y, width: box.w, height: box.h }}
            exit={{ opacity: 0 }}
            transition={{ ...spring, opacity: { duration: 0.25 } }}
            className="absolute top-0 left-0 rounded-[20px]"
            style={{ boxShadow: "0 0 0 9999px rgba(18,18,28,0.55)" }}
          >
            <motion.span
              className="absolute inset-0 rounded-[20px] ring-2 ring-white"
              animate={{ opacity: [0.9, 0.3, 0.9], scale: [1, 1.03, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
        {dimAll && (
          <motion.div
            key="dim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[rgba(18,18,28,0.55)] backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      {/* Instruction card */}
      <motion.div
        ref={cardRef}
        className="pointer-events-auto absolute top-0 left-0 rounded-[24px] bg-white p-5 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.45)]"
        style={{ width: cardW }}
        initial={false}
        animate={{ x: pos.left, y: pos.top }}
        transition={spring}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={guide.index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-lilac-deep uppercase">Guide</span>
              <span className="text-xs text-muted tabular-nums">
                {guide.index + 1} of {guide.total}
              </span>
            </div>
            <div className="mb-3 h-1 overflow-hidden rounded-full bg-soft">
              <motion.div
                className="h-full rounded-full bg-lilac"
                animate={{ width: `${((guide.index + 1) / guide.total) * 100}%` }}
                transition={spring}
              />
            </div>
            <p className="text-[17px] leading-snug font-semibold">{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{step.text}</p>
            {step.illustration === "checking" && <CheckingSteps />}
            {!ready && step.require ? (
              <p className="mt-2 text-xs font-medium text-lilac-deep">{step.require.hint}</p>
            ) : lost ? (
              <p className="mt-2 text-xs text-muted">Can&apos;t see it? Go back to where you were, or tap Next.</p>
            ) : (
              step.advance !== "next" && <p className="mt-2 text-xs font-medium text-lilac-deep">Tap the highlighted spot to continue.</p>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-4 flex gap-2">
          {guide.index > 0 && (
            <button
              type="button"
              onClick={() => {
                manual.current = guide.index - 1;
                advancedFor.current = -1;
                guide.back();
              }}
              aria-label="Back"
              title="Back"
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-soft text-ink-2 transition-colors hover:bg-line"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          <button
            type="button"
            onClick={guide.end}
            className="h-11 flex-1 rounded-2xl bg-soft px-4 text-sm font-medium text-ink-2 transition-colors hover:bg-line"
          >
            {last ? "Close" : "Skip guide"}
          </button>
          {showNext && (
            <button
              type="button"
              disabled={!ready && !lost}
              onClick={() => {
                advancedFor.current = guide.index;
                guide.next();
              }}
              className="h-11 flex-1 rounded-2xl bg-ink px-4 text-sm font-medium text-white transition-opacity disabled:opacity-30"
            >
              {last ? "Finish" : "Next"}
            </button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

/** Photo → transcribe → score, shown after the first task is made. */
function CheckingSteps() {
  const rows = [
    {
      icon: Camera,
      tone: "bg-peach text-ink",
      title: "Take a photo",
      text: "Snap the handwritten test, e.g. items 1–10 multiple choice. Several pages are fine.",
    },
    {
      icon: ScanText,
      tone: "bg-lilac-soft text-lilac-deep",
      title: "Auto transcribe",
      text: "EduLink reads the handwriting and turns it into text.",
    },
    {
      icon: Sparkles,
      tone: "bg-mint text-mint-deep",
      title: "Auto score",
      text: "Each answer is checked against the answer key you set in this task. You review and confirm.",
    },
  ];
  return (
    <div className="mt-3 space-y-2">
      {rows.map((r, i) => (
        <motion.div
          key={r.title}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...spring, delay: 0.1 + i * 0.12 }}
          className="flex items-start gap-3 rounded-2xl bg-soft p-3"
        >
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${r.tone}`}>
            <r.icon className="size-[18px]" />
          </span>
          <span>
            <span className="block text-sm font-semibold">
              {i + 1}. {r.title}
            </span>
            <span className="block text-xs leading-relaxed text-muted">{r.text}</span>
          </span>
        </motion.div>
      ))}
    </div>
  );
}
