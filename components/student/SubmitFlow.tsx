"use client";

import { Camera, Check, ChevronLeft, ChevronRight, ImageUp, Lock, RefreshCw, ScanText, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { submitWork, transcribe } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useGuide } from "@/lib/guide";
import { cn } from "@/lib/cn";
import { snappy, spring } from "@/lib/motion";
import { useUI } from "@/lib/store";
import { ErrorNote, PrimaryButton, inputCls } from "../ui";
import { CameraCapture, fileToJpeg } from "./CameraCapture";

const MAX_PAGES = 10;
/** Sample handwritten paper the guide uploads instead of opening the file picker. */
const SAMPLE_PAPER = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/guide/sample-paper.png`;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Cheap fingerprint of the pages (to know if the text was read for this exact order). */
const signature = (pages: string[]) => pages.map((p) => `${p.length}:${p.slice(-24)}`).join("|");

type Draft = { pages: string[]; text: string; readSig: string };

/** Drafts live in sessionStorage: this tab only, gone when the tab is closed. */
function loadDraft(key: string): Draft | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Draft> & { photo?: string };
    // Older drafts had a single "photo"
    const pages = d.pages ?? (d.photo ? [d.photo] : []);
    return { pages, text: d.text ?? "", readSig: d.readSig ?? (d.text ? signature(pages) : "") };
  } catch {
    return null;
  }
}

function saveDraft(key: string, draft: Draft | null) {
  try {
    if (draft) sessionStorage.setItem(key, JSON.stringify(draft));
    else sessionStorage.removeItem(key);
  } catch {
    /* storage full or blocked — the draft just won't survive a reload */
  }
}

/** Pages (photos, in order) → handwriting read in order → edit → confirm → submit (then locked). */
export function SubmitFlow({
  activityId,
  studentId,
  byTeacher = false,
}: {
  activityId: string;
  /** Whose work this is (the student themself, or the teacher capturing a paper). */
  studentId: string;
  byTeacher?: boolean;
}) {
  const me = useMe();
  const { closeSheet, bumpData } = useUI();
  const guide = useGuide();
  const uploadRef = useRef<HTMLInputElement>(null);
  const phoneCamRef = useRef<HTMLInputElement>(null);
  const draftKey = `edulink-draft-${me.id}-${studentId}-${activityId}`;
  const initial = useRef(loadDraft(draftKey)).current;

  const [camera, setCamera] = useState(false);
  const [pages, setPages] = useState<string[]>(initial?.pages ?? []);
  const [text, setText] = useState(initial?.text ?? "");
  const [readSig, setReadSig] = useState(initial?.readSig ?? "");
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const stale = pages.length > 0 && signature(pages) !== readSig;

  const read = async (list: string[] = pages) => {
    if (!list.length) return;
    setReading(true);
    setReadError(null);
    try {
      const res = await transcribe(list);
      setText(res.text);
      setReadSig(signature(list));
      if (!res.text) setReadError("No handwriting was found. Retake the photos, or type the answer below.");
    } catch (e) {
      setReadError(`${msg(e)} You can try again, or type the answer below.`);
    } finally {
      setReading(false);
    }
  };

  // Keep a draft so pages/text survive a reload or rotation (iOS may reload while its camera app is open).
  useEffect(() => {
    saveDraft(draftKey, pages.length ? { pages, text, readSig } : null);
  }, [draftKey, pages, text, readSig]);

  // Restored pages whose text never came back: read them.
  useEffect(() => {
    if (pages.length && !text) read(pages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----- adding pages ----- */
  const addPage = (img: string) => setPages((p) => (p.length >= MAX_PAGES ? p : [...p, img]));

  const closeCamera = () => {
    setCamera(false);
    setConfirming(false);
    // Read automatically the first time; after that the teacher/student taps "Read again"
    if (pages.length && !text && !reading) read(pages);
  };

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    await addFiles(files);
  };

  // "Upload photos": during the guide, use the sample paper
  const upload = async () => {
    if (byTeacher && guide?.active && guide.step.target === "paper-upload") {
      try {
        const blob = await (await fetch(SAMPLE_PAPER)).blob();
        await addFiles([new File([blob], "sample-paper.png", { type: blob.type || "image/png" })]);
      } catch (err) {
        setError(msg(err));
      }
      return;
    }
    uploadRef.current?.click();
  };

  const addFiles = async (files: File[]) => {
    if (!files.length) return;
    setError(null);
    try {
      const imgs: string[] = [];
      for (const f of files) imgs.push(await fileToJpeg(f)); // keep the picked order
      const next = [...pages, ...imgs].slice(0, MAX_PAGES);
      if (pages.length + imgs.length > MAX_PAGES) setError(`Only ${MAX_PAGES} pages are allowed; extra photos were left out.`);
      setPages(next);
      setConfirming(false);
      if (!text && !reading) read(next);
    } catch (err) {
      setError(msg(err));
    }
  };

  /* ----- arranging pages ----- */
  const move = (i: number, dir: -1 | 1) =>
    setPages((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const next = [...p];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const removePage = (i: number) => {
    setPages((p) => p.filter((_, k) => k !== i));
    setConfirming(false);
  };

  const submit = async () => {
    if (!pages.length) return;
    setBusy(true);
    setError(null);
    try {
      const blobs = await Promise.all(pages.map(async (p) => (await fetch(p)).blob()));
      await submitWork(studentId, activityId, blobs, text.trim());
      saveDraft(draftKey, null);
      setDone(true);
      bumpData();
      setTimeout(closeSheet, 1500);
    } catch (e) {
      setError(msg(e));
      setBusy(false);
      setConfirming(false);
    }
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 14 }}
          className="mx-auto grid size-20 place-items-center rounded-full bg-mint"
        >
          <Check className="size-10 text-mint-deep" strokeWidth={3} />
        </motion.div>
        <p className="mt-4 text-xl font-semibold">{byTeacher ? "Paper saved!" : "Submitted!"}</p>
        <p className="mt-1 text-sm text-muted">
          {byTeacher ? `${pages.length} page${pages.length === 1 ? "" : "s"} saved for this student.` : "Your teacher can see it now."}
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {camera && (
          <CameraCapture
            pages={pages}
            maxPages={MAX_PAGES}
            onCapture={addPage}
            onClose={closeCamera}
            onUsePhoneCamera={() => {
              phoneCamRef.current?.click(); // must run inside the tap
              setCamera(false);
            }}
          />
        )}
      </AnimatePresence>
      {/* Gallery / files picker (several at once, in the picked order) */}
      <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
      {/* Phone's own camera app (when the in-app camera can't open) — kept here so it survives the camera closing */}
      <input ref={phoneCamRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFiles} />

      {!pages.length ? (
        <div className="space-y-2">
          <ErrorNote message={error} />
          <PrimaryButton className="w-full" onClick={() => setCamera(true)}>
            <Camera className="size-4" /> {byTeacher ? "Take photos of test paper" : "Take photos of my work"}
          </PrimaryButton>
          <PrimaryButton guide="paper-upload" variant="soft" className="w-full" onClick={upload}>
            <ImageUp className="size-4" /> Upload photos
          </PrimaryButton>
          <p className="pt-1 text-center text-xs text-muted">
            Several pages? Take them in order — page 1 first. You can rearrange them before saving.
          </p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Pages, in order */}
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
              Pages · {pages.length}
              {pages.length > 1 && <span className="normal-case"> — read in this order</span>}
            </p>
            <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pt-2 pb-1">
              <AnimatePresence initial={false}>
                {pages.map((p, i) => (
                  <motion.div
                    key={signature([p])}
                    layout
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={spring}
                    className="relative w-32 shrink-0"
                  >
                    <div className="relative h-44 overflow-hidden rounded-2xl bg-soft ring-1 ring-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p} alt={`Page ${i + 1}`} className="size-full object-cover" />
                      {reading && (
                        <motion.div
                          className="pointer-events-none absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-lilac/50 to-transparent"
                          animate={{ top: ["-20%", "100%"] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                        />
                      )}
                      <span className="absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-ink text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePage(i)}
                        disabled={busy}
                        className="absolute top-1 right-1 grid size-10 place-items-center"
                        aria-label={`Remove page ${i + 1}`}
                      >
                        <span className="grid size-7 place-items-center rounded-full bg-white/90 shadow">
                          <X className="size-4" />
                        </span>
                      </button>
                    </div>
                    {pages.length > 1 && (
                      <div className="mt-1.5 flex justify-between">
                        <button
                          type="button"
                          onClick={() => move(i, -1)}
                          disabled={i === 0 || busy}
                          className="grid size-11 place-items-center rounded-xl bg-white ring-1 ring-line disabled:opacity-25"
                          aria-label={`Move page ${i + 1} earlier`}
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(i, 1)}
                          disabled={i === pages.length - 1 || busy}
                          className="grid size-11 place-items-center rounded-xl bg-white ring-1 ring-line disabled:opacity-25"
                          aria-label={`Move page ${i + 1} later`}
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add more */}
              {pages.length < MAX_PAGES && (
                <div className="flex w-32 shrink-0 flex-col gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    transition={snappy}
                    onClick={() => setCamera(true)}
                    disabled={busy}
                    className="flex h-[84px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink/15 text-xs font-medium text-ink-2 hover:bg-soft"
                  >
                    <Camera className="size-5" /> Add page
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    transition={snappy}
                    onClick={() => uploadRef.current?.click()}
                    disabled={busy}
                    className="flex h-[84px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink/15 text-xs font-medium text-ink-2 hover:bg-soft"
                  >
                    <ImageUp className="size-5" /> From gallery
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* Pages changed since the text was read */}
          <AnimatePresence initial={false}>
            {stale && !reading && text && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 rounded-2xl bg-peach/60 p-3">
                  <p className="flex-1 text-sm text-peach-deep">The pages changed since the text was read.</p>
                  <PrimaryButton variant="soft" className="h-11 shrink-0 bg-white px-4" onClick={() => read(pages)}>
                    <RefreshCw className="size-4" /> Read again
                  </PrimaryButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Text */}
          <div data-guide={reading ? "paper-reading" : "paper-text"}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted uppercase">
              <ScanText className="size-4" />
              {reading
                ? `Reading ${pages.length > 1 ? `${pages.length} pages` : "the handwriting"}…`
                : byTeacher
                  ? "Transcribed text (check and fix it)"
                  : "Your answer (check and fix it)"}
            </p>
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                disabled={reading || busy}
                placeholder={reading ? "" : "Type the answer if the reader missed something."}
                className={cn(inputCls, "h-auto resize-y py-3 leading-relaxed", reading && "opacity-40")}
              />
              {reading && (
                <div className="absolute inset-0 space-y-2.5 p-4">
                  {[92, 80, 86, 60].map((w, i) => (
                    <motion.div
                      key={i}
                      className="h-3 rounded-full bg-line"
                      style={{ width: `${w}%` }}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              )}
            </div>
            {readError && (
              <div className="mt-2 space-y-1.5">
                <ErrorNote message={readError} />
                <button onClick={() => read(pages)} className="flex h-11 items-center text-sm font-medium text-lilac-deep">
                  Try reading again
                </button>
              </div>
            )}
          </div>

          <ErrorNote message={error} />

          <AnimatePresence mode="wait" initial={false}>
            {confirming ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="rounded-[22px] bg-lilac-soft p-4"
              >
                <p className="flex items-center gap-2 font-semibold text-lilac-deep">
                  <Lock className="size-4" /> {byTeacher ? "Save this paper?" : "Submit now?"}
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  {pages.length} page{pages.length === 1 ? "" : "s"}.{" "}
                  {byTeacher
                    ? "After saving, the photos and text can’t be changed."
                    : "After submitting, you can’t edit or remove your photos or answer."}
                </p>
                <div className="mt-4 flex gap-2">
                  <PrimaryButton variant="soft" className="flex-1 bg-white" onClick={() => setConfirming(false)} disabled={busy}>
                    Not yet
                  </PrimaryButton>
                  <PrimaryButton guide="paper-confirm" className="flex-1" onClick={submit} loading={busy}>
                    {byTeacher ? "Yes, save" : "Yes, submit"}
                  </PrimaryButton>
                </div>
              </motion.div>
            ) : (
              <motion.div key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PrimaryButton guide="paper-save" className="w-full" disabled={reading || !text.trim()} onClick={() => setConfirming(true)}>
                  {byTeacher ? "Save paper" : "Submit"}
                </PrimaryButton>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}
