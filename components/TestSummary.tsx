"use client";

import { ChevronDown, ListChecks } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { spring } from "@/lib/motion";
import { partSummary, questionTotal, readParts, testTotal } from "@/lib/test";

/** Read-only test outline (no answers). Essay rubrics expand on tap. */
export function TestSummary({ parts: raw, className }: { parts: unknown; className?: string }) {
  const parts = readParts(raw);
  const [open, setOpen] = useState<string | null>(null);
  if (!parts.length) return null;

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted uppercase">
          <ListChecks className="size-4" /> Test
        </p>
        <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums">{testTotal(parts)} pts</span>
      </div>
      <div className="overflow-hidden rounded-[20px] bg-soft">
        {parts.map((p, i) => {
          const isEssay = p.type === "essay";
          const expanded = open === p.id;
          return (
            <div key={p.id} className={i > 0 ? "border-t border-white" : ""}>
              <button
                type="button"
                disabled={!isEssay}
                onClick={() => setOpen(expanded ? null : p.id)}
                className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{p.title}</p>
                  <p className="text-xs text-muted">{partSummary(p)}</p>
                  {p.instructions && <p className="mt-0.5 text-xs text-ink-2">{p.instructions}</p>}
                </div>
                {isEssay && (
                  <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={spring}>
                    <ChevronDown className="size-4 text-muted" />
                  </motion.span>
                )}
              </button>
              <AnimatePresence initial={false}>
                {isEssay && expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 px-4 pb-3">
                      {p.questions.map((q, qi) => (
                        <div key={q.id} className="rounded-xl bg-white p-3">
                          <p className="text-sm font-medium">
                            {qi + 1}. {q.prompt || "(no question text)"}{" "}
                            <span className="text-muted">· {questionTotal(q)} pts</span>
                          </p>
                          <ul className="mt-2 space-y-1">
                            {q.rubric.map((c) => (
                              <li key={c.id} className="flex justify-between gap-3 text-xs">
                                <span>
                                  <span className="font-medium">{c.label || "Criterion"}</span>
                                  {c.description && <span className="text-muted"> — {c.description}</span>}
                                </span>
                                <span className="shrink-0 font-semibold tabular-nums">{c.points}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
