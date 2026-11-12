"use client";

import { Calendar, Check, CheckCheck, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { fmtDate } from "@/lib/format";
import { snappy, spring } from "@/lib/motion";
import { useUI } from "@/lib/store";
import { WORK_PROGRESS, type StudentWork } from "@/lib/useTeacherWork";
import { ReviewPanel } from "../ReviewPanel";
import { SheetHeader } from "../Sheet";
import { SubmissionView } from "../SubmissionView";
import { Avatar, MenuItem, Pill, Popover, ProgressBar, SubjectChip, subjectColor } from "../ui";
import { displayName } from "@/lib/names";
import { SubmitFlow } from "../student/SubmitFlow";
import { ScorePanel } from "../ScorePanel";
import { readParts } from "@/lib/test";
import { fmtScore } from "@/lib/scores";

const STATUS = {
  todo: { label: "To do", tone: "bg-lilac text-white" },
  progress: { label: "In progress", tone: "bg-peach text-peach-deep" },
  done: { label: "Done", tone: "bg-mint text-mint-deep" },
} as const;

/** Status + Overdue / Late + Checked pills. */
export function WorkLabels({ w, className }: { w: StudentWork; className?: string }) {
  return (
    <span className={cn("flex flex-wrap items-center justify-end gap-1", className)}>
      {w.review?.checked && (
        <Pill tone="bg-ink text-white">
          <span className="flex items-center gap-1">
            <CheckCheck className="size-3" /> Checked
          </span>
        </Pill>
      )}
      {w.score && (
        <Pill tone={w.score.confirmed ? "bg-ink text-white" : "bg-lilac-soft text-lilac-deep"}>
          {w.score.confirmed ? "" : "AI "}
          {fmtScore(w.score.score)}/{fmtScore(w.score.max)}
        </Pill>
      )}
      {w.overdue && <Pill tone="bg-red-500 text-white">Overdue</Pill>}
      {w.late && <Pill tone="bg-red-500 text-white">Late</Pill>}
      {w.activity.mode === "f2f" ? (
        w.submission ? (
          <Pill tone="bg-mint text-mint-deep">Paper in</Pill>
        ) : (
          <Pill tone="bg-soft text-muted ring-1 ring-line">No paper yet</Pill>
        )
      ) : (
        <Pill tone={STATUS[w.status].tone}>{STATUS[w.status].label}</Pill>
      )}
    </span>
  );
}

function WorkDate({ w }: { w: StudentWork }) {
  return (
    <span className={cn("flex items-center gap-1", w.overdue && "font-medium text-red-500")}>
      <Calendar className="size-3.5" />
      {w.submission
        ? `${w.activity.mode === "f2f" ? "Captured" : "Submitted"} ${fmtDate(w.submission.submitted_at)}`
        : w.activity.due_at
          ? `Due ${fmtDate(w.activity.due_at)}`
          : "No due date"}
    </span>
  );
}

/** "All subjects ▾" dropdown for the weekly tasks. */
export function SubjectPicker({
  subjects,
  value,
  onChange,
  allLabel = "All subjects",
}: {
  subjects: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  allLabel?: string;
}) {
  const current = subjects.find((s) => s.id === value);
  const options = [{ id: "all", name: allLabel }, ...subjects];
  return (
    <Popover
      className="w-56"
      trigger={({ open, toggle }) => (
        <motion.button
          whileTap={{ scale: 0.96 }}
          transition={snappy}
          onClick={toggle}
          className="flex max-w-[200px] items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-medium ring-1 ring-line transition-colors hover:bg-soft max-lg:py-3 max-lg:text-sm"
        >
          {current && <span className={cn("size-2 shrink-0 rounded-full", subjectColor(current.name).dot)} />}
          <span className="truncate">{current?.name ?? allLabel}</span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring} className="shrink-0">
            <ChevronDown className="size-4 text-muted" />
          </motion.span>
        </motion.button>
      )}
    >
      {(close) =>
        options.map((s) => (
          <MenuItem
            key={s.id}
            onClick={() => {
              onChange(s.id);
              close();
            }}
          >
            {s.id !== "all" && <span className={cn("size-2 shrink-0 rounded-full", subjectColor(s.name).dot)} />}
            <span className="flex-1 truncate">{s.name}</span>
            {s.id === value && <Check className="size-4 text-lilac-deep" />}
          </MenuItem>
        ))
      }
    </Popover>
  );
}

