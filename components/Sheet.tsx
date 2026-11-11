"use client";

import { AnimatePresence, motion, useDragControls } from "motion/react";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useIsDesktop } from "@/lib/useMedia";
import { useStore } from "@/lib/store";
import { NewTaskForm, TaskDetail } from "./TaskSheets";
import { NoteEditor } from "./NoteEditor";
import { IconButton } from "./ui";

/** One global overlay: centered modal on desktop, draggable bottom sheet on mobile. */
export function Sheet() {
  const { sheet, closeSheet } = useStore();
  const isDesktop = useIsDesktop();
  const controls = useDragControls();

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSheet();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet, closeSheet]);

  const content = !sheet ? null : sheet.kind === "task" ? (
    <TaskDetail id={sheet.id} />
  ) : sheet.kind === "newTask" ? (
    <NewTaskForm />
  ) : sheet.kind === "note" ? (
    <NoteEditor id={sheet.id} />
  ) : (
    <NoteEditor />
  );

  return (
    <AnimatePresence>
      {sheet && (
        <motion.div key="backdrop" className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-ink/25 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeSheet}
          />
          {isDesktop ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12, transition: { duration: 0.18 } }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="pointer-events-auto relative max-h-[85dvh] w-full max-w-[480px] overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_40px_100px_-20px_rgba(20,20,40,0.45)]"
              >
                <IconButton variant="soft" size={34} className="absolute top-5 right-5" onClick={closeSheet} aria-label="Close">
                  <X className="size-4" />
                </IconButton>
                {content}
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", transition: { type: "spring", stiffness: 400, damping: 40 } }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              drag="y"
              dragControls={controls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.04, bottom: 0.9 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 110 || info.velocity.y > 600) closeSheet();
              }}
              className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[30px] bg-white shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.3)]"
            >
              <div
                onPointerDown={(e) => controls.start(e)}
                className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-2 active:cursor-grabbing"
              >
                <span className="h-1.5 w-10 rounded-full bg-ink/15" />
              </div>
              <div className="overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))]">{content}</div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
