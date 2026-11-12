"use client";

import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { snappy, softSpring, spring } from "@/lib/motion";

/* ---------- Avatar ---------- */
const AVATAR_COLORS = [
  ["#fde2e4", "#9d3b4a"],
  ["#e2f0cb", "#47702a"],
  ["#dcebff", "#2b5ba8"],
  ["#ffe8c7", "#9a5b00"],
  ["#ece8fe", "#5a47c9"],
];

const hash = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);

export function Avatar({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  const initials = name
    .replace(/^(Mrs?|Ms)\.\s*/, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const [bg, fg] = AVATAR_COLORS[hash(name) % AVATAR_COLORS.length];
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full font-semibold", className)}
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38 }}
    >
      {initials || "?"}
    </span>
  );
}

/* ---------- Subject colors (stable per subject name) ---------- */
const SUBJECT_COLORS = [
  { chip: "bg-mint text-mint-deep", card: "bg-mint text-ink", icon: "bg-mint", accent: "text-mint-deep", dot: "bg-mint-deep" },
  { chip: "bg-lilac-soft text-lilac-deep", card: "bg-lilac text-white", icon: "bg-lilac", accent: "text-lilac-deep", dot: "bg-lilac-deep" },
  { chip: "bg-peach text-peach-deep", card: "bg-peach text-ink", icon: "bg-peach", accent: "text-peach-deep", dot: "bg-peach-deep" },
  { chip: "bg-sky text-[#1f5a8c]", card: "bg-sky text-ink", icon: "bg-sky", accent: "text-[#1f5a8c]", dot: "bg-[#1f5a8c]" },
];
export const subjectColor = (name: string) => SUBJECT_COLORS[hash(name) % SUBJECT_COLORS.length];
export const toneFor = (name: string) => subjectColor(name).chip;

export function SubjectChip({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium", toneFor(name), className)}
    >
      {name}
    </span>
  );
}

/* ---------- Pill ---------- */
export function Pill({ children, tone, className }: { children: ReactNode; tone: string; className?: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={String(children)}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.7 }}
        transition={snappy}
        className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium", tone, className)}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

/* ---------- Icon button ---------- */
type IconButtonProps = HTMLMotionProps<"button"> & { variant?: "white" | "lilac" | "ink" | "soft" | "danger"; size?: number };

export function IconButton({ variant = "white", size = 40, className, children, ...rest }: IconButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.05 }}
      transition={snappy}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full transition-colors",
        // Bigger invisible tap area on phones/tablets
        "before:absolute before:-inset-[6px] before:rounded-full before:content-[''] lg:before:hidden",
        variant === "white" && "bg-white text-ink ring-1 ring-line hover:bg-soft",
        variant === "lilac" && "bg-lilac text-white hover:bg-lilac-deep",
        variant === "ink" && "bg-ink text-white",
        variant === "soft" && "bg-soft text-ink hover:bg-line",
        variant === "danger" && "bg-red-50 text-red-500 hover:bg-red-100",
        className,
      )}
      style={{ width: size, height: size }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/* ---------- Buttons ---------- */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  variant = "ink",
  type = "button",
  className,
  guide,
}: {
  children: ReactNode;
  guide?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "ink" | "soft" | "danger" | "lilac";
  type?: "button" | "submit";
  className?: string;
}) {
  const off = disabled || loading;
  return (
    <motion.button
      data-guide={guide}
      type={type}
      whileTap={off ? undefined : { scale: 0.96 }}
      transition={snappy}
      onClick={onClick}
      disabled={off}
      className={cn(
        "flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-medium transition-[opacity,background-color] disabled:opacity-40",
        variant === "ink" && "bg-ink text-white",
        variant === "lilac" && "bg-lilac text-white hover:bg-lilac-deep",
        variant === "soft" && "bg-soft text-ink hover:bg-line",
        variant === "danger" && "bg-red-500 text-white hover:bg-red-600",
        className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </motion.button>
  );
}

/* ---------- Form bits ---------- */
export const inputCls =
  "h-12 w-full rounded-2xl bg-soft px-4 text-[15px] outline-none ring-lilac transition-shadow placeholder:text-muted focus:ring-2";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function ToggleChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-[13px] transition-colors max-lg:px-4 max-lg:py-2.5 max-lg:text-sm",
        on ? "bg-lilac text-white" : "bg-soft text-ink-2 hover:bg-line",
      )}
    >
      {children}
    </motion.button>
  );
}

export function ErrorNote({ message }: { message: string | null | undefined }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-start gap-2 overflow-hidden rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {message}
        </motion.p>
      )}
    </AnimatePresence>
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
            type="button"
            onClick={() => onChange(o.value)}
            whileTap={{ scale: 0.94 }}
            transition={snappy}
            className={cn(
              "relative shrink-0 rounded-full font-medium transition-colors duration-200",
              size === "sm" ? "px-3.5 py-1.5 text-[13px] max-lg:px-4 max-lg:py-2.5 max-lg:text-sm" : "px-4 py-2 text-sm max-lg:py-2.5",
              size === "md" && !active && "bg-white ring-1 ring-line ring-inset",
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

/* ---------- Progress bar (filled + striped remainder) ---------- */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("flex h-3 w-full gap-1", className)}>
      {value > 0 && (
        <motion.div
          className="rounded-full bg-mint ring-1 ring-inset ring-mint-deep/25"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={softSpring}
        />
      )}
      {value < 100 && <div className="stripes flex-1 rounded-full ring-1 ring-inset ring-line" />}
    </div>
  );
}

/* ---------- Card ---------- */
export function Card({
  children,
  className,
  delay = 0,
  onClick,
  guide,
}: {
  children: ReactNode;
  className?: string;
  guide?: string;
  delay?: number;
  onClick?: () => void;
}) {
  return (
    <motion.div
      data-guide={guide}
      layout="position"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...softSpring, delay }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        "rounded-card bg-white p-5",
        onClick && "cursor-pointer transition-shadow hover:shadow-[0_14px_40px_-16px_rgba(20,20,40,0.25)]",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Loading / empty states ---------- */
export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="h-28 rounded-card bg-white"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center py-12 text-center">
      <motion.div
        initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
        className="grid size-16 place-items-center rounded-[22px] bg-lilac-soft text-lilac-deep"
      >
        {icon}
      </motion.div>
      <p className="mt-4 text-lg font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
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
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-soft max-lg:min-h-11 max-lg:text-[15px]",
        danger && "text-red-500",
      )}
    >
      {children}
    </motion.button>
  );
}
