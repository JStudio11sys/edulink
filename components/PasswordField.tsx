"use client";

import { Check, Copy, Eye, EyeOff, Wand2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { generatePassword } from "@/lib/password";
import { snappy } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { inputCls } from "./ui";

/** Password input with show/hide, a generator and a copy button. */
export function PasswordField({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(true);
  const [copied, setCopied] = useState(false);
  const [spin, setSpin] = useState(0);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  const square = "grid size-12 shrink-0 place-items-center rounded-2xl bg-soft text-ink transition-colors hover:bg-line";

  return (
    <div className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <input
          type={show ? "text" : "password"}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          spellCheck={false}
          placeholder="At least 8 characters"
          className={cn(inputCls, "pr-11 font-mono tracking-tight")}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-ink"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        transition={snappy}
        onClick={() => {
          onChange(generatePassword());
          setShow(true);
          setSpin((s) => s + 1);
        }}
        className={square}
        title="Generate password"
        aria-label="Generate password"
      >
        <motion.span key={spin} initial={{ rotate: -120, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={snappy}>
          <Wand2 className="size-[18px]" />
        </motion.span>
      </motion.button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        transition={snappy}
        onClick={copy}
        disabled={!value}
        className={cn(square, "disabled:opacity-40")}
        title="Copy password"
        aria-label="Copy password"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={String(copied)} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={snappy}>
            {copied ? <Check className="size-[18px] text-mint-deep" /> : <Copy className="size-[18px]" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