export function useOpenWork() {
  const { openSheet } = useUI();
  return (w: StudentWork) => openSheet(<WorkSheet w={w} />);
}

/** Desktop row: student name, task title (grey bold), subject, bar, date. */
export function WorkRow({ w, ref }: { w: StudentWork; ref?: React.Ref<HTMLLIElement> }) {
  const open = useOpenWork();
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
        onClick={() => open(w)}
        className="w-full rounded-2xl px-2 py-3 text-left transition-colors hover:bg-soft"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[14px] leading-snug font-medium">{displayName(w.student)}</p>
          <WorkLabels w={w} />
        </div>
        <p className="mt-0.5 text-[13px] font-semibold text-muted">{w.activity.title}</p>
        <p className="text-xs text-muted">{w.subject}</p>
        <ProgressBar value={WORK_PROGRESS[w.status]} className="mt-2.5" />
        <p className="mt-2 text-[11px] text-muted">
          <WorkDate w={w} />
        </p>
      </motion.button>
    </motion.li>
  );
}

/** Mobile card with the same content. */
export function WorkCard({ w, index = 0, ref }: { w: StudentWork; index?: number; ref?: React.Ref<HTMLButtonElement> }) {
  const open = useOpenWork();
  return (
    <motion.button
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { ...spring, delay: Math.min(index, 6) * 0.04 } }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.97 }}
      transition={snappy}
      onClick={() => open(w)}
      className="block w-full rounded-[26px] bg-white p-4 text-left"
    >
      <WorkLabels w={w} className="justify-start" />
      <p className="mt-3 text-[17px] font-semibold">{displayName(w.student)}</p>
      <p className="mt-0.5 text-sm font-semibold text-muted">{w.activity.title}</p>
      <p className="text-sm text-muted">{w.subject}</p>
      <ProgressBar value={WORK_PROGRESS[w.status]} className="mt-3 h-5" />
      <p className="mt-3 text-[13px] text-muted">
        <WorkDate w={w} />
      </p>
    </motion.button>
  );
}

/** Opened from a row: the student's work, plus comment and Checked!. */
export function WorkSheet({ w }: { w: StudentWork }) {
  return (
    <div className="pt-1">
      <div className="flex items-center gap-3 pr-10">
        <Avatar name={w.student.full_name} size={44} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{displayName(w.student)}</p>
          <p className="text-sm text-muted">@{w.student.username}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <SubjectChip name={w.subject} />
        <WorkLabels w={w} className="justify-start" />
      </div>
      <div className="mt-3">
        <SheetHeader
          title={w.activity.title}
          subtitle={w.activity.due_at ? `Due ${fmtDate(w.activity.due_at)}` : "No due date"}
        />
      </div>

      {w.submission ? (
        <div data-guide="work-paper">
          <SubmissionView submission={w.submission} />
        </div>
      ) : w.activity.mode === "f2f" ? (
        // Face to face: the teacher photographs this student's paper
        <SubmitFlow activityId={w.activity.id} studentId={w.student.id} byTeacher />
      ) : (
        <p className="rounded-2xl bg-soft p-4 text-sm text-muted">
          {w.status === "progress"
            ? "The student has opened this activity but hasn't submitted yet."
            : "The student hasn't opened this activity yet."}
        </p>
      )}

      {w.submission && readParts(w.activity.parts).length > 0 && (
        <ScorePanel key={`score-${w.key}`} activityId={w.activity.id} studentId={w.student.id} />
      )}

      <div data-guide="work-feedback">
        <ReviewPanel
          key={w.key}
          activityId={w.activity.id}
          studentId={w.student.id}
          submitted={!!w.submission}
          initial={w.review ?? undefined}
        />
      </div>
    </div>
  );
}
