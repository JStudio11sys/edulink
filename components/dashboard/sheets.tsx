"use client";

import { Check, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { WEEKDAYS, todayWeekday } from "@/lib/format";
import { spring } from "@/lib/motion";
import { usePersonal } from "@/lib/personal";
import { useUI } from "@/lib/store";
import type { Lesson, Note, NoteColor, PersonalTask, TaskStatus } from "@/lib/types";
import { SheetHeader } from "../Sheet";
import { ErrorNote, Field, PrimaryButton, ProgressBar, Segmented, ToggleChip, inputCls } from "../ui";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "progress", label: "In progress" },
  { value: "done", label: "Done" },
];

/** Keep progress consistent with status. */
export const progressFor = (status: TaskStatus, current: number) =>
  status === "done" ? 100 : status === "todo" ? 0 : Math.min(Math.max(current, 10), 90);

function DeleteButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="grid size-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-500"
      aria-label={label}
    >
      <Trash2 className="size-[18px]" />
    </motion.button>
  );
}

/* ---------------- Task ---------------- */
export function TaskSheet({ task }: { task?: PersonalTask }) {
  const { tasks } = usePersonal();
  const { closeSheet } = useUI();
  const [title, setTitle] = useState(task?.title ?? "");
  const [tag, setTag] = useState(task?.tag ?? "");
  const [due, setDue] = useState(task?.due_date ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [progress, setProgress] = useState(task?.progress ?? 0);
  const [description, setDescription] = useState(task?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    const row = {
      title: title.trim(),
      tag: tag.trim(),
      due_date: due || null,
      status,
      progress: progressFor(status, progress),
      description: description.trim(),
    };
    try {
      if (task) await tasks.patch(task.id, row);
      else await tasks.add(row);
      closeSheet();
    } catch (e) {
      setError(msg(e));
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-5 pt-1"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <SheetHeader title={task ? "Edit task" : "New task"} />
      <Field label="Task">
        <input
          autoFocus={!task}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you need to do?"
          className={inputCls}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label (optional)">
          <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. Math 9A" className={inputCls} />
        </Field>
        <Field label="Due date (optional)">
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls} />
        </Field>
      </div>
      <Field label="Status">
        <Segmented
          layoutId="task-sheet-status"
          size="md"
          grow
          options={STATUS_OPTIONS}
          value={status}
          onChange={(s) => {
            setStatus(s);
            setProgress((p) => progressFor(s, p));
          }}
        />
      </Field>
      {status === "progress" && (
        <Field label={`Progress · ${progress}%`}>
          <ProgressBar value={progress} />
          <input
            type="range"
            min={10}
            max={90}
            step={5}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="mt-3 w-full accent-ink"
            aria-label="Progress"
          />
        </Field>
      )}
      <Field label="Notes (optional)">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={`${inputCls} h-auto resize-none py-3 leading-relaxed`}
        />
      </Field>
      <ErrorNote message={error} />
      <div className="flex gap-2">
        {task && (
          <DeleteButton
            label="Delete task"
            onClick={async () => {
              closeSheet();
              await tasks.remove(task.id).catch(() => {});
            }}
          />
        )}
        <PrimaryButton type="submit" className="flex-1" disabled={!title.trim()} loading={busy}>
          {task ? "Save" : "Add task"}
        </PrimaryButton>
      </div>
    </form>
  );
}

/* ---------------- Note ---------------- */
export const NOTE_BG: Record<NoteColor, string> = {
  mint: "bg-mint",
  lilac: "bg-lilac",
  peach: "bg-peach",
  sky: "bg-sky",
};
const COLORS: NoteColor[] = ["mint", "lilac", "peach", "sky"];

export function NoteSheet({ note }: { note?: Note }) {
  const { notes } = usePersonal();
  const { closeSheet } = useUI();
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [color, setColor] = useState<NoteColor>(note?.color ?? "mint");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (note) await notes.patch(note.id, { title: title.trim(), body, color, updated_at: new Date().toISOString() });
      else await notes.add({ title: title.trim(), body, color });
      closeSheet();
    } catch (e) {
      setError(msg(e));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 pt-1">
      <motion.div layout className={cn("rounded-[22px] p-4 pr-12 transition-colors duration-300", NOTE_BG[color])}>
        <input
          autoFocus={!note}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-ink/40"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write something…"
          rows={7}
          className="mt-2 w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-ink/40"
        />
      </motion.div>
      <div className="flex items-center gap-3">
        {COLORS.map((c) => (
          <motion.button
            key={c}
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={() => setColor(c)}
            className={cn("relative grid size-9 place-items-center rounded-full", NOTE_BG[c])}
            aria-label={c}
          >
            {c === color && (
              <motion.span layoutId="note-color-ring" transition={spring} className="absolute -inset-1 rounded-full ring-2 ring-ink" />
            )}
            {c === color && <Check className="size-4" />}
          </motion.button>
        ))}
      </div>
      <ErrorNote message={error} />
      <div className="flex gap-2 pt-1">
        {note && (
          <DeleteButton
            label="Delete note"
            onClick={async () => {
              closeSheet();
              await notes.remove(note.id).catch(() => {});
            }}
          />
        )}
        <PrimaryButton className="flex-1" onClick={save} disabled={!title.trim()} loading={busy}>
          {note ? "Save" : "Add note"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ---------------- Lesson (timetable) ---------------- */
export function LessonSheet({ lesson, defaultWeekday }: { lesson?: Lesson; defaultWeekday?: number }) {
  const { lessons } = usePersonal();
  const { closeSheet } = useUI();
  const [weekday, setWeekday] = useState(lesson?.weekday ?? defaultWeekday ?? todayWeekday());
  const [start, setStart] = useState(lesson?.start_time.slice(0, 5) ?? "08:00");
  const [end, setEnd] = useState(lesson?.end_time.slice(0, 5) ?? "08:45");
  const [subject, setSubject] = useState(lesson?.subject ?? "");
  const [room, setRoom] = useState(lesson?.room ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = subject.trim() && start && end && end > start;

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    const row = { weekday, start_time: `${start}:00`, end_time: `${end}:00`, subject: subject.trim(), room: room.trim() };
    try {
      if (lesson) await lessons.patch(lesson.id, row);
      else await lessons.add(row);
      closeSheet();
    } catch (e) {
      setError(msg(e));
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-5 pt-1"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <SheetHeader title={lesson ? "Edit class" : "Add class"} subtitle="Repeats every week." />
      <Field label="Day">
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d, i) => (
            <ToggleChip key={d} on={weekday === i + 1} onClick={() => setWeekday(i + 1)}>
              {d}
            </ToggleChip>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts">
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Ends">
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
        </Field>
      </div>
      <Field label="Subject / class">
        <input
          autoFocus={!lesson}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Math 9A"
          className={inputCls}
        />
      </Field>
      <Field label="Room (optional)">
        <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. B3, Room 124" className={inputCls} />
      </Field>
      {start && end && end <= start && <p className="text-sm text-red-500">End time must be after start time.</p>}
      <ErrorNote message={error} />
      <div className="flex gap-2">
        {lesson && (
          <DeleteButton
            label="Delete class"
            onClick={async () => {
              closeSheet();
              await lessons.remove(lesson.id).catch(() => {});
            }}
          />
        )}
        <PrimaryButton type="submit" className="flex-1" disabled={!valid} loading={busy}>
          {lesson ? "Save" : "Add class"}
        </PrimaryButton>
      </div>
    </form>
  );
}
