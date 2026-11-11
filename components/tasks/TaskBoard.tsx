"use client";

import { Calendar, CheckCheck, ChevronRight, ClipboardList, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { fmtDate, isOverdue, startOfWeek } from "@/lib/format";
import { snappy, spring } from "@/lib/motion";
import { useUI } from "@/lib/store";
import type { Activity, Section, Subject } from "@/lib/types";
import { useTeacherData, type StudentWork, type TeacherData } from "@/lib/useTeacherData";
import { ActivitySheet, ModeBadge } from "../classes/ActivitySheet";
import { SubjectPicker } from "../dashboard/StudentWork";
import { ErrorNote, Pill, ProgressBar, Segmented } from "../ui";

export type TaskStatus = "todo" | "progress" | "done";

/** One task (activity) as given to one section. */
export interface TaskRow {
  key: string;
  activity: Activity;
  subject: Subject;
  section: Section;
  work: StudentWork[];
  total: number;
  done: number;
  overdue: number;
  checked: number;
  status: TaskStatus;
  /** When the last paper came in (for the weekly reset). */
  lastAt: number;
}

const STATUS: Record<TaskStatus, { label: string; tone: string }> = {
  todo: { label: "To do", tone: "bg-lilac text-white" },
  progress: { label: "In progress", tone: "bg-peach text-peach-deep" },
  done: { label: "Done", tone: "bg-mint text-mint-deep" },
};

/** Build task rows (activity × section) from the teacher's data. */
export function buildTaskRows(d: TeacherData): TaskRow[] {
  const rows: TaskRow[] = [];
  for (const a of d.activities) {
    const subject = d.subjects.find((s) => s.id === a.subject_id);
    if (!subject) continue;
    for (const sectionId of d.sectionsOfActivity(a.id)) {
      const section = d.sections.find((s) => s.id === sectionId);
      if (!section) continue;
      const work = d.work.filter((w) => w.activity.id === a.id && w.sectionId === sectionId);
      const done = work.filter((w) => w.submission).length;
      const total = work.length;
      rows.push({
        key: `${a.id}:${sectionId}`,
        activity: a,
        subject,
        section,
        work,
        total,
        done,
        overdue: work.filter((w) => w.overdue).length,
        checked: work.filter((w) => w.review?.checked).length,
        status: total > 0 && done === total ? "done" : done > 0 ? "progress" : "todo",
        lastAt: Math.max(0, ...work.map((w) => (w.submission ? new Date(w.submission.submitted_at).getTime() : 0))),
      });
    }
  }
  // Overdue first, then by due date, then newest
  return rows.sort(
    (x, y) =>
      Number(y.overdue > 0) - Number(x.overdue > 0) ||
      (x.activity.due_at ?? "9999").localeCompare(y.activity.due_at ?? "9999") ||
      y.activity.created_at.localeCompare(x.activity.created_at),
  );
}

type Filter = "all" | TaskStatus;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All task" },
  { value: "todo", label: "To do" },
  { value: "progress", label: "In progress" },
  { value: "done", label: "Done" },
];

/**
 * Task list grouped by subject + section. Tap a task to see it and its students.
 * weekly: hides tasks that were completed before this Monday.
 */
