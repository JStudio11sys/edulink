"use client";

import { ArrowRight, BarChart3, ClipboardCheck, MessageCircle, Plus, Settings, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Status, Task } from "@/lib/data";
import { cn } from "@/lib/cn";
import { snappy, spring } from "@/lib/motion";
import { useStore, type DesktopView } from "@/lib/store";
import { NoteCard } from "../NoteCard";
import { PrimaryButton } from "../TaskSheets";
import { Card, ProgressBar } from "../ui";
import { NotesCard } from "./NotesCard";
import { ScheduleCard } from "./ScheduleCard";
import { TasksCard } from "./TasksCard";
import { TopBar } from "./TopBar";

export function DashboardView() {
  const [query, setQuery] = useState("");
  return (
    <div className="grid h-full grid-cols-[minmax(340px,5fr)_minmax(0,7fr)] gap-4">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        <TopBar query={query} onQuery={setQuery} />
        <TasksCard query={query} className="flex-1" delay={0.05} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        <NotesCard className="h-[300px] shrink-0" delay={0.1} />
        <ScheduleCard className="flex-1" delay={0.15} />
      </div>
    </div>
  );
}

const COLUMNS: { status: Status; label: string; dot: string }[] = [
  { status: "todo", label: "To do", dot: "bg-lilac" },
  { status: "progress", label: "In progress", dot: "bg-peach-deep" },
  { status: "done", label: "Done", dot: "bg-mint-deep" },
];
const NEXT: Record<Status, Status> = { todo: "progress", progress: "done", done: "todo" };

export function TasksBoardView() {
  const { tasks, openSheet } = useStore();
  return (
    <div className="flex h-full flex-col gap-4">
      <Header title="Tasks" subtitle="Click the arrow to move a task forward.">
        <PrimaryButton onClick={() => openSheet({ kind: "newTask" })}>
          <Plus className="size-4" /> New task
        </PrimaryButton>
      </Header>
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-4">
        {COLUMNS.map((c, i) => {
          const list = tasks.filter((t) => t.status === c.status);
          return (
            <Card key={c.status} delay={i * 0.06} className="p-4">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className={cn("size-2 rounded-full", c.dot)} />
                <h3 className="font-semibold">{c.label}</h3>
                <motion.span
                  key={list.length}
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  transition={snappy}
                  className="ml-auto rounded-full bg-soft px-2 py-0.5 text-xs text-muted"
                >
                  {list.length}
                </motion.span>
              </div>
              <div className="thin-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto">
                {list.map((t) => (
                  <BoardCard key={t.id} task={t} />
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function BoardCard({ task }: { task: Task }) {
  const { openSheet, setStatus } = useStore();
  return (
    <motion.div
      layoutId={`board-${task.id}`}
      transition={spring}
      whileHover={{ y: -2 }}
      className="cursor-pointer rounded-[20px] bg-soft p-3.5 transition-shadow hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.2)]"
      onClick={() => openSheet({ kind: "task", id: task.id })}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <motion.button
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.1 }}
          transition={snappy}
          onClick={(e) => {
            e.stopPropagation();
            setStatus(task.id, NEXT[task.status]);
          }}
          className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-ink shadow-sm"
          aria-label="Move forward"
        >
          <ArrowRight className="size-3.5" />
        </motion.button>
      </div>
      <p className="mt-1 text-xs text-muted">{task.subject}</p>
      {task.status === "progress" && <ProgressBar value={task.progress} className="mt-2.5" />}
      <p className="mt-2 text-[11px] text-muted">{task.due}</p>
    </motion.div>
  );
}

export function ScheduleView() {
  return (
    <div className="flex h-full flex-col gap-4">
      <Header title="Schedule" subtitle="Week of November 9, 2026" />
      <ScheduleCard expanded className="flex-1" />
    </div>
  );
}

export function NotesView() {
  const { notes, openSheet } = useStore();
  return (
    <div className="flex h-full flex-col gap-4">
      <Header title="Notes" subtitle={`${notes.length} notes`}>
        <PrimaryButton onClick={() => openSheet({ kind: "newNote" })}>
          <Plus className="size-4" /> New note
        </PrimaryButton>
      </Header>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto rounded-card">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
          <AnimatePresence mode="popLayout">
            {notes.map((n) => (
              <NoteCard key={n.id} note={n} className="min-h-[220px]" />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const PLACEHOLDERS: Partial<Record<DesktopView, { icon: LucideIcon; title: string }>> = {
  tests: { icon: ClipboardCheck, title: "Tests" },
  reports: { icon: BarChart3, title: "Reports" },
  chat: { icon: MessageCircle, title: "Chat" },
  settings: { icon: Settings, title: "Settings" },
};

export function PlaceholderView({ view }: { view: DesktopView }) {
  const p = PLACEHOLDERS[view] ?? PLACEHOLDERS.tests!;
  const Icon = p.icon;
  return (
    <Card className="h-full items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
        className="grid size-20 place-items-center rounded-[28px] bg-lilac-soft"
      >
        <Icon className="size-9 text-lilac-deep" />
      </motion.div>
      <h2 className="mt-5 text-2xl font-semibold">{p.title}</h2>
      <p className="mt-1 text-sm text-muted">This section is coming soon.</p>
    </Card>
  );
}

function Header({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="flex items-center justify-between rounded-card bg-white px-6 py-4"
    >
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}
