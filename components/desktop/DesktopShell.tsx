"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { easeOutExpo } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { DashboardView, NotesView, PlaceholderView, ScheduleView, TasksBoardView } from "./Views";

export function DesktopShell() {
  const { view } = useStore();

  const content =
    view === "dashboard" ? (
      <DashboardView />
    ) : view === "tasks" ? (
      <TasksBoardView />
    ) : view === "schedule" ? (
      <ScheduleView />
    ) : view === "notes" ? (
      <NotesView />
    ) : (
      <PlaceholderView view={view} />
    );

  return (
    <LayoutGroup id="desktop">
      <div className="hidden h-dvh min-h-[700px] gap-4 p-4 lg:flex">
        <Sidebar />
        <main className="relative z-10 min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.985, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.985, filter: "blur(8px)" }}
              transition={{ duration: 0.3, ease: easeOutExpo }}
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </LayoutGroup>
  );
}
