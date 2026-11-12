"use client";

import { useReadOnly } from "@/lib/auth";
import { Check, ChevronDown, EyeOff, KeyRound, Minus, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { snappy, spring } from "@/lib/motion";
import {
  fmtScore,
  getScore,
  gradeWork,
  recompute,
  saveScore,
  type ActivityScore,
  type ScoreDetails,
} from "@/lib/scores";
import { useUI } from "@/lib/store";
import { partTypeLabel, type TestPart } from "@/lib/test";
import { ErrorNote, PrimaryButton } from "./ui";

/**
 * Teacher: AI-suggested score → review (tap items to flip ✓/✗, adjust essay points) → confirm.
 * Runs the AI automatically the first time a paper with test parts is opened.
 */
export function ScorePanel({
  activityId,
  studentId,
  parts = [],
}: {
  activityId: string;
  studentId: string;
  /** The activity's test parts (for the rubric descriptions). */
  parts?: TestPart[];
}) {
  const { bumpData } = useUI();
  const readOnly = useReadOnly();
  const [loaded, setLoaded] = useState(false);
  const [score, setScore] = useState<ActivityScore | null>(null);
  const [draft, setDraft] = useState<ScoreDetails | null>(null);
  const [grading, setGrading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  /** Parts whose answer key is shown. */
  const [showKey, setShowKey] = useState<string[]>([]);
  const toggleKey = (partId: string) =>
    setShowKey((k) => (k.includes(partId) ? k.filter((x) => x !== partId) : [...k, partId]));
  const autoRan = useRef(false);

  const grade = async () => {
    setGrading(true);
    setError(null);
    try {
      const r = await gradeWork(activityId, studentId);
      const s: ActivityScore = {
        activity_id: activityId,
        student_id: studentId,
        score: r.score,
        max_score: r.max_score,
        details: r.details,
        confirmed: false,
        graded_at: new Date().toISOString(),
      };
      setScore(s);
      setDraft(r.details);
      setOpen(r.details.parts[0]?.part_id ?? null);
      bumpData();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGrading(false);
    }
  };

  useEffect(() => {
    getScore(activityId, studentId).then((s) => {
      setScore(s);
      setDraft(s?.details ?? null);
      setLoaded(true);
      if (!s && !autoRan.current && !readOnly) {
        autoRan.current = true;
        grade();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId, studentId]);

  const live = draft ? recompute(draft) : null;
  const dirty = !!score && !!draft && JSON.stringify(draft) !== JSON.stringify(score.details);

  const toggleItem = (partId: string, n: number) =>
    setDraft((d) =>
      d && {
        ...d,
        parts: d.parts.map((p) =>
          p.part_id !== partId
            ? p
            : { ...p, items: (p.items ?? []).map((it) => (it.n === n ? { ...it, correct: !it.correct, overridden: !it.overridden } : it)) },
        ),
      },
    );

  const setPoints = (partId: string, qid: string, cid: string, pts: number) =>
    setDraft((d) =>
      d && {
        ...d,
        parts: d.parts.map((p) =>
          p.part_id !== partId
            ? p
            : {
                ...p,
                questions: (p.questions ?? []).map((q) =>
                  q.question_id !== qid
                    ? q
                    : { ...q, criteria: q.criteria.map((c) => (c.criterion_id === cid ? { ...c, points: Math.max(0, Math.min(c.max, pts)) } : c)) },
                ),
              },
        ),
      },
    );

  const confirm = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      await saveScore(activityId, studentId, draft, true);
      const r = recompute(draft);
      setScore((s) => s && { ...s, details: r.details, score: r.score, max_score: r.max, confirmed: true });
      setDraft(r.details);
      bumpData();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="mt-5 border-t border-line pt-5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted uppercase">
          <Sparkles className="size-4" /> Score
        </p>
        {score && (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              score.confirmed && !dirty ? "bg-mint text-mint-deep" : "bg-lilac-soft text-lilac-deep",
            )}
          >
            {score.confirmed && !dirty ? "Confirmed" : "AI suggestion — please review"}
          </span>
        )}
      </div>

      {grading && !live ? (
        <div className="mt-3 rounded-[22px] bg-soft p-5 text-center" data-guide="work-checking">
          <motion.div
            className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-white"
            animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            <Sparkles className="size-6 text-lilac-deep" />
          </motion.div>
          <p className="text-sm font-medium">Checking the answers…</p>
          <p className="text-xs text-muted">Reading the paper and comparing it with your key.</p>
        </div>
      ) : live ? (
        <>
          {/* Total */}
          <motion.div layout className="mt-3 flex items-end gap-2" data-guide="work-score">
            <motion.span key={live.score} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={snappy} className="text-4xl leading-none font-semibold tabular-nums">
              {fmtScore(live.score)}
            </motion.span>
            <span className="pb-1 text-lg text-muted tabular-nums">/ {fmtScore(live.max)}</span>
          </motion.div>
          {draft?.notes && <p className="mt-2 rounded-xl bg-peach/60 px-3 py-2 text-xs text-peach-deep">{draft.notes}</p>}

          {/* Parts */}
          <div className="mt-3 space-y-2">
            {live.details.parts.map((p) => {
              const expanded = open === p.part_id;
              return (
                <div key={p.part_id} className="overflow-hidden rounded-[20px] bg-soft">
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : p.part_id)}
                    className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{p.title}</p>
                      <p className="text-xs text-muted">{partTypeLabel(p.type)}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {fmtScore(p.score)} / {fmtScore(p.max)}
                    </span>
                    <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={spring}>
                      <ChevronDown className="size-4 text-muted" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={spring}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4" data-guide="work-items">
                          {p.type !== "essay" ? (
                            <>
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="text-xs text-muted">Tap an item to mark it right or wrong.</p>
                                <KeyToggle open={showKey.includes(p.part_id)} label="answer key" onClick={() => toggleKey(p.part_id)} />
                              </div>
                              <AnimatePresence initial={false}>
                                {showKey.includes(p.part_id) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={spring}
                                    className="overflow-hidden"
                                  >
                                    <div className="mb-3 rounded-xl bg-white p-3">
                                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
                                        <KeyRound className="size-3.5" /> Answer key
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {(p.items ?? []).map((it) => (
                                          <span key={it.n} className="rounded-lg bg-soft px-2.5 py-1 text-sm tabular-nums">
                                            <span className="text-muted">{it.n}.</span> <span className="font-mono font-semibold">{it.key ?? "—"}</span>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              <div className="grid gap-2">
                                {(p.items ?? []).map((it) => (
                                  <motion.button
                                    key={it.n}
                                    type="button"
                                    whileTap={{ scale: 0.94 }}
                                    transition={snappy}
                                    onClick={() => !readOnly && toggleItem(p.part_id, it.n)}
                                    className={cn(
                                      "flex min-h-12 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ring-1 transition-colors",
                                      it.correct ? "bg-mint/50 ring-mint-deep/20" : "bg-red-50 ring-red-200",
                                    )}
                                  >
                                    <span className="w-5 text-right font-semibold text-muted tabular-nums">{it.n}</span>
                                    <span className="font-mono font-semibold">{it.answer ?? "—"}</span>
                                    {!it.correct && it.key && (
                                      <span className="text-xs leading-snug text-muted">
                                        → Correct answer is <span className="font-mono font-semibold text-ink">{it.key}</span>
                                      </span>
                                    )}
                                    <span className="ml-auto">
                                      {it.correct ? <Check className="size-4 text-mint-deep" /> : <X className="size-4 text-red-500" />}
                                    </span>
                                    {it.overridden && <span className="sr-only">(changed by teacher)</span>}
                                  </motion.button>
                                ))}
                              </div>
                            </>
                          ) : (
                            <>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-xs text-muted">Adjust the points for each part of the rubric.</p>
                              <KeyToggle open={showKey.includes(p.part_id)} label="rubric" onClick={() => toggleKey(p.part_id)} />
                            </div>
                            <AnimatePresence initial={false}>
                              {showKey.includes(p.part_id) && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={spring}
                                  className="overflow-hidden"
                                >
                                  <div className="mb-3 space-y-3 rounded-xl bg-white p-3">
                                    <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
                                      <KeyRound className="size-3.5" /> Rubric
                                    </p>
                                    {(p.questions ?? []).map((q, qi) => {
                                      const src = parts.find((x) => x.id === p.part_id)?.questions.find((x) => x.id === q.question_id);
                                      return (
                                        <div key={q.question_id}>
                                          {(p.questions ?? []).length > 1 && (
                                            <p className="mb-1 text-sm font-medium">
                                              {qi + 1}. {q.prompt || "Essay"}
                                            </p>
                                          )}
                                          <ul className="space-y-1.5">
                                            {q.criteria.map((c) => {
                                              const desc = src?.rubric.find((r) => r.id === c.criterion_id)?.description;
                                              return (
                                                <li key={c.criterion_id} className="rounded-lg bg-soft px-3 py-2 text-sm">
                                                  <span className="flex items-center justify-between gap-2">
                                                    <span className="font-semibold">{c.label}</span>
                                                    <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">{fmtScore(c.max)} pts</span>
                                                  </span>
                                                  {desc && <span className="mt-0.5 block text-xs text-muted">{desc}</span>}
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <div className="space-y-3">
                              {(p.questions ?? []).map((q, qi) => (
                                <div key={q.question_id} className="rounded-xl bg-white p-3">
                                  <p className="text-sm font-medium">
                                    {qi + 1}. {q.prompt || "Essay"} <span className="text-muted">· {fmtScore(q.score)}/{fmtScore(q.max)}</span>
                                  </p>
                                  <div className="mt-2 space-y-2">
                                    {q.criteria.map((c) => (
                                      <div key={c.criterion_id} className="flex items-start gap-3">
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-medium">{c.label}</p>
                                          {c.reason && <p className="text-xs text-muted">{c.reason}</p>}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1 rounded-xl bg-soft p-1">
                                          <button type="button" onClick={() => setPoints(p.part_id, q.question_id, c.criterion_id, c.points - 1)} className="grid size-10 place-items-center rounded-lg hover:bg-line max-lg:size-11" aria-label={`Less for ${c.label}`}>
                                            <Minus className="size-4" />
                                          </button>
                                          <span className="w-12 text-center text-sm font-semibold tabular-nums">
                                            {fmtScore(c.points)}/{fmtScore(c.max)}
                                          </span>
                                          <button type="button" onClick={() => setPoints(p.part_id, q.question_id, c.criterion_id, c.points + 1)} className="grid size-10 place-items-center rounded-lg hover:bg-line max-lg:size-11" aria-label={`More for ${c.label}`}>
                                            <Plus className="size-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="mt-3">
            <ErrorNote message={error} />
          </div>
          <div className={readOnly ? "hidden" : "mt-3 flex flex-col gap-2 sm:flex-row"} data-guide="work-confirm">
            <PrimaryButton
              className="w-full sm:flex-1"
              onClick={confirm}
              loading={saving}
              disabled={grading || (!!score?.confirmed && !dirty)}
            >
              <Check className="size-4" /> {score?.confirmed && !dirty ? "Score confirmed" : "Confirm score"}
            </PrimaryButton>
            <PrimaryButton variant="soft" className="w-full sm:w-auto" onClick={grade} loading={grading}>
              <RefreshCw className="size-4" /> Check again
            </PrimaryButton>
          </div>
        </>
      ) : (
        <div className="mt-3">
          <ErrorNote message={error} />
          {readOnly ? (
            <p className="rounded-2xl bg-soft p-4 text-sm text-muted">Not scored yet.</p>
          ) : (
          <PrimaryButton className="mt-3 w-full" onClick={grade} loading={grading}>
            <Sparkles className="size-4" /> Check with AI
          </PrimaryButton>
          )}
        </div>
      )}
    </div>
  );
}

/** "View answer key" / "View rubric" toggle. */
function KeyToggle({ open, label, onClick }: { open: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-medium text-lilac-deep ring-1 ring-line hover:bg-lilac-soft lg:h-9"
    >
      {open ? <EyeOff className="size-3.5" /> : <KeyRound className="size-3.5" />}
      {open ? `Hide ${label}` : `View ${label}`}
    </button>
  );
}
