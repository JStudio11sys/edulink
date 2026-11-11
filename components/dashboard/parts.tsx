"use client";

import { Calendar, Clock, MoreHorizontal } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { fmtDay, fmtTime, todayWeekday, toMinutes } from "@/lib/format";
import { snappy, spring } from "@/lib/motion";
import { useUI } from "@/lib/store";
import type { Lesson, Note, PersonalTask, TaskStatus } from "@/lib/types";
import { Pill, ProgressBar } from "../ui";
import { NOTE_BG, NoteSheet, TaskSheet } from "./sheets";

export const TASK_STATUS: Record<TaskStatus, { label: string; tone: string }> = {
  todo: { label: "To do", tone: "bg-lilac text-white" },
  progress: { label: "In progress", tone: "bg-peach text-peach-deep" },
  done: { label: "Done", tone: "bg-mint text-mint-deep" },
};

export function TaskStatusPill({ status }: { status: TaskStatus }) {
  return <Pill tone={TASK_STATUS[status].tone}>{TASK_STATUS[status].label}</Pill>;
}

/** Compact row for the desktop "My tasks" card. */
export function TaskRow({ task, ref }: { task: PersonalTask; ref?: React.Ref<HTMLLIElement> }) {
  const { openSheet } = useUI();
  return (
    <motion.li
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={spring}
      className="border-b border-line last:border-0"
    >
      <motion.button
        whileTap={{ scale: 0.985 }}
        onClick={() => openSheet(<TaskSheet task={task} />)}
        className="w-full rounded-2xl px-2 py-3 text-left transition-colors hover:bg-soft"
      >
        <div className="flex items-start justify-between gap-3">
          <p className={cn("text-[14px] leading-snug font-medium", task.status === "done" && "text-muted line-through")}>
            {task.title}
          </p>
          <TaskStatusPill status={task.status} />
        </div>
        {task.tag && <p className="mt-0.5 text-xs text-muted">{task.tag}</p>}
        {task.status === "progress" && <ProgressBar value={task.progress} className="mt-2.5" />}
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted">
          <Calendar className="size-3.5" /> {fmtDay(task.due_date)}
        </p>
      </motion.button>
    </motion.li>
  );
}

/** Bigger card for mobile. */
export function TaskCard({ task, index = 0, ref }: { task: PersonalTask; index?: number; ref?: React.Ref<HTMLButtonElement> }) {
  const { openSheet } = useUI();
  return (
    <motion.button
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { ...spring, delay: Math.min(index, 6) * 0.04 } }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.97 }}
      transition={snappy}
      onClick={() => openSheet(<TaskSheet task={task} />)}
      className="block w-full rounded-[26px] bg-white p-4 text-left"
    >
      <TaskStatusPill status={task.status} />
      <p className={cn("mt-3 text-[17px] font-semibold", task.status === "done" && "text-muted line-through")}>
        {task.title}
      </p>
      {task.tag && <p className="mt-0.5 text-sm text-muted">{task.tag}</p>}
      <p className="mt-4 flex items-center gap-1.5 text-[13px] text-muted">
        <Calendar className="size-4" /> {fmtDay(task.due_date)}
      </p>
      {task.status === "progress" && <ProgressBar value={task.progress} className="mt-3 h-5" />}
    </motion.button>
  );
}

export function NoteCard({ note, className, ref }: { note: Note; className?: string; ref?: React.Ref<HTMLButtonElement> }) {
  const { openSheet } = useUI();
  return (
    <motion.button
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4, rotate: -0.6 }}
      whileTap={{ scale: 0.97 }}
      transition={snappy}
      onClick={() => openSheet(<NoteSheet note={note} />)}
      className={cn("flex shrink-0 snap-start flex-col rounded-[22px] p-4 text-left", NOTE_BG[note.color], className)}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <p className="text-[15px] leading-tight font-semibold">{note.title}</p>
        <MoreHorizontal className="size-4 shrink-0 opacity-60" />
      </div>
      <p className="mt-3 line-clamp-5 text-[12.5px] leading-relaxed whitespace-pre-line text-ink/75">{note.body}</p>
      <p className="mt-auto pt-3 text-[11px] text-ink/50">
        {new Date(note.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
    </motion.button>
  );
}

/** past / now / next for a lesson on the given weekday. */
export function lessonState(weekday: number, l: Lesson): "past" | "now" | "next" {
  const today = todayWeekday();
  if (weekday !== today) return "next"; // the timetable repeats weekly
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  if (now >= toMinutes(l.end_time)) return "past";
  if (now >= toMinutes(l.start_time)) return "now";
  return "next";
}

export function NowBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-mint-deep">
      <motion.span
        className="size-1.5 rounded-full bg-mint-deep"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ repeat: Infinity, duration: 1.6 }}
      />
      Now
    </span>
  );
}

export function LessonTimes({ l }: { l: Lesson }) {
  return (
    <div className="flex w-[78px] shrink-0 flex-col">
      <Clock className="size-5" />
      <span className="mt-3 text-[13px] tabular-nums">{fmtTime(l.start_time)}</span>
      <span className="my-1 ml-2 h-4 w-px border-l border-dashed border-ink/30" />
      <span className="text-[13px] tabular-nums">{fmtTime(l.end_time)}</span>
    </div>
  );
}
