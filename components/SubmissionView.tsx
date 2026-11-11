"use client";

import { ChevronLeft, ChevronRight, Lock, Maximize2 } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { photoUrl } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { useQuery } from "@/lib/useQuery";
import type { Submission } from "@/lib/types";

/** Read-only view of a submission: every page (in order) + the transcribed text. */
export function SubmissionView({ submission }: { submission: Submission }) {
  const paths = submission.image_paths?.length ? submission.image_paths : [submission.image_path];
  const urls = useQuery(() => Promise.all(paths.map((p) => photoUrl(p))), [paths.join("|")]);
  const scroller = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const many = paths.length > 1;

  const go = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    const n = Math.max(0, Math.min(paths.length - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-2xl bg-mint/50 px-3.5 py-2.5 text-[13px] text-mint-deep">
        <Lock className="size-4 shrink-0" />
        Submitted {fmtDateTime(submission.submitted_at)}
        {many && ` · ${paths.length} pages`} · can&apos;t be edited
      </div>

      {/* Pages and text side by side on desktop, stacked on mobile */}
      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
        <div className="relative overflow-hidden rounded-[22px] bg-soft">
          {urls.data ? (
            <div
              ref={scroller}
              onScroll={(e) => {
                const el = e.currentTarget;
                setPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
              }}
              className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
            >
              {urls.data.map((u, i) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="group relative block w-full shrink-0 snap-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <motion.img
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={u}
                    alt={`Page ${i + 1} of the handwritten work`}
                    className="max-h-[420px] w-full object-contain lg:max-h-[60dvh]"
                  />
                  <span className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/90 opacity-0 shadow transition-opacity group-hover:opacity-100">
                    <Maximize2 className="size-4" />
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <motion.div className="h-64" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity }} />
          )}
          {urls.error && <p className="p-4 text-sm text-red-500">Couldn&apos;t load the photos: {urls.error}</p>}

          {/* Page controls */}
          {many && urls.data && (
            <div className="flex items-center justify-between gap-2 px-2 pb-2">
              <button
                type="button"
                onClick={() => go(page - 1)}
                disabled={page === 0}
                className="grid size-11 place-items-center rounded-xl bg-white ring-1 ring-line disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tabular-nums">
                  Page {page + 1} of {paths.length}
                </span>
                <div className="flex gap-1">
                  {paths.map((_, i) => (
                    <span key={i} className={`size-1.5 rounded-full transition-colors ${i === page ? "bg-ink" : "bg-ink/20"}`} />
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => go(page + 1)}
                disabled={page === paths.length - 1}
                className="grid size-11 place-items-center rounded-xl bg-white ring-1 ring-line disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Transcribed text</p>
          <p className="rounded-2xl bg-soft p-4 text-[15px] leading-relaxed whitespace-pre-wrap">
            {submission.text || <span className="text-muted">(empty)</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
