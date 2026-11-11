"use client";

import { Calendar, MessageSquare, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { SUBJECTS, type Status } from "@/lib/data";
import { snappy } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import { ProgressBar, Segmented, StatusPill } from "./ui";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={snappy}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-12 items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-sm font-medium text-white transition-opacity disabled:opacity-30",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

export function TaskDetail({ id }: { id: string }) {
  const { tasks, setStatus, updateTask, deleteTask, closeSheet } = useStore();
  const task = tasks.find((t) => t.id === id);
  if (!task) return null;

  return (
    <div className="space-y-5 pt-1">
      <div className="pr-10">
        <StatusPill status={task.status} />
        <h3 className="mt-3 text-[22px] leading-tight font-semibold">{task.title}</h3>
        <p className="mt-1 text-sm text-muted">{task.subject}</p>
      </div>

      <div className="flex gap-4 text-[13px] text-muted">
        <span className="flex items-center gap-1.5">
          <Calendar className="size-4" /> {task.due}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageSquare className="size-4" /> {task.comments} comments
        </span>
      </div>

      <p className="text-[15px] leading-relaxed text-ink-2">{task.description}</p>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Status</p>
        <Segmented
          layoutId="sheet-status"
          size="md"
          grow
          options={STATUS_OPTIONS}
          value={task.status}
          onChange={(s) => setStatus(task.id, s)}
        />
      </div>

      <div>
        <div className="mb-2 flex justify-between text-xs font-medium tracking-wide text-muted uppercase">
          <span>Progress</span>
          <span className="text-ink tabular-nums">{task.progress}%</span>
        </div>
        <ProgressBar value={task.progress} />
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={task.progress}
          onChange={(e) => {
            const v = Number(e.target.value);
            updateTask(task.id, { progress: v, status: v === 100 ? "done" : v === 0 ? "todo" : "progress" });
          }}
          className="mt-3 w-full accent-ink"
          aria-label="Progress"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            deleteTask(task.id);
            closeSheet();
          }}
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-500"
          aria-label="Delete task"
        >
          <Trash2 className="size-[18px]" />
        </motion.button>
        <PrimaryButton
          className="flex-1"
          onClick={() => {
            setStatus(task.id, task.status === "done" ? "todo" : "done");
            closeSheet();
          }}
        >
          {task.status === "done" ? "Mark as not done" : "Mark as done"}
        </PrimaryButton>
      </div>
    </div>
  );
}

export function NewTaskForm() {
  const { addTask, closeSheet } = useStore();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [due, setDue] = useState("2026-11-20");
  const [status, setStatusLocal] = useState<Status>("todo");

  const submit = () => {
    if (!title.trim()) return;
    const d = new Date(due + "T00:00:00");
    addTask({
      title: title.trim(),
      subject,
      due: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      comments: 0,
      status,
      progress: status === "done" ? 100 : status === "progress" ? 10 : 0,
      description: "No description yet.",
    });
    closeSheet();
  };

  return (
    <div className="space-y-5 pt-1">
      <h3 className="text-[22px] font-semibold">New task</h3>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="What do you need to do?"
        className="h-12 w-full rounded-2xl bg-soft px-4 text-[15px] outline-none ring-lilac transition-shadow focus:ring-2"
      />
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Subject</p>
        <div className="flex flex-wrap gap-1.5">
          {SUBJECTS.map((s) => (
            <motion.button
              key={s}
              whileTap={{ scale: 0.94 }}
              onClick={() => setSubject(s)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] transition-colors",
                s === subject ? "bg-lilac text-white" : "bg-soft text-ink-2 hover:bg-line",
              )}
            >
              {s}
            </motion.button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Due date</p>
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="h-12 w-full rounded-2xl bg-soft px-4 text-[15px] outline-none ring-lilac focus:ring-2"
        />
      </div>
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Status</p>
        <Segmented layoutId="new-status" size="md" grow options={STATUS_OPTIONS} value={status} onChange={setStatusLocal} />
      </div>
      <PrimaryButton className="w-full" onClick={submit} disabled={!title.trim()}>
        Add task
      </PrimaryButton>
    </div>
  );
}
