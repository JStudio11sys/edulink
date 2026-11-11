"use client";

import { ArrowUpDown, Calendar, Check, MessageSquare, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { SUBJECTS, type Status, type Task } from "@/lib/data";
import { cn } from "@/lib/cn";
import { snappy, spring } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { IconButton, MenuItem, Popover, ProgressBar, Segmented, StatusPill } from "../ui";
import { ScreenHeader } from "./ScreenHeader";

type Filter = "all" | Status;
type Sort = "due" | "title";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All task" },
  { value: "todo", label: "To do" },
  { value: "progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export function TasksScreen() {
  const { tasks, openSheet } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("due");

  const q = query.trim().toLowerCase();
  const list = tasks
    .filter((t) => filter === "all" || t.status === filter)
    .filter((t) => !subjects.length || subjects.includes(t.subject))
    .filter((t) => !q || t.title.toLowerCase().includes(q))
    .sort((a, b) => (sort === "title" ? a.title.localeCompare(b.title) : Date.parse(a.due) - Date.parse(b.due)));

  return (
    <div>
      <ScreenHeader title="My tasks">
        <IconButton aria-label="Search" onClick={() => setSearchOpen((s) => !s)}>
          <motion.span key={String(searchOpen)} initial={{ rotate: -90, scale: 0.5 }} animate={{ rotate: 0, scale: 1 }}>
            {searchOpen ? <X className="size-[18px]" /> : <Search className="size-[18px]" />}
          </motion.span>
        </IconButton>
        <IconButton variant="ink" aria-label="New task" onClick={() => openSheet({ kind: "newTask" })}>
          <Plus className="size-[18px]" />
        </IconButton>
      </ScreenHeader>

      <AnimatePresence initial={false}>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden px-5"
          >
            <div className="mb-3 flex h-11 items-center gap-2 rounded-2xl bg-white px-3.5 ring-1 ring-line">
              <Search className="size-4 text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks"
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Segmented className="px-5" layoutId="m-task-filter" size="md" options={FILTERS} value={filter} onChange={setFilter} />

      <div className="mt-4 flex items-center justify-between px-5 text-[13px]">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowFilters((s) => !s)}
          className={cn("flex items-center gap-1.5 rounded-full px-2 py-1", showFilters && "bg-white")}
        >
          <SlidersHorizontal className="size-4" /> Filters
          {subjects.length > 0 && (
            <span className="grid size-4 place-items-center rounded-full bg-lilac text-[10px] text-white">
              {subjects.length}
            </span>
          )}
        </motion.button>
        <Popover
          className="w-44"
          trigger={({ toggle }) => (
            <motion.button whileTap={{ scale: 0.95 }} onClick={toggle} className="flex items-center gap-1.5 px-2 py-1">
              <ArrowUpDown className="size-4" /> Sort by
            </motion.button>
          )}
        >
          {(close) =>
            (
              [
                ["due", "Due date"],
                ["title", "Title"],
              ] as [Sort, string][]
            ).map(([v, l]) => (
              <MenuItem
                key={v}
                onClick={() => {
                  setSort(v);
                  close();
                }}
              >
                <span className="flex-1">{l}</span>
                {sort === v && <Check className="size-4 text-lilac-deep" />}
              </MenuItem>
            ))
          }
        </Popover>
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 px-5 pt-3">
              {SUBJECTS.map((s) => {
                const on = subjects.includes(s);
                return (
                  <motion.button
                    key={s}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setSubjects((p) => (on ? p.filter((x) => x !== s) : [...p, s]))}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[13px] transition-colors",
                      on ? "bg-lilac text-white" : "bg-white text-ink-2",
                    )}
                  >
                    {s}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div layout className="mt-4 space-y-3 px-5">
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((t, i) => (
            <TaskCard key={t.id} task={t} index={i} />
          ))}
        </AnimatePresence>
        {list.length === 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-sm text-muted">
            No tasks match.
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

function TaskCard({ task, index, ref }: { task: Task; index: number; ref?: React.Ref<HTMLButtonElement> }) {
  const { openSheet } = useStore();
  return (
    <motion.button
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { ...spring, delay: Math.min(index, 6) * 0.04 } }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.97 }}
      transition={snappy}
      onClick={() => openSheet({ kind: "task", id: task.id })}
      className="block w-full rounded-[26px] bg-white p-4 text-left"
    >
      <StatusPill status={task.status} />
      <p className={cn("mt-3 text-[17px] font-semibold", task.status === "done" && "text-muted line-through")}>
        {task.title}
      </p>
      <p className="mt-0.5 text-sm text-muted">{task.subject}</p>
      <div className="mt-4 flex items-center justify-between text-[13px] text-muted">
        <span className="flex items-center gap-1.5">
          <Calendar className="size-4" /> {task.due}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageSquare className="size-4" /> {task.comments ? `${task.comments} comments` : "No comments"}
        </span>
      </div>
      {task.status === "progress" && <ProgressBar value={task.progress} className="mt-3 h-5" />}
    </motion.button>
  );
}
