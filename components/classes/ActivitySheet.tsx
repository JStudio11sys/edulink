"use client";

import { ArrowLeft, ChevronRight, Home, Pencil, Trash2, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { deleteActivity } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useUI } from "@/lib/store";
import { categoryLabel, type Activity, type Section, type Subject } from "@/lib/types";
import type { StudentWork } from "@/lib/useTeacherData";
import { ConfirmSheet } from "../ConfirmSheet";
import { WorkLabels, WorkSheet } from "../dashboard/StudentWork";
import { ActivityForm } from "../forms/ActivityForm";
import { SheetHeader } from "../Sheet";
import { Avatar, IconButton, Pill, SubjectChip } from "../ui";
import { displayName } from "@/lib/names";
import { TestSummary } from "../TestSummary";

export function ModeBadge({ mode }: { mode: Activity["mode"] }) {
  return mode === "f2f" ? (
    <Pill tone="bg-sky text-[#1f5a8c]">
      <span className="flex items-center gap-1">
        <Users className="size-3" /> Face to face
      </span>
    </Pill>
  ) : (
    <Pill tone="bg-soft text-ink-2">
      <span className="flex items-center gap-1">
        <Home className="size-3" /> At home
      </span>
    </Pill>
  );
}

/** Activity details + every student's work on it (optionally one section only). */
export function ActivitySheet({
  activity,
  subject,
  subjectSections,
  activitySectionIds,
  work,
  onChanged,
}: {
  activity: Activity;
  subject: Subject;
  /** Sections that take this subject (for editing). */
  subjectSections: Section[];
  activitySectionIds: string[];
  /** Student work rows to list (already filtered to the section being viewed). */
  work: StudentWork[];
  onChanged: () => void;
}) {
  const { openSheet } = useUI();
  const [viewing, setViewing] = useState<StudentWork | null>(null);
  const done = work.filter((w) => w.submission).length;
  const sectionNames = subjectSections.filter((s) => activitySectionIds.includes(s.id)).map((s) => s.name);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {viewing ? (
        <motion.div key="student" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
          <button onClick={() => setViewing(null)} className="mb-3 flex items-center gap-1.5 text-sm font-medium text-lilac-deep">
            <ArrowLeft className="size-4" /> {activity.title}
          </button>
          <WorkSheet w={viewing} />
        </motion.div>
      ) : (
        <motion.div key="main" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
          <div className="flex flex-wrap items-center gap-1.5 pr-10">
            <SubjectChip name={subject.name} />
            <ModeBadge mode={activity.mode} />
          </div>
          <div className="mt-3">
            <SheetHeader
              title={activity.title}
              subtitle={`${categoryLabel(activity.category)} · ${activity.due_at ? `Due ${fmtDate(activity.due_at)}` : "No due date"}`}
            />
          </div>
          <p className="-mt-3 mb-4 text-xs text-muted">Given to: {sectionNames.join(", ") || "—"}</p>
          {activity.instructions && (
            <p className="mb-5 rounded-2xl bg-soft p-4 text-[15px] leading-relaxed whitespace-pre-wrap">{activity.instructions}</p>
          )}

          <TestSummary parts={activity.parts} className="mb-5" />

          <div className="mb-5 flex gap-2">
            <IconButton
              variant="soft"
              size={44}
              className="rounded-2xl"
              aria-label="Edit activity"
              onClick={() =>
                openSheet(
                  <ActivityForm
                    subject={subject}
                    sections={subjectSections}
                    existing={activity}
                    existingSectionIds={activitySectionIds}
                    onSaved={onChanged}
                  />,
                )
              }
            >
              <Pencil className="size-4" />
            </IconButton>
            <IconButton
              variant="danger"
              size={44}
              className="rounded-2xl"
              aria-label="Delete activity"
              onClick={() =>
                openSheet(
                  <ConfirmSheet
                    title="Delete this activity?"
                    text={`"${activity.title}" and every submission on it (in all sections) will be permanently removed.`}
                    onConfirm={async () => {
                      await deleteActivity(activity.id);
                      onChanged();
                    }}
                  />,
                )
              }
            >
              <Trash2 className="size-4" />
            </IconButton>
          </div>

          <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
            Students · {done}/{work.length} {activity.mode === "f2f" ? "checked in" : "submitted"}
          </p>
          {work.length === 0 ? (
            <p className="text-sm text-muted">No students in this section yet.</p>
          ) : (
            <ul className="space-y-1">
              {work.map((w) => (
                <li key={w.key}>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setViewing(w)}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-soft"
                  >
                    <Avatar name={w.student.full_name} size={34} />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{displayName(w.student)}</p>
                    <WorkLabels w={w} />
                    <ChevronRight className="size-4 shrink-0 text-muted" />
                  </motion.button>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
