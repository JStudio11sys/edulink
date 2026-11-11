"use client";

import { ArrowRight, Calendar, MessageSquare, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Status, Task } from "@/lib/data";
import { cn } from "@/lib/cn";
import { snappy, spring } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { Card, IconButton, ProgressBar, Segmented, StatusPill } from "../ui";

type Filter = "all" | Status;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All task" },
  { value: "todo", label: "To do" },
  { value: "progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export function TasksCard({ query = "", className, delay }: { query?: string; className?: string; delay?: number }) {
  const { tasks, openSheet, setView } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const q = query.trim().toLowerCase();
  const list = tasks.filter(
    (t) =>
      (filter === "all" || t.status === filter) &&
      (!q || t.title.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)),
  );

  return (
    <Card className={className} delay={delay}>
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-semibold">My tasks</h2>
        <IconButton onClick={() => openSheet({ kind: "newTask" })} aria-label="New task">
          <Plus className="size-[18px]" />
        </IconButton>
      </div>

      <Segmented
        className="mt-4"
        layoutId="d-task-filter"
        options={FILTERS}
        value={filter}
        onChange={setFilter}
      />

      <div className="thin-scroll -mx-2 mt-3 min-h-0 flex-1 overflow-y-auto px-2">
        <motion.ul layout className="relative">
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </AnimatePresence>
        </motion.ul>
        <AnimatePresence>
          {list.length === 0 && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="py-10 text-center text-sm text-muted"
            >
              Nothing here. Enjoy the free time ✨
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        transition={snappy}
        onClick={() => setView("tasks")}
        className="group mx-auto mt-3 flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium ring-1 ring-line transition-colors hover:bg-soft"
      >
        View all tasks
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </motion.button>
    </Card>
  );
}

function TaskRow({ task, ref }: { task: Task; ref?: React.Ref<HTMLLIElement> }) {
  const { openSheet } = useStore();
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
        onClick={() => openSheet({ kind: "task", id: task.id })}
        className="w-full rounded-2xl px-2 py-3 text-left transition-colors hover:bg-soft"
      >
        <div className="flex items-start justify-between gap-3">
          <p className={cn("text-[14px] font-medium leading-snug", task.status === "done" && "text-muted line-through")}>
            {task.title}
          </p>
          <StatusPill status={task.status} />
        </div>
        <p className="mt-0.5 text-xs text-muted">{task.subject}</p>
        {task.status === "progress" && <ProgressBar value={task.progress} className="mt-2.5" />}
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" /> {task.due}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3.5" />
            {task.comments ? `${task.comments} comments` : "No comments"}
          </span>
        </div>
      </motion.button>
    </motion.li>
  );
}
