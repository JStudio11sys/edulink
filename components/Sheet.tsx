"use client";

import { AnimatePresence, motion, useDragControls } from "motion/react";
import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { useIsDesktop } from "@/lib/useMedia";
import { useUI } from "@/lib/store";
import { IconButton } from "./ui";

/**
 * One global overlay: centered modal on desktop, draggable bottom sheet on mobile.
 * The element tree is the same in both modes, so the content (and its state, e.g. a
 * photo being submitted) survives rotating the device across the 1024px breakpoint.
 */
export function Sheet() {
  const { sheet, closeSheet } = useUI();
  const isDesktop = useIsDesktop();
  const controls = useDragControls();

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSheet();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet, closeSheet]);

  return (
    <AnimatePresence>
      {sheet && (
        <motion.div key="sheet" className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-ink/25 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeSheet}
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-0 flex",
              isDesktop ? "items-center justify-center p-6" : "items-end",
            )}
          >
            <motion.div
              initial={isDesktop ? { opacity: 0, scale: 0.9, y: 24 } : { y: "100%" }}
              animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
              exit={
                isDesktop
                  ? { opacity: 0, scale: 0.94, y: 12, transition: { duration: 0.18 } }
                  : { y: "100%", transition: { type: "spring", stiffness: 400, damping: 40 } }
              }
              transition={isDesktop ? { type: "spring", stiffness: 380, damping: 32 } : { type: "spring", stiffness: 380, damping: 38 }}
              drag={isDesktop ? false : "y"}
              dragControls={controls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.04, bottom: 0.9 }}
              onDragEnd={(_, info) => {
                if (!isDesktop && (info.offset.y > 110 || info.velocity.y > 600)) closeSheet();
              }}
              className={cn(
                "pointer-events-auto relative flex flex-col bg-white",
                isDesktop
                  ? "max-h-[90dvh] w-full max-w-[780px] rounded-[28px] shadow-[0_40px_100px_-20px_rgba(20,20,40,0.45)]"
                  : "max-h-[94dvh] w-full rounded-t-[30px] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.3)]",
              )}
            >
              {/* Mobile grabber / desktop close button (same slot, so content never remounts) */}
              {isDesktop ? (
                <div className="absolute top-5 right-5 z-10">
                  <IconButton variant="soft" size={34} onClick={closeSheet} aria-label="Close">
                    <X className="size-4" />
                  </IconButton>
                </div>
              ) : (
                <div
                  onPointerDown={(e) => controls.start(e)}
                  className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-2 active:cursor-grabbing"
                >
                  <span className="h-1.5 w-10 rounded-full bg-ink/15" />
                </div>
              )}
              <div
                className={cn(
                  "thin-scroll overflow-y-auto",
                  isDesktop ? "p-6" : "px-5 pb-[max(20px,env(safe-area-inset-bottom))]",
                )}
              >
                {sheet}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Standard header inside a sheet. Leaves room for the desktop close button. */
export function SheetHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5 pr-10">
      <h3 className="text-[22px] leading-tight font-semibold">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
