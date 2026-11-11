"use client";

import { motion } from "motion/react";
import { DAYS, TODAY } from "@/lib/data";
import { cn } from "@/lib/cn";
import { snappy, spring } from "@/lib/motion";
import { useStore } from "@/lib/store";

export function WeekStrip({ layoutId, className }: { layoutId: string; className?: string }) {
  const { day, setDay } = useStore();
  return (
    <div className={cn("flex gap-2", className)}>
      {DAYS.map((d) => {
        const active = d.key === day;
        return (
          <motion.button
            key={d.key}
            whileTap={{ scale: 0.92 }}
            transition={snappy}
            onClick={() => setDay(d.key)}
            className={cn(
              "relative flex-1 rounded-2xl py-2 text-center transition-colors duration-200",
              active ? "text-white" : "bg-white text-ink ring-1 ring-line ring-inset hover:bg-soft",
            )}
          >
            {active && (
              <motion.span layoutId={layoutId} transition={spring} className="absolute inset-0 rounded-2xl bg-lilac" />
            )}
            <span className={cn("relative block text-xs", active ? "text-white/85" : "text-muted")}>{d.short}</span>
            <span className="relative block text-lg font-semibold">{d.date}</span>
            {d.key === TODAY && (
              <span
                className={cn(
                  "absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full",
                  active ? "bg-white" : "bg-lilac",
                )}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