export function TaskBoard({
  weekly = false,
  query = "",
  showSearch = false,
  showSectionFilter = false,
  layoutKey,
}: {
  weekly?: boolean;
  query?: string;
  showSearch?: boolean;
  showSectionFilter?: boolean;
  layoutKey: string;
}) {
  const data = useTeacherData();
  const { openSheet, bumpData } = useUI();
  const [filter, setFilter] = useState<Filter>("all");
  const [subject, setSubject] = useState("all");
  const [section, setSection] = useState("all");
  const [search, setSearch] = useState("");

  const weekStart = startOfWeek().getTime();
  const all = buildTaskRows(data).filter((r) => !weekly || r.status !== "done" || r.lastAt >= weekStart);
  const scoped = all.filter(
    (r) => (subject === "all" || r.subject.id === subject) && (section === "all" || r.section.id === section),
  );
  const q = (query || search).trim().toLowerCase();
  const rows = scoped.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      (!q || r.activity.title.toLowerCase().includes(q) || r.subject.name.toLowerCase().includes(q) || r.section.name.toLowerCase().includes(q)),
  );
  const count = (s: TaskStatus) => scoped.filter((r) => r.status === s).length;

  // Group by subject + section, keeping the row order
  const groups: { key: string; title: string; rows: TaskRow[] }[] = [];
  for (const r of rows) {
    const key = `${r.subject.id}:${r.section.id}`;
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, title: `${r.subject.name} · ${r.section.name}`, rows: [] }));
    g.rows.push(r);
  }

  const open = (r: TaskRow) => {
    const subjectSections = data.sections.filter((s) =>
      data.classes.some((c) => c.section_id === s.id && c.subject_id === r.subject.id),
    );
    openSheet(
      <ActivitySheet
        activity={r.activity}
        subject={r.subject}
        subjectSections={subjectSections}
        activitySectionIds={data.sectionsOfActivity(r.activity.id)}
        work={r.work}
        onChanged={bumpData}
      />,
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <SubjectPicker subjects={data.subjects} value={subject} onChange={setSubject} />
        {showSectionFilter && (
          <SubjectPicker subjects={data.sections} value={section} onChange={setSection} allLabel="All sections" />
        )}
        {showSearch && (
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-4 ring-1 ring-line sm:max-w-xs">
            <Search className="size-4 shrink-0 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none max-lg:text-[15px]"
            />
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        {count("todo")} to do · {count("progress")} in progress · {count("done")} done{weekly ? " this week" : ""}
      </p>
      <Segmented className="mt-3" layoutId={`${layoutKey}-filter`} options={FILTERS} value={filter} onChange={setFilter} />
      <ErrorNote message={data.error} />

      <div className="thin-scroll -mx-2 mt-3 min-h-0 flex-1 overflow-y-auto px-2">
        {data.loading && !data.data ? null : groups.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-10 text-center">
            <ClipboardList className="mx-auto size-8 text-muted/50" />
            <p className="mt-2 text-sm text-muted">
              {all.length ? "Nothing here." : "No tasks yet. Create one inside a class (Sections → section → subject)."}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.key}>
                <h3 className="mb-1.5 px-2 text-xs font-semibold tracking-wide text-muted uppercase">{g.title}</h3>
                <ul>
                  <AnimatePresence initial={false} mode="popLayout">
                    {g.rows.map((r) => (
                      <TaskRowItem key={r.key} row={r} onOpen={() => open(r)} />
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRowItem({ row, onOpen, ref }: { row: TaskRow; onOpen: () => void; ref?: React.Ref<HTMLLIElement> }) {
  const { activity: a } = row;
  const pct = row.total ? Math.round((row.done / row.total) * 100) : 0;
  const late = row.overdue > 0;
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
        transition={snappy}
        onClick={onOpen}
        className="w-full rounded-2xl px-2 py-3 text-left transition-colors hover:bg-soft max-lg:py-3.5"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[15px] leading-snug font-semibold">{a.title}</p>
          <span className="flex shrink-0 items-center gap-1">
            <Pill tone={STATUS[row.status].tone}>{STATUS[row.status].label}</Pill>
            <ChevronRight className="size-4 text-muted" />
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <ModeBadge mode={a.mode} />
          {late && <Pill tone="bg-red-500 text-white">{row.overdue} overdue</Pill>}
          {row.checked > 0 && (
            <Pill tone="bg-ink text-white">
              <span className="flex items-center gap-1">
                <CheckCheck className="size-3" /> {row.checked}/{row.total} checked
              </span>
            </Pill>
          )}
        </div>
        <div className="mt-2.5 flex items-center gap-3">
          <ProgressBar value={pct} className="flex-1" />
          <span className="shrink-0 text-xs font-semibold tabular-nums">
            {row.done}/{row.total}
          </span>
        </div>
        <p className={cn("mt-2 flex items-center gap-1 text-[11px]", late || isOverdue(a.due_at) ? "font-medium text-red-500" : "text-muted")}>
          <Calendar className="size-3.5" /> {a.due_at ? `Due ${fmtDate(a.due_at)}` : "No due date"}
          <span className="text-muted"> · {a.mode === "f2f" ? "papers in" : "submitted"}</span>
        </p>
      </motion.button>
    </motion.li>
  );
}
