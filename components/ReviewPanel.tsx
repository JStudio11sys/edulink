"use client";

import { useReadOnly } from "@/lib/auth";
import { Check, MessageSquare } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { getReview, saveReview } from "@/lib/api";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";
import { useUI } from "@/lib/store";
import type { ActivityReview } from "@/lib/types";
import { ErrorNote, PrimaryButton, inputCls } from "./ui";

/** Teacher: comment on a student's activity and tick "Checked!" once reviewed. */
export function ReviewPanel({
  activityId,
  studentId,
  submitted,
  initial,
}: {
  activityId: string;
  studentId: string;
  submitted: boolean;
  initial?: ActivityReview;
}) {
  const { bumpData } = useUI();
  const [review, setReview] = useState<ActivityReview | null | undefined>(initial);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the latest review if it wasn't passed in
  useEffect(() => {
    if (initial !== undefined) return;
    getReview(activityId, studentId).then((r) => {
      setReview(r);
      setComment(r?.comment ?? "");
    });
  }, [activityId, studentId, initial]);

  const save = async (patch: { comment?: string; checked?: boolean }) => {
    setError(null);
    const r = await saveReview(activityId, studentId, patch);
    setReview(r);
    bumpData();
    return r;
  };

  const saveComment = async () => {
    setSaving(true);
    try {
      await save({ comment: comment.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleChecked = async () => {
    const next = !review?.checked;
    setReview((r) => ({ ...(r ?? ({} as ActivityReview)), checked: next }));
    try {
      await save({ checked: next });
    } catch (e) {
      setReview((r) => ({ ...(r ?? ({} as ActivityReview)), checked: !next }));
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const readOnly = useReadOnly();
  const checked = !!review?.checked;
  if (readOnly) {
    return (
      <div className="mt-5 space-y-2 border-t border-line pt-5">
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted uppercase">
          <MessageSquare className="size-4" /> Teacher&apos;s comment {review?.checked && <span className="normal-case">· Checked</span>}
        </p>
        <p className="rounded-2xl bg-soft p-4 text-sm whitespace-pre-wrap">{review?.comment || "No comment yet."}</p>
      </div>
    );
  }
  const dirty = comment.trim() !== (review?.comment ?? "");

  return (
    <div className="mt-5 space-y-3 border-t border-line pt-5">
      <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted uppercase">
        <MessageSquare className="size-4" /> Your comment
      </p>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Write feedback for the student…"
        className={`${inputCls} h-auto resize-y py-3 leading-relaxed`}
      />
      <div className="flex items-center gap-2">
        <PrimaryButton variant="soft" className="h-10 px-4 max-lg:h-12" onClick={saveComment} disabled={!dirty} loading={saving}>
          {saved ? <Check className="size-4" /> : null}
          {saved ? "Saved" : "Save comment"}
        </PrimaryButton>

        {submitted && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            transition={snappy}
            onClick={toggleChecked}
            className={cn(
              "ml-auto flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-medium transition-colors max-lg:h-12",
              checked ? "bg-mint text-mint-deep" : "bg-soft text-ink hover:bg-line",
            )}
            aria-pressed={checked}
          >
            <span
              className={cn(
                "grid size-5 place-items-center rounded-md border-2 transition-colors",
                checked ? "border-mint-deep bg-mint-deep text-white" : "border-ink/30 bg-white",
              )}
            >
              <AnimatePresence>
                {checked && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={snappy}>
                    <Check className="size-3.5" strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            Checked!
          </motion.button>
        )}
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
