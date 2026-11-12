"use client";

import { Home, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { getActivityKey, saveActivity } from "@/lib/api";
import { readParts, type AnswerKey, type TestPart } from "@/lib/test";
import { TestBuilder } from "./TestBuilder";
import { fromDateInput, toDateInput } from "@/lib/format";
import { useUI } from "@/lib/store";
import { CATEGORIES, type Activity, type ActivityMode, type Category, type Section, type Subject } from "@/lib/types";
import { SheetHeader } from "../Sheet";
import { ErrorNote, Field, PrimaryButton, Segmented, ToggleChip, inputCls } from "../ui";

/**
 * Create or edit an activity for one subject, given to one or more sections.
 * Optional test parts with a private answer key and essay rubrics.
 */
export function ActivityForm({
  subject,
  sections,
  existing,
  existingSectionIds,
  defaultSectionId,
  onSaved,
}: {
  subject: Subject;
  /** Sections that take this subject (where it can be given). */
  sections: Section[];
  existing?: Activity;
  existingSectionIds?: string[];
  defaultSectionId?: string;
  onSaved: () => void;
}) {
  const { closeSheet, bumpData } = useUI();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState<Category>(existing?.category ?? "written");
  const [mode, setMode] = useState<ActivityMode>(existing?.mode ?? "home");
  const [sectionIds, setSectionIds] = useState<string[]>(
    existingSectionIds ?? (defaultSectionId ? [defaultSectionId] : sections.slice(0, 1).map((s) => s.id)),
  );
  const [instructions, setInstructions] = useState(existing?.instructions ?? "");
  const [due, setDue] = useState(toDateInput(existing?.due_at));
  const [parts, setParts] = useState<TestPart[]>(readParts(existing?.parts));
  const [answerKey, setAnswerKey] = useState<AnswerKey>({});
  const [busy, setBusy] = useState(false);

  // Load the private answer key when editing
  useEffect(() => {
    if (existing) getActivityKey(existing.id).then(setAnswerKey);
  }, [existing]);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim() && sectionIds.length > 0;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveActivity({
        id: existing?.id,
        subject_id: subject.id,
        title: title.trim(),
        instructions: instructions.trim(),
        category,
        mode,
        due_at: fromDateInput(due),
        section_ids: sectionIds,
        parts,
        // keep only answers for items that exist
        key: Object.fromEntries(
          parts.filter((p) => p.type !== "essay").map((p) => [p.id, Array.from({ length: p.items }, (_, i) => answerKey[p.id]?.[i] ?? "")]),
        ),
      });
      onSaved();
      bumpData();
      closeSheet();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-5 pt-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !busy) submit();
      }}
    >
      <SheetHeader title={existing ? "Edit activity" : "New activity"} subtitle={subject.name} />

      <div data-guide="activity-title">
      <Field label="Title">
        <input
          autoFocus={!existing}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Quiz 1 – Parts of speech"
          className={inputCls}
        />
      </Field>
      </div>

      <div data-guide="activity-category">
      <Field label="Category">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <ToggleChip key={c.value} on={category === c.value} onClick={() => setCategory(c.value)}>
              {c.label}
            </ToggleChip>
          ))}
        </div>
      </Field>
      </div>

      <div data-guide="activity-mode">
      <Field
        label="Where is it done?"
        hint={
          mode === "f2f"
            ? "You take photos of each student's paper. It won't appear in students' To do."
            : "Students do it at home and submit photos themselves."
        }
      >
        <Segmented
          layoutId="activity-mode"
          size="md"
          grow
          options={[
            { value: "home", label: "At home" },
            { value: "f2f", label: "Face to face" },
          ]}
          value={mode}
          onChange={setMode}
        />
      </Field>
      {/* Lets the guide know Face to face is picked */}
      {mode === "f2f" && <span data-guide="activity-mode-f2f" className="block h-px w-full" />}
      </div>

      <Field label="Sections" hint="Give the same activity to several sections of this subject.">
        <div className="flex flex-wrap gap-1.5">
          {sections.map((s) => {
            const on = sectionIds.includes(s.id);
            return (
              <ToggleChip
                key={s.id}
                on={on}
                onClick={() => setSectionIds((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))}
              >
                {s.name}
              </ToggleChip>
            );
          })}
        </div>
      </Field>

      <Field label="Instructions">
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder="What should students do? Pages, questions, format…"
          className={`${inputCls} h-auto resize-none py-3 leading-relaxed`}
        />
      </Field>

      <div data-guide="activity-test">
      <TestBuilder parts={parts} onParts={setParts} answerKey={answerKey} onKey={setAnswerKey} />
      </div>

      <div className="space-y-5" data-guide="activity-finish">
      <Field label="Due date (optional)">
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls} />
      </Field>

      <ErrorNote message={error} />

      <PrimaryButton type="submit" className="w-full" disabled={!valid} loading={busy}>
        {mode === "f2f" ? <Users className="size-4" /> : <Home className="size-4" />}
        {existing ? "Save changes" : "Create activity"}
      </PrimaryButton>
      </div>
    </form>
  );
}
