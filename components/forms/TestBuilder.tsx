"use client";

import { AlertCircle, ChevronDown, Minus, Plus, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { snappy, spring } from "@/lib/motion";
import {
  PART_TYPES,
  keyOptions,
  missingKeys,
  newCriterion,
  newPart,
  newQuestion,
  partTotal,
  partTypeLabel,
  questionTotal,
  testTotal,
  type AnswerKey,
  type EssayQuestion,
  type PartType,
  type TestPart,
} from "@/lib/test";
import { IconButton, inputCls } from "../ui";

/** Build the test: parts (True/False, Multiple choice, Matching, Essay), answer key and rubrics. */
export function TestBuilder({
  parts,
  onParts,
  answerKey,
  onKey,
}: {
  parts: TestPart[];
  onParts: (p: TestPart[]) => void;
  answerKey: AnswerKey;
  onKey: (k: AnswerKey) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(parts[0]?.id ?? null);
  const total = testTotal(parts);
  const missing = missingKeys(parts, answerKey);

  const update = (id: string, patch: Partial<TestPart>) => onParts(parts.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const remove = (id: string) => {
    onParts(parts.filter((p) => p.id !== id));
    const k = { ...answerKey };
    delete k[id];
    onKey(k);
  };
  const add = (type: PartType) => {
    const p = newPart(type, parts.length);
    onParts([...parts, p]);
    setOpen(p.id);
    setAdding(false);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted uppercase">Test parts</span>
        {parts.length > 0 && (
          <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums">Total {total} pts</span>
        )}
      </div>

      {parts.length === 0 && !adding && (
        <p className="mb-2 text-sm text-muted">
          No test parts yet. Add one for quizzes and tests, or leave it empty for tasks like drawings or projects.
        </p>
      )}

      {missing > 0 && (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-peach-deep">
          <AlertCircle className="size-3.5" /> {missing} answer{missing === 1 ? "" : "s"} still missing in the key
        </p>
      )}

      <div className="space-y-2.5">
        {parts.map((p, i) => (
          <PartCard
            key={p.id}
            part={p}
            index={i}
            open={open === p.id}
            onToggle={() => setOpen(open === p.id ? null : p.id)}
            onChange={(patch) => update(p.id, patch)}
            onRemove={() => remove(p.id)}
            answers={answerKey[p.id] ?? []}
            onAnswers={(a) => onKey({ ...answerKey, [p.id]: a })}
          />
        ))}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {adding ? (
          <motion.div
            key="types"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {PART_TYPES.map((t) => (
                <motion.button
                  key={t.value}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => add(t.value)}
                  className="min-h-16 rounded-2xl bg-white p-3 text-left ring-1 ring-line transition-colors hover:bg-soft"
                >
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-xs text-muted">{t.hint}</p>
                </motion.button>
              ))}
            </div>
            <button type="button" onClick={() => setAdding(false)} className="mt-2 w-full py-2 text-sm text-muted">
              Cancel
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="add"
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setAdding(true)}
            className="mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 text-sm font-medium text-ink-2 transition-colors hover:bg-soft"
          >
            <Plus className="size-4" /> Add a test part
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- One part ---------------- */

function PartCard({
  part,
  index,
  open,
  onToggle,
  onChange,
  onRemove,
  answers,
  onAnswers,
}: {
  part: TestPart;
  index: number;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<TestPart>) => void;
  onRemove: () => void;
  answers: string[];
  onAnswers: (a: string[]) => void;
}) {
  const filled = part.type === "essay" ? 0 : Array.from({ length: part.items }, (_, i) => answers[i]).filter(Boolean).length;

  return (
    <motion.div layout transition={spring} className="overflow-hidden rounded-[22px] bg-soft">
      <button type="button" onClick={onToggle} className="flex min-h-14 w-full items-center gap-3 px-4 text-left">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-xs font-bold">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {part.title || `Part ${index + 1}`} · {partTypeLabel(part.type)}
          </p>
          <p className="text-xs text-muted">
            {part.type === "essay"
              ? `${part.questions.length} question${part.questions.length === 1 ? "" : "s"}`
              : `${part.items} items · key ${filled}/${part.items}`}{" "}
            · {partTotal(part)} pts
          </p>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring}>
          <ChevronDown className="size-5 text-muted" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-4 pb-4">
              <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                <input
                  value={part.title}
                  onChange={(e) => onChange({ title: e.target.value })}
                  placeholder="Part I"
                  className={cn(inputCls, "bg-white")}
                />
                <input
                  value={part.instructions}
                  onChange={(e) => onChange({ instructions: e.target.value })}
                  placeholder="Directions (optional), e.g. Write T if true…"
                  className={cn(inputCls, "bg-white")}
                />
              </div>

              {part.type === "essay" ? (
                <EssayEditor part={part} onChange={onChange} />
              ) : (
                <ObjectiveEditor part={part} onChange={onChange} answers={answers} onAnswers={onAnswers} />
              )}

              <button
                type="button"
                onClick={onRemove}
                className="flex h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-red-500 hover:bg-red-50"
              >
                <Trash2 className="size-4" /> Remove this part
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------------- True/False, Multiple choice, Matching ---------------- */

function ObjectiveEditor({
  part,
  onChange,
  answers,
  onAnswers,
}: {
  part: TestPart;
  onChange: (patch: Partial<TestPart>) => void;
  answers: string[];
  onAnswers: (a: string[]) => void;
}) {
  const options = keyOptions(part);
  const [quick, setQuick] = useState("");

  const setAnswer = (i: number, v: string) => {
    const next = Array.from({ length: part.items }, (_, k) => answers[k] ?? "");
    next[i] = next[i] === v ? "" : v;
    onAnswers(next);
  };

  /** "TFFT…" or "A B C D" → fills the key from item 1. */
  const applyQuick = (text: string) => {
    const tokens = text
      .toUpperCase()
      .replace(/TRUE/g, "T")
      .replace(/FALSE/g, "F")
      .split("")
      .filter((c) => options.includes(c));
    if (!tokens.length) return;
    const next = Array.from({ length: part.items }, (_, k) => tokens[k] ?? answers[k] ?? "");
    onAnswers(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <Stepper label="Items" value={part.items} min={1} max={100} onChange={(items) => onChange({ items })} />
        <Stepper label="Points each" value={part.points} min={1} max={20} onChange={(points) => onChange({ points })} />
        {part.type === "multiple" && (
          <Stepper label="Choices (A–?)" value={part.choices} min={2} max={6} onChange={(choices) => onChange({ choices })} />
        )}
        {part.type === "matching" && (
          <Stepper label="Letters in column B" value={part.choices} min={2} max={26} onChange={(choices) => onChange({ choices })} />
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Answer key (only you can see this)</p>
        <input
          value={quick}
          onChange={(e) => {
            setQuick(e.target.value);
            applyQuick(e.target.value);
          }}
          placeholder={part.type === "truefalse" ? "Quick type, e.g. TFFTT…" : "Quick type, e.g. ABDCA…"}
          autoCapitalize="characters"
          spellCheck={false}
          className={cn(inputCls, "mb-3 bg-white font-mono tracking-widest")}
        />
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          {Array.from({ length: part.items }, (_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-7 shrink-0 text-right text-sm font-semibold text-muted tabular-nums">{i + 1}.</span>
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                {options.map((o) => {
                  const on = answers[i] === o;
                  return (
                    <motion.button
                      key={o}
                      type="button"
                      whileTap={{ scale: 0.88 }}
                      transition={snappy}
                      onClick={() => setAnswer(i, o)}
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-xl text-sm font-semibold transition-colors max-lg:size-11",
                        on ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line hover:bg-line",
                      )}
                      aria-label={`Item ${i + 1}: ${o}`}
                      aria-pressed={on}
                    >
                      {o}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Essay + rubric ---------------- */

function EssayEditor({ part, onChange }: { part: TestPart; onChange: (patch: Partial<TestPart>) => void }) {
  const setQ = (id: string, patch: Partial<EssayQuestion>) =>
    onChange({ questions: part.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });

  return (
    <div className="space-y-3">
      {part.questions.map((q, qi) => (
        <div key={q.id} className="rounded-2xl bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              Question {qi + 1} · <span className="text-muted">{questionTotal(q)} pts</span>
            </p>
            {part.questions.length > 1 && (
              <IconButton
                type="button"
                variant="soft"
                size={36}
                aria-label={`Remove question ${qi + 1}`}
                onClick={() => onChange({ questions: part.questions.filter((x) => x.id !== q.id) })}
              >
                <X className="size-4" />
              </IconButton>
            )}
          </div>
          <textarea
            value={q.prompt}
            onChange={(e) => setQ(q.id, { prompt: e.target.value })}
            rows={2}
            placeholder="The essay question, e.g. Explain the theme of the poem."
            className={cn(inputCls, "h-auto resize-none py-3 leading-relaxed")}
          />

          <p className="mt-3 mb-2 text-xs font-medium tracking-wide text-muted uppercase">Rubric</p>
          <div className="space-y-2">
            {q.rubric.map((c) => (
              <div key={c.id} className="rounded-xl bg-soft p-2.5">
                <div className="flex items-center gap-2">
                  <input
                    value={c.label}
                    onChange={(e) => setQ(q.id, { rubric: q.rubric.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)) })}
                    placeholder="Criterion, e.g. Content"
                    className={cn(inputCls, "h-11 min-w-0 flex-1 bg-white")}
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={c.points}
                    onChange={(e) =>
                      setQ(q.id, { rubric: q.rubric.map((x) => (x.id === c.id ? { ...x, points: Math.max(0, Number(e.target.value) || 0) } : x)) })
                    }
                    className={cn(inputCls, "h-11 w-20 bg-white text-center")}
                    aria-label="Points"
                  />
                  <span className="text-xs text-muted">pts</span>
                  <IconButton
                    type="button"
                    variant="soft"
                    size={36}
                    aria-label="Remove criterion"
                    onClick={() => setQ(q.id, { rubric: q.rubric.filter((x) => x.id !== c.id) })}
                  >
                    <X className="size-4" />
                  </IconButton>
                </div>
                <input
                  value={c.description}
                  onChange={(e) => setQ(q.id, { rubric: q.rubric.map((x) => (x.id === c.id ? { ...x, description: e.target.value } : x)) })}
                  placeholder="What earns full points?"
                  className={cn(inputCls, "mt-2 h-11 bg-white text-sm")}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setQ(q.id, { rubric: [...q.rubric, newCriterion()] })}
            className="mt-2 flex h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-lilac-deep hover:bg-lilac-soft"
          >
            <Plus className="size-4" /> Add criterion
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ questions: [...part.questions, newQuestion()] })}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-medium ring-1 ring-line hover:bg-line"
      >
        <Plus className="size-4" /> Add essay question
      </button>
    </div>
  );
}

/* ---------------- Small stepper (44px targets) ---------------- */

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div>
      <p className="mb-1.5 text-xs text-muted">{label}</p>
      <div className="flex items-center gap-1 rounded-2xl bg-white p-1 ring-1 ring-line">
        <button type="button" onClick={() => set(value - 1)} className="grid size-10 place-items-center rounded-xl hover:bg-soft max-lg:size-11" aria-label={`Fewer ${label}`}>
          <Minus className="size-4" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => set(Number(e.target.value) || min)}
          className="w-12 bg-transparent text-center text-sm font-semibold tabular-nums outline-none"
          aria-label={label}
        />
        <button type="button" onClick={() => set(value + 1)} className="grid size-10 place-items-center rounded-xl hover:bg-soft max-lg:size-11" aria-label={`More ${label}`}>
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
