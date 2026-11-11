"use client";

import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { snappy, softSpring, spring } from "@/lib/motion";
import type { NoteColor, Status } from "@/lib/data";

/* ---------- Avatar ---------- */
const AVATAR_COLORS = [
  ["#fde2e4", "#9d3b4a"],
  ["#e2f0cb", "#47702a"],
  ["#dcebff", "#2b5ba8"],
  ["#ffe8c7", "#9a5b00"],
  ["#ece8fe", "#5a47c9"],
];

export function Avatar({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  const initials = name
    .replace(/^(Mrs?|Ms)\.\s*/, "")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  const [bg, fg] = AVATAR_COLORS[idx];
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full font-semibold", className)}
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

/* ---------- Icon button ---------- */
type IconButtonProps = HTMLMotionProps<"button"> & { variant?: "white" | "lilac" | "ink" | "soft"; size?: number };

export function IconButton({ variant = "white", size = 40, className, children, ...rest }: IconButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.05 }}
      transition={snappy}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full transition-colors",
        variant === "white" && "bg-white text-ink ring-1 ring-line hover:bg-soft",
        variant === "lilac" && "bg-lilac text-white hover:bg-lilac-deep",
        variant === "ink" && "bg-ink text-white",
        variant === "soft" && "bg-soft text-ink hover:bg-line",
        className,
      )}
      style={{ width: size, height: size }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/* ---------- Segmented control with sliding pill ---------- */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  size = "sm",
  grow,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  layoutId: string;
  size?: "sm" | "md";
  grow?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("no-scrollbar isolate flex gap-1.5 overflow-x-auto", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <motion.button
            key={o.value}
            onClick={() => onChange(o.value)}
            whileTap={{ scale: 0.94 }}
            transition={snappy}
            className={cn(
              "relative shrink-0 rounded-full font-medium transition-colors duration-200",
              size === "sm" ? "px-3.5 py-1.5 text-[13px]" : "px-4 py-2 text-sm",
              size === "md" && !active && "ring-1 ring-line ring-inset bg-white",
              grow && "flex-1",
              active ? "text-white" : "text-ink-2 hover:bg-soft",
            )}
          >
            {active && (
              <motion.span layoutId={layoutId} className="absolute inset-0 rounded-full bg-ink" transition={spring} />
            )}
            <span className="relative z-10 whitespace-nowrap">{o.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ---------- Status pill ---------- */
const STATUS: Record<Status, { label: string; cls: string }> = {
  todo: { label: "To do", cls: "bg-lilac text-white" },
  progress: { label: "In progress", cls: "bg-peach text-peach-deep" },
  done: { label: "Done", cls: "bg-mint text-mint-deep" },
};
export const STATUS_LABEL = (s: Status) => STATUS[s].label;

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={status}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.7 }}
        transition={snappy}
        className={cn(
          "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
          STATUS[status].cls,
          className,
        )}
      >
        {STATUS[status].label}
      </motion.span>
    </AnimatePresence>
  );
}

/* ---------- Progress bar (filled + striped remainder) ---------- */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("flex h-3.5 w-full gap-1", className)}>
      <motion.div
        className="rounded-full bg-mint ring-1 ring-inset ring-mint-deep/25"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={softSpring}
      />
      {value < 100 && <div className="stripes flex-1 rounded-full ring-1 ring-inset ring-line" />}
    </div>
  );
}

/* ---------- Note color helpers ---------- */
export const NOTE_BG: Record<NoteColor, string> = {
  mint: "bg-mint",
  lilac: "bg-lilac",
  peach: "bg-peach",
  sky: "bg-sky",
};

/* ---------- Card ---------- */
export function Card({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...softSpring, delay }}
      className={cn("flex min-h-0 flex-col rounded-card bg-white p-5", className)}
    >
      {children}
    </motion.section>
  );
}

/* ---------- Popover ---------- */
export function Popover({
  trigger,
  children,
  align = "right",
  className,
}: {
  trigger: (p: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", open && "z-50")}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -8, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, y: -4, filter: "blur(2px)", transition: { duration: 0.15 } }}
            transition={snappy}
            style={{ transformOrigin: align === "right" ? "top right" : "top left" }}
            className={cn(
              "absolute top-full z-40 mt-2 rounded-[20px] bg-white p-2 shadow-[0_24px_60px_-16px_rgba(20,20,40,0.3)] ring-1 ring-black/5",
              align === "right" ? "right-0" : "left-0",
              className,
            )}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuItem({ children, onClick, danger }: { children: ReactNode; onClick?: () => void; danger?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-soft",
        danger && "text-red-500",
      )}
    >
      {children}
    </motion.button>
  );
}
