"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { spring } from "@/lib/motion";
import { IconButton, PrimaryButton } from "../ui";

export function PageHeader({
  title,
  subtitle,
  action,
  compact,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Used when the page sits inside another page (e.g. Settings tabs). */
  compact?: boolean;
}) {
  if (compact)
    return (
      <div className="flex min-h-12 items-center justify-between gap-3 px-5 pb-3 lg:px-0">
        <p className="truncate text-sm text-muted">{subtitle}</p>
        {action}
      </div>
    );
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="flex items-center justify-between gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))] pb-4 lg:mb-4 lg:rounded-card lg:bg-white lg:px-6 lg:py-4"
    >
      <div className="min-w-0">
        <h1 className="truncate text-[26px] font-semibold tracking-tight lg:text-2xl">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </motion.div>
  );
}

/** "+" on mobile, labelled button on desktop. */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <>
      <IconButton variant="ink" className="lg:hidden" onClick={onClick} aria-label={label}>
        <Plus className="size-[18px]" />
      </IconButton>
      <PrimaryButton className="hidden lg:flex" onClick={onClick}>
        <Plus className="size-4" /> {label}
      </PrimaryButton>
    </>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="px-5 pb-32 lg:px-0 lg:pb-4">{children}</div>;
}
