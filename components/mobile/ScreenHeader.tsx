"use client";

import { motion } from "motion/react";
import { spring } from "@/lib/motion";

export function ScreenHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pt-[max(20px,env(safe-area-inset-top))] pb-4">
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="text-[26px] font-semibold tracking-tight"
      >
        {title}
      </motion.h1>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
